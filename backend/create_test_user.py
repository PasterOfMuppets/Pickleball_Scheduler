"""Create a test user for API testing."""
from datetime import datetime
from zoneinfo import ZoneInfo
from app.database import SessionLocal
from app.models.user import User

db = SessionLocal()

now = datetime.now(ZoneInfo("UTC"))

# Create a test user (using a dummy password hash for testing)
test_user = User(
    name="Test User",
    email="test@example.com",
    password_hash="$2b$12$dummyhashfortest123456789",  # Dummy hash for testing
    phone_number="+1234567890",
    role="player",
    status="active",
    sms_consent=True,
    created_at=now,
    updated_at=now
)

db.add(test_user)
db.commit()
db.refresh(test_user)

print(f"Test user created successfully!")
print(f"ID: {test_user.id}")
print(f"Name: {test_user.name}")
print(f"Email: {test_user.email}")
print(f"\nTo use this user in Swagger UI, set Authorization header to: Bearer {test_user.id}")

db.close()
