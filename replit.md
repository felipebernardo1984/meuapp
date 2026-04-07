# Seven Sports — SaaS Multi-Tenant Arena Management

## Overview
A multi-tenant SaaS platform for managing sports arenas (beach tennis, volleyball, etc.). Each arena is an independent tenant with its own manager, teachers, students, and financial data.

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS, Shadcn/UI, TanStack Query v5, Wouter
- **Backend**: Node.js + Express + TypeScript (tsx in dev, esbuild in prod)
- **Database**: PostgreSQL via Neon Serverless + Drizzle ORM
- **Auth**: express-session + memorystore (in-memory sessions)

### Key Files
- `shared/schema.ts` — All database table definitions and Zod schemas
- `server/storage.ts` — Data access layer (IStorage interface + DatabaseStorage)
- `server/routes.ts` — All API routes
- `client/src/pages/Admin.tsx` — Super-admin panel (arena CRUD, pricing, payment history)
- `client/src/pages/ArenaApp.tsx` — Arena-specific app shell
- `client/src/components/ManagerDashboard.tsx` — Gestor dashboard
- `client/src/components/TeacherDashboard.tsx` — Teacher dashboard
- `client/src/components/StudentDashboard.tsx` — Student dashboard

### Routes
- `/` — Admin panel (superadmin login)
- `/arena/:id` — Arena-specific login + dashboard

## Database Tables
- `arenas` — Tenants with subscription info (plan, value, start date, next billing, status)
- `platform_plans` — Admin-defined pricing per plan type (basic/premium)
- `arena_subscription_payments` — History of arena subscription payments
- `plans` — Arena-created training plans for students
- `teachers` — Arena teachers
- `students` — Arena students with plan/checkin data
- `checkin_history` — Student check-in records
- `payments` — Student monthly payment records
- `charges` — Ad-hoc charges for students
- `payment_settings` — Arena PIX payment configuration

## Multi-Tenant Security
- All arena data is filtered by `arenaId` / `tenantId`
- Admin uses separate session flag (`isAdmin`)
- Arena users are authenticated by gestor/teacher/student login within arena scope
- Impersonation allows admin to enter any arena as gestor

## Admin Features
- CRUD for arenas with plan selection (Básico/Premium)
- Platform plan pricing configuration (editable R$ values)
- Minimize/expand arena card view
- Arena subscription payment history table

## Arena Features (Gestor)
- Subscription info card (plan, value, start date, next billing, status)
- Pay subscription button with payment method options
- Student/teacher/plan management
- Financial dashboard

## Dev Setup
- `npm run dev` — Starts Express + Vite on port 5000
- `npm run db:push` — Sync Drizzle schema to DB
- Default admin: `superadmin` / `superadmin`
- Default arena: login `333` / `333`
