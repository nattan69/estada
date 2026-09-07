# Estada — Review tècnic de la guia d'implementació

> Document de revisió sobre `Estada_guia_implementacio.md`.
> Recull els 9 punts detectats, el problema de fons i la solució aplicada
> al document perquè el codi resultant siga correcte.
>
> Data: 06/09/2026 | Autor: [Revisió] | Estat: revisat, guia corregida
> Referència: `../Estada_guia_implementacio.md`

---

## Resum

| # | Punt | Problema | Solució aplicada |
|---|------|----------|------------------|
| 1 | Dates | Barreja `DateTime`/`date` | `check_in`/`check_out` a `Date` + convenció de temps |
| 2 | Disponibilitat | No valida restriccions del model | Valida totes les restriccions per dia i d'estada |
| 3 | Concurrència | Sobrevenda (race TOCTOU) | `SELECT ... FOR UPDATE` sobre l'inventari |
| 4 | min/max stay | Al lloc equivocat (`Rate` per dia) | Moguts a `RatePlan` (durada d'estada) |
| 5 | VeriFactu | IVA únic, payload no verificable, seq. no atòmica | IVA per línia, `payload` guardat, `FiscalSequence` |
| 6 | Diners | `float` en comptes de `Decimal` | `Decimal` a tots els càlculs de servei |
| 7 | Foli | Lligat 1:1 a la reserva | `reservation_id` nullable + `kind` + `guest_id` |
| 8 | Comanda | Exemple no quadrava, matching fràgil | Import corregit, matching robust, config unificada |
| 9 | Detalls | Imports, timezone, migració, tenant | Imports, Alembic, scoping per dependency |

---

## 1. Dates: `DateTime` vs `date`

**Problema.** `Reservation.check_in`/`check_out` eren `DateTime`, però el motor de
disponibilitat (`each_night`) i les columnes `Rate.date`/`Inventory.date`/`ReservationNight.date`
són `Date`. Si el client passa un datetime (encara que siga mitjanit), les comparacions
`Rate.date == night` fallen o fan *type coercion* inesperada.

**Correcció aplicada.**

- `Reservation.check_in`/`check_out` passen a `Date`.
- Al preàmbul de la secció 5 s'ha afegit una **convenció de temps** explícita:

> `check_in`/`check_out` d'estada i les dates de `Rate`/`Inventory`/`ReservationNight`
> són `Date` (sense hora). Els timestamps (`created_at`, `updated_at`, `posted_at`, etc.)
> són `DateTime(timezone=True)`. No barrejar mai un `date` d'estada amb un `datetime`.
> Els límits de nit s'avaluen pel `timezone` de la propietat (`Property.timezone`),
> mai pel fus local del servidor.

**Vigilància en picar codi.** Tots els serveis (`availability_service`, `reservation_service`)
han de rebre i treballar amb `date` per a les dates d'estada. La capa d'API (Pydantic) ha de
validar i convertir a `date` abans d'arribar al servei.

---

## 2. El motor de disponibilitat no validava tota la lògica

**Problema.** `search_availability()` només mirava `stop_sell` i `min_stay`. Ignorava:

- `Rate.closed_to_arrival` / `Rate.closed_to_departure` (tancat a entrada/sortida per dia).
- `RatePlan.max_stay` (i posava `min_stay` a `Rate`).
- `max_children` i `base_occupancy`.

**Correcció aplicada.** `search_availability()` ara:

- Filtra els tipus d'habitació i valida **ocupació** (`max_adults`, `max_children`) i
  **durada** (`min_stay`, `max_stay` del plan) en un helper `_check_restrictions()`.
- Per cada nit valida `stop_sell`, `closed_to_arrival` (a la nit d'entrada),
  `closed_to_departure` (a la nit anterior a la sortida) i el saldo d'inventari
  (`allotment + overbooking_allowed - sold - blocked`).

Això evita oferir habitacions que l'hotel ha tancat a l'entrada o a la sortida.

---

## 3. Sobreventa per concurrència (race TOCTOU)

**Problema.** `create_reservation()` incrementava `Inventory.sold` amb un
`UPDATE sold = sold + 1` sense cap bloqueig. Dos operaris o Ariadna creant reserves
alhora podien vendre la mateixa habitació, perquè el recompte de disponibilitat
(`search_availability`) i la reserva (`create_reservation`) no són atòmics.

**Correcció aplicada.** `create_reservation()` ara:

- Carrega cada fila d'inventari amb `SELECT ... FOR UPDATE` (`with_for_update()`).
- Recalcula el saldo *després* del lock i, si no queda disponibilitat, fa `db.rollback()`
  i llança error.
- Només llavors incrementa `sold`.

La transacció es manté oberta fins al `db.commit()` final, per la qual cosa els locks
es mantenen durant tota la creació de la reserva.

**Nota.** El `search_availability()` (cerca/cotització) **no** ha de fer lock; el lock
és responsabilitat exclusiva de l'escriptura que reserva. En un entorn d'alta concurrència,
considerar a més un **índex únic** o una *constraint* de sobreventa per evitar que dues
transaccions passin el check simultàniament sense serialitzar-les.

---

## 4. `min_stay`/`max_stay` al lloc equivocat

**Problema.** Estaven a `Rate` (una fila per dia), però són restriccions de **durada
d'estada** que pertanyen al plan de tarifa: es compleixen sobre tota l'estada, no per nit.
A més, el check `total_nights < rate.min_stay` es repetia innecessàriament dins del bucle.

**Correcció aplicada.**

- `min_stay` i `max_stay` s'han **mogut a `RatePlan`**.
- A `Rate` només queden les restriccions que tenen sentit per dia
  (`closed_to_arrival`, `closed_to_departure`, `stop_sell`).

---

## 5. VeriFactu — el risc de compliance més gran

**Problemes detectats.**

1. **IVA únic a tot el foli.** `iva_rate = Decimal("0.10")` hardcoded. Un foli d'hotel pot
   portar IVA mixt (habitatge 10%, restaurant i begudes alcohòliques 21%, etc.). Emetre una
   factura amb un únic IVA sobre el total **no és fiscalment correcte**.
2. **`verify_chain()` no podia verificar res.** A la línia que reconstruïa el payload hi havia
   un placeholder buit `{ /* reconstruct from stored fields */ }`, i el model **no guardava
   el payload complet** (només `payload_hash`). Sense el text canònic no es pot recomputar el hash.
3. **Numeració seqüencial no atòmica.** `generate_invoice_number()` estava referenciat però no
   definit, i `SEQ-AAAA-NNNNN` amb `SELECT MAX()+1` genera forats/duplicats sota concurrència.
4. **`float` en els càlculs** de diners.

**Correcció aplicada.**

- **`_build_vat_breakdown()`**: agrupa els `FolioItem` per `tax_rate`, calcula base i IVA
  de cada grup (l'`amount` es considera IVA inclòs). El desglossament es guarda a la columna
  `vat_breakdown` (JSON) i al `payload`.
- **Nova columna `payload` (Text)** amb el *canonical JSON complet*. `verify_chain()` recomputa
  `payload_hash` i el hash encadenat **des del text guardat**, i retorna el motiu exacte
  de la ruptura (`previous_hash_mismatch`, `payload_hash_mismatch`, `chain_hash_mismatch`).
- **Nou model `FiscalSequence`** (per propietat i any) amb `SELECT ... FOR UPDATE` per
  numerar de manera atòmica. També s'ha afegit a la llista de Fase 1.
- Tots els càlculs amb `Decimal`, i cada operació que emet factura comprova que el foli
  tinga saldo zero.

**Vigilància.** La regla del 10% d'IVA sobre l'habitatge s'ha de treure de codi dur i
configurar-la per propietat (o per línia), perquè pot variar segons el règim fiscal.
El desglossament per tipus d'IVA és imprescindible per a la factura.

---

## 6. Diners en `float` en lloc de `Decimal`

**Problema.** Els models són `Numeric(12,2)`, però els serveis convertien a `float`
(`sum(float(r.price) ...)`, `total += float(rate.price)`). En una aplicació de diners,
això provoca errors d'arrodoniment.

**Correcció aplicada.** `Decimal` a tota la capa de servei: disponibilitat, reserva i fiscal.
Els agregats es fan amb `Decimal("0")` com a valor inicial per evitar aritmètica mixta.

---

## 7. Foli lligat 1:1 a la reserva

**Problema.** `Folio.reservation_id` era `nullable=False` i `unique=True`. Això impedia
folis sense reserva: walk-ins sense reserva prèvia, guests de dia, lloguer d'espais,
comptes d'empresa.

**Correcció aplicada.**

- `reservation_id` passa a **`nullable` i no únic** (`ondelete="SET NULL"`).
- S'afegeixen `guest_id` (opcional) i un camp `kind`
  (`reservation` | `walk_in` | `company` | `misc`) per distingir l'origen del foli.
- Nou índex sobre `reservation_id` i `guest_id`.
- La relació `Reservation.folio` ja **no** és `delete-orphan`: si s'esborra la reserva,
  el foli queda deslligat. El mateix val per a la creació de reserves (el foli s'hi crea
  amb `kind="reservation"` i `guest_id`).

---

## 8. Integració Comanda → Estada (room charges)

**Problemes detectats.**

1. **L'exemple no quadrava.** `"amount": 45.50` però la suma dels items era 30,00.
2. **Matching per nom de guest fràgil.** `guest_name` + `room_number` sense normalitzar,
   i sense manejar múltiples guests a la mateixa habitació.
3. **Config inconsistent.** La capçalera deia `ESTADA_POS_API_KEY`, però la config
   (`POS_API_KEY`) i el doc de Comanda no coincidien.

**Correcció aplicada.**

- `"amount": 30.00` (correspon a la suma dels items de l'exemple).
- **Regla de matching robust**: criteri primari `room_number` + `status=checked_in`
  (i `property_id`, perquè el número d'habitació pot repetir-se entre hotels);
  `guest_name` només desambigüa si hi ha més d'una persona a la mateixa habitació,
  normalitzant accents/espais/majuscules. Es recomana que Comanda enviï `guest_id` o
  `folio_id`/`reservation_id` per eliminar l'ambigüitat.
- **Config unificada** a `POS_API_KEY` (es documenta que `ESTADA_POS_API_KEY` és un àlies).
- Cada línia del POS ha d'aportar `tax_rate` perquè VeriFactu pugui desglossar l'IVA.

---

## 9. Detalls menors

**Problemes i correcció.**

- **Imports trencats**: `reservation_service()` feia servir `each_night` i
  `generate_confirmation_code` sense importar-los. Ara els importa de
  `availability_service` i defineix `generate_confirmation_code()` al seu propi mòdul.
- **Migració**: substituït "`create_all` o Alembic" per **Alembic des del primer dia**.
- **Tenant scoping**: molts models només tenen `property_id` (no `tenant_id`). S'ha afegit
  a la secció 11 que l'scoping es resol a la capa d'API amb una **dependency FastAPI** que
  injecta `tenant_id`/`property_id` a totes les queries i les valida als PATCH/DELETE,
  perquè un usuari d'un tenant no accedeixi a dades d'un altre.
- **Timezones**: cobert per la convenció del punt 1 (dates d'estada en `Date`, límits de nit
  pel `timezone` de la propietat).

---

## Canvis de contracte que cal tenir en compte a l'API

Els canvis de model anteriors afecten la capa d'API:

| Model | Canvi de contracte |
|---|---|
| `Reservation` | `check_in`/`check_out` ara són `date` (no `datetime`) als schemas Pydantic. |
| `Rate` | Perd `min_stay`/`max_stay`. Aquests camps són a `RatePlan`. |
| `Folio` | `reservation_id` és opcional, nou `kind` i `guest_id`. Resposta de creació reforçada. |
| `FiscalRecord` | Nous camps `vat_breakdown`, `payload`. `iva_rate` desapareix del model (ara és per línia). |
| `GET /fiscal/chain/verify` | Resposta ampliada amb `reason` de la ruptura. |

---

_Revisió tècnica feta sobre `Estada_guia_implementacio.md`. La guia ja reflecteix
tots aquests canvis perquè Fase 1 es puga picar directament sobre un model correcte._
