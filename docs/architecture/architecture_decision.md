# Architecture Analysis

## Architecture baseline review

| Evidence                              | Requirement ID | Architectural Driver & Implication                                                                                            |
| :------------------------------------ | :------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| Account Registration & Authentication | **FR-001**     | Managed identity provisioning (Firebase Auth) paired with user profile records in Neon PostgreSQL.                            |
| Order Placement & Customization       | **FR-002**     | Reactive client-side customizer; transactional order creation with snapshot pricing across 1 to 10 drinks                     |
| Fulfillment Mode (Pickup vs Delivery) | **FR-003**     | Validated pickup scheduling (restaurant location and time slot) and delivery address enforcement.                             |
| Payment Processing & Receipts         | **FR-004**     | External payment integration (Stripe), signature-verified serverless webhook handling, receipt generation, and email dispatch |
| Management Audit & Clever Reporting   | **FR-005**     | Controlled analytical read-queries, aggregation views, and non-blocking multi-criteria filters executed via SQL on Neon       |
| Usability                             | **NFR-001**    | Low-latency CDN asset delivery via Firebase Hosting; declarative form validation; real-time transactional feedback.           |
| Authorization & Security              | **NFR-002**    | Dual security boundary: Firebase Auth token verification + server-side RBAC middleware inside Cloud Functions                 |
| Auditability                          | **NFR-003**    | Append-only immutable audit ledger on Neon PostgreSQL; automated database triggers for lookup modifications                   |
| Secrets & Configuration               | **NFR-004**    | Cloud Secret Manager / Firebase `defineSecret` integration; schema-validated boot configuration.                              |

## Architectural Alternatives Considered & Comparative Analysis

To select the most effective architecture, four structural archetypes were evaluated against the Milky Shakes quality drivers and constraints.

### Candidate Architectures

#### Alternative 1: Distributed Microservices Architecture

- **Description:** Decomposes the platform into independently deployed network services (Auth, Order, Payment, Reporting), each with its own database, communicating via RPC or message brokers.
- **Verdict:** **Rejected.** Extreme operational complexity, distributed transaction overhead, and prohibitive setup duration severely breach the 21 November deadline.

#### Alternative 2: Pure Firebase Serverless (NoSQL / Cloud Firestore)

- **Description:** Static hosting on Firebase Hosting + Cloud Functions + Cloud Firestore (NoSQL document store) + Firebase Security Rules.
- **Strengths:** Native Firebase integration, real-time sync, zero server management.
- **Weaknesses:** **Rejected.** Cloud Firestore lacks relational schema constraints, native foreign keys, and SQL analytical aggregations (`GROUP BY`, date-truncation for day-of-week volume trends). Fulfilling in Firestore requires complex, expensive distributed counter pipelines or BigQuery synchronization.

#### Alternative 3: Containerized Monolith on Traditional VPS / Cloud PaaS

- **Description:** Single Docker container housing frontend static files, Express backend, and co-located PostgreSQL instance on a virtual machine (e.g., Render, Railway, or VPS).
- **Strengths:** Familiar setup, unified deployment container.
- **Weaknesses:** **Rejected.** Requires maintaining server infrastructure, managing container memory footprints on minimal hosts, and lacks the global CDN performance and built-in identity management of Firebase.

#### Alternative 4: Hybrid Serverless Architecture (Firebase Hosting + Cloud Functions + Neon PostgreSQL) — SELECTED

- **Description:** A decoupled cloud-native architecture combining:
  1. **Firebase Hosting:** Global CDN serving the React SPA with instant caching and automatic SSL.
  2. **Cloud Functions for Firebase (2nd Gen / Cloud Run):** Stateless Express API handling business logic, RBAC, and webhooks.
  3. **Neon Serverless PostgreSQL:** Managed cloud relational database with built-in connection pooling, maintaining complete ACID transactional integrity, SQL constraints, price snapshots, and reporting queries.
- **Strengths:** Combines serverless zero-maintenance scaling with full relational power; zero server management; zero idle compute cost; instantaneous deployment via Firebase CLI; 100% compliance with through.

### Tier Decomposition

### 4.3 Subsystem Decomposition & Architectural Responsibilities

#### 1. Presentation Tier (Firebase Hosting CDN)

- Globally cached Single-Page Application (React + Vite).
- Handles responsive milkshake customization, live price tallies, and pickup scheduling.
- Firebase Hosting rewrites all `/api/**` traffic seamlessly to Cloud Functions without CORS preflight delays.

#### 2. Identity Tier (Firebase Authentication)

- Manages user credentials, password resets, and session lifecycles.
- Issues cryptographically signed Firebase ID tokens (JWTs) containing user identity and custom claims (`role: 'PATRON' | 'STAFF' | 'MANAGER'`).

#### 3. Application Tier (Cloud Functions for Firebase v2)

- Express REST API encapsulated in a Cloud Function entry point (`api`).
- **Auth Middleware:** Verifies the `Authorization: Bearer <token>` header via `firebase-admin`, extracts claims, and enforces role boundaries.
- **Domain Services:** Order processing, payment intent creation, webhook processing, and reporting query isolation.

#### 4. Persistence Tier (Neon Serverless PostgreSQL)

- Stores normalized tables: `users`, `restaurants`, `flavours`, `consistencies`, `toppings`, `discount_tiers`, `system_config`, `orders`, `order_items`, `payments`, and `audit_logs`.
- Enforces line-item price snapshots so that updating lookup fees never changes historical transactions.
- Automated PL/pgSQL triggers log lookup modifications into the append-only `audit_logs` table (*"who changed what to what"*).
