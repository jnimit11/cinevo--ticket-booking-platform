# Cinevo — Movie Ticket Booking Platform

Cinevo is a full-stack cinema booking web platform featuring server-side movie search and pagination, showtime scheduling, an interactive seat reservation grid, user authentication, and admin management.

---

## Technology Stack

- **Backend**: Node.js (ES Modules), Express 4, Drizzle ORM, `pg` (node-postgres), Zod, JWT (`jsonwebtoken`), Node Test Runner (`node --test`).
- **Frontend**: React 19, Vite 8, Tailwind CSS 4, ESLint 10, Vanilla CSS design tokens.
- **Database & Infrastructure**: PostgreSQL 17 via Docker & Docker Compose, Drizzle Kit for schema migrations.

---

## Prerequisites

- **Node.js**: v20.0.0 or higher (required for native `node --test` runner and ESM support).
- **npm**: v10.0.0 or higher.
- **Docker & Docker Compose**: Docker Desktop or Docker Engine with Compose V2.

---

## Project Structure

```text
cinevo/
├── docker-compose.yml       # PostgreSQL 17 container configuration
├── .env.example             # Root environment template for Docker Compose
├── backend/
│   ├── .env.example         # Backend environment template
│   ├── drizzle/             # Drizzle Kit migration files
│   ├── drizzle.config.js    # Drizzle ORM migration configuration
│   ├── package.json         # Backend scripts and dependencies
│   ├── scripts/
│   │   └── seed-movies.js   # 16-movie idempotent catalogue seeder
│   ├── src/
│   │   ├── config/          # Environment configuration & JWT validation
│   │   ├── controllers/     # Route controllers (movies, showtimes, bookings, etc.)
│   │   ├── db/              # Database pool & Drizzle schema definitions
│   │   ├── routes/          # Express route declarations
│   │   ├── utils/           # Utilities (e.g., LIKE/ILIKE wildcard escaping)
│   │   └── validators/      # Zod validation schemas
│   └── tests/               # Backend unit and concurrency test suites
└── frontend/
    ├── package.json         # Frontend scripts and dependencies
    ├── src/
    │   ├── App.jsx          # Main application & routing logic
    │   ├── App.css          # Design tokens and responsive styles
    │   └── lib/api.js       # Typed API client and query builders
    └── tests/               # Frontend unit test suites
```

---

## Setup & Getting Started

### 1. Clone & Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root directory
cd ..
```

### 2. Environment Configuration

Create the environment files from the provided templates:

#### Root Environment (Docker Compose)
Copy `.env.example` to `.env` in the project root:
```bash
cp .env.example .env
```
Set a secure PostgreSQL password:
```env
POSTGRES_PASSWORD=your_secure_postgres_password_here
```

#### Backend Environment
Copy `backend/.env.example` to `backend/.env`:
```bash
cp backend/.env.example backend/.env
```
Configure backend settings:
```env
PORT=5000
DATABASE_URL=postgresql://cinevo_user:<POSTGRES_PASSWORD>@localhost:5432/cinevo
JWT_SECRET=your_jwt_secret_key_minimum_32_characters_long
JWT_EXPIRES_IN=1d
```

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `PORT` | No | `5000` | Port for Express HTTP server |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string. Replace `<POSTGRES_PASSWORD>` with the password configured in root `.env`. If your password contains reserved URL characters (e.g. `@`, `:`, `/`, `?`, `#`, `%`), percent-encode them to ensure valid connection string parsing. |
| `JWT_SECRET` | **Yes** | — | Secret string for signing auth tokens (minimum 32 chars) |
| `JWT_EXPIRES_IN` | No | `1d` | Token expiration duration (e.g. `1d`, `7d`, `2h`) |

*Note: The frontend currently connects to `http://localhost:5000/api` directly via `frontend/src/lib/api.js` and does not require an additional `.env` file.*

---

### 3. Start Database Services

