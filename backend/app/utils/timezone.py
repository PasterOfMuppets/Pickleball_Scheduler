"""Timezone utilities for converting between UTC and league local time."""
from datetime import datetime, date, time
from zoneinfo import ZoneInfo
from app.config import settings


def get_league_timezone() -> ZoneInfo:
    """Get the league's timezone."""
    return ZoneInfo(settings.LEAGUE_TIMEZONE)


def utc_to_league_time(utc_dt: datetime) -> datetime:
    """Convert UTC datetime to league local time."""
    if utc_dt.tzinfo is None:
        # Assume UTC if no timezone
        utc_dt = utc_dt.replace(tzinfo=ZoneInfo("UTC"))
    return utc_dt.astimezone(get_league_timezone())


def league_time_to_utc(local_dt: datetime) -> datetime:
    """Convert league local time to UTC."""
    if local_dt.tzinfo is None:
        # Assume league timezone if no timezone
        local_dt = local_dt.replace(tzinfo=get_league_timezone())
    return local_dt.astimezone(ZoneInfo("UTC"))


def combine_date_time_local(date_obj: date, time_obj: time) -> datetime:
    """Combine a date and time in league timezone."""
    local_dt = datetime.combine(date_obj, time_obj)
    return local_dt.replace(tzinfo=get_league_timezone())


def get_current_league_time() -> datetime:
    """Get current time in league timezone."""
    return datetime.now(get_league_timezone())


def utc_now() -> datetime:
    """Get current time in UTC."""
    return datetime.now(ZoneInfo("UTC"))
