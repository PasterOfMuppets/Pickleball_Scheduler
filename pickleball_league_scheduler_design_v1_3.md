# Pickleball League Match & Availability Scheduler  
**Version:** Design Spec v1.3  
**Owner:** Jeremy  
**Status:** Updated Design (includes notification handling and tech stack)

---

# 1. Overview

This system is a responsive, mobile-friendly web application for a pickleball league (≈50 players). Players:

- Register with name, email, phone number  
- Provide **SMS consent**  
- Set weekly availability (30-minute granularity) with optional recurring patterns  
- View overlapping availability with other players  
- Challenge opponents to match times  
- Accept/decline/cancel challenges  
- Receive SMS/email notifications  

Admins can monitor matches, impersonate users for troubleshooting, and manage match disputes.

All timestamps are **stored in UTC**, but **displayed and interpreted in the league's fixed time zone** (e.g., America/New_York).

---

# 2. Goals & Non-Goals

## 2.1 Goals
- Weekly availability input with mobile-first UI  
- Optional recurring availability patterns (e.g., "every Monday 7-9 PM")  
- Overlap discovery between players  
- Match challenge flow with notifications  
- Match reminders (24h + 2h before)  
- Player-initiated match cancellation  
- Player status (active/vacation/inactive)  
- Admin management + admin impersonation  
- League-centric time zone consistency  
- Responsive frontend (phone/tablet/desktop)

## 2.2 Non-Goals (v1)
- Match score reporting (deferred to v1.1+)  
- Tournament brackets  
- Automated ranking ladders  
- Native mobile apps  
- Court reservation integrations  
- Calendar integration (Google/Outlook)  
- Group matches (2v2)  

---

# 3. Time Zone Model (Critical)

### **Storage:**  
- **ALL timestamps stored in UTC** (AvailabilityBlock, Match, reminders, created_at, updated_at).

### **League Time Zone:**  
- A system setting (e.g., `"America/New_York"`).  
- Defines:
  - What counts as the "league week" (Mon-Sun, starting Monday 00:00:00 in league timezone)
  - How availability is displayed  
  - How match times appear in UI  

### **Conversion Layer:**  
- **Application layer (backend)** handles all UTC ↔ league timezone conversions
- Backend converts to league timezone on read
- Backend converts user input to UTC on write
- Frontend displays times as received from backend (no timezone logic in frontend)

### **Wall Clock Time:**  
- Availability times represent "wall clock" time (e.g., "7:00 PM" always means 7:00 PM local, regardless of DST changes)
- Recurring patterns store local times
- Generated blocks for specific weeks convert to appropriate UTC values
- After DST transitions, same pattern generates different UTC times to maintain local time consistency

### **Display:**  
- **Always convert to league time zone for players**.  
- Local user time is deferred to v1.1+

---

# 4. User Roles

## Player
- Manage availability (one-time and recurring patterns)  
- View overlaps with other players  
- Send/respond to challenges  
- Cancel confirmed matches (anytime before match start)  
- Configure SMS/email preferences  
- Toggle vacation mode  

## Admin
- View all data  
- Cancel matches, resolve disputes  
- Impersonate users ("Act as Player")  
- Manage inactive/vacation users  

---

# 5. Availability System

## 5.1 Time Slot Granularity
- **30-minute slots**  
- Allows 60, 90, or 120 minute matches naturally  
- Reasonable table size for 50 players  

## 5.2 Recurring Availability Model
```sql
CREATE TABLE recurring_availability (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL,           -- 1=Monday, 7=Sunday
  start_time_local TIME NOT NULL,     -- e.g., '19:00:00' (7 PM)
  end_time_local TIME NOT NULL,       -- e.g., '21:00:00' (9 PM)
  enabled BOOLEAN DEFAULT TRUE,       -- lets users temporarily disable
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_day CHECK (day_of_week BETWEEN 1 AND 7),
  CONSTRAINT valid_time_order CHECK (start_time_local < end_time_local)
);

CREATE INDEX idx_recurring_availability_user 
  ON recurring_availability(user_id) WHERE enabled = TRUE;
```