Start the PostgreSQL 17 container:
```bash
docker compose up -d
```
Verify the container is healthy:
```bash
docker compose ps
```

---

### 4. Apply Database Migrations

Run Drizzle schema migrations to initialize tables, enum types, and check constraints:
```bash
cd backend
npm run db:migrate
```

---

### 5. (Optional) Seed Sample Movie Catalogue

Populate the database with 16 realistic sample movies:
```bash
cd backend
npm run db:seed
```

**Seeder Behavior & Features:**
- **Catalogue**: Inserts 16 movies across multiple Indian and international languages (English, Hindi, Tamil, Telugu, Malayalam, Kannada, Bengali, Marathi, Spanish, French, Japanese, Korean).
- **Poster Fallbacks**: Includes 2 movies with `posterUrl: null` (`The Silk Trail`, `Karavali Kogile`) to test frontend poster fallback layouts.
- **Idempotency**: Sequentially idempotent, but not concurrency-safe. The database schema does not enforce a UNIQUE constraint on movie titles, so concurrent seed executions could insert duplicate titles. For sequential developer runs, it matches trimmed, lowercase titles against existing records and skips already present entries (`0 new movies inserted, 16 skipped`).

---

### 6. Start Development Servers

Open two separate terminals to run the backend and frontend:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Starts backend server at http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Starts Vite dev server at http://localhost:5173
```

Navigate to `http://localhost:5173` in your browser.

---

## Running Automated Tests & Code Quality

### Backend Unit Tests
Executes unit tests for SQL wildcard escaping, PostgreSQL integer boundary validation, JWT configuration, and login error handling:
```bash
cd backend
npm run test:unit
```

### Frontend Unit Tests
Executes frontend unit tests for query string construction, API error handling, and pagination boundary transitions:
```bash
cd frontend
npm test
```

### Frontend Linting
Runs ESLint across frontend JavaScript and JSX files:
```bash
cd frontend
npm run lint
```

### Frontend Production Build
Validates bundling and asset production:
```bash
cd frontend
npm run build
```

*Note on Concurrency Tests: `npm run test:concurrency` in `backend/` tests race conditions on showtime bookings. It executes multiple parallel booking attempts against the configured database and should only be run against disposable test databases.*

---

## Key Features

1. **Movie Catalogue**:
   - Server-side title search with LIKE/ILIKE wildcard escaping (`%`, `_`, `\`).
   - Server-side pagination with bounded limits (`limit <= 50`).
   - Client-side debounced search input (300ms) with instant filter clearing.
   - Dynamic language filter dropdown populated from active catalogue records.
   - Poster fallbacks for movies with missing or failed poster URLs.
2. **Movie Details & Showtimes**:
   - Deep-linking via hash routes (`#movie/:id`).
   - Duration formatting (`2h 25m`), formatted release dates, and full descriptions.
   - Showtimes list with cinema name, screen, date/time, and ticket price in INR (`₹250.00`).
   - Dedicated empty state when a movie has no scheduled screenings.
3. **Interactive Seat Selection Grid**:
   - Visual 220-seat layout with screen orientation banner and availability legend.
   - Real-time pricing calculation based on selected seat count ($N \times \text{ticketPrice}$).
   - Strict booking cap: Enforces a maximum limit of 12 seats (`MAX_BOOKING_SEATS = 12`) with automatic button disabling when the limit is reached.
4. **Authentication & Booking Guard**:
   - Unauthenticated users cannot dispatch booking requests; the primary button prompts *"Continue to Booking"*.
   - Inline authentication form allows logging in or registering without losing selected seats.

---

## Known Limitations

- **Booking Creation Verification**: During the Phase 3 read-only verification audits, runtime booking submission was intentionally omitted to prevent modifying test accounts or writing unverified records to the development database.
- **Frontend API Base URL**: `frontend/src/lib/api.js` points to `http://localhost:5000/api`. In containerized or reverse-proxy production deployments, this should be made configurable via Vite environment variables (`import.meta.env.VITE_API_URL`).
