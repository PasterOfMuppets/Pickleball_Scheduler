"""Background jobs for scheduled tasks using APScheduler."""
import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.database import SessionLocal
from app.models.availability import RecurringAvailability
from app.services.availability import AvailabilityService
from app.config import settings


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def generate_all_availability_blocks():
    """Generate availability blocks for all users with enabled recurring patterns.

    Runs nightly at 2 AM league time.
    Generates blocks for current week + next week (2-week window).
    """
    logger.info("Starting availability block generation job...")

    db = SessionLocal()
    try:
        # Get all users with enabled recurring patterns
        patterns = db.query(RecurringAvailability).filter(
            RecurringAvailability.enabled == True
        ).all()

        user_ids = set(p.user_id for p in patterns)
        logger.info(f"Found {len(user_ids)} users with enabled recurring patterns")

        total_blocks = 0
        for user_id in user_ids:
            blocks = AvailabilityService.generate_blocks_for_user(
                db, user_id, weeks_ahead=2
            )
            total_blocks += len(blocks)
            logger.info(f"Generated {len(blocks)} blocks for user {user_id}")

        logger.info(f"Availability block generation complete. Total blocks created: {total_blocks}")

    except Exception as e:
        logger.error(f"Error generating availability blocks: {str(e)}", exc_info=True)
        db.rollback()
    finally:
        db.close()


def cleanup_old_availability_blocks():
    """Clean up old availability blocks (>2 weeks in the past).

    Runs weekly to keep database size manageable.
    """
    logger.info("Starting availability block cleanup job...")

    db = SessionLocal()
    try:
        deleted_count = AvailabilityService.cleanup_old_blocks(db, days_old=14)
        logger.info(f"Availability block cleanup complete. Deleted {deleted_count} old blocks")

    except Exception as e:
        logger.error(f"Error cleaning up old blocks: {str(e)}", exc_info=True)
        db.rollback()
    finally:
        db.close()


# Create scheduler instance
scheduler = BackgroundScheduler(
    timezone=str(ZoneInfo(settings.LEAGUE_TIMEZONE))
)


def start_background_jobs():
    """Start all background jobs.

    Should be called when the application starts.
    """
    logger.info("Starting background jobs...")

    # Job 1: Generate availability blocks
    # Runs nightly at 2 AM league time
    scheduler.add_job(
        func=generate_all_availability_blocks,
        trigger=CronTrigger(hour=2, minute=0, timezone=settings.LEAGUE_TIMEZONE),
        id="generate_availability_blocks",
        name="Generate availability blocks for all users",
        replace_existing=True,
        misfire_grace_time=3600  # Allow up to 1 hour late execution
    )
    logger.info("Scheduled: Availability block generation (daily at 2:00 AM)")

    # Job 2: Clean up old blocks
    # Runs weekly on Monday at 3 AM league time
    scheduler.add_job(
        func=cleanup_old_availability_blocks,
        trigger=CronTrigger(
            day_of_week='mon',
            hour=3,
            minute=0,
            timezone=settings.LEAGUE_TIMEZONE
        ),
        id="cleanup_old_blocks",
        name="Clean up old availability blocks",
        replace_existing=True,
        misfire_grace_time=7200  # Allow up to 2 hours late execution
    )
    logger.info("Scheduled: Old block cleanup (weekly, Monday at 3:00 AM)")

    # Start the scheduler
    scheduler.start()
    logger.info("Background jobs started successfully")


def stop_background_jobs():
    """Stop all background jobs.

    Should be called when the application shuts down.
    """
    logger.info("Stopping background jobs...")
    scheduler.shutdown(wait=True)
    logger.info("Background jobs stopped")


def run_job_now(job_id: str):
    """Manually trigger a job to run immediately (useful for testing).

    Args:
        job_id: Job ID to run (e.g., "generate_availability_blocks")
    """
    job = scheduler.get_job(job_id)
    if job:
        logger.info(f"Manually triggering job: {job_id}")
        job.func()
    else:
        logger.error(f"Job not found: {job_id}")


# Additional jobs that will be added in future phases:
# - check_expired_challenges() - Every 5 minutes (Phase 3)
# - check_vacation_end() - Daily at midnight (Phase 1/6)
# - process_notification_queue() - Every minute (Phase 5)
