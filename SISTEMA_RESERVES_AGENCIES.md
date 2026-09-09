# Sistema de càrrega de reserves d'agències a Estada

> Document de disseny del sistema per carregar les reserves de les agències
> (OTAs, GDS o agències tradicionals) a Estada (PMS).
> Decisió d'en Tomeu (08/09/2026). Font de veritat: Drive (carpeta Projectes).

---

## 1. Visió general

El sistema de càrrega de reserves d'agències a Estada es basa en **3 fases**,
seguint les tecnologies més avançades (Open API basada en events, IA generativa
i PMS agentic):

1. **Webhooks (Event-Driven Open APIs)** — per a OTAs i Channel Managers.
2. **Parseig intel·ligent (OCR/IA)** — per a agències tradicionals (PDF, email, bons).
3. **Processament agentic** — gestió d'observacions, duplicats i frau.

---

## 2. Fase 1 — Webhooks (el nucli)

### Com funciona
- Estada exposa un **endpoint de webhook**: `POST /integrations/ota/webhook`.
- El **Channel Manager** (o l'OTA) envia un **event instantani** (en mil·lisegons) quan entra una reserva.
- Estada crea la reserva **en temps real**.
- **Sincronització de disponibilitat** bidireccional → elimina gairebé el 100% del risc d'overbooking.

### Avantatges
- Sincronització en temps real.
- Elimina el polling (el sistema no ha de preguntar periòdicament).
- Encaixa amb el patró d'integracions que ja tenim (Comanda→Estada, Ariadna→Estada).

### Requisits
- [ ] Endpoint `POST /integrations/ota/webhook` a Estada.
- [ ] Autenticació per API key (header `X-API-Key`).
- [ ] Idempotència per `external_id` (no duplicar reserves).
- [ ] Mapatge de camps OTA → model de reserva d'Estada.

---

## 3. Fase 2 — Parseig intel·ligent (OCR/IA)

### Com funciona
- Per a agències tradicionals que envien **PDF, emails o bons en paper** (sense API estàndard).
- Un **agent d'IA** (na Gemma4 o un model) llegeix el correu o adjunt.
- **Extreu les dades estructurades**: dates, tipus d'habitació, règim, tarifa, peticions especials.
- Les **volca a Estada via API** (endpoint de reserves).

### Avantatges
- Elimina l'entrada manual de dades d'agències tradicionals o de grup.
- Redueix errors.

### Requisits
- [ ] Integració amb email (IMAP/Gmail API) per rebre els correus.
- [ ] Agent d'IA per extreure les dades (OCR + parsing).
- [ ] Endpoint de reserves d'Estada per volcar les dades.

---

## 4. Fase 3 — Processament agentic (el valor afegit)

### Com funciona
- No només carrega la reserva, sinó que la **processa de manera autònoma**.

### 4.1. Gestió d'observacions
- La IA analitza els comentaris del bono de l'agència (ex. "alergia al gluten", "llegada de madrugada").
- **Assigna la tasca automàticament** a recepció o housekeeping, sense intervenció humana.

### 4.2. Detecció de duplicats i frau
- La IA **audita la reserva** al entrar:
  - Comprova que les dades del client coincideixen amb l'historial previ.
  - Valida la passarel·la de pagament o la targeta de garantia abans de l'arribada.

### Requisits
- [ ] Agent d'IA per processar observacions i assignar tasques.
- [ ] Lògica de detecció de duplicats (per nom, email, telèfon, dates).
- [ ] Validació de targetes de garantia.

---

## 5. Comparativa: mètodes tradicionals vs. nova generació

| Aspecte | Mètode tradicional | Nova generació |
|---|---|---|
| **Sincronització** | Polling (pregunta periòdica) | Webhooks (event instantani) |
| **Risc d'overbooking** | Alt (desincronització) | Gairebé nul (temps real) |
| **Agències tradicionals** | Entrada manual de dades | OCR/IA (parseig automàtic) |
| **Observacions** | Gestió manual | Agentic (assignació automàtica) |
| **Duplicats/frau** | Revisió manual | IA (auditoria automàtica) |

---

## 6. Ordre d'implementació

1. **Fase 1 (Webhooks)** — prioritat alta, desbloqueja el valor més gran (overbooking).
2. **Fase 2 (OCR/IA)** — quan hi hagi agències tradicionals reals.
3. **Fase 3 (Agentic)** — el diferencial, es construeix a sobre.

---

## 7. Decisions

- **08/09/2026**: Sistema de càrrega de reserves d'agències = 3 fases (Webhooks, OCR/IA, Agentic).
- **08/09/2026**: Començar per la Fase 1 (Webhooks), que encaixa amb el patró d'integracions existent.
