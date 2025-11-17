# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Pickleball League Match & Availability Scheduler** - a responsive, mobile-friendly web application for managing a pickleball league of approximately 50 players. The system allows players to set weekly availability, discover overlapping schedules with other players, challenge opponents to matches, and receive notifications via SMS and email.

## Tech Stack

### Backend
- **Language:** Python 3.11+
- **Framework:** FastAPI
- **ORM:** SQLAlchemy 2.0
- **Migrations:** Alembic
- **Authentication:** JWT (python-jose)
- **Password Hashing:** bcrypt (passlib)
- **Background Jobs:** APScheduler (in-process)
- **Rate Limiting:** SlowAPI

### Frontend
- **Framework:** React 18
- **Language:** TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router
- **HTTP Client:** Axios or Fetch API

### Database
- **PostgreSQL 15** (initially self-hosted, later managed)

### External Services
- **SMS:** Twilio
- **Email:** SendGrid

## Project Structure

```
pickleball-scheduler/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py           # FastAPI application entry point
│   │   ├── config.py         # Environment configuration
│   │   ├── database.py       # Database connection setup
│   │   ├── models/           # SQLAlchemy models
│   │   ├── routes/           # API endpoints
│   │   ├── services/         # Business logic
│   │   ├── utils/            # Auth, helpers
│   │   └── background/       # APScheduler jobs
│   ├── alembic/              # Database migrations
│   ├── requirements.txt
│   └── .env                  # Environment variables
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── context/          # React context (Auth, etc.)
│   │   └── utils/            # Frontend utilities
│   ├── package.json
│   └── vite.config.ts
└── docker-compose.yml
```

## Development Commands

### Backend Setup and Testing

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Create a new migration (after model changes)
alembic revision --autogenerate -m "description of changes"

# Start development server
uvicorn app.main:app --reload

# Access API documentation
# http://localhost:8000/docs (Swagger UI)
# http://localhost:8000/redoc (ReDoc)

# Run tests
pytest

# Run specific test file
pytest tests/test_availability.py

# Run with coverage
pytest --cov=app tests/
```

### Frontend Setup and Testing

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Run tests
npm test
```

### Database Commands

```bash
# Connect to PostgreSQL
psql -U postgres -d pickleball_scheduler

# Common PostgreSQL queries for debugging
# List all tables:
\dt

# Describe a table:
\d users

# View all users:
SELECT id, name, email, role, status FROM users;

# View recurring patterns for a user:
SELECT * FROM recurring_availability WHERE user_id = 1;

# View generated blocks:
SELECT id, user_id, start_time, end_time, generated_from_recurring
FROM availability_blocks
WHERE user_id = 1
ORDER BY start_time;
```

## Critical Architecture Concepts

### 1. Time Zone Handling (CRITICAL)

**All timestamps are stored in UTC but displayed/interpreted in the league's fixed timezone.**

- Database: All `TIMESTAMPTZ` columns store UTC
- Application layer: Backend handles ALL timezone conversions
- Frontend: Receives and displays times as converted by backend (no timezone logic in frontend)
- League timezone setting: Configurable (e.g., "America/New_York")
- Wall clock time: Availability times represent local time regardless of DST changes

**Implementation:**
```python
# Backend conversion utilities should be in utils/timezone.py
# - utc_to_league_time(utc_dt: datetime) -> datetime
# - league_time_to_utc(local_dt: datetime) -> datetime
# - get_league_timezone() -> timezone
```

**DST Handling:** Recurring patterns store local times (e.g., "7:00 PM"). When blocks are generated for specific weeks, they are converted to UTC based on the actual date, so the same pattern generates different UTC times before/after DST transitions.

### 2. Recurring Availability Model

Players can set recurring weekly patterns (e.g., "Every Monday 7-9 PM") which are stored in `recurring_availability` table. A **background job** runs nightly at 2 AM league time to generate actual `availability_blocks` for the current week + next week (2-week scheduling window).

**Block Generation Strategy:**
- Nightly background job generates blocks for all users
- Immediate regeneration when patterns are updated/deleted
- Users can add manual one-time blocks (`generated_from_recurring = NULL`)
- Users can delete individual blocks (one-time exceptions)
- Past blocks are never modified (matches may already be scheduled)

### 3. Match Lifecycle and Status Flow

```
pending → confirmed (Player B accepts)
pending → declined (Player B declines)
pending → expired (48h timeout OR 2h before match OR past start_time)
pending → canceled (Player A withdraws before response)

confirmed → canceled (Either player cancels before start_time)
```

