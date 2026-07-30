# BarberFlow - MicroSaaS Premium para Barbearias

Sistema de gestão premium para barbearias com agendamento online, dashboard administrativo e página pública de reservas.

## Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Motion (Framer Motion)
- **Backend:** Firebase (Firestore, Auth), Express
- **Build:** Vite 6, esbuild
- **UI:** Lucide React, date-fns

## Scripts

```bash
npm run dev          # Inicia dev server Vite
npm run build        # Build do frontend
npm run lint         # ESLint (JS + TS)
npm run dev:all      # Dev server completo (Vite + Express)
npm run build:all    # Build completo (frontend + server)
npm run start:prod   # Inicia em produção
```

## Estrutura

```
src/
  components/    # Componentes reutilizáveis (Button, Card, Input, Sidebar, ProtectedRoute, ErrorBoundary)
  lib/           # Firebase, utilitários
  pages/         # Landing, Login, Register, Dashboard, CRUD pages, PublicBooking
  types/         # Interfaces TypeScript
  main.tsx       # Entry point
  App.tsx        # Router + Auth state
```

## Funcionalidades

- Página de landing com planos e pricing
- Autenticação (email/senha + Google OAuth)
- Dashboard com métricas em tempo real
- CRUD de barbeiros, serviços e agendamentos
- Página pública de agendamento multi-etapas
- PWA com suporte offline