## 5.3 Generated Availability Blocks Model
```sql
CREATE TABLE availability_blocks (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,  -- UTC, always on 30-min boundary
  end_time TIMESTAMPTZ NOT NULL,    -- UTC, exactly 30 mins after start_time
  
  -- Track if generated from recurring pattern
  generated_from_recurring BIGINT REFERENCES recurring_availability(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_duration CHECK (end_time = start_time + INTERVAL '30 minutes'),
  CONSTRAINT valid_order CHECK (start_time < end_time),
  
  -- Prevent duplicates for same user + time slot
  UNIQUE(user_id, start_time)
);

-- Index for overlap queries
CREATE INDEX idx_availability_blocks_user_time 
  ON availability_blocks(user_id, start_time);

-- Index for finding overlaps with a specific time range
CREATE INDEX idx_availability_blocks_time_range 
  ON availability_blocks(start_time, end_time);
```

## 5.4 Block Generation Strategy

**Nightly Background Job:**
- Runs every night at 2 AM league time
- For each user with enabled recurring patterns:
  - Generate blocks for current week + next week (2 weeks total)
  - Convert wall clock times to appropriate UTC for each specific date
  - Skip if blocks already exist (idempotent operation)
  - Link generated blocks via `generated_from_recurring` field

**Immediate Regeneration on Pattern Changes:**
- When user updates/deletes a recurring pattern, trigger immediate regeneration for future weeks
- Delete existing blocks where `generated_from_recurring = pattern_id` and `start_time > NOW()`
- Regenerate new blocks for remaining scheduling window
- Past weeks remain unchanged (matches may already be scheduled)

**Exception Handling:**
- Users can manually add blocks (one-time availability): `generated_from_recurring = NULL`
- Users can delete individual blocks (one-time exceptions)
- Deleted blocks do NOT prevent pattern regeneration next week
- For permanent schedule changes, users should edit the recurring pattern

## 5.5 Weekly Cycle
- Max scheduling window: **2 weeks out** (current week + next week)  
- Vacation mode: removes user from scheduling and hides from overlap detection  

---

# 6. Overlap Detection

## 6.1 Calculation
- Query for AvailabilityBlocks where times match exactly (30-min slots)
- Must exclude:  
  - Users with status ≠ active  
  - Users currently on vacation  
  - Time slots where either user has a pending/confirmed match

## 6.2 Performance Strategy
- **v1.0:** Calculate overlaps on-demand when user views "Find Opponents" page
- Target: <2 seconds for 50 players
- **v1.1:** If performance becomes an issue, pre-compute overlaps nightly and store in cache table

## 6.3 User Experience - "Find Opponents" (People-First View)

### **Desktop Layout:**

**Left Panel: Player List**
- Shows active players sorted by overlap time (current week only)
- Default: Only shows players with at least 1 hour overlap
- "Show players with no overlap" toggle reveals remaining players at bottom
- Each list item displays:
  ```
  [Avatar] Alice Johnson
  12 hours of overlap this week
  [View Schedule →]
  ```
- Search/filter box at top

**Right Panel: Shared Availability Calendar**
- Appears when player is selected from left panel
- Week view (Mon-Sun) showing only mutually available time slots
- Only displays times where BOTH users are available AND neither has a conflict
- Click time slot → Challenge modal with duration options (60/90/120 min)

### **Mobile Layout:**
- Scrolling list of player cards
- Tap card → Navigate to dedicated shared calendar page
- Calendar shows simplified list view of available times:
  ```
  Tuesday, Dec 3
  • 6:00-7:00 PM [Challenge]
  • 7:30-9:00 PM [Challenge]
  
  Wednesday, Dec 4
  • 6:00-8:00 PM [Challenge]
  ```

### **v1.1 Feature: Hybrid Grid View**
- Time-first discovery with heat map visualization
- Color-coded slots by number of available players
- Mobile-optimized grid design

