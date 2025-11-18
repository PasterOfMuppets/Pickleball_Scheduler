"""Reset database by dropping all tables and alembic_version."""
import sys
from sqlalchemy import create_engine, text
from app.config import settings

def reset_database():
    """Drop all tables and alembic version to allow clean migration."""
    try:
        engine = create_engine(settings.DATABASE_URL)

        with engine.connect() as conn:
            # Drop all tables
            print("Dropping tables...")
            conn.execute(text("DROP TABLE IF EXISTS alembic_version CASCADE;"))
            conn.execute(text("DROP TABLE IF EXISTS matches CASCADE;"))
            conn.execute(text("DROP TABLE IF EXISTS availability_blocks CASCADE;"))
            conn.execute(text("DROP TABLE IF EXISTS recurring_availability CASCADE;"))
            conn.execute(text("DROP TABLE IF EXISTS users CASCADE;"))
            conn.execute(text("DROP TABLE IF EXISTS notification_queue CASCADE;"))
            conn.execute(text("DROP TABLE IF EXISTS admin_action_log CASCADE;"))
            conn.commit()
            print("All tables dropped successfully!")
            print("\nYou can now restart the backend container to run migrations from scratch.")

    except Exception as e:
        print(f"Error resetting database: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("WARNING: This will drop all database tables!")
    response = input("Are you sure you want to continue? (yes/no): ")
    if response.lower() == 'yes':
        reset_database()
    else:
        print("Aborted.")
