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

    if has_alembic and not has_users:
        print("Detected incomplete migration state - resetting alembic_version...")
        conn.execute(text("DROP TABLE IF EXISTS alembic_version CASCADE"))
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
