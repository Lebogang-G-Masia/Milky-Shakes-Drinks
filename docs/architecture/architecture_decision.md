# Architecture Analysis

*Milky Shakes platform: revised baseline using Vercel and Supabase*

## Architecture baseline review

| Evidence | Requirement ID | Architectural Driver & Implication |
| :-- | :-- | :-- |
| Account Registration & Authentication | **FR-001** | Managed identity provisioning (Supabase Auth) paired with user profile records in Supabase PostgreSQL, linked by the auth user ID. |
| Order Placement & Customization | **FR-002** | Reactive client-side customizer; transactional order creation with snapshot pricing across 1 to 10 drinks, executed as a single server-side SQL transaction. |
| Fulfillment Mode (Pickup vs Delivery) | **FR-003** | Validated pickup scheduling (restaurant location and time slot) and delivery address enforcement. |
| Payment Processing & Receipts | **FR-004** | External payment integration (Stripe), signature-verified webhook handling in a Vercel Function (raw request body), receipt generation, and email dispatch. |
| Management Audit & Clever Reporting | **FR-005** | Controlled analytical read-queries, aggregation views, and non-blocking multi-criteria filters executed via SQL on Supabase PostgreSQL through a read-only database role. |
| Usability | **NFR-001** | Low-latency CDN asset delivery via Vercel's Edge Network; declarative form validation; real-time transactional feedback. |
| Authorization & Security | **NFR-002** | Layered security boundary: Supabase Auth JWT verification + server-side RBAC middleware inside the Express API, with Row Level Security (RLS) enabled deny-by-default on every table as a backstop. |
| Auditability | **NFR-003** | Append-only immutable audit ledger on Supabase PostgreSQL; automated database triggers for lookup modifications. |
| Secrets & Configuration | **NFR-004** | Vercel Environment Variables scoped per environment (Production, Preview, Development); server-only Supabase keys; schema-validated boot configuration. |

## Architectural Alternatives Considered & Comparative Analysis

To select the most effective architecture, five structural archetypes were evaluated against the Milky Shakes quality drivers and constraints.

### Candidate Architectures

#### Alternative 1: Distributed Microservices Architecture

- **Description:** Decomposes the platform into independently deployed network services (Auth, Order, Payment, Reporting), each with its own database, communicating via RPC or message brokers.
- **Verdict:** **Rejected.** Extreme operational complexity, distributed transaction overhead, and prohibitive setup duration severely breach the 21 November deadline.

#### Alternative 2: Pure Firebase Serverless (NoSQL / Cloud Firestore)

- **Description:** Static hosting on Firebase Hosting + Cloud Functions + Cloud Firestore (NoSQL document store) + Firebase Security Rules.
- **Strengths:** Native Firebase integration, real-time sync, zero server management.
- **Weaknesses:** **Rejected.** Cloud Firestore lacks relational schema constraints, native foreign keys, and SQL analytical aggregations (`GROUP BY`, date-truncation for day-of-week volume trends). Fulfilling these in Firestore requires complex distributed counter pipelines or BigQuery synchronization.

#### Alternative 3: Containerized Monolith on Traditional VPS / Cloud PaaS

- **Description:** Single Docker container housing frontend static files, Express backend, and a co-located PostgreSQL instance on a virtual machine (e.g., Render, Railway, or VPS).
- **Strengths:** Familiar setup, unified deployment container.
- **Weaknesses:** **Rejected.** Requires maintaining server infrastructure and managing container memory footprints on minimal hosts, and lacks both the global CDN performance and the managed identity service of the selected platforms.

#### Alternative 4: Previous Hybrid (Firebase Hosting + Cloud Functions + Neon PostgreSQL)

