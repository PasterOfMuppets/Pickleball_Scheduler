"""Background jobs using APScheduler."""
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime

from app.database import SessionLocal
from app.services import matches as match_service

logger = logging.getLogger(__name__)

# Create scheduler instance
scheduler = BackgroundScheduler()


def check_expired_challenges():
    """
    Check for expired challenges and update their status.

    Runs every 5 minutes.

    A challenge expires if:
    - 48 hours have passed since creation
    - Current time is within 2 hours of start time
    - Current time has passed start time
    """
    logger.info("Running challenge expiration check...")

    db = SessionLocal()
    try:
        expired_matches = match_service.check_expiration(db)
        if expired_matches:
            logger.info(f"Expired {len(expired_matches)} challenges")
            for match in expired_matches:
                logger.debug(f"Expired match {match.id} (created {match.created_at}, start {match.start_time})")
        else:
            logger.debug("No challenges expired")

    except Exception as e:
        logger.error(f"Error checking expired challenges: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()


def start_scheduler():
    """Initialize and start all background jobs."""
    logger.info("Starting background scheduler...")

    # Add challenge expiration check (every 5 minutes)
    scheduler.add_job(
        check_expired_challenges,
        trigger=IntervalTrigger(minutes=5),
        id='check_expired_challenges',
        name='Check for expired challenges',
        replace_existing=True
    )

    # Start the scheduler
    scheduler.start()
    logger.info("Background scheduler started")


def shutdown_scheduler():
    """Shutdown the scheduler gracefully."""
    logger.info("Shutting down background scheduler...")
    scheduler.shutdown(wait=False)
    logger.info("Background scheduler shut down")
