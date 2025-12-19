## MonEra

<div align="center">

[![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)](https://github.com/AriceNn/MonEra)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?style=for-the-badge)](./tsconfig.json)

Personal finance tracking web application (transactions, budgets, recurring items).

</div>

## What it does

- Transactions: create/update/delete, categories, types (income/expense/savings/withdrawal)
- Budgets: category budgets with a configurable alert threshold
- Recurring transactions: scheduled generation (daily/weekly/monthly/yearly)
- Dashboard & analytics: summary cards and charts (line/bar/pie)
- Import/export: CSV/JSON utilities
- i18n and theming: Turkish/English and light/dark theme

## Data model and storage

- Primary storage: Supabase (PostgreSQL)
- Auth: Supabase Auth (JWT-based sessions)
- Authorization: Row-Level Security (RLS) in the database
- Local browser storage: small UI/cache flags in localStorage and session state in SessionStorage

Note: The repository includes storage adapter utilities under `src/db` (localStorage/IndexedDB via Dexie). The current runtime data flow reads and writes data via Supabase.

## Tech stack

- Frontend: React 19, TypeScript, Tailwind CSS
- Charts/icons: Recharts, Lucide
- Backend: Supabase (PostgreSQL + Auth + RLS)
- Tooling: Vite, ESLint, Vitest

## Getting started

### Prerequisites

- Node.js >= 18
- npm >= 9

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/AriceNn/MonEra.git
cd MonEra
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get credentials from: [supabase.com/dashboard](https://supabase.com/dashboard) → Settings → API

4. **Start development server**
```bash
npm run dev
```

Open http://localhost:5173.

## Scripts

### Available Scripts

```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Lint code
npm run lint

# Type-check TypeScript
tsc --noEmit
```
docs: 📝 Documentation
test: 🧪 Tests
## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

```
MIT License

Copyright (c) 2025 MonEra

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED.
```

---

## Acknowledgments

Built with the following open-source tools and services:

- **React Team** - For the powerful UI framework
- **Supabase** - For the excellent backend platform
- **Vite Team** - For the lightning-fast build tool
- **Tailwind Labs** - For beautiful utility-first CSS
- **Dexie.js** - For the excellent IndexedDB wrapper
- **Dexie.js** - Used by optional IndexedDB utilities
- **Community Contributors** - For feedback and support

---

<div align="center">

**MonEra - Smart Financial Management**

[![GitHub](https://img.shields.io/badge/GitHub-Repository-black?style=flat-square&logo=github)](https://github.com/AriceNn/MonEra)
[![Issues](https://img.shields.io/github/issues/AriceNn/MonEra?style=flat-square)](https://github.com/AriceNn/MonEra/issues)
[![Pull Requests](https://img.shields.io/github/issues-pr/AriceNn/MonEra?style=flat-square)](https://github.com/AriceNn/MonEra/pulls)

**Version:** 1.0.0-cloud | **Last Updated:** December 20, 2025

© 2025 MonEra. MIT License.

</div>
