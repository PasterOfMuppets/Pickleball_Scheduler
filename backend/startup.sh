#!/bin/bash
set -e

echo "Checking database state..."

# Check if users table exists but is empty (indicating failed migration)
python << 'PYEOF'
from sqlalchemy import create_engine, text, inspect
from app.config import settings

engine = create_engine(settings.DATABASE_URL)

with engine.connect() as conn:
    # Check if alembic_version exists
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    # If alembic_version exists but users table doesn't, we have a problem
    has_alembic = 'alembic_version' in tables
    has_users = 'users' in tables

    # Check for schema issues (like old metadata column instead of extra_data)
    needs_reset = False

    if has_alembic and not has_users:
        print("Detected incomplete migration state - users table missing...")
        needs_reset = True
    elif 'notification_queue' in tables:
        # Check if notification_queue has old 'metadata' column instead of 'extra_data'
        columns = [col['name'] for col in inspector.get_columns('notification_queue')]
        if 'metadata' in columns and 'extra_data' not in columns:
            print("Detected old schema - notification_queue has 'metadata' column instead of 'extra_data'...")
            needs_reset = True

    if needs_reset:
        print("Resetting database schema...")
        conn.execute(text("DROP TABLE IF EXISTS alembic_version CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS notification_queue CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS notification_preferences CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS admin_action_log CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS matches CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS availability_blocks CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS recurring_availability CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS users CASCADE"))
        conn.commit()
        print("Reset complete. Migrations will run from scratch.")
    elif has_alembic and has_users:
        print("Database schema looks good.")
    else:
        print("Fresh database detected.")
PYEOF

echo "Running migrations..."
alembic upgrade head

echo "Starting FastAPI server..."
uvicorn app.main:app --host 0.0.0.0 --port 6900
