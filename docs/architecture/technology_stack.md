# Technology Stack

## Technology Stack Decision & Candidate Evaluation

### Candidate Ecosystems Considered

To implement the Hybrid Serverless Architecture, four candidate implementation stacks were evaluated:

1. **Candidate 1: Hybrid Serverless (Firebase Hosting + Cloud Functions v2 + Neon PostgreSQL + React) — SELECTED**
   - *Overview:* React SPA deployed to Firebase Hosting CDN; Express REST API deployed to Cloud Functions (Node.js 20); managed PostgreSQL hosted on Neon with built-in connection pooling; Drizzle ORM query layer.
   - *Strengths:* Single-language TypeScript across the entire platform; shared Zod validation schemas; zero server maintenance; native connection pooling via Neon PgBouncer; full SQL relational support for complex management reports; rapid deployment via Firebase CLI.
   - *Weaknesses:* Requires Blaze Plan for outbound Stripe API calls (covered under C-002 free allowances).

2. **Candidate 2: Pure Firebase Serverless (Firebase Hosting + Cloud Functions + Cloud Firestore NoSQL)**
   - *Overview:* Static React SPA + Cloud Functions + Cloud Firestore (NoSQL Document Store).
   - *Strengths:* Native Firebase data sync, zero third-party database dependencies.
   - *Weaknesses:* **Rejected.** Cloud Firestore lacks relational schema constraints, native foreign keys, and SQL analytical aggregations (`GROUP BY`, date-truncation for day-of-week volume trends). Fulfilling in Firestore requires complex, expensive distributed counter pipelines or BigQuery synchronization.

3. **Candidate 3: Traditional Container Monolith (Node.js + PostgreSQL in Docker on VPS / PaaS)**
   - *Overview:* Express backend and PostgreSQL co-located in a single container or managed PaaS (e.g., Render/Railway).
   - *Strengths:* Familiar operational model.
   - *Weaknesses:* **Rejected.** Requires maintaining server infrastructure, managing container memory footprints on minimal hosts, and lacks the global CDN performance and built-in identity management of Firebase.

4. **Candidate 4: Python Serverless (Google Cloud Run + FastAPI + Neon PostgreSQL + React)**
   - *Overview:* React frontend on Firebase Hosting with a Python FastAPI container deployed to Google Cloud Run and Neon PostgreSQL.
   - *Strengths:* Python analytical libraries.
   - *Weaknesses:* **Rejected.** Context-switching between Python (backend) and TypeScript (frontend); duplicated schema declarations; slower build times on Cloud Run compared to native Cloud Functions.

## Component specification

| Layer / Concern               | Technology & Version                     |
| :---------------------------- | :--------------------------------------- |
| **Static Hosting & CDN**      | **Firebase Hosting**                     |
| **Identity & Authentication** | **Firebase Auth**                        |
| **Serverless Compute**        | **Cloud Functions for Firebase (v2)**    |
| **Database Engine**           | **Neon PostgreSQL 16+**                  |
| **Database Client & Pooler**  | **`@neondatabase/serverless` + Drizzle** |
| **Schema Validation**         | **Zod 3.23+**                            |
| **Secrets Management**        | **Firebase `defineSecret`**              |
| **Payment Integration**       | **Stripe Node.js SDK**                   |
| **Transactional Email**       | **Nodemailer 6.9+**                      |
| **Local Emulation**           | **Firebase Emulator Suite**              |