**Expiration Logic:** Background job checks every 5 minutes for:
- Challenges older than 48 hours
- Challenges within 2 hours of start time
- Challenges where current time > start_time

### 4. Overlap Detection

The "Find Opponents" feature calculates which players have mutually available time slots:

- Query `availability_blocks` for matching times
- Exclude users on vacation or inactive status
- Exclude time slots where either user has a pending/confirmed match
- Performance target: <2 seconds for 50 players
- v1.0: Calculate on-demand; v1.1+: Pre-compute and cache if needed

### 5. Notification System

**Channels:** SMS (Twilio) and Email (SendGrid)

**Queue-based processing:** Notifications are queued in `notification_queue` table and processed by background job every minute.

**Failure Handling:**
- SMS permanent failure (invalid number, blocked) → Disable SMS, fallback to email
- SMS transient failure → Retry 3x with exponential backoff, fallback to email
- Email hard bounce → Disable email notifications
- Email soft bounce → Retry 3x, log but don't disable

**Quiet Hours:** Configurable per user (default 10 PM - 7 AM league time)
- Critical priority (match canceled <4h before, 2h reminder) → Send anyway
- High/Normal priority → Delay until quiet hours end

**Reminders:** Scheduled when match status becomes 'confirmed':
- 24 hours before match
- 2 hours before match
- Canceled if match is canceled

### 6. Admin Impersonation

Admins can "Act as Player" to troubleshoot issues:
- All actions logged to `admin_action_log` table
- Clear visual banner in frontend: "You are impersonating [Player Name]"
- Admin can perform any player action while impersonating
- Log includes: admin_id, acting_as_user_id, action, metadata, timestamp

### 7. Rate Limiting

**Authentication:**
- Login: 10 failed attempts/IP/hour, 6/email/hour
- Registration: 6/IP/day

**Challenges:**
- Create challenge: 40/player/day, 10 to same player/day, 6/minute
- Accept/decline: 200/day
- Cancel: 20/day

**Availability:**
- Update: 100/day
- Recurring pattern changes: 40/day

**General API:**
- Read (GET): 200/user/minute
- Write (POST/PUT/DELETE): 120/user/minute
- Overlap detection: 60/user/hour (expensive operation)

## Background Jobs (APScheduler)

All background jobs should be defined in `backend/app/background/jobs.py`:

1. **Block Generation** - Runs nightly at 2 AM league time
   - Generate availability blocks for all users with enabled recurring patterns
   - Current week + next week (2-week window)
   - Idempotent: Skip if blocks already exist

2. **Challenge Expiration** - Runs every 5 minutes
   - Set status='expired' for pending challenges that meet expiration criteria

3. **Vacation End Check** - Runs daily at midnight league time
   - Auto-revert status to 'active' for users where vacation_until has passed

4. **Notification Processing** - Runs every minute
   - Process notification queue
   - Check quiet hours
   - Send via Twilio/SendGrid
   - Handle failures and retries

5. **Cleanup Jobs** - Runs weekly
   - Clean up old sent/failed notifications (>30 days)
   - Archive old availability blocks (>2 weeks in past)

## Database Indexes

Critical indexes for performance (should be in migrations):

```sql
-- Availability blocks: overlap queries
CREATE INDEX idx_availability_blocks_user_time
  ON availability_blocks(user_id, start_time);
CREATE INDEX idx_availability_blocks_time_range
  ON availability_blocks(start_time, end_time);

-- Matches: conflict detection
CREATE INDEX idx_matches_player_a_time
  ON matches(player_a_id, start_time, end_time)
  WHERE status IN ('pending', 'confirmed');
CREATE INDEX idx_matches_player_b_time
  ON matches(player_b_id, start_time, end_time)
  WHERE status IN ('pending', 'confirmed');

-- Notifications: queue processing
CREATE INDEX idx_notification_queue_pending
  ON notification_queue(scheduled_for)
  WHERE sent_at IS NULL AND failed_at IS NULL;

-- Admin: impersonation logs
CREATE INDEX idx_admin_action_log_impersonation
  ON admin_action_log(acting_as_user_id, timestamp DESC)
  WHERE acting_as_user_id IS NOT NULL;
```

## Testing Strategy

