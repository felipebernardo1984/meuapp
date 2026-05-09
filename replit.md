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
- `client/src/components/ManagerDashboard.tsx` — Gestor dashboard with collapsible sidebar navigation (sections: Dashboard, Alunos, Mensalidades, Professores, Turmas, Quadras, Planos, Financeiro, Despesas, WhatsApp, Configurações, Alertas, Ajuda)
- `client/src/components/TurmasManager.tsx` — Full class/schedule management: weekly calendar grid view + list view, CRUD dialogs for classes, student enrollment per class
- `client/src/components/ManagerSidebar.tsx` — Dark collapsible sidebar with full mobile drawer support (hamburger button, overlay backdrop, fixed-position mobile drawer, smooth translate transition)
- `client/src/components/OverviewDashboard.tsx` — Analytics overview (KPIs, student movement, financial, plan distribution)
- `client/src/components/TeacherDashboard.tsx` — Teacher dashboard
- `client/src/components/StudentDashboard.tsx` — Student dashboard

- `client/src/components/QuadrasManager.tsx` — Court booking management: weekly calendar view + court CRUD + reserva CRUD (aluguel/dayuse/bloqueio)
- `client/src/pages/QuadrasPublicas.tsx` — Public weekly court availability page (no login required)
- `client/src/pages/PagamentoOnline.tsx` — Public payment page: shows PIX key, QR code, and self-confirm button

### Routes
- `/` — Public landing page (marketing)
- `/admin` — Super-admin panel (arena CRUD, pricing, support settings)
- `/arena/:id` — Arena-specific login + dashboard
- `/arena/:id/quadras` — Public court availability calendar
- `/pagar/:token` — Public payment page (student self-confirms mensalidade)
- `/reset-senha?token=...` — Password reset confirmation page
- `/cadastro` — Arena registration page

## Database Tables
- `arenas` — Tenants with subscription info (plan, value, start date, next billing, status)
- `platform_plans` — Admin-defined pricing per plan type (basic/premium)
- `platform_settings` — Global platform key/value settings (suporte_email, suporte_telefone, suporte_whatsapp, sac_texto, resend_api_key)
- `password_reset_tokens` — Gestor password reset tokens with expiry (2h TTL)
- `arena_subscription_payments` — History of arena subscription payments
- `plans` — Arena-created training plans for students
- `teachers` — Arena teachers; includes `percentualComissao` (commission %) field
- `students` — Arena students with plan/checkin data; soft-delete via `ativo` bool, `desativadoEm` date, `criadoEm` timestamp
- `checkin_history` — Student check-in records; includes `tipo` (pendente/aula/dayuse/avulso) and `professorId` for attribution
- `teacher_commissions` — Commission records per attributed check-in (valorCheckin, percentual, valorComissao, status: pendente/aprovado/editado/cancelado)
- `checkin_financeiro` — Financial snapshot per check-in (valorUnitario saved at moment of check-in for historical consistency)
- `payments` — Student monthly payment records; includes `paymentMethod` field (cartao/pix/dinheiro)
- `charges` — Ad-hoc charges for students
- `payment_settings` — Arena PIX payment configuration
- `modalidade_settings` — Per-modality value per check-in and integration toggles
- `integration_plans` — TotalPass/Wellhub plan structure (prepared for future integration)
- `integration_settings` — API keys and provider config per arena (prepared for future integration)
- `whatsapp_settings` — WhatsApp number + default message per arena
- `whatsapp_automation` — WhatsApp automation config (cobrança + assiduidade)
- `whatsapp_dispatch_log` — Pending/sent WhatsApp dispatches queue
- `turmas` — Class/schedule definitions per arena (id, arenaId, professorId, nome, modalidade, diasSemana pipe-separated, horarioInicio, horarioFim, capacidadeMaxima, cor, ativo)
- `turma_alunos` — Student enrollments per class (id, arenaId, turmaId, alunoId, dataMatricula, ativo)

## Email / Password Reset
- Password reset uses Resend (npm package installed). When `resend_api_key` is set in platform_settings, reset e-mails are sent automatically.
- When no API key is set, the "Esqueci a senha" screen shows the support contact (email/phone/whatsapp) configured in platform_settings.
- Reset token expires in 2 hours. Tokens are stored in `password_reset_tokens`.
- NOTE: Resend integration was dismissed in Replit connector flow — API key must be added manually via Admin → Configurações → API Key do Resend.

