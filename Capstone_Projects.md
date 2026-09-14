# Node.js & Express Capstone Projects

This document contains 3 comprehensive, independent capstone projects for students who have completed the [Node.js & Express Course](../node_express_class_notes/Node_Express_Course_Outline.md).

Each project is designed to evaluate a student's ability to architect, build, secure, test, and deploy a production-grade REST API from scratch without using an ORM.

---

## Universal Project Requirements

Every project must satisfy the standard architectural and technical benchmarks taught throughout Weeks 1–6:

1. **Architecture:**
   * Strict 3-layer separation: **Router $\rightarrow$ Controller $\rightarrow$ Service $\rightarrow$ Model**.
   * Controllers handle only HTTP parsing (`req.params`, `req.query`, `req.body`) and response formatting.
   * Services encapsulate all business logic.
   * Models execute database operations and return plain JavaScript data.
   * All API routes must be versioned under `/api/v1`.

2. **Database & Raw SQL:**
   * Powered by a serverless PostgreSQL database (e.g., [Neon](https://neon.tech/)) using `pg.Pool`.
   * Version-controlled, hand-rolled migration scripts (`up()` and `down()`).
   * 100% raw parameterized SQL queries (`$1, $2`) — **no ORM or query builder (no Prisma, Drizzle, Sequelize, or Knex)**.
   * Proper foreign key constraints with `ON DELETE CASCADE` or `ON DELETE RESTRICT` where appropriate.

3. **Authentication & Authorization:**
   * Password hashing using `bcryptjs` (salt cost $\ge 10$).
   * Short-lived JWT access tokens (15m–1h) and long-lived rotating refresh tokens stored in a database `refresh_tokens` table.
   * Custom authentication middleware validating `Authorization: Bearer <token>`.
   * Strict resource scoping: all user-owned data must be filtered by `WHERE user_id = $1` with `403 Forbidden` checks on update/delete operations.

4. **Validation & Error Handling:**
   * Runtime request validation via **Zod** schemas executed in a reusable `validateData` middleware.
   * Centralized error middleware catching operational errors via a `CustomError` class with status codes.
   * Consistent JSON error response contracts across all endpoints.

5. **Security & Hardening:**
   * Security HTTP headers with `helmet`.
   * Tiered rate limiting via `express-rate-limit`: standard global limiter plus a strict brute-force limiter on `/api/v1/auth/login`.
   * CORS configured for cross-origin client apps.
   * HTTP request logging via `morgan` or `pino-http`.

6. **Automated Testing & CI/CD:**
   * Integration test suite written with **Vitest** and **Supertest** running against an isolated test database.
   * Coverage must include: auth signup/login/refresh, happy paths for CRUD, input validation rejection (400), unauthenticated requests (401), and unauthorized access (403).
   * GitHub Actions workflow (`.github/workflows/ci.yml`) running `npm test` automatically on every push and PR.

7. **Deployment:**
   * Deployed live to a cloud platform (Railway or Render) connected to a production Neon PostgreSQL database.
   * Exported Postman collection saved directly inside the project repository (`postman/collection.json`).

---

## Project 1: Expense & Budget Management API (*ExpensePulse*)

### 1. Overview
A personal finance backend that allows individuals to track their financial transactions (income and expenses), organize them under custom categories, view monthly spending breakdowns, and query filtered financial histories.

### 2. Database Schema (Raw SQL)
* **`users`**: `id` (UUID or SERIAL PRIMARY KEY), `email` (VARCHAR UNIQUE), `password_hash` (VARCHAR), `created_at` (TIMESTAMPTZ).
* **`categories`**: `id` (SERIAL PRIMARY KEY), `user_id` (INTEGER REFERENCES users(id) ON DELETE CASCADE), `name` (VARCHAR), `type` (VARCHAR: `'income'` or `'expense'`), `created_at` (TIMESTAMPTZ).
* **`expenses`**: `id` (SERIAL PRIMARY KEY), `user_id` (INTEGER REFERENCES users(id) ON DELETE CASCADE), `category_id` (INTEGER REFERENCES categories(id) ON DELETE RESTRICT), `amount` (NUMERIC(12, 2)), `description` (TEXT), `expense_date` (DATE), `created_at` (TIMESTAMPTZ).
* **`refresh_tokens`**: `id` (SERIAL PRIMARY KEY), `user_id` (INTEGER REFERENCES users(id) ON DELETE CASCADE), `token_hash` (VARCHAR), `expires_at` (TIMESTAMPTZ), `created_at` (TIMESTAMPTZ).

### 3. API Contract
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/signup` | Public | Register new user; returns access + refresh tokens |
| `POST` | `/api/v1/auth/login` | Public (Rate Limited) | Authenticate user; returns token pair |
| `POST` | `/api/v1/auth/refresh` | Public | Rotates refresh token and issues new access token |
| `GET` | `/api/v1/categories` | User | List categories for logged-in user |
| `POST` | `/api/v1/categories` | User | Create a custom category |
| `DELETE` | `/api/v1/categories/:id` | User | Delete category (restricted if transactions exist) |
| `GET` | `/api/v1/expenses` | User | List expenses with pagination (`limit`, `offset`), sorting, and filters (`start_date`, `end_date`, `category_id`) |
| `GET` | `/api/v1/expenses/summary` | User | Aggregated breakdown (`SUM(amount)`, `GROUP BY category_id`) for a specified month |
| `POST` | `/api/v1/expenses` | User | Create an expense record |
| `GET` | `/api/v1/expenses/:id` | User | Get single expense details |
| `PATCH` | `/api/v1/expenses/:id` | User | Partial update of an expense |
| `DELETE` | `/api/v1/expenses/:id` | User | Delete an expense |

### 4. Technical Challenges
* **Dynamic SQL Updating:** Build a dynamic SQL `UPDATE ... SET` statement based on whichever fields are provided in the `PATCH` body.
* **Aggregations in SQL:** Write a raw aggregation query using `SUM` and `GROUP BY` that joins `expenses` and `categories` to return total expenditures grouped by category name.
* **Ownership Enforcement:** Verify that both the `category_id` provided during expense creation and the expense itself belong to the authenticated user.

---

## Project 2: Event Ticketing & Reservation API (*TicketPass*)

### 1. Overview
A ticketing platform where event organizers schedule and manage events, while attendees search for upcoming events and reserve or cancel tickets.

### 2. Database Schema (Raw SQL)
* **`users`**: `id` (SERIAL PRIMARY KEY), `name` (VARCHAR), `email` (VARCHAR UNIQUE), `password_hash` (VARCHAR), `role` (VARCHAR: `'attendee'` or `'organizer'`), `created_at` (TIMESTAMPTZ).
* **`events`**: `id` (SERIAL PRIMARY KEY), `organizer_id` (INTEGER REFERENCES users(id) ON DELETE CASCADE), `title` (VARCHAR), `description` (TEXT), `location` (VARCHAR), `event_date` (TIMESTAMPTZ), `total_seats` (INTEGER), `available_seats` (INTEGER), `created_at` (TIMESTAMPTZ).
* **`bookings`**: `id` (SERIAL PRIMARY KEY), `event_id` (INTEGER REFERENCES events(id) ON DELETE CASCADE), `user_id` (INTEGER REFERENCES users(id) ON DELETE CASCADE), `seats_booked` (INTEGER), `status` (VARCHAR: `'confirmed'` or `'cancelled'`), `created_at` (TIMESTAMPTZ).
* **`refresh_tokens`**: `id` (SERIAL PRIMARY KEY), `user_id` (INTEGER REFERENCES users(id) ON DELETE CASCADE), `token_hash` (VARCHAR), `expires_at` (TIMESTAMPTZ), `created_at` (TIMESTAMPTZ).

### 3. API Contract
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/signup` | Public | Register user with role (`attendee` / `organizer`) |
| `POST` | `/api/v1/auth/login` | Public (Rate Limited) | Authenticate user |
| `POST` | `/api/v1/auth/refresh` | Public | Rotate refresh token |
| `GET` | `/api/v1/events` | Public | List upcoming events with pagination, location filter, and sorting |
| `GET` | `/api/v1/events/:id` | Public | View specific event details |
| `POST` | `/api/v1/events` | Organizer | Create an event |
| `PATCH` | `/api/v1/events/:id` | Organizer | Update event details (organizer only) |
| `DELETE` | `/api/v1/events/:id` | Organizer | Delete event (organizer only) |
| `POST` | `/api/v1/bookings` | Attendee | Reserve tickets for an event |
| `GET` | `/api/v1/bookings/my-bookings` | Attendee | List all bookings made by the current user |
| `PATCH` | `/api/v1/bookings/:id/cancel` | Attendee | Cancel an active booking and release reserved seats |

### 4. Technical Challenges
* **Concurrency & Race Conditions:** Ticket reservations must use atomic PostgreSQL transactions (`BEGIN ... COMMIT ... ROLLBACK`) with `SELECT ... FOR UPDATE` to lock the event row, verify that `available_seats >= seats_booked`, deduct seats, and create the booking row safely.
* **Role-Based Route Guards:** Create role-authorization middleware ensuring only users with `role: 'organizer'` can mutate events.
* **Zod Date Validation:** Ensure submitted `event_date` is strictly in the future.

---

## Project 3: Fitness Workout & Routine Logger API (*FitLog*)

### 1. Overview
A specialized health and fitness API where users create structured workout sessions containing multiple exercises, track weights/reps, and monitor their training consistency.

### 2. Database Schema (Raw SQL)
* **`users`**: `id` (SERIAL PRIMARY KEY), `email` (VARCHAR UNIQUE), `password_hash` (VARCHAR), `created_at` (TIMESTAMPTZ).
* **`workouts`**: `id` (SERIAL PRIMARY KEY), `user_id` (INTEGER REFERENCES users(id) ON DELETE CASCADE), `title` (VARCHAR), `workout_date` (DATE), `duration_minutes` (INTEGER), `notes` (TEXT), `created_at` (TIMESTAMPTZ).
* **`exercises`**: `id` (SERIAL PRIMARY KEY), `workout_id` (INTEGER REFERENCES workouts(id) ON DELETE CASCADE), `name` (VARCHAR), `sets` (INTEGER), `reps` (INTEGER), `weight_kg` (NUMERIC(6, 2)), `created_at` (TIMESTAMPTZ).
* **`refresh_tokens`**: `id` (SERIAL PRIMARY KEY), `user_id` (INTEGER REFERENCES users(id) ON DELETE CASCADE), `token_hash` (VARCHAR), `expires_at` (TIMESTAMPTZ), `created_at` (TIMESTAMPTZ).

### 3. API Contract
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/signup` | Public | Register user |
| `POST` | `/api/v1/auth/login` | Public (Rate Limited) | Authenticate user |
| `POST` | `/api/v1/auth/refresh` | Public | Rotate refresh token |
| `GET` | `/api/v1/workouts` | User | List workouts with pagination, date filters (`from`, `to`), and sorting |
| `POST` | `/api/v1/workouts` | User | Create a workout session along with an array of initial exercises |
| `GET` | `/api/v1/workouts/:id` | User | Fetch workout with all related exercises nested in JSON |
| `PATCH` | `/api/v1/workouts/:id` | User | Update workout metadata (title, duration, notes) |
| `DELETE` | `/api/v1/workouts/:id` | User | Delete workout and cascade delete all exercises |
| `POST` | `/api/v1/workouts/:id/exercises`| User | Append a new exercise to an existing workout |
| `PATCH` | `/api/v1/exercises/:id` | User | Update a specific exercise's sets, reps, or weight |
| `DELETE` | `/api/v1/exercises/:id` | User | Remove an exercise entry |

### 4. Technical Challenges
* **Nested Writes via Transactions:** Implement `POST /api/v1/workouts` such that the workout record is created first, its generated ID retrieved, and the array of exercise objects inserted in bulk within the same SQL transaction.
* **Nested Zod Validation:** Validate request payloads containing an array of objects (`z.array(exerciseSchema).min(1)`).
* **JSON Aggregation in SQL:** Construct `GET /api/v1/workouts/:id` using PostgreSQL `json_agg` or multiple coordinated queries to return the workout with its child exercises nested cleanly under an `exercises` array.

---

## Submission & Deliverables Checklist

For any chosen capstone project, the student must submit:

1. **GitHub Repository:** Containing clean commits, meaningful PR history, migration files, and configuration.
2. **CI Pipeline:** A working `.github/workflows/ci.yml` file with a green checkmark demonstrating passing tests.
3. **Live API URL:** A deployed base URL on Railway or Render with a working `GET /health` endpoint.
4. **Postman Collection:** A versioned collection file (`postman/collection.json`) documenting all endpoints and environment variables.
5. **Demonstration Video:** A 3–5 minute recorded walkthrough showing:
   * Signup, login, and token refresh.
   * Full CRUD operations with proper authorization checks.
   * Running test suite via terminal (`npm test`).
