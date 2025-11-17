# Claude Code Setup Guide
## Pickleball League Scheduler - Build Priority

This guide provides a prioritized, step-by-step approach to building the pickleball scheduler using Claude Code. Each phase builds on the previous one and delivers working functionality.

---

## 🎯 Overall Strategy

**Goal:** Get to a working MVP as quickly as possible, then iterate.

**Principle:** Backend-first approach with stub endpoints, then build frontend to consume them.

**Testing:** Manual testing via Swagger UI before building frontend.

---

## 📋 Phase 0: Project Bootstrap (Day 1)

### Priority: CRITICAL
Set up the project structure and core infrastructure.

### Tasks:

1. **Initialize project structure**
   ```
   pickleball-scheduler/
   ├── backend/
   │   ├── app/
   │   │   ├── __init__.py
   │   │   ├── main.py
   │   │   ├── config.py
   │   │   ├── database.py
   │   │   ├── models/
   │   │   ├── routes/
   │   │   ├── services/
   │   │   └── utils/
   │   ├── alembic/
   │   ├── requirements.txt
   │   ├── .env.example
   │   └── Dockerfile
   ├── frontend/
   │   ├── src/
   │   ├── package.json
   │   └── vite.config.ts
   └── docker-compose.yml
   ```

2. **Set up backend basics**
   - Create FastAPI app in `main.py`
   - Configure database connection in `database.py`
   - Set up environment variables in `config.py`
   - Create `.env` file from `.env.example`

3. **Set up database**
   - Install PostgreSQL (via Docker or locally)
   - Initialize Alembic for migrations
   - Test database connection

4. **Set up frontend basics**
   - Initialize React + Vite + TypeScript project
   - Install Tailwind CSS
   - Install React Router
   - Create basic layout component

5. **Verify setup**
   - Backend: `uvicorn app.main:app --reload` → http://localhost:8000
   - Frontend: `npm run dev` → http://localhost:5173
   - Database: `psql` connection test
   - API docs: http://localhost:8000/docs

**Success Criteria:**
✅ Backend returns "Hello World"
✅ Frontend displays a page
✅ Database connection works
✅ Swagger UI is accessible

---

## 📋 Phase 1: Authentication & Users (Days 2-3)

### Priority: HIGH
Users need to log in before doing anything else.

### Backend Tasks:

1. **Create User model** (`models/user.py`)
   - Follow schema from design spec
   - Create Alembic migration
   - Run migration: `alembic upgrade head`

2. **Create auth utilities** (`utils/auth.py`)
   - Password hashing (bcrypt)
   - JWT token generation
   - JWT token verification
   - Get current user dependency

3. **Create auth routes** (`routes/auth.py`)
   - `POST /api/auth/register` - Create new user (with SMS consent)
   - `POST /api/auth/login` - Return JWT token
   - `GET /api/auth/me` - Get current user (protected)
   - Apply rate limiting (10 login attempts/hour per IP)

4. **Create user routes** (`routes/users.py`)
   - `GET /api/users/me` - Get own profile
   - `PUT /api/users/me` - Update own profile
   - `PATCH /api/users/me/vacation` - Set vacation mode

5. **Test via Swagger UI**
   - Register a user
   - Log in → get token
   - Use token to access `/api/auth/me`

### Frontend Tasks:

1. **Create auth context** (`src/context/AuthContext.tsx`)
   - Store JWT token in localStorage
   - Provide login/logout/register functions
   - Provide current user state

2. **Create auth pages**
   - `src/pages/Login.tsx`
   - `src/pages/Register.tsx` (with SMS consent checkbox)

3. **Create protected route wrapper**
   - Redirect to login if not authenticated

4. **Create basic navbar**
   - Show user name when logged in
   - Logout button

**Success Criteria:**
✅ Can register a new user with SMS consent
✅ Can log in and receive JWT token
✅ Frontend stores token and uses it for API calls
✅ Protected routes redirect unauthenticated users
✅ Can see own user profile

**Estimated Time:** 1-2 days

---

## 📋 Phase 2: Recurring Availability (Days 4-5)

### Priority: HIGH
Core feature - users need to set their schedules.

### Backend Tasks:

1. **Create models** (`models/availability.py`)
   - RecurringAvailability model
   - AvailabilityBlock model
   - Create Alembic migration

