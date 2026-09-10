# 🧪 Guió de prova manual — Recorregut complet d'Estada

> **Objectiu:** recórrer de cap a cap el flux operatiu d'un hotel (reserva → check-in → folio/càrrecs → check-out → tancament → night audit → facturació → informes) per detectar **fallades i millores**.
>
> **Data de referència:** 2026-09-10 · **Backend:** `http://localhost:8001` (port 8001)
> **Autenticació:** `admin@estada.local` / `cambia-esta-contrasenya`

⚠️ **Important abans de començar:** aquest guió està pensat per executar-se **per l'API (curl)**, que és el backend "enllestit". El frontend de na Flavia encara està en construcció, així que moltes d'aquestes accions no tenen pantalla connectada encara. A cada pas t'indicaré què hauries de veure a la pantalla corresponent quan el frontend estigui fet.

---

## 0. Preparació (copiar-enganxar un sol cop)

```bash
export BASE=http://localhost:8001

# IDs del teu entorn (canvien si fas un seed nou)
export PID=aeb3dbf3-8f3a-48f9-a380-0a07c3498b2f   # property "Estada"
export STD=665e28bf-6b88-486b-b1fb-87b43e2fe48c   # tipus d'habitació STD
export DLX=976b2e9d-6a3e-4483-b13a-663b7ff324be   # tipus DLX
export BAR=a6738f2a-a028-4c5c-9c5a-964da34288c3   # tarifa BAR
export R101=0cba7aa1-5e77-4dfe-bfee-896671748f7b  # habitació 101
export R102=f6d6fb7f-a1a8-4035-8e67-79304f06d602  # habitació 102
export G1=c8ae8f57-738b-40c1-8e50-cbe7bb55885d     # guest "Juan Pérez"

# Dates dinàmiques (perquè el guió funcioni qualsevol dia)
export T=$(date +%F)                 # avui
export CIN=$(date -d "+1 day" +%F)   # demà
export COUT=$(date -d "+3 days" +%F) # d'aquí 3 dies

# Ajudant per llegir JSON
jget() { python3 -c "import sys,json;print(json.load(sys.stdin).get('$1',''))"; }
```

---

## FASE 0 — Login i exploració

### Pas 0.1 · Login
```bash
curl -s -X POST $BASE/api/v1/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@estada.local","password":"cambia-esta-contrasenya"}'
```
**Esperat:** JSON amb `access_token` i `refresh_token`.
```bash
export TOKEN=$(curl -s -X POST $BASE/api/v1/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@estada.local","password":"cambia-esta-contrasenya"}' | jget access_token)
echo $TOKEN   # ha de ser un token llarg (JWT)
```

### Pas 0.2 · Qui soc?
```bash
curl -s $BASE/api/v1/auth/me -H "Authorization: Bearer $TOKEN"
```
**Esperat:** el teu usuari (`Administrador`, rol `owner`).

### Pas 0.3 · Llista de reserves (SENSE token, a propòsit)
```bash
curl -s "$BASE/api/v1/reservations?propertyId=$PID"
```
**Esperat:** la llista de les 45 reserves de prova.
> 🚨 **Primera fallada (seguretat):** fixa't que aquest endpoint **no demana token** i retorna les dades igualment. Ni reserves, ni folios, ni guests, ni informes demanen autenticació. Només ho fan `night-audit`, `users` i `contracts`. Qualsevol amb accés a la xarxa pot operar el PMS. **Això ho has de veure amb els teus ulls: tot aquest guió, excepte el night audit, funciona sense cap token.**

---

## FASE 1 — Cotització i creació de reserva

### Pas 1.1 · Cotitzar disponibilitat i preu (primer intent: fallarà)
```bash
curl -s -X POST $BASE/api/v1/reservations/quote -H "Content-Type: application/json" \
  -d "{\"property_id\":\"$PID\",\"check_in\":\"$CIN\",\"check_out\":\"$COUT\",\"adults\":2,\"children\":0,\"rate_plan_id\":\"$BAR\"}"
```
> 🚨 **Fallada (inventari buit):** retorna `[]` (buit). El motiu: el seed ha carregat **180 tarifes** (`Rate`) però **0 registres d'inventari** (`Inventory`). La cotització exigeix que cada nit tingui inventari (disponibilitat), i sense inventari no hi ha res disponible. **El seed no carrega inventari.**

