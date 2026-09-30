# TicketPass API

TicketPass is a Node.js and Express REST API for event listings and ticket reservations. It uses PostgreSQL for users, events, bookings, and refresh tokens; JWT bearer tokens for access control; and Zod for request validation.

## Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Environment configuration](#environment-configuration)
- [Database setup](#database-setup)
- [Run the API](#run-the-api)
- [Authentication](#authentication)
- [API endpoints](#api-endpoints)
- [Error responses](#error-responses)
- [Tests](#tests)
- [Security and current limitations](#security-and-current-limitations)

## Requirements

- Node.js 20.6 or later. The project uses Node's `--env-file` option in its start scripts.
- npm.
- A PostgreSQL database. Use a separate local or hosted database for tests; never point integration tests at production data.

## Installation

```sh
npm install
```

Create a local `.env` file in the repository root. `.env*` files are ignored by Git; do not commit database URLs, passwords, or JWT secrets.

## Environment configuration

The application reads these variables:

| Variable                  | Required | Purpose                                                                                | Example                                                             |
| ------------------------- | -------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `PORT`                    | No       | HTTP port. Defaults to `3000`.                                                         | `PORT=3000`                                                         |
| `DATABASE_URL`            | Yes      | PostgreSQL connection string.                                                          | `DATABASE_URL=postgresql://user:password@localhost:5432/ticketpass` |
| `JWT_SECRET`              | Yes      | Secret used to sign and verify access tokens. Use a high-entropy random value.         | `JWT_SECRET=replace-with-a-random-secret`                           |
| `ACCESS_TOKEN_EXPIRY`     | Yes      | JWT access-token lifetime accepted by `jsonwebtoken`.                                  | `ACCESS_TOKEN_EXPIRY=15m`                                           |
| `REFRESH_TOKEN_TILL_DAYS` | No       | Refresh-token lifetime in days. Defaults to `30`.                                      | `REFRESH_TOKEN_TILL_DAYS=30`                                        |
| `NODE_ENV`                | No       | Runtime mode; `production` enables TLS certificate configuration in the database pool. | `NODE_ENV=development`                                              |

Example `.env` layout (replace every placeholder with your own values):

```dotenv
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
JWT_SECRET=REPLACE_WITH_A_RANDOM_SECRET
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_TILL_DAYS=30
NODE_ENV=development
```

Generate a random JWT secret locally with Node.js:

```sh
node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('base64url'))"
```

If your database password contains characters reserved by a PostgreSQL URL, URL-encode those characters in `DATABASE_URL`. For hosted PostgreSQL providers, use the provider's required SSL options. Never paste real credentials into documentation or commit them to source control.

## Database setup

The schema consists of four tables:

- `users`: account identity, password hash, and role (`attendee` or `organizer`).
- `events`: organizer, event details, ticket price, and seat counts.
- `bookings`: event, attendee, seats booked, total amount, and booking status.
- `refresh_tokens`: refresh-token records and expiration timestamps.

The files in `src/migrations` each create their table when executed. The application does **not** run migrations automatically. Run each migration once against the database selected by `DATABASE_URL`, in this order:

```sh
node --env-file=.env src/migrations/2026_09_24_users_table.js
node --env-file=.env src/migrations/2026_09_24_events_table.js
node --env-file=.env src/migrations/2026_09_24_refresh_tokens_table.js
node --env-file=.env src/migrations/2026_09_24_bookings_tables.js
```

The migrations use `CREATE TABLE IF NOT EXISTS`, so running them again does not recreate existing tables. Back up important data before making schema changes.

### Isolated test database

The integration tests create users, events, and bookings, then delete the test users (related events and bookings cascade from those users). Configure a dedicated, disposable database before running them. Do not use your development or production database.

Create `.env.test` in the repository root with a test database URL and test-only signing secret:

```dotenv
DATABASE_URL=postgresql://TEST_USER:TEST_PASSWORD@TEST_HOST:5432/ticketpass_test?sslmode=require
JWT_SECRET=TEST_ONLY_RANDOM_SECRET
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_TILL_DAYS=30
NODE_ENV=test
```

`.env.test` is ignored by Git. This repository's database pool currently reads `DATABASE_URL`; it does not have a separate `TEST_DATABASE_URL` option. Passing `.env.test` to Node therefore ensures tests connect to the isolated database.

Create the schema in that test database with the same migration commands, replacing `--env-file=.env` with `--env-file=.env.test`. Then run tests with:

```sh
node --env-file=.env.test node_modules/vitest/vitest.mjs run
```

To run only one suite:

```sh
node --env-file=.env.test node_modules/vitest/vitest.mjs run tests/events.test.js
node --env-file=.env.test node_modules/vitest/vitest.mjs run tests/booking.test.js
```

`npm test` runs Vitest but does not load an env file by itself. On a machine without a database configured through the process environment, use the explicit `.env.test` command above.

## Run the API

Start in development mode with nodemon:

```sh
npm run dev
```

Start without nodemon:

```sh
npm start
```

Both scripts start `src/index.js`. `npm run dev` loads the local `.env` file; `npm start` uses environment variables already provided by the shell or hosting platform (such as Railway). Configure `DATABASE_URL`, `JWT_SECRET`, and `ACCESS_TOKEN_EXPIRY` in the Railway service's Variables settings. By default the API listens at `http://localhost:3000`.

Health check:

```http
GET /health
```

Example response:

```json
{ "status": "ok" }
```

## Authentication

Except for signup, signin, and refresh, API routes require an access token in the `Authorization` header:

```http
Authorization: Bearer ACCESS_TOKEN
```

### Sign up

```http
POST /api/v1/auth/signup
Content-Type: application/json
```

```json
{
  "name": "Alex Morgan",
  "email": "alex@example.com",
  "password": "choose-a-strong-password",
  "role": "attendee"
}
```

Set `role` to `attendee` or `organizer`. Signup returns `accessToken`, `refreshToken`, and a user object. Use a separate organizer account to create and manage events.

### Sign in

```http
POST /api/v1/auth/signin
Content-Type: application/json
```

```json
{
  "email": "alex@example.com",
  "password": "choose-a-strong-password"
}
```

Signin requires only email and password. The response includes an access token and a refresh token. Signin is limited to five attempts per IP in a 15-minute window; the app also applies a general rate limit of 100 requests per IP per 15 minutes.

### Refresh tokens

When a protected request returns `401` because its access token expired, send the current refresh token:

```http
POST /api/v1/auth/refresh
Content-Type: application/json
```

```json
{
  "refreshToken": "CURRENT_REFRESH_TOKEN"
}
```

The response contains a new access token and a new refresh token. Replace both saved tokens: refresh tokens rotate and the old token is deleted when it is used.

## API endpoints

All routes are prefixed with `/api/v1`. Unless marked public, send a Bearer access token. Request and response bodies are JSON.

### Events

| Method and path      | Access                 | Description                                                     |
| -------------------- | ---------------------- | --------------------------------------------------------------- |
| `GET /events`        | Any authenticated user | List events.                                                    |
| `GET /events/:id`    | Any authenticated user | Fetch one event.                                                |
| `POST /events`       | Organizer              | Create an event. The authenticated organizer becomes its owner. |
| `PATCH /events/:id`  | Owning organizer       | Update event fields.                                            |
| `DELETE /events/:id` | Owning organizer       | Delete an event.                                                |

Create event example:

```http
POST /api/v1/events
Authorization: Bearer ORGANIZER_ACCESS_TOKEN
Content-Type: application/json
```

```json
{
  "title": "Live at Test Hall",
  "description": "An evening performance",
  "venue": "Test Hall",
  "event_date": "2030-12-31T19:00:00.000Z",
  "ticket_price": 35,
  "total_seats": 120
}
```

`event_date` must be a future ISO 8601 timestamp with a timezone. `ticket_price` must be zero or greater. `total_seats` must be a positive integer. On creation, available seats start at the total seat count; clients should not supply `organizer_id` or `available_seats`.

An update can contain one or more supported fields:

```json
{
  "title": "Updated Event Name",
  "ticket_price": 40
}
```

An organizer may only update or delete events that they own. A different organizer receives `403`.

### Bookings

| Method and path                    | Access                   | Description                                    |
| ---------------------------------- | ------------------------ | ---------------------------------------------- |
| `GET /bookings`                    | Organizer                | List bookings across all events and attendees. |
| `GET /bookings/my-bookings`        | Attendee                 | List the signed-in attendee's bookings.        |
| `GET /bookings/my-bookings/:id`    | Booking owner (attendee) | Fetch one of the attendee's bookings.          |
| `POST /bookings`                   | Attendee                 | Book seats for an event.                       |
| `PATCH /bookings/my-bookings/:id`  | Booking owner (attendee) | Change the booking status.                     |
| `DELETE /bookings/my-bookings/:id` | Booking owner (attendee) | Delete the booking.                            |

Create a booking for an existing event:

```http
POST /api/v1/bookings
Authorization: Bearer ATTENDEE_ACCESS_TOKEN
Content-Type: application/json
```

```json
{
  "event_id": 12,
  "seatsBooked": 2
}
```

The event ID must exist, and the requested seats must be positive and no greater than the event's available seats. The server sets the attendee ID and initial `confirmed` status from the authenticated request, calculates `total_amount` from the event's ticket price, and decreases available seats.

Update status with:

```http
PATCH /api/v1/bookings/my-bookings/34
Authorization: Bearer ATTENDEE_ACCESS_TOKEN
Content-Type: application/json
```

```json
{
  "status": "cancelled"
}
```

The accepted statuses are `confirmed` and `cancelled`. A cancelled booking cannot be re-confirmed. Cancelling restores its seats to the event. Attendees cannot read, update, or delete another attendee's booking.

## Error responses

Errors use JSON. Application and authorization errors generally look like:

```json
{
  "error": "Description of the problem"
}
```

Validation errors may include details:

```json
{
  "error": "Invalid data",
  "details": [{ "message": "field is invalid" }]
}
```

Common status codes:

| Status | Meaning                                                                                              |
| ------ | ---------------------------------------------------------------------------------------------------- |
| `400`  | Invalid JSON, missing/invalid fields, or an unsupported state change.                                |
| `401`  | Missing, malformed, expired, or invalid access token; invalid credentials; or invalid refresh token. |
| `403`  | The user's role or ownership does not permit the operation.                                          |
| `404`  | The requested event, booking, or user was not found.                                                 |
| `409`  | The requested booking exceeds available event capacity.                                              |
| `500`  | Unexpected server or database error.                                                                 |

Send a JSON object directly with `Content-Type: application/json`. Do not wrap the whole object in quotes or JSON-stringify it more than once.

## Tests

The tests use Vitest and Supertest and make real requests against the Express app and PostgreSQL database. The event and booking integration suites create temporary user accounts and delete those users afterward; related test events and bookings are removed by database foreign-key cascades.

Use only the isolated `.env.test` database described under [Database setup](#isolated-test-database):

```sh
node --env-file=.env.test node_modules/vitest/vitest.mjs run
```

Do not run the integration suites against a production database. `npm test` is the package script, but it does not load `.env.test` automatically.

## Security and current limitations

- Keep `.env`, `.env.test`, JWT secrets, and database credentials private. Rotate credentials that have been exposed.
- Passwords are stored as bcrypt hashes; access tokens are signed JWTs; refresh tokens are stored in PostgreSQL with expiration times and rotated when refreshed.
- Helmet security headers and IP-based rate limits are enabled. CORS currently allows every origin; restrict this to trusted application origins before production deployment.
- Booking capacity changes are currently separate database operations, not one transaction with row locking. Concurrent requests may race for the last seats; use a PostgreSQL transaction and `SELECT ... FOR UPDATE` before relying on this API for high-volume sales.
- Signup requires a role but does not currently validate it against a strict enum. Use only `attendee` or `organizer`; those are the roles recognized by route authorization.
- Migration scripts are standalone and are not run automatically when the server starts.
- Event read routes currently require authentication, even though the conceptual project brief describes event browsing as public.