## Finance Module
- `server/financeService.ts` — Central finance service with:
  - `calcularReceitaCheckin` — Creates a financial record at check-in time (snapshot)
  - `getReceitaTotalPeriodo` — Total revenue aggregation with optional date filters
  - `getReceitaPorAluno` — Revenue summary for a specific student
- Financial records are created automatically on every check-in without altering check-in logic
- Historical consistency: `valorUnitario` is saved at check-in time, unaffected by future config changes

## Financial API Endpoints
- `GET /api/finance/receita/summary?dataInicio=&dataFim=` — Aggregated revenue (total checkins, receita total, by modality, by student)
- `GET /api/finance/receita/aluno/:studentId` — Student-specific financial summary
- `GET/PUT /api/integracoes/settings/:provider` — Integration settings (API keys)
- `GET/POST/PUT/DELETE /api/integracoes/planos` — Integration plans (TotalPass/Wellhub)
- `GET /api/finance/comissoes` — All commissions for the arena (with professor and student names)
- `GET /api/finance/comissao/resumo` — Commission summary grouped by professor
- `GET /api/finance/comissao/professor/:id` — Commission history for a specific professor
- `PUT /api/finance/comissao/:id` — Edit/approve a commission record (valorComissao, status, observacao)

## Check-in Attribution & Commission Module
- `GET /api/checkins/log` — All check-ins for the arena enriched with alunoNome, modalidade, professorNome
- `PUT /api/checkins/:id/atribuir` — Attribute a check-in: tipo (aula/dayuse/avulso) + professorId (optional)
  - When `tipo=aula` + `professorId`: automatically creates a commission record
  - When changed to non-aula: cancels the associated commission
- `server/commissionService.ts` — Commission logic:
  - `calcularComissao(arenaId, checkinId, teacherId, studentId, valorCheckin, data)` — Creates commission record based on teacher's `percentualComissao`
  - `getResumoPorProfessor(arenaId)` — Returns aggregated commission summary per professor

## Gestor UI — Commission Management (ManagerDashboard)
- Each professor card shows commission badge when `percentualComissao > 0`
- "Log de Check-ins" button opens a dialog with all check-ins filterable by tipo (pendente/aula/dayuse/avulso)
  - Per check-in: select tipo + professor and click "Referenciar" — commission is auto-calculated
  - Already attributed check-ins show current tipo and can be changed
- "Comissões" button opens commission management dialog with:
  - Summary table: professor, %, check-ins, receita gerada, total comissão, pendentes, aprovados
  - Detailed table: per commission — approve (1-click), edit valor + observação
  - Gestor can adjust the commission value when check-in had duplicity (valor=0)

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

## NotificationService

- `server/notificationService.ts` — Camada de envio de mensagens com seleção automática de provider:
  - `sendNotification(aluno, mensagem)` — assinatura estável, sem mudanças de código para trocar provider
  - **MockProvider** (padrão): ativo quando qualquer secret do Twilio estiver ausente — loga no console, nunca bloqueia
  - **TwilioProvider**: ativado automaticamente quando `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_WHATSAPP_FROM` estiverem configurados
  - Para ativar WhatsApp real: basta adicionar os 3 secrets — nenhuma mudança de código necessária

## AutomationService

- `server/automationService.ts` — Read-only analysis service that inspects arena data and surfaces actionable situations:
  - **`paymentsNearDue`** — Mensalistas (`integrationType === "none"`) with pending payments due within N days (default: 3)
  - **`overduePayments`** — Mensalistas with pending payments past their due date
  - **`lowFrequencyStudents`** — Check-in students (`integrationType === "wellhub"` or `"totalpass"`) who have done less than 50% of expected check-ins in the last 30 days (threshold configurable)
- `server/automationRoutes.ts` — Mounts `GET /api/automation/report/:arenaId`
  - Query params: `nearDueDays` (int), `lowFrequencyPct` (int, 0–100)
  - Requires an authenticated arena session or admin session
  - Returns an `AutomationReport` JSON with all three alert lists

## Dev Setup
- `npm run dev` — Starts Express + Vite on port 5000
- `npm run db:push` — Sync Drizzle schema to DB
- Default admin: `superadmin` / `superadmin`
- Default arena: login `333` / `333`
