# Sistema de Contractes d'Agències (Yield & Allotment Management)

> Document de sistema del mòdul de **Gestió de Contractes de Turoperació**
> d'Estada. Descriu el Contract Rules Engine: parametrització del contracte,
> auditoria automàtica de reserves i alliberament dinàmic de cupos.
>
> Data: 08/09/2026 | Autor: Maria | Estat: Fase 1 + Fase 2 implementades
> Referència: `Estada_guia_implementacio.md` §13.6

---

## 1. Objectiu

Auditar **cada reserva** contra les condicions contractuals signades amb una
agència de turoperació (Booking, Expedia, Agoda, turoperadors tradicionals...),
per garantir que:

- No es ven més del cupo (allotment) pactat.
- Es respecta la data de release (alliberament del cupo no venut).
- El preu aplicat quadra amb la tarifa pactada.
- Les reserves fora de vigència o sense contracte es rebutgen.

El mòdul es construeix en **4 fases** (vegeu §6). Actualment estan
implementades la **Fase 1** (parametrització) i la **Fase 2** (auditoria
automàtica).

---

## 2. Models de dades

### 2.1. `AgencyContract` — el contracte

| Camp | Tipus | Descripció |
|---|---|---|
| `id` | UUID | PK |
| `property_id` | UUID FK | Propietat (hotel) |
| `agency_name` | str | Nom de l'agència |
| `code` | str | Codi únic de l'agència (per property) |
| `start_date` | date | Inici de vigència |
| `end_date` | date | Fi de vigència |
| `guarantee_type` | str | `guaranteed` \| `free` (venda lliure) |
| `release_days` | int | Dies abans de l'arribada en què s'allibera el cupo |
| `commission` | Decimal | Comissió de l'agència |
| `cancellation_policy` | dict | Condicions d'anul·lació (JSON) |
| `active` | bool | Contracte actiu/inactiu |

### 2.2. `ContractAllotment` — el cupo

| Camp | Tipus | Descripció |
|---|---|---|
| `id` | UUID | PK |
| `contract_id` | UUID FK | Contracte al qual pertany |
| `room_type_id` | UUID FK | Tipus d'habitació |
| `date` | date | Nit concreta |
| `allotment` | int | Cupo total pactat |
| `sold` | int | Cupo venut (comptador) |
| `release_date` | date | Data d'alliberament del cupo no venut |
| `contracted_rate` | Decimal | Tarifa pactada per nit |
| `discount_pct` | Decimal | Descompte aplicat |

### 2.3. `Reservation.agency_code` — l'enllaç

La reserva porta un camp opcional `agency_code` que l'enllaça amb el contracte
de la seva agència. Si és `None`, la reserva no està subjecta a cap contracte
(no s'audita).

---

## 3. Contract Rules Engine (Fase 1)

Parametrització del contracte. Els camps de §2.1 i §2.2 cobreixen:

- **Cupos/Contingents** → `ContractAllotment.allotment` + `sold`.
- **Dies de Release** → `AgencyContract.release_days` + `ContractAllotment.release_date`.
- **Garantia** → `AgencyContract.guarantee_type` (`guaranteed` vs `free`).
- **Tarifes i Descomptes** → `ContractAllotment.contracted_rate` + `discount_pct`.
- **Condicions d'Anul·lació** → `AgencyContract.cancellation_policy` (JSON).

---

## 4. Automated Audit (Fase 2)

El servei `contract_service.audit_reservation(db, reservation)` valida una
reserva contra el contracte de la seva agència i retorna un
`ContractAuditResult` amb un dels **5 estats**:

| Estat | Significat | Quan es produeix |
|---|---|---|
| `ok` | La reserva compleix el contracte | Tot correcte |
| `on_request` | Cupo esgotat, però contracte garantit | `sold >= allotment` i `guarantee_type == "guaranteed"` |
| `rejected` | Cupo esgotat i venda lliure | `sold >= allotment` i `guarantee_type == "free"` |
| `released` | El cupo ja s'ha alliberat | `stay_date <= release_date` |
| `price_discrepancy` | El preu no quadra | `total_amount != contracted_rate` |

### 4.1. Flux d'auditoria

1. Si la reserva no té `agency_code` → `ok` (no aplica contracte).
2. Si el contracte no existeix o és inactiu → `rejected`.
3. Si la reserva cau fora de la vigència (`check_in`/`check_out` vs
   `start_date`/`end_date`) → `rejected`.
4. Per a **cada nit** de l'estada:
   - Si no hi ha cupo per a aquella nit → `rejected`.
   - Si la data de release ha passat → `released`.
   - Si el cupo està esgotat → `on_request` (garantit) o `rejected` (lliure).
   - Si la tarifa no quadra → `price_discrepancy`.

### 4.2. Resultat

```json
{
  "reservation_id": "…",
  "contract_id": "…",
  "agency_name": "Booking.com",
  "status": "price_discrepancy",
  "reason": "Discrepància de preu: pactat 120.00, aplicat 135.00",
  "contracted_rate": "120.00",
  "applied_rate": "135.00",
  "release_date": null
}
```

---

## 5. Alliberament dinàmic (Fase 3, parcial)

El servei `contract_service.release_allotments(db, property_id, as_of)`
allibera els cupos no venuts que han passat la data de release: marca
`allotment = 0` (el cupo torna a l'hotel) i retorna el nombre de cupos
alliberats.

> **Nota:** l'alliberament **dinàmic** (condicionat a l'ocupació alta) i els
> **Stop Sales** automàtics encara no estan implementats — són la resta de la
> Fase 3.

---

## 6. Fases i estat

| Fase | Descripció | Estat |
|---|---|---|
| 1 | Contract Rules Engine (parametrització) | ✅ Implementada |
| 2 | Automated Audit (validació a l'entrada) | ✅ Implementada |
| 3 | Yield & Allotment Control (alliberament dinàmic, stop sales) | 🟡 Parcial (només `release_allotments`) |
| 4 | Auditoria de liquidació i facturació | ⬜ Pendent |

---

## 7. API

Prefix: `/api/v1/contracts`

| Mètode | Ruta | RBAC | Descripció |
|---|---|---|---|
| `GET` | `/` | — | Llista contractes (filtre `propertyId`) |
| `POST` | `/` | owner, admin, manager | Crea contracte (+ cupos) |
| `GET` | `/{id}` | — | Detall d'un contracte |
| `PATCH` | `/{id}` | owner, admin, manager | Actualitza contracte |
| `DELETE` | `/{id}` | owner, admin | Elimina contracte |
| `POST` | `/{id}/allotments` | owner, admin, manager | Afegeix/actualitza cupo (idempotent) |
| `POST` | `/audit/{reservation_id}` | owner, admin, manager, reception | Audita una reserva |
| `POST` | `/release` | owner, admin, manager | Allibera cupos vençuts |

---

## 8. Idempotència i integritat

- **Codi únic:** `(property_id, code)` únic — no es poden crear dos contractes
  amb el mateix codi per a la mateixa propietat (HTTP 409).
- **Cupo idempotent:** `POST /{id}/allotments` actualitza el cupo existent per a
  `(contract_id, room_type_id, date)` en lloc de duplicar-lo.
- **`tenant_id` derivat de l'usuari autenticat** (no del payload) — tanca el
  forat de seguretat de crear contractes en propietats alienes.