---

# 7. Match System

## 7.1 Match Model
```sql
CREATE TABLE matches (
  id BIGSERIAL PRIMARY KEY,
  player_a_id BIGINT NOT NULL REFERENCES users(id),
  player_b_id BIGINT NOT NULL REFERENCES users(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL, -- pending | confirmed | declined | expired | canceled
  created_by BIGINT NOT NULL REFERENCES users(id),
  
  -- Cancellation tracking
  canceled_by BIGINT REFERENCES users(id),
  cancellation_reason TEXT,  -- Optional note from canceling player
  
  -- Timestamps for lifecycle tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_match_time CHECK (start_time < end_time),
  CONSTRAINT different_players CHECK (player_a_id != player_b_id)
);

-- Indexes for conflict detection
CREATE INDEX idx_matches_player_a_time 
  ON matches(player_a_id, start_time, end_time) 
  WHERE status IN ('pending', 'confirmed');

CREATE INDEX idx_matches_player_b_time 
  ON matches(player_b_id, start_time, end_time) 
  WHERE status IN ('pending', 'confirmed');

-- Index for analytics on cancellations
CREATE INDEX idx_matches_canceled 
  ON matches(canceled_by, canceled_at) 
  WHERE status = 'canceled';
```

## 7.2 Match Status Flow

```
pending → confirmed
pending → declined  
pending → expired
pending → canceled (by Player A before Player B responds)

confirmed → canceled (by either player, anytime before start_time)
```

## 7.3 Lifecycle Rules

### **Pending Challenges:**
1. **Challenge Expiration:** 48 hours after creation OR 2 hours before match start_time (whichever comes first)
2. **Too Late Response:** If current time passes start_time while status=pending, auto-expire
3. **Player A Can Withdraw:** Anytime while pending (sets status to 'canceled')
4. **Player B Can Accept/Decline:** Anytime before expiration

### **Confirmed Matches:**
5. **Either Player Can Cancel:** Anytime before start_time
6. **Cancellation Triggers:**
   - Status changes to 'canceled'
   - Sets `canceled_at` timestamp and `canceled_by` user_id
   - Optional `cancellation_reason` captured from user
   - Notification sent to other player (SMS/email per preferences)
   - Scheduled reminders are canceled
7. **Availability After Cancellation:** Both players' availability remains unchanged (they remain marked available for that time and can immediately challenge or be challenged by others)

### **History & Cleanup:**
8. **Declined/Expired/Canceled matches:** Remain visible in user's match history for 30 days
9. **Manual Dismissal:** Users can clear old challenges via "Clear History" action

## 7.4 Conflict Rules
- A player **cannot**:
  - Send a challenge for a time that overlaps an existing pending/confirmed match
  - Accept a challenge that overlaps another pending/confirmed match
- System validates and blocks invalid/overlapping attempts at submission time

## 7.5 Challenge Flow
1. Player A selects opponent and shared available time slot  
2. Player A selects match duration (60/90/120 minutes)  
3. System validates no conflicts for both players  
4. Match created with status='pending'  
5. Player B receives SMS/email notification (if opted in)  
6. Player B accepts → status='confirmed', reminders scheduled  
7. Player B declines → status='declined'  
8. No response within expiration window → status='expired'  

## 7.6 Challenge Modal UI
```
┌─────────────────────────────────────┐
│ Challenge Alice Johnson             │
├─────────────────────────────────────┤
│ Tuesday, December 3, 2025           │
│ Starting at: 6:00 PM                │
│                                     │
│ Match Duration:                     │
│ ○ 60 minutes (ends 7:00 PM)        │
│ ○ 90 minutes (ends 7:30 PM)        │
│ ○ 120 minutes (ends 8:00 PM)       │
│                                     │
│ Note: Grayed options indicate       │
│ conflicts with existing matches     │
│                                     │
│ [Cancel]  [Send Challenge]          │
└─────────────────────────────────────┘
```