### Backend Testing
- Use pytest with FastAPI TestClient
- Mock external services (Twilio, SendGrid) in tests
- Test timezone conversions thoroughly (including DST boundaries)
- Test conflict detection with various overlapping scenarios
- Test expiration logic with manipulated timestamps

### Frontend Testing
- React Testing Library for components
- Test mobile responsiveness (availability grid, challenge modal)
- Test accessibility (keyboard navigation, ARIA labels)

### Integration Testing
- Test complete user flows (register → set availability → challenge → accept)
- Test notification delivery end-to-end
- Test background job execution

## Common Development Tasks

### Adding a New Model
1. Create model class in `backend/app/models/`
2. Import model in `backend/app/models/__init__.py`
3. Generate migration: `alembic revision --autogenerate -m "add model_name"`
4. Review migration file, adjust if needed
5. Run migration: `alembic upgrade head`

### Adding a New API Endpoint
1. Create route function in appropriate `backend/app/routes/` file
2. Add business logic to `backend/app/services/` if complex
3. Include Pydantic schemas for request/response validation
4. Apply rate limiting decorator
5. Add authentication dependency if needed
6. Test in Swagger UI before building frontend

### Adding a New Notification Type
1. Add type to notification_type enum/constant
2. Update `services/notifications.py` with new template
3. Add trigger in relevant service (matches, availability, etc.)
4. Update notification preferences if user should be able to toggle it

## Environment Variables

Required in `backend/.env`:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pickleball_scheduler

# JWT
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080  # 7 days

# League Settings
LEAGUE_TIMEZONE=America/New_York

# Twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# SendGrid
SENDGRID_API_KEY=your-api-key
SENDGRID_FROM_EMAIL=noreply@yourleague.com

# Environment
ENVIRONMENT=development  # development | staging | production
DEBUG=True  # False in production

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## Security Considerations

- All passwords hashed with bcrypt
- JWT tokens for authentication (7-day expiration)
- HTTPS required in production
- Rate limiting on all endpoints (use SlowAPI)
- SQL injection prevention (SQLAlchemy parameterized queries)
- XSS prevention (React escapes by default, be careful with dangerouslySetInnerHTML)
- CORS properly configured (only allow frontend domain)
- Admin impersonation actions fully logged

## Mobile Responsiveness

**Critical mobile UI patterns:**
- Availability grid: Touch-friendly 30-min slots (min 44x44 pixels)
- Challenge modal: Stack inputs vertically on mobile
- Find Opponents: List view instead of grid on mobile
- Shared calendar: List view of available times instead of week grid
- Navigation: Hamburger menu on mobile

## Deployment

### v1.0 (Free Tier)
- Backend: Render.com free tier (accepts 15-30s cold start)
- Database: Render PostgreSQL free tier
- Frontend: Vercel free tier

### Running Migrations on Production
```bash
# SSH into Render or use Render shell
alembic upgrade head
```

### Creating Initial Admin User
```python
# Run in production Python shell or create a script
from app.database import SessionLocal
from app.models.user import User
from app.utils.auth import get_password_hash

db = SessionLocal()
admin = User(
    name="Admin User",
    email="admin@yourleague.com",
    password_hash=get_password_hash("secure-password"),
    role="admin",
    status="active"
)
db.add(admin)
db.commit()
```

## Useful Debugging Queries

```sql
-- Find all overlaps between two users for a specific week
SELECT ab1.start_time, ab1.end_time
FROM availability_blocks ab1
JOIN availability_blocks ab2
  ON ab1.start_time = ab2.start_time
  AND ab1.end_time = ab2.end_time
WHERE ab1.user_id = 1
  AND ab2.user_id = 2
  AND ab1.start_time >= '2025-11-16'
  AND ab1.start_time < '2025-11-23'
ORDER BY ab1.start_time;

-- Check for match conflicts
SELECT * FROM matches
WHERE (player_a_id = 1 OR player_b_id = 1)
  AND status IN ('pending', 'confirmed')
  AND start_time < '2025-11-17 20:00:00'
  AND end_time > '2025-11-17 19:00:00';

-- View pending notifications
SELECT * FROM notification_queue
WHERE sent_at IS NULL
  AND failed_at IS NULL
ORDER BY scheduled_for;
```

## References

- **Design Specification:** `pickleball_league_scheduler_design_v1_3.md` - Complete system design with all schemas, flows, and requirements
- **Setup Guide:** `claude_code_setup_guide.md` - Phase-by-phase implementation roadmap with 17-day MVP plan
