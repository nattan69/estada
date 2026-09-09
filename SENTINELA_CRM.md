# Projecte: SENTINELA — CRM comercial i de màrqueting

> Document de definició del **CRM** de Conceptes com a **projecte separat**,
> completament lligat amb **Estada** (PMS) i viceversa.
> Decisió d'en Tomeu (08/09/2026). Font de veritat: Drive (carpeta "Projectes").

---

## 1. Visió general

El CRM és el **"cervell" comercial i de màrqueting** de l'hotel (o de qualsevol
negoci), mentre que Estada (PMS) és el **"cor" operatiu** (reserves, ocupació,
neteja, facturació). Són dos sistemes **separats i integrats bidireccionalment**.

- **Estada (PMS):** core operatiu — reserves, ocupació, housekeeping, folios, facturació.
- **SENTINELA (CRM):** cervell comercial — leads, pipeline de vendes, campanyes, fidelització.

---

## 2. Per què un projecte SEPARAT

| Motiu | Explicació |
|---|---|
| **Dominis diferents** | El PMS gestiona reserves/ocupació; el CRM gestiona leads, vendes i campanyes. Són dominis diferents. |
| **Funcionalitats pròpies** | Pipeline, lead scoring, email marketing, campanyes, forecasting — no són core del PMS. |
| **Cicle de vida propi** | El CRM té el seu propi ritme de desenvolupament (com Ariadna, Comanda, Jornada). |
| **Reusabilitat** | Un CRM separat serveix per a qualsevol empresa (hotel, restaurant, coworking), no només hotels. |

---

## 3. Mòduls essencials del CRM

1. **Gestió de contactes i organitzacions:** fitxa única per client amb historial
   complet de converses, emails, trucades, documents i notes.
2. **Canonada de vendes (Pipeline):** vista Kanban de les fases de venda
   (List, Primer contacte, Pressupost enviat, Negociació, Tancat).
3. **Gestió de tasques i alertes:** recordatoris automàtics per fer seguiments,
   enviar pressupostos o recontactar clients.
4. **Integració de canals de comunicació:** email, telèfon, calendaris, WhatsApp, xats web.
5. **Quadre de comandament i analítica (Dashboards):** activitat, previsió de
   vendes (forecasting), taxa de conversió, rendiment de l'equip.
6. **Accessibilitat mòbil i API:** aplicació per a mòbils i capacitat de connectar
   amb altres eines (facturació, ERP, web).

---

## 4. Ajuda al Pla Comercial

- **Segmentació de la cartera:** classificació segons valor, sector, historial de
  compra o nivell d'activitat (metodologia ABC).
- **Previsió de vendes (Sales Forecasting):** càlcul automàtic dels ingressos
  previstos segons la probabilitat de tancament de cada oportunitat.
- **Assignació i rutes de vendes:** distribució automàtica de leads segons zona,
  càrrega de feina o especialització.
- **Automatització de processos (Workflows):** alertes si una oportunitat fa massa
  dies que està aturada o si un client habitual deixa de comprar.

---

## 5. Ajuda al Pla de Màrqueting

- **Captació i qualificació de leads (Lead Scoring):** puntuació automàtica dels
  potencials clients segons el comportament (obren emails, visiten la web...).
- **Automatització de campanyes (Email Marketing & Nurturing):** seqüències
  d'emails personalitzades segons l'estat del client en el cicle de venda.
- **Atribució i ROI de campanyes:** seguiment de l'origen de cada lead per mesurar
  quin canal genera més vendes reals.
- **Landing pages i formularis integrats:** recollida de dades des de la web
  directament al CRM.

---

## 6. Integració CRM ↔ Estada (el punt clau)

> **Imprescindible:** el PMS i el CRM han d'anar **lligats** per no perdre dades
> ni duplicar feina manual.

### 6.1. Perfil únic i unificat de l'hoste
- El CRM rep automàticament des del PMS: historial d'estades, despesa mitjana,
  preferències d'habitació, serveis consumits (spa, restaurant) i motiu del viatge.

### 6.2. Màrqueting automatitzat hiperpersonalitzat
Segons l'estat de la reserva al PMS:
- **Pre-stay:** correus de benvinguda amb upselling (millora d'habitació, reservar sopar).
- **In-stay:** enquestes de satisfacció durant l'estada.
- **Post-stay:** petició de ressenyes (TripAdvisor/Google) i codis de descompte per a reserves directes futures.

### 6.3. Fidelització i venda directa
- Redueix la dependència de les OTAs (Booking, Expedia).
- En conèixer el perfil real que ve per una OTA, el CRM executa campanyes per
  aconseguir que la pròxima reserva sigui directa.

### 6.4. Segmentació avançada
- Fluxos de treball com "enviar una oferta especial al novembre a tots els clients
  d'empresa que hagin tingut més de 3 estades aquest any".

---

## 7. Punts crítics de la integració

### 7.1. Sincronització en temps real (API bidireccional)
- Les dades flueixen en **ambdós sentits**:
  - **PMS → CRM:** si el client canvia l'email a recepció (PMS), s'actualitza al CRM.
  - **CRM → PMS:** si el CRM capta un lead corporatiu, envia la tarifa acordada al PMS.

### 7.2. Neteja i unificació de dades (Deduplication)
- Els PMS generen molts perfils duplicats (un per reserva).
- El CRM ha de tenir un **algorisme de fusió automàtica** basat en email, DNI o telèfon.

### 7.3. Compliment del RGPD
- La sincronització ha de respectar el **consentiment de màrqueting**.
- Que un hoste estigui registrat al PMS per obligació legal **no implica** que hagi
  acceptat rebre comunicacions comercials al CRM.

---

## 8. Arquitectura (proposta)

```
┌─────────────────────────────────────────────────────────┐
│  ESTADA (PMS)              •  SENTINELA (CRM)            │
│  Core operatiu             •  Cervell comercial          │
│  - Reserves                •  - Contactes               │
│  - Ocupació                •  - Pipeline de vendes      │
│  - Housekeeping            •  - Lead scoring            │
│  - Folios / facturació     •  - Campanyes / email mark. │
│  - VeriFactu               •  - Forecasting             │
│  - Guest (CRM bàsic)       •  - Analytics               │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
           └────────── API bidireccional ──────────┘
                (temps real, deduplicació, RGPD)
```

### Stack
- **Backend:** Python + FastAPI + SQLAlchemy (mateix patró que els altres).
- **Frontend:** Next.js (React) + App Router.
- **Base de dades:** PostgreSQL (producció) / SQLite (dev).
- **Integració:** API bidireccional amb Estada.

---

## 9. El nom

- **Nom de treball:** SENTINELA (CRM comercial i de màrqueting).
- Marca definitiva pendent (com cada projecte, disseny propi).

---

## 10. Ordre d'implementació

1. **Estada (PMS):** core operatiu (reserves, folios, housekeeping, rates, VeriFactu).
2. **Estada Guest (CRM bàsic):** perfils de clients dins del PMS (camp 1).
3. **SENTINELA (CRM complet):** quan el core d'Estada estigui consolidat — leads,
   pipeline, email marketing, campanyes.
4. **Integració bidireccional:** sincronització en temps real, deduplicació, RGPD.

---

## 11. Decisions

- **08/09/2026**: el CRM és un **projecte separat** (SENTINELA), integrat bidireccionalment amb Estada.
- **08/09/2026**: Estada (PMS) = cor operatiu; SENTINELA (CRM) = cervell comercial i de màrqueting.
- **08/09/2026**: Sincronització en temps real (API bidireccional), deduplicació i RGPD com a crítics.