## 7.7 Cancellation UI
```
┌─────────────────────────────────────┐
│ Cancel Match?                       │
├─────────────────────────────────────┤
│ Are you sure you want to cancel     │
│ your match with Alice on Tuesday    │
│ at 6:00 PM?                         │
│                                     │
│ Reason (optional):                  │
│ [Text area]                         │
│                                     │
│ Alice will be notified.             │
│                                     │
│ [Go Back]  [Yes, Cancel Match]      │
└─────────────────────────────────────┘
```

---

# 8. Notifications

## 8.1 Consent & Preferences
```sql
CREATE TABLE notification_preferences (
  user_id BIGINT PRIMARY KEY REFERENCES users(id),
  
  -- Channel preferences
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_opt_in BOOLEAN DEFAULT FALSE,
  sms_opt_in_at TIMESTAMPTZ,
  
  -- What to notify about
  notify_match_requests BOOLEAN DEFAULT TRUE,
  notify_match_responses BOOLEAN DEFAULT TRUE,
  notify_reminders BOOLEAN DEFAULT TRUE,
  notify_cancellations BOOLEAN DEFAULT TRUE,
  
  -- Quiet hours (times in league timezone)
  quiet_hours_enabled BOOLEAN DEFAULT TRUE,
  quiet_hours_start TIME DEFAULT '22:00:00',  -- 10 PM
  quiet_hours_end TIME DEFAULT '07:00:00',    -- 7 AM
  
  -- Delivery status tracking
  last_sms_failure_at TIMESTAMPTZ,
  last_email_failure_at TIMESTAMPTZ,
  sms_consecutive_failures INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notification_queue (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  notification_type VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL, -- 'critical' | 'high' | 'normal'
  channel VARCHAR(10) NOT NULL, -- 'sms' | 'email' | 'both'
  subject VARCHAR(255),
  message TEXT NOT NULL,
  metadata JSONB, -- Match ID, challenge ID, etc.
  
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  fallback_sent BOOLEAN DEFAULT FALSE, -- SMS→email fallback occurred
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_queue_pending 
  ON notification_queue(scheduled_for) 
  WHERE sent_at IS NULL AND failed_at IS NULL;

CREATE INDEX idx_notification_queue_user 
  ON notification_queue(user_id, created_at DESC);
```

## 8.2 Channels
- **Email:** SendGrid  
- **SMS:** Twilio  
- Only send SMS if `sms_opt_in = true`  

## 8.3 Notification Types

### **Challenge Notifications:**
- **New Challenge Received:** When Player B receives a challenge
- **Challenge Accepted:** When Player A's challenge is accepted
- **Challenge Declined:** When Player A's challenge is declined
- **Challenge Expired:** When a challenge expires without response
- **Challenge Withdrawn:** When Player A cancels their pending challenge

### **Match Notifications:**
- **Match Canceled:** When opponent cancels a confirmed match
- **Match Reminder - 24 hours:** Sent 24 hours before match start_time
- **Match Reminder - 2 hours:** Sent 2 hours before match start_time

## 8.4 Reminder Logic
- Reminders scheduled when match status changes to 'confirmed'
- If match is canceled, delete pending reminder jobs
- Reminders respect user's `notify_reminders` preference
- No reminders sent for matches in the past

## 8.5 Failure Handling & Retry Logic

### **SMS Failures:**

**Permanent Failures (invalid number, user blocked, STOP reply):**
- Disable SMS immediately: set `sms_opt_in = FALSE`
- Send email notification explaining SMS was disabled due to delivery issues
- Automatically fallback to email for the current notification

**Transient Failures (carrier issue, phone off):**
- Retry up to 3 times with exponential backoff:
  - Immediately
  - After 5 minutes
  - After 30 minutes
- Automatically fallback to email for each failed SMS attempt
- Track consecutive failures in `sms_consecutive_failures` counter

### **Email Failures:**