### Pas 1.2 · Carregar inventari (disponibilitat) per poder cotitzar
```bash
for d in 1 2; do
  D=$(date -d "+$d days" +%F)
  curl -s -X POST $BASE/api/v1/inventory/bulk-upsert -H "Content-Type: application/json" \
    -d "{\"room_type_id\":\"$STD\",\"inventory\":[{\"date\":\"$D\",\"allotment\":10,\"sold\":0,\"blocked\":0,\"overbooking_allowed\":2}]}" > /dev/null
  curl -s -X POST $BASE/api/v1/inventory/bulk-upsert -H "Content-Type: application/json" \
    -d "{\"room_type_id\":\"$DLX\",\"inventory\":[{\"date\":\"$D\",\"allotment\":5,\"sold\":0,\"blocked\":0,\"overbooking_allowed\":1}]}" > /dev/null
done
echo "Inventari carregat per a STD i DLX ($CIN → $COUT)"
```

### Pas 1.3 · Cotitzar de nou (ara sí que respon)
```bash
curl -s -X POST $BASE/api/v1/reservations/quote -H "Content-Type: application/json" \
  -d "{\"property_id\":\"$PID\",\"check_in\":\"$CIN\",\"check_out\":\"$COUT\",\"adults\":2,\"children\":0,\"rate_plan_id\":\"$BAR\"}"
```
**Esperat:** ara sí, una llista amb `STD` i `DLX` disponibles, amb `total_price` i el desglossament per nit.
> 📌 Anota el preu de `STD`. Ho faràs servir per comparar al pas 1.4.

### Pas 1.4 · Crear una reserva nova
```bash
curl -s -X POST $BASE/api/v1/reservations -H "Content-Type: application/json" \
  -d "{\"property_id\":\"$PID\",\"guest_id\":\"$G1\",\"room_type_id\":\"$STD\",\"rate_plan_id\":\"$BAR\",\"confirmation_code\":\"MANUAL-001\",\"check_in\":\"$T\",\"check_out\":\"$COUT\",\"adults\":2,\"children\":0,\"status\":\"confirmed\",\"source\":\"direct_web\"}"
```
**Esperat:** JSON de la reserva creada amb estat `confirmed`.
```bash
export RID=$(curl -s -X POST $BASE/api/v1/reservations -H "Content-Type: application/json" \
  -d "{\"property_id\":\"$PID\",\"guest_id\":\"$G1\",\"room_type_id\":\"$STD\",\"rate_plan_id\":\"$BAR\",\"confirmation_code\":\"MANUAL-001\",\"check_in\":\"$T\",\"check_out\":\"$COUT\",\"adults\":2,\"children\":0,\"status\":\"confirmed\",\"source\":\"direct_web\"}" | jget id)
echo "Nova reserva: $RID"
```

### Pas 1.5 · Inspeccionar les nits de la reserva (a la BD)
```bash
cd /mnt/d/projectes/Estada/backend && .venv/bin/python -c "
from app.database import SessionLocal
from app.models.models import ReservationNight
import os
db=SessionLocal(); rid=os.environ['RID']
for n in db.query(ReservationNight).filter_by(reservation_id=rid).all():
    print(n.date, 'base_rate=', n.base_rate, 'amount=', n.amount, 'taxes=', n.taxes)
db.close()"
```
> 🚨 **Fallada (pricing):** totes les nits tenen `base_rate=0`, `amount=0`, `taxes=0`. El preu que et va donar la cotització (pas 1.3) **no s'aplica en crear la reserva**. Conseqüència: quan es faci el night audit, aquestes nits es postaran a 0 € (estada gratuïta). El preu de la cotització i la reserva estan **desconnectats**.

### Pas 1.6 · Comprovar si la reserva té folio
```bash
cd /mnt/d/projectes/Estada/backend && .venv/bin/python -c "
from app.database import SessionLocal
from app.models.models import Folio
import os
db=SessionLocal(); rid=os.environ['RID']
f=db.query(Folio).filter_by(reservation_id=rid).first()
print('Folio:', f.id if f else 'NO EXISTEIX')
db.close()"
```
> 🚨 **Fallada (folio):** la reserva creada per API **no té folio**. No hi ha cap endpoint per crear-lo (`POST /folios` no existeix). Un folio només es crea: (a) al seed, (b) al night audit quan es posta una nit, o (c) quan arriba un room-charge des de Comanda. Sense folio no es pot cobrar res fins que es faci un night audit — i això és un problema greu per al flux real de check-in.

