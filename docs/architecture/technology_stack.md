# Technology Stack

*Milky Shakes platform: implementation stack for the Vercel + Supabase architecture*

## Technology Stack Decision & Candidate Evaluation

### Candidate Ecosystems Considered

To implement the Vercel + Supabase Serverless Architecture, five candidate implementation stacks were evaluated:

1. **Candidate 1: Vercel + Supabase Serverless (Vercel CDN + Vercel Functions + Supabase Auth & PostgreSQL + React): SELECTED**
   - *Overview:* React SPA deployed to the Vercel Edge Network; Express REST API deployed as a Vercel Function (Node.js); Supabase providing both managed authentication and PostgreSQL behind its connection pooler; Drizzle ORM query layer.
   - *Strengths:* Single-language TypeScript across the entire platform; shared Zod validation schemas; zero server maintenance; identity and data in one platform, so user profiles reference the auth user ID directly through a foreign key; connection pooling in transaction mode suited to serverless functions; full SQL relational support for complex management reports; Row Level Security as a deny-by-default backstop; deployment on every Git push with per-branch preview deployments.
   - *Weaknesses:* Free-tier Supabase projects are paused after a period of inactivity and must be confirmed active before demonstrations; the Vercel free (Hobby) plan is intended for non-commercial use; transaction-mode pooling rules out session-level database features, so the API relies only on transaction-scoped settings. The stack operates within free-tier allowances (C-002).
2. **Candidate 2: Pure Firebase Serverless (Firebase Hosting + Cloud Functions + Cloud Firestore NoSQL)**
   - *Overview:* Static React SPA + Cloud Functions + Cloud Firestore (NoSQL Document Store).
   - *Strengths:* Native Firebase data sync, zero third-party database dependencies.
   - *Weaknesses:* **Rejected.** Cloud Firestore lacks relational schema constraints, native foreign keys, and SQL analytical aggregations (`GROUP BY`, date-truncation for day-of-week volume trends). Fulfilling these in Firestore requires complex, expensive distributed counter pipelines or BigQuery synchronization.
3. **Candidate 3: Traditional Container Monolith (Node.js + PostgreSQL in Docker on VPS / PaaS)**
   - *Overview:* Express backend and PostgreSQL co-located in a single container or managed PaaS (e.g., Render/Railway).
   - *Strengths:* Familiar operational model.
   - *Weaknesses:* **Rejected.** Requires maintaining server infrastructure and managing container memory footprints on minimal hosts, and lacks both the global CDN performance and the managed identity service of the selected stack.
4. **Candidate 4: Python Serverless (FastAPI + Supabase PostgreSQL + React)**
   - *Overview:* React frontend on a CDN with a Python FastAPI backend on a serverless or container runtime, using Supabase for authentication and PostgreSQL.
   - *Strengths:* Python analytical libraries.
   - *Weaknesses:* **Rejected.** Context-switching between Python (backend) and TypeScript (frontend); duplicated schema and validation declarations, with no way to share Zod schemas between the browser and the API.
5. **Candidate 5: Previous Hybrid (Firebase Hosting + Cloud Functions v2 + Neon PostgreSQL + React)**
   - *Overview:* React SPA on Firebase Hosting; Express API on Cloud Functions (Node.js); Firebase Auth for identity; managed PostgreSQL on Neon with Drizzle ORM.
   - *Strengths:* Same TypeScript-everywhere and full-SQL benefits as the selected stack.
   - *Weaknesses:* **Superseded.** Deploying Cloud Functions, including the outbound Stripe API calls, requires the pay-as-you-go Firebase billing plan, which conflicts with the free-tier constraint (C-002). Identity (Firebase) and data (Neon) also sit with separate vendors, so the API must verify Firebase tokens and mirror users into a separate database.

## Component specification

| Layer / Concern | Technology & Version |
| :-- | :-- |
| **Language** | **TypeScript** (frontend and API) |
| **Frontend Framework** | **React + Vite** |
| **Static Hosting & CDN** | **Vercel (Edge Network)** |
| **Identity & Authentication** | **Supabase Auth** |
| **Serverless Compute** | **Vercel Functions (Node.js 20+) running Express 5** |
| **Token Verification** | **`jose` against the Supabase project's JWKS endpoint** |
| **Database Engine** | **Supabase PostgreSQL (15+)** |
| **Database Client & Pooler** | **Drizzle ORM over `pg` (node-postgres) + Supabase connection pooler (transaction mode)** |
| **Database Security & Audit** | **Row Level Security (deny-by-default) + PL/pgSQL audit triggers** |
| **Schema Validation** | **Zod 3.23+** |
| **Secrets Management** | **Vercel Environment Variables (scoped per environment) + Zod boot-time validation** |
| **Payment Integration** | **Stripe Node.js SDK** |
| **Transactional Email** | **Nodemailer 6.9+ (SMTP relay)** |
| **Local Development** | **Vite dev proxy + local Express listener; Stripe CLI for webhook forwarding** |
