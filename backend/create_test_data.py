"""
Script to create test data for the authentication system.
Run this script after migrations: python manage.py shell < create_test_data.py
Or run it inside Django shell: python manage.py shell
>>> exec(open('create_test_data.py').read())
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from users.models import User, Department
from django.contrib.auth import get_user_model

User = get_user_model()

def create_test_data():
    """Create test departments and users."""

    print("Creating test data...")

    # Create Departments
    print("\n1. Creating departments...")

    it_dept, created = Department.objects.get_or_create(
        code="IT",
        defaults={
            "name": "IT Department",
            "description": "Information Technology Department",
            "is_active": True
        }
    )
    print(f"  - IT Department {'created' if created else 'already exists'}")

    hr_dept, created = Department.objects.get_or_create(
        code="HR",
        defaults={
            "name": "HR Department",
            "description": "Human Resources Department",
            "is_active": True
        }
    )
    print(f"  - HR Department {'created' if created else 'already exists'}")

    finance_dept, created = Department.objects.get_or_create(
        code="FIN",
        defaults={
            "name": "Finance Department",
            "description": "Finance and Accounting Department",
            "is_active": True
        }
    )
    print(f"  - Finance Department {'created' if created else 'already exists'}")

    marketing_dept, created = Department.objects.get_or_create(
        code="MKT",
        defaults={
            "name": "Marketing Department",
            "description": "Marketing and Communications Department",
            "is_active": True
        }
    )
    print(f"  - Marketing Department {'created' if created else 'already exists'}")

    # Create IT sub-department
    it_support, created = Department.objects.get_or_create(
        code="IT-SUP",
        defaults={
            "name": "IT Support",
            "description": "IT Support Team",
            "parent": it_dept,
            "is_active": True
        }
    )
    print(f"  - IT Support (sub-department) {'created' if created else 'already exists'}")

    # Create Admin User
    print("\n2. Creating admin user...")
    admin_user, created = User.objects.get_or_create(
        username="admin",
        defaults={
            "email": "admin@example.com",
            "first_name": "Admin",
            "last_name": "User",
            "role": User.UserRole.ADMIN,
            "employee_id": "EMP001",
            "is_staff": True,
            "is_superuser": True,
            "is_active": True
        }
    )
    if created:
        admin_user.set_password("Admin123!")
        admin_user.save()
        print(f"  - Admin user created")
        print(f"    Username: admin")
        print(f"    Email: admin@example.com")
        print(f"    Password: Admin123!")
    else:
        print(f"  - Admin user already exists")

    # Create Manager Users
    print("\n3. Creating manager users...")

    it_manager, created = User.objects.get_or_create(
        username="it_manager",
        defaults={
            "email": "it.manager@example.com",
            "first_name": "John",
            "last_name": "Manager",
            "role": User.UserRole.MANAGER,
            "department": it_dept,
            "employee_id": "EMP002",
            "phone_number": "+1234567890",
            "is_active": True
        }
    )
    if created:
        it_manager.set_password("Manager123!")
        it_manager.save()
        # Set as department manager
        it_dept.manager = it_manager
        it_dept.save()
        print(f"  - IT Manager created")
        print(f"    Username: it_manager")
        print(f"    Email: it.manager@example.com")
        print(f"    Password: Manager123!")
    else:
        print(f"  - IT Manager already exists")

    hr_manager, created = User.objects.get_or_create(
        username="hr_manager",
        defaults={
            "email": "hr.manager@example.com",
            "first_name": "Sarah",
            "last_name": "Johnson",
            "role": User.UserRole.MANAGER,
            "department": hr_dept,
            "employee_id": "EMP003",
            "phone_number": "+1234567891",
            "is_active": True
        }
    )
    if created:
        hr_manager.set_password("Manager123!")
        hr_manager.save()
        hr_dept.manager = hr_manager
        hr_dept.save()
        print(f"  - HR Manager created")
        print(f"    Username: hr_manager")
        print(f"    Email: hr.manager@example.com")
        print(f"    Password: Manager123!")
    else:
        print(f"  - HR Manager already exists")

    # Create Regular Users
    print("\n4. Creating regular users...")

    users_data = [
        {
            "username": "john_doe",
            "email": "john.doe@example.com",
            "first_name": "John",
            "last_name": "Doe",
            "department": it_dept,
            "employee_id": "EMP101"
        },
        {
            "username": "jane_smith",
            "email": "jane.smith@example.com",
            "first_name": "Jane",
            "last_name": "Smith",
            "department": it_dept,
            "employee_id": "EMP102"
        },
        {
            "username": "bob_wilson",
            "email": "bob.wilson@example.com",
            "first_name": "Bob",
            "last_name": "Wilson",
            "department": hr_dept,
            "employee_id": "EMP201"
        },
        {
            "username": "alice_brown",
            "email": "alice.brown@example.com",
            "first_name": "Alice",
            "last_name": "Brown",
            "department": finance_dept,
            "employee_id": "EMP301"
        },
        {
            "username": "charlie_davis",
            "email": "charlie.davis@example.com",
            "first_name": "Charlie",
            "last_name": "Davis",
            "department": marketing_dept,
            "employee_id": "EMP401"
        },
    ]

    for user_data in users_data:
        user, created = User.objects.get_or_create(
            username=user_data["username"],
            defaults={
                **user_data,
                "role": User.UserRole.USER,
                "is_active": True
            }
        )
        if created:
            user.set_password("User123!")
            user.save()
            print(f"  - {user.full_name} created")
            print(f"    Username: {user.username}")
            print(f"    Email: {user.email}")
            print(f"    Password: User123!")
        else:
            print(f"  - {user.full_name} already exists")

    # Summary
    print("\n" + "="*60)
    print("TEST DATA CREATION COMPLETE!")
    print("="*60)

    print("\nDatabase Statistics:")
    print(f"  Total Departments: {Department.objects.count()}")
    print(f"  Total Users: {User.objects.count()}")
    print(f"  Admins: {User.objects.filter(role=User.UserRole.ADMIN).count()}")
    print(f"  Managers: {User.objects.filter(role=User.UserRole.MANAGER).count()}")
    print(f"  Regular Users: {User.objects.filter(role=User.UserRole.USER).count()}")

    print("\nTest Credentials:")
    print("-" * 60)
    print("ADMIN:")
    print("  Username: admin")
    print("  Email: admin@example.com")
    print("  Password: Admin123!")
    print()
    print("IT MANAGER:")
    print("  Username: it_manager")
    print("  Email: it.manager@example.com")
    print("  Password: Manager123!")
    print()
    print("HR MANAGER:")
    print("  Username: hr_manager")
    print("  Email: hr.manager@example.com")
    print("  Password: Manager123!")
    print()
    print("REGULAR USERS (all have password: User123!):")
    print("  - john_doe / john.doe@example.com")
    print("  - jane_smith / jane.smith@example.com")
    print("  - bob_wilson / bob.wilson@example.com")
    print("  - alice_brown / alice.brown@example.com")
    print("  - charlie_davis / charlie.davis@example.com")
    print("-" * 60)

    print("\nYou can now:")
    print("1. Run the development server: python manage.py runserver")
    print("2. Access the API at: http://localhost:8000/api/v1/")
    print("3. Access Django Admin at: http://localhost:8000/admin/")
    print("4. Test the API with the credentials above")

if __name__ == "__main__":
    create_test_data()