**Hard Bounce (invalid address, domain doesn't exist):**
- After 1 hard bounce: set `email_enabled = FALSE`
- Show in-app banner: "Email notifications are disabled because your email address is invalid. Update it to receive match notifications."
- No fallback channel (email is the fallback)

**Soft Bounce (mailbox full, temporary server issue):**
- Retry 3 times with delays:
  - Immediately
  - After 5 minutes
  - After 1 hour
- If all retries fail: log it but don't disable (might be temporary)
- Show in-app notice: "Recent emails may not have delivered"

## 8.6 Quiet Hours

### **Configuration:**
- **Default:** 10:00 PM - 7:00 AM (league timezone)
- **User-configurable:** Users can customize via notification preferences
- **Applies to:** All notification channels (SMS and email)

### **Priority-Based Override:**

**Critical Priority (send during quiet hours):**
- Match canceled <4 hours before start
- Match starting in 2 hours (reminder)

**High Priority (respect quiet hours):**
- Challenge received for match <24 hours away
- Challenge accepted/declined

**Normal Priority (respect quiet hours):**
- Challenge received for match >24 hours away
- Match reminder 24 hours before

### **Quiet Hours Edge Cases:**

1. **Notification scheduled within 5 minutes of quiet hours start:**
   - Send immediately (don't delay)

2. **Match at 8 AM with 2-hour reminder at 6 AM (during quiet hours):**
   - Send at 7 AM when quiet hours end (1-hour notice instead of 2-hour)

3. **User changes quiet hours settings:**
   - Re-evaluate all queued notifications
   - Reschedule delayed notifications if they now fall outside quiet hours

## 8.7 Notification Processing

**Background Job (runs every minute):**

1. Fetch all pending notifications where `scheduled_for <= NOW()`
2. For each notification:
   - Check user's notification preferences
   - Skip if notification type is disabled by user
   - Check if within user's quiet hours:
     - If Critical priority → send anyway
     - If High/Normal → reschedule for `quiet_hours_end` time
   - Attempt to send via requested channel(s):
     - **SMS:** Try Twilio → If failure, apply failure handling rules above
     - **Email:** Try SendGrid → If failure, apply failure handling rules above
   - Log delivery attempt for monitoring
3. Clean up old sent/failed notifications (>30 days)

## 8.8 User Experience

**Profile Settings - Notifications Section:**
```
┌─────────────────────────────────────┐
│ Notification Preferences            │
├─────────────────────────────────────┤
│ ☑ Email notifications               │
│   ✉ your.email@example.com          │
│                                     │
│ ☑ SMS notifications                 │
│   📱 (555) 123-4567                 │
│                                     │
│ Notify me about:                    │
│ ☑ Match challenges                  │
│ ☑ Challenge responses               │
│ ☑ Match reminders                   │
│ ☑ Match cancellations               │
│                                     │
│ Quiet Hours                         │
│ ☑ Enable quiet hours                │
│   From: [10:00 PM ▼]                │
│   To:   [7:00 AM  ▼]                │
│   (Urgent notifications may still   │
│    be sent during quiet hours)      │
│                                     │
│ [Save Preferences]                  │
└─────────────────────────────────────┘
```

**Banner When SMS Auto-Disabled:**
```
┌─────────────────────────────────────┐
│ ⚠️ SMS notifications have been      │
│ disabled due to delivery issues.    │
│ Please verify your phone number.    │
│                                     │
│ [Update Phone Number] [Dismiss]     │
└─────────────────────────────────────┘
```

**Banner When Email Disabled:**
```
┌─────────────────────────────────────┐
│ ⚠️ Email notifications are disabled │
│ because your email address is       │
│ invalid. Update it to receive       │
│ match notifications.                │
│                                     │
│ [Update Email] [Dismiss]            │
└─────────────────────────────────────┘
```

---

# 9. Player Status

```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL, -- 'player' or 'admin'
  status VARCHAR(20) NOT NULL, -- 'active' | 'vacation' | 'inactive'
  vacation_until DATE, -- Inclusive date when vacation ends
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 9.1 Status Definitions

**Active:**
- Normal operational status
- Appears in overlap detection
- Can send/receive challenges
- Recurring patterns generate blocks

**Vacation:**
- Player is temporarily unavailable
- Hidden from "Find Opponents" list
- Cannot send or receive challenges
- `vacation_until` date defines when status returns to 'active'
- Existing confirmed matches: remain confirmed (players coordinate cancellation if needed)
- Existing pending challenges: remain pending (can still respond)

**Inactive:**
- Long-term unavailable (admin-set or auto after 60 days of inactivity)
- Hidden from all scheduling
- Can still log in to view history
- Cannot send/receive challenges

## 9.2 Vacation Mode Behavior
- User sets `vacation_until` date (inclusive)
- Nightly job checks for vacation_until dates that have passed
- Auto-reverts status to 'active' on the day after vacation_until
- Recurring patterns remain in database but don't generate blocks during vacation
- User can end vacation early via profile settings

---

# 10. Admin Features

## 10.1 Admin Dashboard
- View all players & statuses  
- View all matches (past/future) with filtering
- Cancel any match
- View cancellation analytics per player

## 10.2 Admin Impersonation
- "Act as Player" mode  
- Clear banner at top: "You are impersonating [Player Name]"  
- All actions logged to audit trail
- Admin can perform any player action (set availability, send challenges, etc.)

```sql
CREATE TABLE admin_action_log (
  id BIGSERIAL PRIMARY KEY,
  admin_id BIGINT NOT NULL REFERENCES users(id),
  acting_as_user_id BIGINT REFERENCES users(id), -- NULL if not impersonating
  action VARCHAR(100) NOT NULL,
  metadata JSONB, -- Additional context about the action
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_action_log_admin 
  ON admin_action_log(admin_id, timestamp DESC);

CREATE INDEX idx_admin_action_log_impersonation 
  ON admin_action_log(acting_as_user_id, timestamp DESC) 
  WHERE acting_as_user_id IS NOT NULL;
```

**Logged Actions Include:**
- Challenge sent
- Challenge accepted/declined
- Match canceled
- Availability modified
- Vacation mode toggled
- User settings changed

---

# 11. Frontend (Responsive)

## 11.1 Key Screens
- **Login / Signup** (with SMS consent checkbox)  
- **Dashboard** (upcoming matches, quick actions)  
- **Weekly Availability Editor** (30-min grid, touch/drag selection)
  - Copy from last week button
  - Recurring pattern manager
- **Find Opponents** (people-first overlap view)  
- **Challenge Creator** (embedded in opponent calendar view)  
- **Match Detail** (accept/decline/cancel/view)  
- **Challenge & Match History**
  - Tabs: Incoming / Outgoing / Upcoming / Past
  - Past matches: confirmed matches where start_time < NOW()
- **Profile** (notification preferences, vacation mode)  
- **Admin Dashboard**  
- **Admin Impersonation** (with clear visual indicator)

## 11.2 Mobile Considerations
- All screens must function smoothly on mobile devices
- Availability grid: simplified touch interface for 30-min slots
- Overlap calendar: list view on mobile instead of grid
- Challenge modal: stack inputs vertically
- Minimum touch target size: 44x44 pixels

---

# 12. Security & Privacy

## 12.1 Authentication & Authorization
- HTTPS required  
- Passwords hashed (bcrypt or argon2)  
- JWT or secure sessions with proper expiration (7 days)
- Role-based access control (player vs admin)

## 12.2 Rate Limiting

**Authentication Endpoints:**
- Login: 10 failed attempts per IP/hour, 6 per email/hour
- Password reset: 6 requests per email/hour
- Registration: 6 registrations per IP/day
- Action on exceed: Block for 1 hour, return 429 status

**Challenge Endpoints:**
- Create challenge: 40 per player/day
- To same player: 10 per day
- Per minute: 6 challenges
- Accept/decline: 200 per day
- Cancel: 20 per day

**Availability Endpoints:**
- Update availability: 100 per day
- Recurring pattern changes: 40 per day (triggers block regeneration)

**General API:**
- Read operations (GET): 200 per user/minute
- Write operations (POST/PUT/DELETE): 120 per user/minute
- Overlap detection: 60 per user/hour (expensive operation)

**Implementation:**
- v1.0: In-memory rate limiting (SlowAPI for FastAPI)
- v1.1+: Migrate to Redis for distributed rate limiting

**Rate Limit Response Format:**
```json
HTTP 429 Too Many Requests

{
  "error": "rate_limit_exceeded",
  "message": "You've sent too many challenges today. Limit: 40 per day.",
  "retry_after": 3600,
  "limit": 40,
  "remaining": 0,
  "reset_at": "2025-11-17T00:00:00Z"
}
```

**Response Headers:**
```
X-RateLimit-Limit: 40
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1731801600
Retry-After: 3600
```

## 12.3 Data Protection
- Audit logs for admin impersonation with 1-year retention  
- SMS opt-in compliance tracked with timestamp
- Player data accessible only to:
  - The player themselves
  - Admins (with logging)
  - Other players (limited to: name, availability, match history)

## 12.4 Privacy Compliance
- Users can update notification preferences anytime
- SMS opt-out: users can opt out via app or by replying "STOP" to SMS
- Data retention: match history older than 2 years archived/anonymized (future consideration)

---

# 13. Technology Stack

## 13.1 Backend
- **Language:** Python 3.11+
- **Framework:** FastAPI
- **ORM:** SQLAlchemy 2.0
- **Migrations:** Alembic
- **Authentication:** JWT (python-jose)
- **Password Hashing:** bcrypt (passlib)
- **Background Jobs:** APScheduler (in-process)
- **Rate Limiting:** SlowAPI (in-memory for v1)

## 13.2 Database
- **Primary Database:** PostgreSQL 15
- **Hosting:** Self-hosted on application server (v1), migrate to managed database in v1.1+

## 13.3 Frontend
- **Framework:** React 18
- **Language:** TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router
- **HTTP Client:** Axios or Fetch API

## 13.4 External Services
- **SMS:** Twilio (~$0.0079/message in US)
- **Email:** SendGrid (100/day free tier)
- **Error Tracking:** Sentry (optional, free tier)

## 13.5 Deployment

**v1.0 (Free Tier):**
- **Backend:** Render.com free tier (accepts 15-30s cold start)
- **Database:** Render PostgreSQL free tier (90-day limit)
- **Frontend:** Vercel free tier
- **Cost:** $0/mo infrastructure + ~$5-10/mo SMS usage

**v1.1 (Paid, No Sleep):**
- **Backend+DB:** Fly.io free tier (256MB RAM) or Render paid ($7/mo)
- **Frontend:** Vercel free tier
- **Cost:** $0-7/mo infrastructure + $5-10/mo SMS

**v2.0+ (Scaled):**
- **Backend:** DigitalOcean Droplet ($12/mo) or Railway ($20/mo)
- **Database:** Managed PostgreSQL ($15/mo)
- **Redis:** Managed Redis ($3-5/mo)
- **Frontend:** Vercel/Netlify
- **Cost:** ~$30-40/mo

## 13.6 Development Tools
- **Version Control:** Git + GitHub
- **Containerization:** Docker + Docker Compose
- **API Documentation:** FastAPI auto-generated (Swagger UI)
- **Testing:** pytest (backend), React Testing Library (frontend)

---

# 14. Non-Functional Requirements

## 14.1 Scale
- Supports 50-200 users  
- ~100-500 availability blocks per week (with recurring patterns)
- ~50-100 active matches per week

## 14.2 Performance
- Availability/match queries: <200ms typical
- Overlap calculation: <2s for 50 players
- Background job completion: <5 minutes for full user base
- Cold start acceptable: 15-30s on free tier

## 14.3 Availability
- No strict 24/7 SLA for v1
- Planned maintenance windows acceptable with advance notice
- Target uptime: 99% during peak hours (evenings/weekends)
- Cold starts acceptable on free tier for low-traffic periods

## 14.4 Monitoring & Logging
- Application error logging (exceptions, failed queries)
- Notification provider logging (Twilio/SendGrid delivery status)
- Admin action audit trail
- Match lifecycle metrics (acceptance rate, cancellation rate)
- Rate limit hit tracking

---

# 15. Open Questions (Documented for v1.1+)

## 15.1 Deferred Features
- Match score reporting & dispute resolution
- Calendar integration (Google/Outlook/iCal)  
- Group matches (2v2 or round-robin)  
- Proposing alternate times for challenges
- Player reliability scores/ratings
- Court/location management
- Skill-based matchmaking or brackets
- Tournament mode

## 15.2 Optimization Opportunities
- Pre-computed overlap cache (if on-demand proves too slow)
- Redis for distributed rate limiting and caching
- Push notifications (instead of just SMS/email)
- Real-time updates (WebSocket for match status changes)
- CDN for static assets

## 15.3 UX Enhancements
- Time-first overlap view (heat map grid)
- Filter opponents by skill level, recency, match count
- Bulk availability operations ("copy next 4 weeks")
- Smart match suggestions algorithm
- Player-to-player messaging
- In-app notification center

---

# 16. Implementation Roadmap (v1)

## Phase 1: Foundation (Week 1-2)
1. **Project setup** (FastAPI + React + PostgreSQL)
2. **User registration + authentication** (JWT, SMS opt-in checkbox)
3. **Database schema** (Alembic migrations for all tables)
4. **Time zone conversion layer** (application-level UTC ↔ league timezone)
5. **Basic admin authentication**

## Phase 2: Availability (Week 3-4)
6. **Recurring availability patterns** (UI + backend CRUD)
7. **Availability block generation** (nightly job + immediate regeneration)
8. **Weekly availability editor** (30-min grid, mobile-responsive)
9. **Manual availability additions/exceptions**

## Phase 3: Matching (Week 5-6)
10. **Overlap detection** (people-first view with toggle)
11. **Match challenge flow** (create, validate conflicts, send)
12. **Challenge response** (accept/decline with validation)
13. **Match cancellation** (with optional reason)
14. **Challenge expiration** (48h OR 2h before match)

## Phase 4: Notifications (Week 7)
15. **Notification system integration** (Twilio + SendGrid)
16. **Notification preferences** (UI for quiet hours, channels)
17. **Match reminders** (24h and 2h before start)
18. **Challenge/cancellation notifications**
19. **Failure handling** (SMS→email fallback, auto-disable)
20. **Quiet hours logic** (priority-based override)

## Phase 5: Admin & Polish (Week 8-9)
21. **Admin dashboard** (view players, matches, analytics)
22. **Admin impersonation** (with audit logging)
23. **Challenge & match history screens** (tabs for incoming/outgoing/past)
24. **Vacation mode** (with automatic reactivation)
25. **Background jobs** (expiration check, vacation end check, reminder cleanup)
26. **Rate limiting** (SlowAPI integration on all endpoints)

## Phase 6: Testing & Deployment (Week 10)
27. **End-to-end testing** (critical user flows)
28. **Mobile responsiveness testing** (all screens)
29. **Notification testing** (all scenarios, quiet hours)
30. **Deploy to Render.com** (free tier)
31. **Documentation** (API docs, user guide)

**Total Estimated Time:** 10 weeks for a single developer working part-time, or 5-6 weeks full-time.

---

# 17. Changes from v1.2

## Added Sections:
- **Section 8.5-8.8:** Complete notification failure handling, retry logic, and quiet hours
- **Section 12.2:** Detailed rate limiting specifications with doubled limits
- **Section 13:** Complete technology stack with deployment options and cost breakdown

## Updated Sections:
- **Section 8:** Expanded notification models and processing logic
- **Section 12:** Added rate limit response format and implementation strategy
- **Section 16:** Updated implementation roadmap with notification phase details

---

**End of Design Specification v1.3**
