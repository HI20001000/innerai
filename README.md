# Meeting Records + AI Analysis + Follow-up Dashboard

Monorepo containing a Fastify-like Express backend (TypeScript + Prisma + MySQL) and a Vue 3 frontend with Element Plus UI. Includes JWT auth, meeting ingestion with automatic Dify analysis, configurable tags, and a follow-up dashboard.

## Project Structure
```
.
├── server/   # Express + Prisma API
├── web/      # Vue 3 + Vite frontend
├── docker-compose.yml
└── .env.example
```

## Prerequisites
- Node.js 20+
- npm
- Docker (for MySQL via docker-compose)

## Environment Variables
Copy `.env.example` to `.env` (root) and fill in values. Key fields:
- MySQL: `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_POOL_SIZE`
- API: `PORT`, `HOST`, `CORS_ALLOWED_ORIGINS`, `REQUEST_BODY_LIMIT`, `JWT_SECRET`, `REGISTER_INVITE_TOKEN`
- Dify: `DIFY_API_BASE_URL`, `DIFY_API_KEY`, `DIFY_CHAT_ENDPOINT`, `DIFY_TOKEN_LIMIT`

You can optionally override `DATABASE_URL`; otherwise it is composed from the MySQL values.

Frontend config: copy `web/.env.example` to `web/.env` and set `VITE_API_BASE_URL` (default `http://localhost:3001`).

## Run MySQL with Docker
```bash
docker-compose up -d mysql
```
This starts MySQL 8 with persisted volume `mysql_data`.

## Install Dependencies
From repo root (uses npm workspaces):
```bash
npm install
```

## Database Migration & Seed
Set the `.env` first, then run:
```bash
cd server
npx prisma generate
npx prisma migrate deploy
npm run build
node dist/seed.js
```
The migration SQL is available at `server/prisma/migrations/0001_init/migration.sql` if you prefer running it directly.

## Development Servers
In two terminals (after `npm install`):
```bash
npm run dev:server   # or: npm run server   | starts Express API on PORT (default 3001)
npm run dev:web      # or: npm run web      | starts Vite dev server on 5173
```
Or run both: `npm run dev`.

### Troubleshooting connection issues
- Ensure MySQL is up: `docker-compose up -d mysql`.
- Confirm `.env` is in the repo root and `PORT`/`HOST` match your desired bind address (default HOST=0.0.0.0 so the frontend can reach it).
- Watch backend logs: requests are logged in the server console, and Prisma actions are logged as `[prisma] <model>.<action> ...`.
- Verify the backend is listening: `curl http://localhost:3001/health`.
- If `npm run dev:server` fails with a missing `tsx` binary, run `npm install` at the repo root to install workspace dependencies; the dev script uses the local `tsx` binary.

## Build for Production
```bash
npm run build
```
Then start the API with `npm --workspace server run start` and serve the `web/dist` build via any static server.

## API Overview (key endpoints)
- `POST /api/auth/register` `{ email, password, inviteToken, name? }`
- `POST /api/auth/login` `{ email, password }`
- `GET /api/auth/me`
- Settings CRUD: `/api/customers`, `/api/manufacturers`, `/api/products`
- Meetings: `GET /api/meetings`, `POST /api/meetings`, `GET /api/meetings/:id`
- Follow-ups: `GET /api/followups`, `PATCH /api/followups/:id`, `POST /api/followups/:id/comments`

All endpoints except `/api/auth/login` and `/api/auth/register` require `Authorization: Bearer <token>`.

## Dify Prompt
Backend function `buildDifyPrompt(meetingContent)` sends this instruction to Dify (see `server/src/utils/dify.ts`):
```json
{
  "summary": "string: concise summary of the meeting (<= 120 words)",
  "followUps": [
    {
      "title": "string: actionable follow-up item",
      "description": "string: details on what to do",
      "suggestedOwner": "string: name or role of the suggested responsible person",
      "dueDate": "string | null: YYYY-MM-DD if available, otherwise null",
      "priority": "LOW | MEDIUM | HIGH | null"
    }
  ]
}
```
The response **must** be strict JSON. The backend parses defensively, falling back to empty summary/followUps if parsing fails.

## Seed Data
`server/src/seed.ts` loads sample data:
- User: `admin@example.com` / `password123` (role: admin)
- Customers: `Acme Corp`
- Manufacturers: `Contoso Manufacturing`, `Fabrikam Industries`
- Products: `Contoso Widget`, `Fabrikam Gear`
- One sample meeting with a TODO follow-up

## One-command Startup (after env + install)
```bash
# Terminal 1
docker-compose up -d mysql
# Terminal 2
npm run dev:server
# Terminal 3
npm run dev:web
```
Navigate to http://localhost:5173.