---

## FASE 2 — Check-in

### Pas 2.1 · Assignar habitació
```bash
curl -s -X POST $BASE/api/v1/reservations/$RID/assign-room -H "Content-Type: application/json" \
  -d "{\"room_id\":\"$R101\"}"
```
**Esperat:** `{"message":"Habitación asignada"}`.

### Pas 2.2 · Assignar la MATEIXA habitació a una altra reserva (prova de disponibilitat)
```bash
# agafa qualsevol altra reserva confirmed, p. ex. CONF-2027
export RID2=9fa438bf-ea73-4cd6-a690-9cb14613bfd4
curl -s -X POST $BASE/api/v1/reservations/$RID2/assign-room -H "Content-Type: application/json" \
  -d "{\"room_id\":\"$R101\"}"
```
> 🚨 **Fallada (disponibilitat):** no hi ha cap control. **La mateixa habitació 101 queda assignada a dues reserves diferents** a la mateixa nit. No es valida ni que l'habitació existeixi, ni que estigui lliure, ni els estats (es pot assignar habitació a una reserva cancel·lada o de cotització).

### Pas 2.3 · Fer el check-in
```bash
curl -s -X POST $BASE/api/v1/reservations/$RID/check-in
```
**Esperat:** `{"message":"Check-in realizado"}`.
```bash
curl -s "$BASE/api/v1/reservations/$RID" | jget status   # ha de dir checked_in
```
> 🚨 **Fallada (check-in incomplet):** el check-in **només canvia l'estat** a `checked_in`. NO crea el folio, NO valida que hi hagi habitació assignada, NO valida l'estat previ (pots fer check-in d'una reserva cancel·lada o d'una cotització). Torna a mirar el pas 1.6: la reserva continua **sense folio** després del check-in.

### Pas 2.4 · Provar de fer un càrrec a un folio inexistent
```bash
curl -s -X POST $BASE/api/v1/folios/00000000-0000-0000-0000-000000000000/charges \
  -H "Content-Type: application/json" \
  -d '{"folio_id":"00000000-0000-0000-0000-000000000000","type":"charge","description":"minibar","quantity":1,"unit_price":5}'
```
**Esperat:** `404 Folio no encontrado`.
> 📌 Aquest és el problema: per una reserva creada per l'usuari (no pel seed), **no pots cobrar res** fins al night audit. Això ho hem de resoldre abans de posar-ho en producció.

---

## FASE 3 — Folio: càrrecs, descomptes i pagaments

Aquí fem servir una reserva del seed que **ja té folio** (perquè el seed el crea), per veure el flux de facturació "de veritat".

```bash
# Reserva checked_in CONF-2010, surt demà (check-out 2026-09-11)
export FOLIO=9f613f24-41c7-4569-b230-235961b92e4a
export RES=632f5630-1170-4ad9-b069-5af8e635d798
```

### Pas 3.1 · Veure el folio
```bash
curl -s $BASE/api/v1/folios/$FOLIO
```
**Esperat:** folio amb `total_amount=720.00`, `balance=720.00`, estat `open`.

### Pas 3.2 · Afegir un càrrec (minibar)
```bash
curl -s -X POST $BASE/api/v1/folios/$FOLIO/charges -H "Content-Type: application/json" \
  -d '{"folio_id":"'$FOLIO'","type":"charge","description":"Minibar","quantity":2,"unit_price":12.5,"tax_rate":21}'
```
**Esperat:** item de `25.00` (2 × 12.50).
> 🚨 **Fallada (IVA):** fixa't que has enviat `tax_rate:21` (IVA 21%) però el càrrec **ignora el camp** — l'import és només `2 × 12.50 = 25.00`, sense impostos. No hi ha càlcul d'IVA enlloc.