2. **Create availability service** (`services/availability.py`)
   - `create_recurring_pattern(user_id, day_of_week, start_time, end_time)`
   - `update_recurring_pattern(pattern_id, ...)`
   - `delete_recurring_pattern(pattern_id)`
   - `generate_blocks_for_pattern(pattern_id, start_date, end_date)` - converts wall clock to UTC
   - `generate_blocks_for_user(user_id)` - generates all blocks for 2 weeks
   - `add_manual_block(user_id, start_time, end_time)` - one-time availability
   - `delete_block(block_id)` - one-time exception

3. **Create availability routes** (`routes/availability.py`)
   - `GET /api/availability/patterns` - Get user's recurring patterns
   - `POST /api/availability/patterns` - Create recurring pattern
   - `PUT /api/availability/patterns/{id}` - Update pattern
   - `DELETE /api/availability/patterns/{id}` - Delete pattern
   - `GET /api/availability/blocks` - Get generated blocks for date range
   - `POST /api/availability/blocks` - Add manual block
   - `DELETE /api/availability/blocks/{id}` - Delete block
   - Apply rate limiting (100 updates/day)

4. **Create background job** (`background/jobs.py`)
   - Use APScheduler
   - Job: Generate blocks for all users (runs nightly at 2 AM league time)
   - Job: Clean up old blocks (>2 weeks in past)

5. **Test timezone conversion**
   - Create pattern for "Monday 7:00 PM"
   - Verify blocks generated with correct UTC times
   - Test DST boundary dates (March/November)

### Frontend Tasks:

1. **Create recurring pattern manager** (`src/components/RecurringPatterns.tsx`)
   - List of user's patterns
   - Add new pattern form (day selector, time pickers)
   - Edit/delete existing patterns
   - Enable/disable toggle

2. **Create weekly availability calendar** (`src/components/AvailabilityCalendar.tsx`)
   - 7-day week view
   - Display generated blocks (read-only for recurring)
   - Click to add manual blocks
   - Click to remove blocks
   - Copy from last week button

3. **Create availability page** (`src/pages/Availability.tsx`)
   - Tab 1: Recurring Patterns
   - Tab 2: This Week / Next Week calendar
   - Show blocks with source (recurring vs manual)

**Success Criteria:**
✅ Can create recurring pattern "Every Monday 7-9 PM"
✅ Blocks auto-generate for current + next week
✅ Blocks have correct UTC times based on league timezone
✅ Can add one-time manual availability
✅ Can delete individual blocks
✅ Calendar displays all availability blocks
✅ Background job runs and generates blocks

**Estimated Time:** 2 days

---

## 📋 Phase 3: Match Challenges (Days 6-8)

### Priority: HIGH
Core feature - users need to challenge each other.

### Backend Tasks:

1. **Create Match model** (`models/match.py`)
   - Follow schema from design spec
   - Create Alembic migration

2. **Create match service** (`services/matches.py`)
   - `check_conflict(user_id, start_time, end_time)` - Check for overlapping matches
   - `create_challenge(player_a_id, player_b_id, start_time, duration)` - Validate and create
   - `accept_challenge(match_id, user_id)` - Set status to confirmed
   - `decline_challenge(match_id, user_id)` - Set status to declined
   - `cancel_match(match_id, user_id, reason)` - Cancel confirmed match
   - `get_user_matches(user_id, status, time_filter)` - Get matches with filters
   - `check_expiration()` - Background job to expire old pending challenges

3. **Create match routes** (`routes/matches.py`)
   - `POST /api/matches` - Create challenge (validate conflicts)
   - `GET /api/matches` - Get user's matches (with filters)
   - `GET /api/matches/{id}` - Get match details
   - `POST /api/matches/{id}/accept` - Accept challenge
   - `POST /api/matches/{id}/decline` - Decline challenge
   - `POST /api/matches/{id}/cancel` - Cancel match (with reason)
   - Apply rate limiting (40 challenges/day, 10 to same player)

4. **Add to background jobs**
   - Job: Check for expired challenges (every 5 minutes)
   - Update status to 'expired' if:
     - 48 hours passed since creation, OR
     - 2 hours before match start_time, OR
     - Current time > start_time (too late)

5. **Test challenge lifecycle**
   - Create challenge → pending
   - Accept → confirmed
   - Decline → declined
   - Wait 48 hours (or manually set created_at) → expired
   - Cancel confirmed match → canceled

### Frontend Tasks:

