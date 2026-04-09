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
- `checkin_financeiro` — Financial snapshot per check-in (valorUnitario saved at moment of check-in for historical consistency)
- `payments` — Student monthly payment records
- `charges` — Ad-hoc charges for students
- `payment_settings` — Arena PIX payment configuration
- `modalidade_settings` — Per-modality value per check-in and integration toggles
- `integration_plans` — TotalPass/Wellhub plan structure (prepared for future integration)
- `integration_settings` — API keys and provider config per arena (prepared for future integration)

## Finance Module
- `server/financeService.ts` — Central finance service with:
  - `calcularReceitaCheckin` — Creates a financial record at check-in time (snapshot)
  - `getReceitaTotalPeriodo` — Total revenue aggregation with optional date filters
  - `getReceitaPorAluno` — Revenue summary for a specific student
- Financial records are created automatically on every check-in without altering check-in logic
- Historical consistency: `valorUnitario` is saved at check-in time, unaffected by future config changes

## Financial API Endpoints (new)
- `GET /api/finance/receita/summary?dataInicio=&dataFim=` — Aggregated revenue (total checkins, receita total, by modality, by student)
- `GET /api/finance/receita/aluno/:studentId` — Student-specific financial summary
- `GET/PUT /api/integracoes/settings/:provider` — Integration settings (API keys)
- `GET/POST/PUT/DELETE /api/integracoes/planos` — Integration plans (TotalPass/Wellhub)

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

## Scheduler (Job Diário)

- `server/schedulerService.ts` — Executa o `AutomationService` automaticamente 1 vez ao dia:
  - Roda imediatamente ao iniciar o servidor
  - Repete a cada 24h via `setInterval`
  - Percorre todas as arenas cadastradas e loga os alertas encontrados
  - Não altera nenhum dado — apenas leitura e log

## AutomationService

- `server/automationService.ts` — Read-only analysis service that inspects arena data and surfaces actionable situations:
  - **`paymentsNearDue`** — Pending payments whose `dueDate` is within N days (default: 3)
  - **`overduePayments`** — Pending payments whose `dueDate` has already passed
  - **`inactiveStudents`** — Students with no check-in in the last N days (default: 7), or never
- `server/automationRoutes.ts` — Mounts `GET /api/automation/report/:arenaId`
  - Query params: `nearDueDays` (int), `inactiveDays` (int)
  - Requires an authenticated arena session or admin session
  - Returns an `AutomationReport` JSON with all three alert lists

## Dev Setup
- `npm run dev` — Starts Express + Vite on port 5000
- `npm run db:push` — Sync Drizzle schema to DB
- Default admin: `superadmin` / `superadmin`
- Default arena: login `333` / `333`
