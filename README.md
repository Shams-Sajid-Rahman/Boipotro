# Boipotro (বইপত্র)

Marketplace for university students in Bangladesh to buy and sell used textbooks.

| Folder    | Stack                                                                                 |
| --------- | ------------------------------------------------------------------------------------- |
| `client/` | React (Vite), React Router, TanStack Query, Axios, Tailwind CSS, socket.io-client     |
| `server/` | Node.js, Express, PostgreSQL (`pg` + plain SQL migrations), JWT, bcrypt, multer, Socket.IO, zod |

## Prerequisites

- Node.js 20+
- PostgreSQL 14+

## Setup

```bash
# 1. Install dependencies (root, server, client)
npm run install:all

# 2. Environment files
cp server/.env.example server/.env    # set DATABASE_URL, TEST_DATABASE_URL and the two JWT secrets
cp client/.env.example client/.env    # VITE_API_URL (default /api is fine for dev)

# 3. Create the databases
psql -U postgres -c "CREATE DATABASE boipotro"
psql -U postgres -c "CREATE DATABASE boipotro_test"   # only needed for npm test

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

If the API runs on another port, start the client with `API_PROXY_TARGET=http://localhost:PORT`.

## Seed accounts

Every seed user's password is `Password123!` (override with `SEED_PASSWORD`).

| Role    | Email                          | Notes                                  |
| ------- | ------------------------------ | -------------------------------------- |
| Admin   | `admin@boipotro.test`          | Can open `/admin`                      |
| Student | `ayesha.rahman@northsouth.edu` | Sells "Introduction to Algorithms" etc |
| Student | `tanvir.hasan@northsouth.edu`  | Has a chat with Ayesha                 |
| Student | `nusrat.jahan@bracu.ac.bd`     |                                        |

## Tests

```bash
cd server && npm test
```

Jest + Supertest against `TEST_DATABASE_URL`. The test database is **dropped and rebuilt** on every
run (migrations + seed), and the setup refuses to run if it equals `DATABASE_URL`.

## Server structure

```
server/src/
  config/        env loading + validation (zod)
  routes/        Express routers (URL -> middleware -> controller/service)
  controllers/   request/response handling
  services/      business logic + SQL
  middleware/    auth (requireAuth, optionalAuth, requireRole), validation, uploads, rate limits, errors
  validators/    zod schemas for bodies / queries / params
  socket/        Socket.IO server (JWT handshake, chat events)
  db/
    pool.js      pg pool + query/transaction helpers
    migrate.js   migration runner
    migrations/  NNN_description.sql, applied once, in order
    seeds/       sample data
  utils/         small shared helpers
```

## API overview

| Area          | Endpoints |
| ------------- | --------- |
| Auth          | `POST /api/auth/register`, `/login`, `/refresh`, `/logout`, `GET /api/auth/me` |
| Catalogue     | `GET /api/categories`, `/universities`, `/site-content`, `POST /api/contact` |
| Listings      | `GET /api/listings?q&category&university&condition&minPrice&maxPrice&sort&page&limit`, `GET /api/listings/featured`, `GET/PATCH/DELETE /api/listings/:id`, `PATCH /api/listings/:id/status`, `POST /api/listings` (multipart, `images` × 5) |
| Mine          | `GET /api/users/me/listings`, `PATCH /api/users/me`, `GET /api/users/:id/reviews` |
| Offers        | `POST /api/listings/:id/offers`, `GET /api/offers/sent`, `/received`, `PATCH /api/offers/:id` |
| Wishlist      | `GET /api/wishlist`, `POST/DELETE /api/wishlist/:listingId` |
| Reviews       | `POST /api/listings/:id/reviews` (buyer of a sold listing only) |
| Reports       | `POST /api/listings/:id/reports` |
| Conversations | `GET/POST /api/conversations`, `GET /api/conversations/unread-count`, `GET /api/conversations/:id`, `GET/POST /api/conversations/:id/messages`, `POST /api/conversations/:id/read` |
| Admin         | `GET /api/admin/stats`, `/users`, `/listings`, `/reports`, `DELETE /api/admin/listings/:id`, `PATCH /api/admin/users/:id/ban`, `PATCH /api/admin/reports/:id` |
| Socket.IO     | connect with `auth: { token }`; emit `message:send`, `conversation:read`; receive `message:new`, `conversation:read` |

## Migrations

Plain `.sql` files in `server/src/db/migrations/`, named `NNN_description.sql`.
Each file runs once inside a transaction and is recorded in the `schema_migrations` table.
All queries use parameters (`$1, $2, ...`); dynamic SQL only ever joins constant fragments.

## Editable site text

Homepage, about, contact and footer text live in the `site_content` table (JSON per section).
Set a hero photo with:

```sql
UPDATE site_content SET value = jsonb_set(value, '{imageUrl}', '"/uploads/hero.jpg"') WHERE key = 'hero';
```