- **Description:** Firebase Hosting serving the React SPA, an Express API on Cloud Functions for Firebase (2nd Gen), Firebase Auth for identity, and Neon Serverless PostgreSQL for relational data.
- **Strengths:** Full relational power with serverless scaling; instantaneous deployment via the Firebase CLI.
- **Weaknesses:** **Superseded.** Deploying Cloud Functions requires the pay-as-you-go Firebase billing plan, which conflicts with the no-cost constraint. Identity (Firebase) and data (Neon) also sit with different vendors, so the API must bridge them by verifying Firebase tokens and mirroring users into a separate database.

#### Alternative 5: Vercel + Supabase Serverless Architecture: SELECTED

- **Description:** A decoupled cloud-native architecture combining:
  1. **Vercel:** Global CDN serving the React SPA with instant caching and automatic SSL, plus serverless Vercel Functions hosting the API.
  2. **Express API on Vercel Functions:** Stateless Express application handling business logic, RBAC, and webhooks, deployed from the same repository as the frontend.
  3. **Supabase:** Managed Auth and PostgreSQL in one platform, maintaining complete ACID transactional integrity, SQL constraints, price snapshots, and reporting queries.
- **Strengths:** Combines serverless zero-maintenance scaling with full relational power; zero server management; no idle compute cost on the application tier; deployment on every Git push with per-branch preview deployments; identity and data live in one platform, so user records reference the auth user ID directly without a cross-vendor synchronization step.
- **Trade-offs and mitigations:**
  - Free-tier Supabase projects are paused after a period of inactivity. The project must be confirmed active before demonstrations or assessment.
  - The Vercel free (Hobby) plan is intended for personal, non-commercial use, which fits this coursework deployment but would need review for a production launch.
  - Serverless functions open many short-lived connections, so the API connects through Supabase's connection pooler (transaction mode) rather than a direct database connection.
- **Verdict:** **Selected.** Satisfies the relational, security, and auditability drivers and meets the 21 November delivery deadline.

### Tier Decomposition

### 4.3 Subsystem Decomposition & Architectural Responsibilities

#### 1. Presentation Tier (Vercel Edge Network)

- Globally cached Single-Page Application (React + Vite).
- Handles responsive milkshake customization, live price tallies, and pickup scheduling.
- Vercel rewrites route all `/api/**` traffic to the API function on the same origin, avoiding CORS preflight delays, and fall back to `index.html` for client-side routes.

#### 2. Identity Tier (Supabase Auth)

- Manages user credentials, password resets, and session lifecycles.
- Issues cryptographically signed JWT access tokens containing user identity and a role claim (`role: 'PATRON' | 'STAFF' | 'MANAGER'`). The role is stored in server-controlled `app_metadata`, so users cannot edit it themselves.

#### 3. Application Tier (Express on Vercel Functions)

- Express REST API encapsulated in a Vercel Function entry point (`api`).
- **Auth Middleware:** Verifies the `Authorization: Bearer <token>` header against the Supabase project's published signing keys, extracts claims, and enforces role boundaries.
- **Domain Services:** Order processing, payment intent creation, webhook processing, and reporting query isolation.
- **Webhook Handling:** The Stripe webhook route reads the raw request body so that signature verification succeeds before any order or payment state changes.
- **Database Access:** Uses a server-side Postgres connection through the Supabase pooler. Service credentials are held only in server environment variables and are never exposed to the browser.

#### 4. Persistence Tier (Supabase PostgreSQL)

- Stores normalized tables: `users`, `restaurants`, `flavours`, `consistencies`, `toppings`, `discount_tiers`, `system_config`, `orders`, `order_items`, `payments`, and `audit_logs`.
- Enforces line-item price snapshots so that updating lookup fees never changes historical transactions.
- Row Level Security is enabled on every table with no permissive policies for browser-facing roles, so the API is the only write path and direct access through Supabase's auto-generated data API is denied.
- Automated PL/pgSQL triggers log lookup modifications into the append-only `audit_logs` table (*"who changed what to what"*). The API records the acting user ID for each transaction in a transaction-scoped setting that the triggers read, and `UPDATE` and `DELETE` privileges on `audit_logs` are revoked to keep the ledger immutable.
