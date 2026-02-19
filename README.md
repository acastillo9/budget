# Budget App

A personal finance management application for tracking income, expenses, bills, and budgets. Built as a monorepo with a NestJS REST API and a SvelteKit frontend.

![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs&logoColor=white)
![Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-6-47A248?logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Authentication** — JWT-based auth with Google OAuth support
- **Transactions** — Track income and expenses by category
- **Bills** — Manage recurring bills and payment schedules
- **Budgets** — Monitor spending against budget goals
- **Categories** — Organize transactions with custom categories
- **Multi-currency** — Support for multiple currencies
- **Dashboard** — Overview of monthly income and expenses

## Architecture

This is a monorepo containing two projects:

| Project | Description | Tech Stack |
|---------|-------------|------------|
| [budget-api](./budget-api) | REST API backend | NestJS, Mongoose, Passport.js, JWT |
| [budget-ui](./budget-ui) | Web frontend | SvelteKit 2, Svelte 5, Tailwind CSS, shadcn-svelte |

**Database:** MongoDB

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 6+ (local or Atlas)
- npm or pnpm

### Setup

1. **Clone the repository**

```bash
git clone https://github.com/acastillo9/budget.git
cd budget
```

2. **Set up the API**

```bash
cd budget-api
npm install
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, etc.
npm run start:dev
```

3. **Set up the UI**

```bash
cd budget-ui
npm install
cp .env.example .env
# Edit .env with your API URL
npm run dev
```

See each subproject's README for detailed configuration and environment variables:
- [API README](./budget-api/README.md)
- [UI README](./budget-ui/README.md)

## License

MIT

---

Built with ☕ by [Andres Castillo](https://github.com/acastillo9)