1. **Create match card component** (`src/components/MatchCard.tsx`)
   - Display match details (opponent, time, status)
   - Actions based on status and user role
   - Accept/Decline buttons for pending (if you're player B)
   - Cancel button for confirmed
   - Show cancellation reason if canceled

2. **Create match list page** (`src/pages/Matches.tsx`)
   - Tabs: Incoming | Outgoing | Upcoming | Past
   - Filter by status
   - Click card → navigate to detail page

3. **Create match detail page** (`src/pages/MatchDetail.tsx`)
   - Full match info
   - Accept/Decline/Cancel actions
   - Cancellation modal with optional reason

**Success Criteria:**
✅ Can create a challenge (validates conflicts)
✅ Player B receives challenge (shows in "Incoming")
✅ Player B can accept → status becomes confirmed
✅ Player B can decline → status becomes declined
✅ Either player can cancel confirmed match
✅ Challenges expire after 48 hours or 2h before start
✅ Cannot create overlapping challenges
✅ Rate limiting prevents spam

**Estimated Time:** 3 days

---

## 📋 Phase 4: Overlap Detection (Days 9-10)

### Priority: HIGH
Key discovery feature for finding opponents.

### Backend Tasks:

1. **Create overlap service** (`services/overlap.py`)
   - `calculate_overlaps(user_id, week_start_date)` - Find all users with shared availability
     - Query for availability blocks where times match
     - Exclude users on vacation or inactive
     - Exclude time slots where either user has a match
     - Group by user and count hours of overlap
   - `get_shared_availability(user_a_id, user_b_id, week_start_date)` - Get specific overlap times

2. **Create overlap routes** (`routes/overlap.py`)
   - `GET /api/overlap` - Get all overlaps for current user (current week only)
   - `GET /api/overlap/{user_id}` - Get shared availability with specific user
   - Apply rate limiting (60 requests/hour - expensive operation)

3. **Optimize query**
   - Add indexes if slow
   - Consider caching for v1.1

### Frontend Tasks:

1. **Create player card component** (`src/components/PlayerCard.tsx`)
   - Display player name, overlap hours
   - "View Schedule" button

2. **Create shared calendar component** (`src/components/SharedCalendar.tsx`)
   - Week view showing only mutually available slots
   - Click slot → open challenge modal
   - For mobile: list view instead of grid

3. **Create find opponents page** (`src/pages/FindOpponents.tsx`)
   - **Desktop:** Two-panel layout (player list + calendar)
   - **Mobile:** List of player cards → navigate to shared calendar
   - "Show players with no overlap" toggle
   - Search/filter by name

4. **Create challenge modal** (`src/components/ChallengeModal.tsx`)
   - Select duration (60/90/120 min)
   - Disable options that have conflicts
   - Send challenge button

**Success Criteria:**
✅ Can see list of all players with overlap hours
✅ Can toggle to show players with no overlap
✅ Can click a player and see shared availability calendar
✅ Shared calendar only shows conflict-free times
✅ Can click a time slot and send a challenge
✅ Challenge modal validates duration against conflicts
✅ Page loads in <2 seconds for 50 players

**Estimated Time:** 2 days

---

## 📋 Phase 5: Notifications (Days 11-13)

### Priority: MEDIUM-HIGH
Important for user engagement but app works without it.

### Backend Tasks:

1. **Create notification models** (`models/notification.py`)
   - NotificationPreferences model
   - NotificationQueue model
   - Create Alembic migration

2. **Create notification service** (`services/notifications.py`)
   - `send_sms(to_number, message)` - Twilio integration
   - `send_email(to_email, subject, body)` - SendGrid integration
   - `queue_notification(user_id, type, priority, message, scheduled_for)`
   - `process_notification_queue()` - Background job
   - `handle_sms_failure(user_id, reason)` - Disable SMS on permanent failure
   - `handle_email_failure(user_id, reason)` - Disable email on hard bounce
   - `check_quiet_hours(user_id, scheduled_time)` - Return true if in quiet hours
   - `reschedule_for_quiet_hours(notification_id, new_time)`

3. **Create notification routes** (`routes/notifications.py`)
   - `GET /api/notifications/preferences` - Get user's preferences
   - `PUT /api/notifications/preferences` - Update preferences

4. **Add notification triggers** (update existing services)
   - Match created → queue notification to player B
   - Match accepted → queue notification to player A
   - Match declined → queue notification to player A
   - Match canceled → queue notification to opponent
   - Match confirmed → schedule 24h and 2h reminders

5. **Add to background jobs**
   - Job: Process notification queue (every minute)
     - Check scheduled_for <= NOW()
     - Check quiet hours (skip if normal priority)
     - Attempt send
     - Handle failures (retry, fallback, disable)
   - Job: Cancel reminders for canceled matches

6. **Test notification scenarios**
   - SMS success
   - SMS failure → email fallback
   - Email hard bounce → disable email
   - Quiet hours delay
   - Critical priority override

### Frontend Tasks:

1. **Create notification preferences page** (`src/pages/NotificationPreferences.tsx`)
   - Toggle email on/off
   - Toggle SMS on/off (with opt-in warning)
   - Checkboxes for notification types
   - Quiet hours time pickers
   - Save button

2. **Add banners for disabled notifications**
   - Component: `src/components/NotificationBanner.tsx`
   - Show when SMS or email is disabled
   - "Update Phone Number" / "Update Email" buttons

3. **Update profile page**
   - Link to notification preferences
   - Show current phone/email
   - Edit phone/email forms

**Success Criteria:**
✅ Twilio account set up and tested
✅ SendGrid account set up and tested
✅ Challenge created → Player B receives SMS/email
✅ Challenge accepted → Player A receives notification
✅ Match confirmed → 24h and 2h reminders scheduled
✅ SMS failure → email fallback works
✅ Email hard bounce → email disabled, banner shown
✅ Quiet hours respected (normal priority delayed)
✅ Critical notifications sent during quiet hours
✅ Users can update notification preferences

**Estimated Time:** 3 days

---

## 📋 Phase 6: Admin Features (Days 14-15)

### Priority: MEDIUM
Needed for management but not critical for MVP.

### Backend Tasks:

1. **Create AdminActionLog model** (`models/admin.py`)
   - Create Alembic migration

2. **Create admin middleware** (`utils/admin.py`)
   - `require_admin` dependency - Check if user is admin
   - `impersonate_user(admin_id, user_id)` - Set session to act as user
   - `log_admin_action(admin_id, acting_as, action, metadata)`

3. **Create admin routes** (`routes/admin.py`)
   - `GET /api/admin/users` - List all users with filters
   - `PATCH /api/admin/users/{id}/status` - Change user status
   - `GET /api/admin/matches` - List all matches with filters
   - `DELETE /api/admin/matches/{id}` - Cancel any match
   - `POST /api/admin/impersonate/{user_id}` - Start impersonation
   - `POST /api/admin/stop-impersonate` - Stop impersonation
   - `GET /api/admin/analytics` - Match stats, cancellation rates, etc.
   - `GET /api/admin/action-log` - View admin action history

4. **Update existing routes to support impersonation**
   - Check for impersonation session
   - Use impersonated user_id for actions
   - Log all actions when impersonating

### Frontend Tasks:

1. **Create admin dashboard** (`src/pages/admin/Dashboard.tsx`)
   - Stats: Total users, active matches, upcoming matches
   - Recent matches table
   - Players on vacation
   - Link to other admin pages

2. **Create admin users page** (`src/pages/admin/Users.tsx`)
   - Table of all users
   - Filter by status (active/vacation/inactive)
   - Search by name/email
   - Actions: Change status, Impersonate

3. **Create admin matches page** (`src/pages/admin/Matches.tsx`)
   - Table of all matches
   - Filter by status, date range
   - Cancel button
   - View details

4. **Create impersonation banner** (`src/components/ImpersonationBanner.tsx`)
   - Fixed banner at top when impersonating
   - "You are acting as [User Name]"
   - "Stop Impersonating" button
   - Different background color for visibility

5. **Add admin nav section**
   - Show only if user is admin
   - Links to admin pages

**Success Criteria:**
✅ Admin can view all users and matches
✅ Admin can change user status (vacation, inactive)
✅ Admin can cancel any match
✅ Admin can impersonate a user
✅ Impersonation banner shows clearly
✅ All actions while impersonating are logged
✅ Admin can view action log
✅ Admin can see analytics/stats

**Estimated Time:** 2 days

---

## 📋 Phase 7: Polish & Deploy (Days 16-17)

### Priority: MEDIUM
Make it production-ready.

### Backend Tasks:

1. **Add proper error handling**
   - Consistent error response format
   - Proper HTTP status codes
   - Log errors to file or Sentry

2. **Add validation**
   - Pydantic schemas for all request/response bodies
   - Validate date ranges, time formats
   - Clear error messages

3. **Add health checks**
   - `/health` endpoint with DB connection check
   - `/health/db` endpoint

4. **Environment-specific configs**
   - Development, staging, production settings
   - Debug mode off in production

5. **Database optimization**
   - Review all queries
   - Add missing indexes
   - Test with realistic data (50 users, 100 matches)

### Frontend Tasks:

1. **Loading states**
   - Spinners for API calls
   - Skeleton screens for lists

2. **Error handling**
   - Toast notifications for errors
   - Retry buttons
   - Friendly error messages

3. **Mobile testing**
   - Test all screens on mobile viewport
   - Touch targets large enough
   - Forms work with mobile keyboard

4. **Accessibility**
   - Proper ARIA labels
   - Keyboard navigation works
   - Color contrast meets WCAG standards

5. **Performance**
   - Lazy load routes
   - Optimize images
   - Minimize bundle size

### Deployment Tasks:

1. **Backend deployment**
   - Create Render.com account
   - Create web service from GitHub repo
   - Set environment variables
   - Connect to Render PostgreSQL

2. **Frontend deployment**
   - Create Vercel account
   - Connect GitHub repo
   - Set environment variables (API URL)
   - Deploy

3. **Database setup**
   - Run migrations on production DB
   - Create initial admin user
   - Backup strategy

4. **External services**
   - Twilio account + phone number
   - SendGrid account + verified sender
   - Test in production

5. **Documentation**
   - README with setup instructions
   - API documentation (Swagger)
   - User guide (basic)

**Success Criteria:**
✅ All features work in production
✅ Mobile experience is smooth
✅ Error handling is user-friendly
✅ Performance is acceptable
✅ SMS and email work in production
✅ Admin can manage the system
✅ Documentation is complete

**Estimated Time:** 2 days

---

## 🎯 MVP Feature Checklist

Before launching, ensure these core features work:

### Authentication
- [ ] User registration with SMS consent
- [ ] Login/logout
- [ ] JWT token security
- [ ] Password hashing

### Availability
- [ ] Create recurring patterns (day, time)
- [ ] Blocks auto-generate for 2 weeks
- [ ] Add manual one-time availability
- [ ] Delete individual blocks
- [ ] View calendar of availability

### Matching
- [ ] Find opponents with overlap calculation
- [ ] View shared availability with a player
- [ ] Send challenge with duration selection
- [ ] Receive challenges
- [ ] Accept/decline challenges
- [ ] Cancel confirmed matches
- [ ] View match history
- [ ] Challenges expire after 48h

### Notifications
- [ ] SMS notifications (Twilio)
- [ ] Email notifications (SendGrid)
- [ ] Match reminders (24h, 2h)
- [ ] Notification preferences (channels, quiet hours)
- [ ] SMS→email fallback
- [ ] Auto-disable on delivery failure

### Admin
- [ ] View all users
- [ ] View all matches
- [ ] Cancel matches
- [ ] Change user status
- [ ] Impersonate users
- [ ] Action audit log

### General
- [ ] Mobile responsive
- [ ] Rate limiting
- [ ] Error handling
- [ ] Timezone conversion (UTC ↔ league time)
- [ ] Vacation mode
- [ ] Background jobs (block generation, expiration check)

---

## 💡 Tips for Using Claude Code

### Start Small
Ask Claude Code to implement one feature at a time. For example:
- "Create the User model and authentication routes"
- "Implement the recurring availability pattern CRUD operations"

### Test Frequently
After each feature, test in Swagger UI before moving to frontend.

### Use Design Spec
Reference the design spec frequently. Tell Claude Code:
- "Follow the schema in the design spec for the Match model"
- "Implement the conflict detection logic as described in section 7.4"

### Iterate
Don't try to get everything perfect the first time. Get it working, then refine.

### Database First
Always create models and migrations before routes. Run migrations before testing.

### Frontend After Backend
Build and test backend endpoints before creating the frontend components that use them.

---

## 📊 Progress Tracking

Track your progress by phase:

- [ ] Phase 0: Project Bootstrap (1 day)
- [ ] Phase 1: Authentication & Users (2 days)
- [ ] Phase 2: Recurring Availability (2 days)
- [ ] Phase 3: Match Challenges (3 days)
- [ ] Phase 4: Overlap Detection (2 days)
- [ ] Phase 5: Notifications (3 days)
- [ ] Phase 6: Admin Features (2 days)
- [ ] Phase 7: Polish & Deploy (2 days)

**Total: ~17 days for MVP**

---

## 🚀 Quick Start Commands

Once you have the project set up:

```bash
# Backend
cd backend
source venv/bin/activate
alembic upgrade head
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev

# Database
psql -U postgres -d pickleball_scheduler
```

---

**Good luck! Start with Phase 0 and work through each phase systematically. The design spec has all the details you need for implementation.**
