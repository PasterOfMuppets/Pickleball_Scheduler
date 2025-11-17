# Pickleball League Scheduler

A responsive, mobile-friendly web application for managing a pickleball league. Players can set weekly availability, discover overlapping schedules, challenge opponents to matches, and receive notifications via SMS and email.

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15 (via Docker)

### 1. Start the Database

```bash
docker-compose up -d
```

This starts PostgreSQL on port 5433 (to avoid conflicts with other PostgreSQL instances).

### 2. Set Up Backend

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload
```

Backend will be available at:
- API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health
- Database health: http://localhost:8000/health/db

### 3. Set Up Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at: http://localhost:5173

## Project Structure

```
pickleball-scheduler/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── main.py      # FastAPI application
│   │   ├── config.py    # Configuration
│   │   ├── database.py  # Database connection
│   │   ├── models/      # SQLAlchemy models
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic
│   │   ├── utils/       # Utilities
│   │   └── background/  # Background jobs
│   ├── alembic/         # Database migrations
│   └── requirements.txt
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   └── context/     # React context
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml   # PostgreSQL container
└── CLAUDE.md           # Development guide
```

## Tech Stack

### Backend
- FastAPI - Modern Python web framework
- SQLAlchemy 2.0 - ORM
- Alembic - Database migrations
- PostgreSQL - Database (psycopg3 driver)
- Twilio - SMS notifications
- SendGrid - Email notifications
- APScheduler - Background jobs

### Frontend
- React 18 - UI framework
- TypeScript - Type safety
- Vite - Build tool
- Tailwind CSS - Styling
- React Router - Navigation
- Axios - HTTP client

## Development Commands

### Backend

```bash
# Run database migrations
alembic upgrade head

# Create a new migration
alembic revision --autogenerate -m "description"

# Start server
uvicorn app.main:app --reload

# Run tests
pytest

# Run tests with coverage
pytest --cov=app tests/
```

### Frontend

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Database

```bash
# Connect to PostgreSQL
psql -h localhost -p 5433 -U postgres -d pickleball_scheduler

# Stop database
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Environment Variables

See `backend/.env.example` for all required environment variables. Key settings:

- `DATABASE_URL` - PostgreSQL connection string
- `LEAGUE_TIMEZONE` - League timezone (e.g., America/New_York)
- `TWILIO_*` - Twilio credentials for SMS
- `SENDGRID_*` - SendGrid credentials for email

## Next Steps

The project is bootstrapped and ready for development. Follow the implementation roadmap in `claude_code_setup_guide.md`:

**Phase 1:** Authentication & Users (Days 2-3)
- User model
- JWT authentication
- Login/register endpoints

**Phase 2:** Recurring Availability (Days 4-5)
- Recurring patterns
- Block generation
- Weekly calendar

**Phase 3:** Match Challenges (Days 6-8)
- Match model
- Challenge flow
- Conflict detection

See the full roadmap in `claude_code_setup_guide.md`.

## Documentation

- **CLAUDE.md** - Development guide for Claude Code
- **pickleball_league_scheduler_design_v1_3.md** - Complete system design specification
- **claude_code_setup_guide.md** - Phase-by-phase implementation roadmap

## License

MIT
