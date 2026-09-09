# Sistema de cobrament i liquidació de factures d'agències a Estada

> Document de disseny del sistema per cobrar i liquidar les factures de les
> agències (OTAs com Booking/Expedia, o agències tradicionals) a Estada (PMS).
> Decisió d'en Tomeu (08/09/2026). Font de veritat: Drive (carpeta Projectes).

---

## 1. Visió general

El sistema de cobrament i liquidació de factures d'agències a Estada es basa
en **3 tecnologies** (Plataformes de Cobraments Integrades amb Processament
Automàtic de Targetes Virtuals (VCC) i Motor de Reconciliació B2B per IA):

1. **Cobrament automàtic de Targetes Virtuals (VCC Automated Processing)**.
2. **Conciliació bancària automàtica (Auto-Reconciliation Engine)**.
3. **Gestió de comissions i Net/Gross automatic settlement**.

---

## 2. Fase 1 — Cobrament automàtic de Targetes Virtuals (VCC)

### Com funciona
- Quan les agències (Booking, Expedia, Agoda) usen el model **Merchant** (el
  client paga a l'agència i l'agència paga a l'hotel), envien una **Targeta de
  Crèdit Virtual (VCC)** amb l'import exacte i una data d'activació (normalment
  el dia d'entrada o sortida).
- El PMS integra la **passarel·la de pagament nativa** (Adyen, Stripe) i la
  connexió amb el **Channel Manager**.
- Quan arriba el moment d'activació, el PMS demana el cobrament de manera
  **100% automàtica i en l'ombra**, sense intervenció humana.
- **Control d'imports**: la passarel·la valida que l'import de la targeta
  coincideixi exactament amb la **tarifa neta negociada** abans d'executar el càrrec.

### Avantatges
- **Zero descuits**: s'elimina el risc que caduqui una targeta virtual sense cobrar-la.
- Estalvi de temps: el departament financer només supervisa.

### Requisits
- [ ] Integració amb passarel·la de pagament (Adyen/Stripe).
- [ ] Connexió amb el Channel Manager per rebre les VCC.
- [ ] Lògica d'activació automàtica (data d'entrada/sortida).
- [ ] Validació de l'import (tarifa neta negociada).

---

## 3. Fase 2 — Conciliació bancària automàtica (Auto-Reconciliation)

### Com funciona
- Per a agències que paguen per **transferència bancària en massa** (turoperadors
  o agències tradicionals que paguen paquets de reserves a 30 dies).
- El PMS usa **algorismes d'IA** per al creuament de pagaments connectats a la
  **banca oberta (Open Banking)**.
- **Lectura de justificants**: llegint els extractes bancaris o els fitxers de
  liquidació (remittance advice) que envia l'agència en PDF o Excel, la IA
  identifica les referències de les reserves, desglossa el pagament global i
  paga automàticament cada factura i folio associat dins del PMS.

### Avantatges
- Elimina el creuament manual de transferències.
- Redueix errors.

### Requisits
- [ ] Integració amb Open Banking (banca oberta).
- [ ] Agent d'IA per llegir extractes/fitxers de liquidació (OCR + parsing).
- [ ] Lògica de creuament de pagaments amb reserves/folios.

---

## 4. Fase 3 — Gestió de comissions i Net/Gross automatic settlement

### Com funciona
- El sistema calcula i liquida en temps real la diferència entre el preu
  **Brut** (el que paga el client) i el preu **Net** (el que rep l'hotel
  descomptant la comissió de l'agència).
- **Facturació automàtica**: quan el pagament de l'agència s'efectua, el PMS
  genera automàticament la factura rectificativa o el tancament de despeses per
  la comissió corresponent i l'envia directament al sistema comptable (ERP) de
  l'hotel, deixant la compta d'Explotació i Balanç actualitzada al moment.

### Avantatges
- **Control d'ajustador i desviació**: si l'agència aplica un descompte no
  autoritzat o una comissió errònia, el sistema ho detecta a l'instant i genera
  un avís de discordança (discrepancy alert).

### Requisits
- [ ] Càlcul de comissions (brut/net).
- [ ] Generació automàtica de factures rectificatives.
- [ ] Integració amb l'ERP de l'hotel.
- [ ] Detecció de discrepàncies (descomptes/comissions no autoritzades).

---

## 5. Comparativa: mètode tradicional vs. nova generació

| Aspecte | Mètode tradicional | Nova generació |
|---|---|---|
| **Cobrament VCC** | Manual (TPV física, una a una) | Automàtic (passarel·la, en l'ombra) |
| **Risc de targeta caducada** | Alt | Zero |
| **Conciliació bancària** | Manual (creuament línia per línia) | IA (Open Banking + lectura de justificants) |
| **Comissions** | Càlcul manual | Automàtic (brut/net) + factura rectificativa |
| **Discrepàncies** | Detecció tardana | Avis instantani (discrepancy alert) |
| **Temps del departament financer** | Hores | Supervisió d'informes |

---

## 6. Ordre d'implementació

1. **Fase 1 (VCC)** — prioritat alta, elimina el risc de targetes caducades.
2. **Fase 2 (Conciliació bancària)** — quan hi hagi agències que paguen per transferència.
3. **Fase 3 (Comissions/Net-Gross)** — el diferencial, es construeix a sobre.

---

## 7. Decisions

- **08/09/2026**: Sistema de cobrament i liquidació de factures d'agències = 3 fases (VCC, Conciliació bancària, Comissions/Net-Gross).
- **08/09/2026**: Començar per la Fase 1 (VCC), que elimina el risc de targetes caducades.
