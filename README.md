# Boipotro (বইপত্র)

Marketplace for university students in Bangladesh to buy and sell used textbooks.

| Folder    | Stack                                                                     |
| --------- | ------------------------------------------------------------------------- |
| `client/` | React (Vite), React Router, TanStack Query, Axios, Tailwind CSS           |
| `server/` | Node.js, Express, PostgreSQL (`pg` + plain SQL migrations), JWT, Socket.IO |

## Prerequisites

- Node.js 20+
- PostgreSQL 14+

## Setup

```bash
# 1. Install dependencies (root, server, client)
npm run install:all

# 2. Environment files
cp server/.env.example server/.env    # set DATABASE_URL and the two JWT secrets
cp client/.env.example client/.env    # VITE_API_URL (default /api is fine for dev)

# 3. Create the database
psql -U postgres -c "CREATE DATABASE boipotro"

# 4. Run migrations
npm run migrate

# 5. Load sample data (wipes existing data; refuses when NODE_ENV=production)
npm run seed

# 6. Start both apps
npm run dev
```

- Client: http://localhost:5173
- API: http://localhost:5000/api/health

Generate a JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Server structure

```
server/src/
  config/        env loading + validation (zod)
  routes/        Express routers (URL -> controller)
  controllers/   request/response handling
  services/      business logic + SQL
  middleware/    errors, validation, rate limits, auth
  validators/    zod schemas for request bodies/queries
  db/
    pool.js      pg pool + query/transaction helpers
    migrate.js   migration runner
    migrations/  NNN_description.sql, applied once, in order
    seeds/       sample data
  utils/         small shared helpers
```

## Migrations

Plain `.sql` files in `server/src/db/migrations/`, named `NNN_description.sql`.
Each file runs once inside a transaction and is recorded in the `schema_migrations` table.
All queries use parameters (`$1, $2, ...`); SQL is never built by string concatenation.

## Seed data

`npm run seed` truncates all app tables and loads 5 universities, 8 categories, 10 users
(1 admin + 9 students), 30 listings with placeholder covers, and a few sample chats, offers,
wishlist items and reviews. Every seed user's password is `Password123!`
(override with `SEED_PASSWORD`). Example logins: `admin@boipotro.test`, `ayesha.rahman@northsouth.edu`.
