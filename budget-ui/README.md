# Budget App

A personal finance management application built with Svelte 5 and SvelteKit for tracking income, expenses, and bill payments.

![Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)
![SvelteKit](https://img.shields.io/badge/SvelteKit-2-FF3E00?logo=svelte&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

<!-- Add a screenshot here -->
<!-- ![App Screenshot](./docs/screenshot.png) -->

## Features

- 📊 **Dashboard** — Overview of monthly income and expenses
- 💰 **Transaction Management** — Track income and expenses by category
- 📅 **Bill Tracking** — Manage recurring bills and payment schedules
- 📈 **Budget Overview** — Monitor spending against budget goals

## Tech Stack

| Layer      | Technology                                             |
| ---------- | ------------------------------------------------------ |
| Frontend   | Svelte 5, SvelteKit, TypeScript                        |
| Styling    | [Tailwind CSS / CSS — update this]                     |
| Backend    | [NestJS API](https://github.com/acastillo9/budget-api) |
| Database   | MongoDB                                                |
| Deployment | Vercel (frontend)                                      |
| CI/CD      | GitHub Actions                                         |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/acastillo9/budget-ui.git
cd budget-ui

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API URL
```

### Development

```bash
# Start development server
npm run dev

# Run with browser auto-open
npm run dev -- --open
```

### Build

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── lib/
│   ├── components/    # Reusable UI components
│   ├── services/      # API client and business logic
│   └── stores/        # Svelte stores for state management
├── routes/            # SvelteKit file-based routing
└── app.html           # HTML template
```

## Environment Variables

| Variable         | Description          |
| ---------------- | -------------------- |
| `PUBLIC_API_URL` | Backend API base URL |

## Related

- [budget-api](https://github.com/acastillo9/budget-api) — NestJS backend for this application

## License

MIT

---

Built with ☕ by [Andrés Castillo](https://github.com/acastillo9)