### Pas 3.3 · Afegir un descompte
```bash
curl -s -X POST $BASE/api/v1/folios/$FOLIO/discounts -H "Content-Type: application/json" \
  -d '{"folio_id":"'$FOLIO'","description":"Descompte benvinguda","amount":20}'
```
**Esperat:** item de `-20.00`. El `balance` del folio baixa en 20.

### Pas 3.4 · Afegir un pagament
```bash
curl -s -X POST $BASE/api/v1/folios/$FOLIO/payments -H "Content-Type: application/json" \
  -d '{"folio_id":"'$FOLIO'","provider":"stripe","method":"card","amount":100,"currency":"EUR"}'
```
**Esperat:** pagament `captured` de 100 €. El `paid_amount` puja, el `balance` baixa.

### Pas 3.5 · Pagar MÉS del que toca (sobrepagament)
```bash
curl -s -X POST $BASE/api/v1/folios/$FOLIO/payments -H "Content-Type: application/json" \
  -d '{"folio_id":"'$FOLIO'","provider":"stripe","method":"card","amount":99999,"currency":"EUR"}'
```
> 🚨 **Fallada (sobrepagament):** s'accepta un pagament de 99.999 € a un folio que en devia ~700. El `balance` queda **negatiu** (el client ha pagat de més) sense cap avís ni control. No hi ha validació d'import ni de saldo.

### Pas 3.6 · Reemborsament (refund)
```bash
curl -s -X POST $BASE/api/v1/folios/$FOLIO/refunds -H "Content-Type: application/json" \
  -d '{"payment_id":"00000000-0000-0000-0000-000000000000","amount":50,"reason":"error càrrec"}'
```
> 🚨 **Fallada (refund desvinculat):** has passat un `payment_id` que no existeix, però el refund **l'ignora** i crea un reemborsament de 50 € igualment. No es vincula al pagament original, ni es comprova que el pagament existís.

---

## FASE 4 — Check-out

### Pas 4.1 · Fer el check-out de la reserva checked_in
```bash
curl -s -X POST $BASE/api/v1/reservations/$RES/check-out
```
**Esperat:** `{"message":"Check-out realizado"}`.
```bash
curl -s "$BASE/api/v1/reservations/$RES" | jget status   # ha de dir checked_out
```

### Pas 4.2 · Mirar si el folio s'ha tancat
```bash
curl -s $BASE/api/v1/folios/$FOLIO | jget status   # hauria de dir closed
```
> 🚨 **Fallada (check-out incomplet):** el check-out **només canvia l'estat** de la reserva. El folio continua **obert** (amb el saldo que tingui). En un PMS real, el check-out hauria de (a) tancar el folio si el saldo és zero, o (b) bloquejar la sortida si hi ha saldo pendent. Aquí no fa ni una cosa ni l'altra. De fet, pots fer check-out de qualsevol reserva en qualsevol estat, fins i tot una que no ha fet mai check-in.

---

## FASE 5 — Tancament de folio

### Pas 5.1 · Tancar el folio (amb saldo pendent, a propòsit)
```bash
curl -s -X POST $BASE/api/v1/folios/$FOLIO/close
```
**Esperat:** `400 "El folio no tiene saldo cero"` (perquè encara té saldo).
> ✅ Aquesta validació SÍ que existeix. Bé.

### Pas 5.2 · Saldar i tancar
```bash
# mira el balance actual
BAL=$(curl -s $BASE/api/v1/folios/$FOLIO | jget balance)
echo "Saldo pendent: $BAL"
# paga exactament el saldo
curl -s -X POST $BASE/api/v1/folios/$FOLIO/payments -H "Content-Type: application/json" \
  -d "{\"folio_id\":\"$FOLIO\",\"provider\":\"stripe\",\"method\":\"card\",\"amount\":$BAL,\"currency\":\"EUR\"}"
# ara sí que es pot tancar
curl -s -X POST $BASE/api/v1/folios/$FOLIO/close
```
**Esperat:** folio amb `status=closed`.
> 🚨 **Fallada (factura desconnectada):** el folio es tanca, però **NO es genera cap factura ni registre fiscal**. Tancar un folio hauria de disparar l'emissió de la factura VeriFactu. Aquí no passa res.

---

## FASE 6 — Night audit (tancament de caixa)

Aquest sí que demana autenticació.

