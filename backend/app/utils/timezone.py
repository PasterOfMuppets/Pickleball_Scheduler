"""Timezone conversion utilities for league time handling.

All timestamps are stored in UTC in the database, but displayed and interpreted
in the league's fixed timezone (e.g., America/New_York).

Wall clock times represent local time regardless of DST changes.
"""
from datetime import datetime, date, time
from zoneinfo import ZoneInfo
from typing import Optional

from app.config import settings


def get_league_timezone() -> ZoneInfo:
    """Get the league's timezone.

    Returns:
        ZoneInfo: The league timezone (e.g., America/New_York)
    """
    return ZoneInfo(settings.LEAGUE_TIMEZONE)


def utc_to_league_time(utc_dt: datetime) -> datetime:
    """Convert UTC datetime to league local time.

    Args:
        utc_dt: Datetime in UTC (should be timezone-aware)

    Returns:
        datetime: Datetime in league timezone (timezone-aware)

    Example:
        >>> utc_dt = datetime(2025, 11, 17, 19, 0, tzinfo=ZoneInfo("UTC"))
        >>> local_dt = utc_to_league_time(utc_dt)
        >>> # If league is in America/New_York (UTC-5), result would be 14:00
    """
    # Ensure input is timezone-aware (UTC)
    if utc_dt.tzinfo is None:
        utc_dt = utc_dt.replace(tzinfo=ZoneInfo("UTC"))
    elif utc_dt.tzinfo != ZoneInfo("UTC"):
        # Convert to UTC if in different timezone
        utc_dt = utc_dt.astimezone(ZoneInfo("UTC"))

    # Convert to league timezone
    league_tz = get_league_timezone()
    return utc_dt.astimezone(league_tz)


def league_time_to_utc(local_dt: datetime) -> datetime:
    """Convert league local time to UTC.

    Args:
        local_dt: Datetime in league timezone (can be naive or aware)

    Returns:
        datetime: Datetime in UTC (timezone-aware)

    Example:
        >>> # Create a datetime for Monday 7:00 PM in league timezone
        >>> local_dt = datetime(2025, 11, 17, 19, 0)
        >>> utc_dt = league_time_to_utc(local_dt)
        >>> # If league is in America/New_York (UTC-5), result would be 00:00 next day
    """
    league_tz = get_league_timezone()

    # If naive (no timezone), assume it's in league timezone
    if local_dt.tzinfo is None:
        local_dt = local_dt.replace(tzinfo=league_tz)
    elif local_dt.tzinfo != league_tz:
        # If in different timezone, convert to league timezone first
        local_dt = local_dt.astimezone(league_tz)

    # Convert to UTC
    return local_dt.astimezone(ZoneInfo("UTC"))


def combine_date_time_in_league_tz(
    target_date: date,
    wall_time: time
) -> datetime:
    """Combine a date and time in the league timezone.

    This is used for converting recurring patterns (which store wall clock times)
    into actual datetime blocks for specific dates.

    Args:
        target_date: The date for the availability block
        wall_time: The wall clock time (e.g., 19:00:00 for 7 PM)

    Returns:
        datetime: Timezone-aware datetime in league timezone

    Example:
        >>> # Create a block for Monday Nov 17, 2025 at 7:00 PM league time
        >>> target_date = date(2025, 11, 17)
        >>> wall_time = time(19, 0)
        >>> dt = combine_date_time_in_league_tz(target_date, wall_time)
    """
    league_tz = get_league_timezone()

    # Combine date and time, then localize to league timezone
    naive_dt = datetime.combine(target_date, wall_time)
    return naive_dt.replace(tzinfo=league_tz)


def get_week_start(reference_date: Optional[datetime] = None) -> datetime:
    """Get the start of the current league week (Monday 00:00:00 league time).

    The league week runs Monday through Sunday in league timezone.

    Args:
        reference_date: Optional reference date (defaults to now in league timezone)

    Returns:
        datetime: Start of the week in UTC (timezone-aware)

    Example:
        >>> # If today is Wednesday Nov 17, 2025
        >>> week_start = get_week_start()
        >>> # Returns Monday Nov 15, 2025 00:00:00 (league time) converted to UTC
    """
    league_tz = get_league_timezone()

    if reference_date is None:
        # Get current time in league timezone
        now_league = datetime.now(league_tz)
    else:
        # Convert reference date to league timezone
        if reference_date.tzinfo is None:
            reference_date = reference_date.replace(tzinfo=league_tz)
        now_league = reference_date.astimezone(league_tz)

    # Calculate days since Monday (0 = Monday, 6 = Sunday)
    days_since_monday = now_league.weekday()

    # Get Monday of this week at 00:00:00
    week_start_league = now_league.replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    week_start_league = week_start_league.replace(
        day=week_start_league.day - days_since_monday
    )

    # Convert to UTC
    return week_start_league.astimezone(ZoneInfo("UTC"))


def get_week_end(reference_date: Optional[datetime] = None) -> datetime:
    """Get the end of the current league week (Sunday 23:59:59 league time).

    Args:
        reference_date: Optional reference date (defaults to now in league timezone)

    Returns:
        datetime: End of the week in UTC (timezone-aware)
    """
    from datetime import timedelta

    week_start = get_week_start(reference_date)
    # Add 7 days minus 1 second to get end of Sunday
    week_end = week_start + timedelta(days=7) - timedelta(seconds=1)
    return week_end


def is_dst(dt: datetime) -> bool:
    """Check if a datetime is during Daylight Saving Time in the league timezone.

    Args:
        dt: Datetime to check (can be naive or aware)

    Returns:
        bool: True if during DST, False otherwise
    """
    league_tz = get_league_timezone()

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=league_tz)
    else:
        dt = dt.astimezone(league_tz)

    # Check if DST offset is non-zero
    return dt.dst() is not None and dt.dst().total_seconds() != 0
