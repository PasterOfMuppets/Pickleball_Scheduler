"""Create an initial admin user for the Pickleball Scheduler."""
import sys
from app.database import SessionLocal
from app.models.user import User
from app.utils.auth import get_password_hash

def create_admin_user(name: str, email: str, password: str, phone: str = None):
    """Create an admin user in the database."""
    db = SessionLocal()

    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"❌ User with email {email} already exists!")
            print(f"   User ID: {existing_user.id}")
            print(f"   Name: {existing_user.name}")
            print(f"   Role: {existing_user.role}")
            return False

        # Create admin user
        admin = User(
            name=name,
            email=email,
            phone=phone,
            password_hash=get_password_hash(password),
            role="admin",
            status="active"
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print("✅ Admin user created successfully!")
        print(f"   User ID: {admin.id}")
        print(f"   Name: {admin.name}")
        print(f"   Email: {admin.email}")
        print(f"   Role: {admin.role}")
        print(f"\n🔐 Login credentials:")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print(f"\n📱 You can now log in at http://localhost:5173")

        return True

    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python create_admin.py <name> <email> <password> [phone]")
        print("\nExample:")
        print("  python create_admin.py 'Admin User' admin@example.com 'SecurePass123!' '+15551234567'")
        sys.exit(1)

    name = sys.argv[1]
    email = sys.argv[2]
    password = sys.argv[3]
    phone = sys.argv[4] if len(sys.argv) > 4 else None

    create_admin_user(name, email, password, phone)
