# 🥤 Milky Shakes Drinks

> An artisanal, cloud-native milkshake ordering and management platform built with React, Vite, Node.js Express, Supabase PostgreSQL, and Vercel.

[![Tests](https://img.shields.io/badge/tests-48%20passed-brightgreen.svg)](#testing--quality-assurance)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-blue.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-19.3.1-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/vite-8.3.6-646cff.svg)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/express-4.19.2-lightgrey.svg)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/supabase-PostgreSQL%2015+-3ecf8e.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/license-Private-orange.svg)](#)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
  - [Patron Ordering Experience](#-patron-ordering-experience)
  - [Management & Kitchen Operations](#-management--kitchen-operations)
  - [Security, Audit & Compliance](#-security-audit--compliance)
- [System Architecture](#system-architecture)
  - [Architecture Diagram](#architecture-diagram)
  - [Monorepo Structure](#monorepo-structure)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Running Locally](#running-locally)
- [API Reference](#api-reference)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Deployment](#deployment)
- [Documentation & Traceability](#documentation--traceability)

---

## 🌟 Overview

**Milky Shakes Drinks** is a high-performance web platform designed to streamline custom milkshake creation, fulfillment scheduling, secure payment settlement, and live kitchen operations.

The platform addresses two core user groups:
1. **The Patron:** Can explore artisanal flavour profiles, interactively configure bespoke milkshakes (1–10 drinks per order), select between Store Pickup and Home Delivery, settle orders via Stripe or simulated checkout, and receive traceable digital receipts.
2. **The Manager & Kitchen Staff:** Gain real-time operational visibility through an SLA-guaranteed management portal (<500ms query latency), featuring live kitchen ticket status progression, inventory toggling, dynamic pricing/lookup administration, immutable audit logging, and RFC 4180 CSV analytical reporting.

---

## ✨ Key Features

### 🥤 Patron Ordering Experience
- **Interactive Milkshake Customizer:** Configure 1 to 10 drinks per order, specifying:
  - **Artisanal Flavours:** Belgian Chocolate, Madagascan Vanilla, Salted Caramel Crunch, Wild Strawberry Swirl, etc.
  - **Consistency ("Thick or Not"):** Standard, Extra Thick, Spoon-Thick Malt, or Dairy-Free Velvet.
  - **Premium Toppings:** Crushed Flake, Crushed Oreo, Honeycomb Dust, Whipped Cream, Marshmallows, etc.
- **Dynamic Pricing Engine:** Calculates line-item totals with price snapshot immutability (ensuring historical transactions are never altered when menu prices change).
- **Tax & Fee Breakdown:** Real-time computation of Subtotal, South African VAT (15%), Delivery Fees (R15.00), and Loyalty Tier discounts.
- **Fulfillment Flexibility:**
  - **Store Pickup:** Pick a restaurant location and specify an estimated pickup time slot.
  - **Home Delivery:** Comprehensive address capture, postal code validation, and recipient phone verification.
- **Traceable Receipts & Transmittals:**
  - Standardized receipt numbering (`RCP-YYYYMMDD-XXXX`).
  - In-browser printable receipt format.
  - Transactional receipt email delivery powered by Nodemailer.
- **Patron Portal & Order History:** Track active order statuses and view past purchase history with loyalty tier progression.

### 📊 Management & Kitchen Operations
- **Executive Metrics Dashboard:** Real-time metrics including gross revenue, paid order volume, average order value, pickup vs. delivery split, and top-selling ingredients.
- **Clever Filtering (Sub-500ms SLA):** Instantly filter orders by order status, fulfillment mode, specific flavours, toppings, minimum/maximum price thresholds, or instant search keywords.
- **Live Kitchen Operations (Kanban Status Pipeline):** Advance orders across operational states:
  $$\text{PENDING\_PAYMENT} \longrightarrow \text{PAID} \longrightarrow \text{PREPARING} \longrightarrow \text{READY} \longrightarrow \text{COLLECTED} \text{ / } \text{CANCELLED}$$
- **Dynamic Lookup Table Administration:** Add, edit, adjust prices, or soft-delete flavours, toppings, consistencies, and discount tiers without code changes.
- **Inventory & Store Status Controls:** Toggle ingredient stock levels (`IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`) and pause or reopen store operations in real-time.
- **System Configuration:** Manage live global parameters including VAT rate, delivery fee, and per-order drink limits.
- **CSV Data Export:** One-click RFC 4180-compliant CSV report generation for accounting, auditing, and external analysis.

### 🛡️ Security, Audit & Compliance
- **Role-Based Access Control (RBAC):** Strict boundary separation across `PATRON`, `STAFF`, and `MANAGER` roles.
- **Immutable Chronological Audit Trail:** Automated recording of every administrative update (*who changed what, previous value, new value, actor role, timestamp, and client IP*).
- **Payment Security & Idempotency:** Secure payment session creation, HMAC-SHA256 signature verification for webhooks, and duplicate event prevention.
- **Data Sanitization:** Strict egress filtering preventing password hashes, internal secrets, or sensitive system details from being exposed in client responses.

---

## 🏗️ System Architecture

Milky Shakes Drinks adopts a serverless cloud architecture pairing **Vercel** (global edge hosting and serverless functions) with **Supabase** (PostgreSQL database and managed authentication).

### Architecture Diagram

```mermaid
flowchart TD
    subgraph ClientTier ["Presentation Tier (Vercel Edge Network)"]
        SPA["React 19 Single Page App (Vite)"]
        Router["Client-Side Router & Context"]
        SPA --> Router
    end

    subgraph ServerlessTier ["Application Tier (Vercel Serverless Functions / Express)"]
        API["Express 5 REST API (/api)"]
        AuthMiddleware["RBAC & JWT Auth Middleware"]
        DomainServices["Order, Lookup, & Report Services"]
        EmailService["Nodemailer Email Service"]
        
        API --> AuthMiddleware
        AuthMiddleware --> DomainServices
        DomainServices --> EmailService
    end

    subgraph ExternalServices ["External Services"]
        Stripe["Stripe Payment Gateway"]
        SMTP["SMTP Mail Relay"]
        EmailService --> SMTP
    end

    subgraph DataTier ["Persistence Tier (Supabase)"]
        Auth["Supabase Managed Auth"]
        Pooler["Supabase Transaction Pooler (Port 6543)"]
        Postgres[("Supabase PostgreSQL Database")]
        AuditLedger[("Immutable Audit Ledger")]

        Pooler --> Postgres
        Postgres --> AuditLedger
    end

    SPA -- "HTTPS /api Requests" --> API
    SPA -- "Auth Login / Signup" --> Auth
    API -- "Verify Webhook HMAC" --> Stripe
    API -- "SQL Transactions & Queries" --> Pooler
```

### Monorepo Structure

The project is structured as an npm workspaces monorepo:

```text
milky-shakes-drinks/
├── api/
│   └── index.js                   # Vercel Serverless Function entry point
├── docs/
│   ├── architecture/              # Architecture Decision Records & Tech Stack
│   │   ├── architecture_decision.md
│   │   └── technology_stack.md
│   └── requirements/              # Requirements, Stakeholders, & Risk Register
│       ├── assumptions_and_constraints.md
│       ├── risk_register.md
│       └── stakeholder_analysis.md
├── packages/
│   ├── api/                       # Express 5 REST API Backend
│   │   ├── src/
│   │   │   ├── app.js             # Express application & route definitions
│   │   │   ├── emailService.js    # Nodemailer transactional email delivery
│   │   │   ├── server.js          # Standalone HTTP server runner (Port 3001)
│   │   │   └── middleware/
│   │   │       └── rbac.js        # Role-based access control middleware
│   │   └── __tests__/             # Automated integration test suites
│   ├── client/                    # React 19 + Vite Frontend SPA
│   │   ├── src/
│   │   │   ├── App.jsx            # Main app shell & route switcher
│   │   │   ├── LandingPage.jsx    # Hero, story, and brand presentation
│   │   │   ├── OrderPlacement.jsx # Custom milkshake builder & checkout flow
│   │   │   ├── ManagementDashboard.jsx # Kitchen board, filters & admin tools
│   │   │   ├── PatronOrdersPage.jsx   # Patron order history & loyalty status
│   │   │   ├── ReceiptPrinter.jsx # Printable receipt view & PDF export
│   │   │   └── router.jsx         # Lightweight client-side router
│   │   └── vite.config.js         # Vite configuration with embedded API plugin
│   ├── database/                  # Schema definitions & PostgreSQL clients
│   │   └── schema/
│   │       └── index.js           # Table names & enum definitions
│   └── shared/                    # Shared code between frontend and backend
│       └── src/
│           ├── constraints/rules.js     # Constants, business rules & roles
│           ├── schema/order.schema.js   # Order calculations & HMAC verification
│           ├── schema/reporting.schema.js # Filter logic & CSV generation
│           └── types/index.js           # Shared domain types & JSDoc contracts
├── .env.example                   # Environment variable template
├── package.json                   # Root package definition & npm workspace scripts
├── vercel.json                    # Vercel deployment rewrites & build configuration
└── README.md                      # Project documentation
```

---

## 💻 Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Monorepo** | npm Workspaces | Manages `@milky-shakes/client`, `@milky-shakes/api`, `@milky-shakes/database`, and `@milky-shakes/shared` |
| **Frontend** | React 19, Vite 8 | Single Page Application with reactive state management, CSS modules, and custom routing |
| **Backend API** | Express 4 / 5, Node.js 20+ | REST API deployed on Vercel Functions; embedded in Vite dev server for local development |
| **Database** | Supabase PostgreSQL 15+ | Relational persistence, snapshot pricing models, PL/pgSQL triggers, connection pooling |
| **Authentication**| Supabase Auth / JWT | Managed authentication and role assertions (`PATRON`, `STAFF`, `MANAGER`) |
| **Payments** | Stripe & Signature Webhooks | Webhook handling with HMAC-SHA256 signature verification & simulated checkout flow |
| **Transactional Email** | Nodemailer | Asynchronous SMTP receipt dispatch |
| **Validation** | Shared Pure JS & Zod | Unified client-side and server-side validation schemas |
| **Hosting** | Vercel Edge Network | Global CDN static delivery + Serverless API routing |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version `20.x` or later (verify with `node -v`)
- **npm**: Version `10.x` or later (verify with `npm -v`)
- *(Optional)* A **Supabase** project for cloud database and authentication
- *(Optional)* A **Stripe** account for live sandbox payments

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/milky-shakes-drinks.git
   cd "milky-shakes-drinks"
   ```

2. **Install all workspace dependencies:**
   ```bash
   npm install
   ```

### Environment Configuration

Copy the example environment file and adjust configuration values as needed:

```bash
cp .env.example .env.local
```

Key environment variables:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Local API server listening port | `3001` |
| `DATABASE_URL` | Supabase Transaction-Mode Pooler URL (Port 6543) | `postgresql://postgres.[ref]:[pw]@...pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `VITE_SUPABASE_URL` | Public Supabase project URL | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase client anonymous key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY`| Private Supabase backend service role key | `eyJhbGciOi...` |
| `STRIPE_SECRET_KEY` | Stripe sandbox secret API key | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_milky_shakes_test_secret_key_2026` |
| `SMTP_HOST` / `SMTP_USER` | SMTP server credentials for receipt delivery | Optional |

### Running Locally

Milky Shakes Drinks supports two convenient local development modes:

#### Option 1: Unified Development Mode (Recommended)
Vite serves the client and mounts the Express API as middleware on the same port. No CORS configuration or secondary process required:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser. Both the React SPA and `/api/*` endpoints are live immediately.

#### Option 2: Standalone API Development
To run or debug the Express API as an independent process on port 3001:
```bash
npm run dev:api
```
The API server will listen on [http://localhost:3001](http://localhost:3001).

---

## 📡 API Reference

All backend endpoints are prefixed with `/api`. Administrative routes require authentication with `STAFF` or `MANAGER` roles.

### 🌐 Public & Patron Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check endpoint returning system status and uptime |
| `POST` | `/api/login` | Authenticate user and issue session token and role claims |
| `POST` | `/api/signup` | Register a new Patron account |
| `GET` | `/api/lookups` | Retrieve active catalog: flavours, consistencies, toppings, restaurants, configs |
| `POST` | `/api/orders/calculate` | Calculate price breakdown (Subtotal, VAT, Delivery, Discount, Total) without creating an order |
| `POST` | `/api/orders` | Submit a custom order with 1–10 milkshakes and fulfillment schedule |
| `POST` | `/api/payments/checkout-session`| Create a payment intent or checkout session for an order |
| `POST` | `/api/payments/simulate` | Interactive prototype checkout simulation for instant settlement |
| `POST` | `/api/webhooks/payment` | HMAC-SHA256 signature-verified webhook handler for payment settlement |
| `GET` | `/api/orders/:orderId/receipt` | Fetch detailed receipt data by order ID |
| `POST` | `/api/orders/email-receipt` | Trigger receipt email dispatch to patron |
| `GET` | `/api/patron/orders` | Retrieve authenticated patron order history with loyalty discount status |

### 🔒 Management & Operations Endpoints (RBAC Guarded)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/reports/summary` | Executive metrics: gross revenue, order volume, fulfillment split, popular items |
| `GET` | `/api/admin/reports/orders` | High-performance filtered orders query (<500ms SLA, multi-criteria) |
| `GET` | `/api/admin/reports/audit-logs` | Chronological immutable audit trail ("who changed what to what") |
| `GET` | `/api/admin/reports/export` | Stream RFC 4180-compliant CSV report of filtered orders |
| `PATCH` | `/api/admin/orders/:orderId/status` | Advance live kitchen order status (`PAID` $\to$ `PREPARING` $\to$ `READY`, etc.) |
| `GET` | `/api/admin/inventory` | Retrieve stock levels for all flavours and toppings |
| `PATCH` | `/api/admin/inventory/:itemId` | Update ingredient stock status (`IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`) |
| `GET` | `/api/admin/store-status` | Get current store operational status (`OPEN` or `CLOSED`) |
| `PATCH` | `/api/admin/store-status` | Toggle store operating mode |
| `POST` | `/api/admin/lookups/:type` | Add a new lookup item (flavour, consistency, topping) |
| `PATCH` | `/api/admin/lookups/:type/:id` | Update an existing lookup item or price |
| `DELETE` | `/api/admin/lookups/:type/:id` | Soft-delete a lookup item |
| `PATCH` | `/api/admin/configurations/:key` | Update system configuration parameters (VAT rate, delivery fees) |

---

## 🧪 Testing & Quality Assurance

Milky Shakes Drinks features a comprehensive automated test suite leveraging Node.js's native test runner (`node --test`).

### Running Tests

Execute the automated test suite across all packages:
```bash
npm test
```

### Test Suite Coverage

The test suite contains **48 passing tests** validating all core business drivers and quality attributes:

```text
✔ Public Lookup Catalog (/api/lookups)
✔ Lookup Item Creation & RBAC (/api/admin/lookups/:type)
✔ Lookup Item Update & Audit Trail
✔ Patron Order History & Loyalty (/api/patron/orders)
✔ Shared Validation & Price Calculation (1-10 drinks constraints, snapshot totals)
✔ API Order Placement (Store Pickup vs. Home Delivery validation)
✔ Payment Processing & Receipt Generation (HMAC signatures & idempotency)
✔ RBAC Security Guard (401 unauthenticated, 403 patron, 200 staff/manager)
✔ Aggregated Executive Metrics (revenue, fulfillment breakdown)
✔ Clever Filters & SLA Performance (sub-500ms response time threshold)
✔ Data Sanitization & Schema Protection (no secret leaks)
✔ Chronological Audit Trail (state transitions)
✔ RFC 4180 CSV Report Export
✔ Live Kitchen & Operational Order Management (real-time status updates)
✔ Inventory & Store Operational Controls (stock status & store toggle)
```

### Code Quality & Building

To verify production bundle compilation across all workspace packages:
```bash
npm run build
```

---

## ☁️ Deployment

The project is preconfigured for continuous deployment via **Vercel**:

- **Build Configuration:** Configured in `vercel.json` to execute `npm run build` at the root workspace.
- **Frontend Assets:** Static artifacts are served directly from `packages/client/dist` via Vercel's Edge Network CDN.
- **Serverless API:** Requests to `/api/(.*)` are transparently routed to `api/index.js` (Vercel Functions).
- **Single Page App Routing:** Non-API requests rewrite to `/index.html` to allow client-side navigation.

To deploy using the Vercel CLI:
```bash
npm install -g vercel
vercel
```

Ensure environment variables (`DATABASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_WEBHOOK_SECRET`) are configured in the Vercel Project Settings.

---

## 📚 Documentation & Traceability

Comprehensive engineering and requirement documentation is located in the `docs/` folder:

- [Architecture Decision Record](docs/architecture/architecture_decision.md): Evaluation of architectural candidates and rationale for Vercel + Supabase.
- [Technology Stack Specification](docs/architecture/technology_stack.md): In-depth component and tooling choices.
- [Requirements & Constraints](docs/requirements/assumptions_and_constraints.md): Baselined project assumptions and constraints.
- [Stakeholder Analysis](docs/requirements/stakeholder_analysis.md): Needs and expectations of Patrons, Clients, and Developers.
- [Risk Register](docs/requirements/risk_register.md): Assessed project risks, probabilities, impacts, and active mitigations.

---

## 👥 Contributors & Acknowledgements

Developed for **Milky Shakes Drinks** — crafting premium, artisanal milkshake experiences with modern cloud engineering.