### Pas 6.1 · Provar SENSE token (ha de fallar)
```bash
curl -s -X POST $BASE/api/v1/night-audit/run -H "Content-Type: application/json" \
  -d "{\"property_id\":\"$PID\",\"audit_date\":\"$T\"}"
```
**Esperat:** `401` (no autenticat).
> ✅ Aquest endpoint SÍ que està protegit. (La ironia: és l'únic dels importants que ho està.)

### Pas 6.2 · Llançar el night audit AMB token
```bash
curl -s -X POST $BASE/api/v1/night-audit/run -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"property_id\":\"$PID\",\"audit_date\":\"$T\"}"
```
**Esperat:** JSON amb el `summary` del tancament: `rooms_occupied`, `occupancy_pct`, `arrivals`, `departures`, `nights_posted`, `room_revenue`, `folios_closed`, `payments_total`, etc.
> 📌 Aquí és on es veu la conseqüència de la fallada de pricing: `room_revenue` i `total_revenue` seran **0 o molt baixos**, perquè les nits de les reserves creades per API es van postar a 0 €. Les úniques que aporten ingrés són les del seed (que sí que tenen preu).

### Pas 6.3 · Mirar el llistat de tancaments
```bash
curl -s "$BASE/api/v1/night-audit?propertyId=$PID" -H "Authorization: Bearer $TOKEN"
```

---

## FASE 7 — Facturació (VeriFactu)

### Pas 7.1 · Llistar registres fiscals
```bash
curl -s "$BASE/api/v1/fiscal/records?propertyId=$PID"
```
> 🚨 **Fallada (facturació desconnectada):** retorna **una llista buida**. No hi ha cap endpoint per **emetre** una factura/registre fiscal (`POST /fiscal/...` no existeix). El servei que crea el registre (`fiscal_service.create_fiscal_record`) existeix al codi, però **cap endpoint el crida**. Per tant, no es pot facturar res via API.

### Pas 7.2 · Verificar la cadena de hash
```bash
curl -s "$BASE/api/v1/fiscal/chain/verify?propertyId=$PID"
```
> 📌 Retornarà `{"valid": true, ...}` però amb **0 registres** a la cadena. La cadena està "vàlida" perquè no hi ha res a validar. Això vol dir que el mòdul VeriFactu és un **esquelet sense connectar** al flux de tancament de folio ni de check-out.

---

## FASE 8 — Informes

### Pas 8.1 · Ocupació
```bash
curl -s "$BASE/api/v1/reports/occupancy?propertyId=$PID&from=$(date -d '-7 days' +%F)&to=$(date -d '+7 days' +%F)"
```

### Pas 8.2 · Ingressos
```bash
curl -s "$BASE/api/v1/reports/revenue?propertyId=$PID&from=$(date -d '-7 days' +%F)&to=$(date -d '+7 days' +%F)"
```
> 📌 Els ingressos reflectiran el mateix problema: les reserves creades per API aporten 0 € perquè les seves nits no tenen preu.

### Pas 8.3 · ADR, RevPAR
```bash
curl -s "$BASE/api/v1/reports/adr?propertyId=$PID&from=$(date -d '-7 days' +%F)&to=$(date -d '+7 days' +%F)"
curl -s "$BASE/api/v1/reports/revpar?propertyId=$PID&from=$(date -d '-7 days' +%F)&to=$(date -d '+7 days' +%F)"
```

### Pas 8.4 · Arribades i sortides del dia
```bash
curl -s "$BASE/api/v1/reports/front-desk/arrivals?date=$CIN"
curl -s "$BASE/api/v1/reports/front-desk/departures?date=$CIN"
```
**Esperat:** les reserves amb check-in/check-out en aquella data.

---

## FASE 9 — Housekeeping (neteja)

### Pas 9.1 · Llistar tasques
```bash
curl -s "$BASE/api/v1/housekeeping"
```
### Pas 9.2 · Crear una tasca
```bash
curl -s -X POST $BASE/api/v1/housekeeping -H "Content-Type: application/json" \
  -d '{"room_id":"'$R101'","task_type":"cleaning","status":"pending","assigned_to":null,"notes":"neteja sortida"}'
```
**Esperat:** la tasca creada.

### Pas 9.3 · Completar la tasca
```bash
# substitueix <TASK_ID> per l'id retornat al pas anterior
curl -s -X POST $BASE/api/v1/housekeeping/<TASK_ID>/complete
```

---

## 📋 Resum de fallades detectades

| # | Severitat | Fallada | On |
|---|-----------|---------|-----|
| 1 | 🔴 Crítica | **Sense autenticació**: reserves, folios, guests, informes, housekeeping… són públics. Només night-audit/users/contracts demanen token. | gairebé tot |
| 2 | 🔴 Crítica | **Facturació VeriFactu desconnectada**: cap endpoint emet factura/registre fiscal. La cadena de hash és buida. | Fase 7 |
| 3 | 🟠 Alta | **Check-in només canvia estat**: no crea folio, no assigna habitació, no valida res. | Fase 2 |
| 4 | 🟠 Alta | **Check-out només canvia estat**: no tanca folio ni factura, no valida saldo. | Fase 4 |
| 5 | 🟠 Alta | **Pricing desconnectat**: la reserva es crea amb nits a 0 €; el preu de la cotització no s'aplica. | Fase 1 |
| 6 | 🟠 Alta | **No hi ha endpoint per crear folio**: reserva per API no té folio fins al night audit. | Fase 1 |
| 7 | 🟠 Alta | **assign/change-room no validen disponibilitat**: es pot doble-assignar la mateixa habitació. | Fase 2 |
| 8 | 🟠 Alta | **Tancar folio no genera factura**. | Fase 5 |
| 9 | 🟡 Mitjana | **IVA ignorat**: el camp `tax_rate` dels càrrecs no es calcula ni es guarda. | Fase 3 |
| 10 | 🟡 Mitjana | **Refund desvinculat**: el `payment_id` del refund s'ignora. | Fase 3 |
| 11 | 🟡 Mitjana | **Sobrepagament permès**: es pot pagar més del saldo (balance negatiu). | Fase 3 |
| 12 | 🟡 Mitjana | **No es valida folio obert**: es poden afegir càrrecs/pagaments a folis tancats. | Fase 3 |
| 13 | 🟡 Baixa | `assign-room` amb UUID invàlid dona error 500 (no 422). | Fase 2 |
| 14 | 🟠 Alta | **El seed no carrega inventari** (`Inventory`): sense disponibilitat la cotització retorna buit. | Fase 1 |

---

## 🛠️ Millores proposades (ordre de prioritat)

1. **Autenticació global**: afegir un `Depends(get_current_user)` a tots els routers (o un middleware d'auth), amb RBAC per rol. És la fallada més greu.
2. **Connectar la facturació**: crear `POST /fiscal/records` (o fer que `close_folio` i el check-out cridin `fiscal_service.create_fiscal_record`) perquè cada tancament de folio emeti el registre VeriFactu i la cadena de hash es vagi formant.
3. **Check-in complet**: que el check-in creï el folio si no existeix, validi l'estat (`confirmed` → `checked_in`) i exigeixi habitació assignada.
4. **Check-out complet**: que validi saldo del folio (bloquejar sortida amb deute), tanqui el folio si saldo = 0 i dispari la factura.
5. **Pricing**: que `create_reservation` calculi el preu de cada nit (via `search_availability`/rate engine) en lloc de deixar-ho a 0, i ho guardi a les `ReservationNight`.
6. **Validació de disponibilitat** a `assign-room`/`change-room` (habitació lliure, sense doble assignació) i gestió d'errors (422 en lloc de 500).
7. **IVA**: calcular l'impost als càrrecs (tipus d'IVA per producte/servei) i guardar-lo a cada `FolioItem`.
8. **Refunds i sobrepagaments**: vincular el refund al pagament original, i validar que el pagament no excedeixi el saldo.
9. **Validar estat del folio**: bloquejar càrrecs/pagaments sobre folis tancats.
10. **Endpoint de folio per reserva**: `GET /reservations/{id}/folio` per no haver de consultar la BD directament.
11. **Seed d'inventari**: que el `seed_demo.py`/`seed_reservations.py` també carreguin `Inventory` (disponibilitat), no només `Rate`, perquè la cotització pugui respondre.

---

*Generat per Maria (2026-09-10) a partir del manual d'usuari i del codi real del backend.*
