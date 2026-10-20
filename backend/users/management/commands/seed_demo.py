"""
Seed the database with demo departments, users, forms, workflows and submissions.

    python manage.py migrate
    python manage.py seed_demo            # add demo data (safe to re-run)
    python manage.py seed_demo --flush    # wipe the database first
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone

from users.models import Department
from forms.models import Form, FormField, FormSubmission
from workflows.models import Workflow, WorkflowStep, WorkflowStepApprover, WorkflowInstance, WorkflowApproval

User = get_user_model()


def create_departments():
    """Create departments"""
    print("\n=== Creating Departments ===")

    departments_data = [
        {"code": "IT", "name": "IT Department", "description": "Information Technology Department"},
        {"code": "HR", "name": "HR Department", "description": "Human Resources Department"},
        {"code": "FIN", "name": "Finance Department", "description": "Finance and Accounting Department"},
        {"code": "MKT", "name": "Marketing Department", "description": "Marketing and Communications Department"},
        {"code": "OPS", "name": "Operations Department", "description": "Operations and Logistics Department"},
    ]

    departments = {}
    for dept_data in departments_data:
        dept, created = Department.objects.get_or_create(
            code=dept_data["code"],
            defaults={
                "name": dept_data["name"],
                "description": dept_data["description"],
                "is_active": True
            }
        )
        departments[dept_data["code"]] = dept
        print(f"  {'Created' if created else 'Found'}: {dept.name}")

    return departments


def create_users(departments):
    """Create users with different roles"""
    print("\n=== Creating Users ===")

    # Admin
    admin, created = User.objects.get_or_create(
        username="admin",
        defaults={
            "email": "admin@company.com",
            "first_name": "System",
            "last_name": "Administrator",
            "role": User.UserRole.ADMIN,
            "employee_id": "ADM001",
            "is_staff": True,
            "is_superuser": True,
            "is_active": True
        }
    )
    if created:
        admin.set_password("Admin123!")
        admin.save()
    print(f"  {'Created' if created else 'Found'}: Admin - admin@company.com")

    # Managers for each department
    managers = {}
    manager_data = [
        {"username": "it_manager", "email": "it.manager@company.com", "first_name": "David", "last_name": "Chen", "dept": "IT", "emp_id": "MGR001"},
        {"username": "hr_manager", "email": "hr.manager@company.com", "first_name": "Sarah", "last_name": "Johnson", "dept": "HR", "emp_id": "MGR002"},
        {"username": "fin_manager", "email": "finance.manager@company.com", "first_name": "Michael", "last_name": "Wong", "dept": "FIN", "emp_id": "MGR003"},
        {"username": "mkt_manager", "email": "marketing.manager@company.com", "first_name": "Emily", "last_name": "Lee", "dept": "MKT", "emp_id": "MGR004"},
        {"username": "ops_manager", "email": "ops.manager@company.com", "first_name": "James", "last_name": "Tan", "dept": "OPS", "emp_id": "MGR005"},
    ]

    for m in manager_data:
        manager, created = User.objects.get_or_create(
            username=m["username"],
            defaults={
                "email": m["email"],
                "first_name": m["first_name"],
                "last_name": m["last_name"],
                "role": User.UserRole.MANAGER,
                "department": departments[m["dept"]],
                "employee_id": m["emp_id"],
                "is_active": True
            }
        )
        if created:
            manager.set_password("Manager123!")
            manager.save()
            # Set as department manager
            dept = departments[m["dept"]]
            dept.manager = manager
            dept.save()
        managers[m["dept"]] = manager
        print(f"  {'Created' if created else 'Found'}: Manager - {m['email']}")

    # Regular employees
    employees = []
    employee_data = [
        {"username": "john_doe", "email": "john.doe@company.com", "first_name": "John", "last_name": "Doe", "dept": "IT", "emp_id": "EMP001"},
        {"username": "jane_smith", "email": "jane.smith@company.com", "first_name": "Jane", "last_name": "Smith", "dept": "IT", "emp_id": "EMP002"},
        {"username": "bob_wilson", "email": "bob.wilson@company.com", "first_name": "Bob", "last_name": "Wilson", "dept": "HR", "emp_id": "EMP003"},
        {"username": "alice_brown", "email": "alice.brown@company.com", "first_name": "Alice", "last_name": "Brown", "dept": "FIN", "emp_id": "EMP004"},
        {"username": "charlie_davis", "email": "charlie.davis@company.com", "first_name": "Charlie", "last_name": "Davis", "dept": "MKT", "emp_id": "EMP005"},
        {"username": "diana_miller", "email": "diana.miller@company.com", "first_name": "Diana", "last_name": "Miller", "dept": "OPS", "emp_id": "EMP006"},
        {"username": "eric_taylor", "email": "eric.taylor@company.com", "first_name": "Eric", "last_name": "Taylor", "dept": "IT", "emp_id": "EMP007"},
        {"username": "fiona_clark", "email": "fiona.clark@company.com", "first_name": "Fiona", "last_name": "Clark", "dept": "HR", "emp_id": "EMP008"},
    ]

    for e in employee_data:
        emp, created = User.objects.get_or_create(
            username=e["username"],
            defaults={
                "email": e["email"],
                "first_name": e["first_name"],
                "last_name": e["last_name"],
                "role": User.UserRole.USER,
                "department": departments[e["dept"]],
                "employee_id": e["emp_id"],
                "is_active": True
            }
        )
        if created:
            emp.set_password("User123!")
            emp.save()
        employees.append(emp)
        print(f"  {'Created' if created else 'Found'}: Employee - {e['email']}")

    return admin, managers, employees


def create_forms(departments, admin, managers):
    """Create sample forms"""
    print("\n=== Creating Forms ===")

    forms_data = [
        {
            "name": "Leave Request Form",
            "code": "LEAVE-REQ",
            "description": "Request for annual leave, sick leave, or other time off",
            "department": departments["HR"],
            "ai_generated": False,
            "fields": [
                {"name": "leave_type", "label": "Leave Type", "field_type": "SELECT", "required": True,
                 "options": ["Annual Leave", "Sick Leave", "Personal Leave", "Unpaid Leave"]},
                {"name": "start_date", "label": "Start Date", "field_type": "DATE", "required": True},
                {"name": "end_date", "label": "End Date", "field_type": "DATE", "required": True},
                {"name": "total_days", "label": "Total Days", "field_type": "NUMBER", "required": True},
                {"name": "reason", "label": "Reason for Leave", "field_type": "TEXTAREA", "required": True},
                {"name": "handover_to", "label": "Work Handover To", "field_type": "TEXT", "required": False},
                {"name": "contact_number", "label": "Emergency Contact Number", "field_type": "PHONE", "required": True},
            ]
        },
        {
            "name": "Expense Claim Form",
            "code": "EXP-CLAIM",
            "description": "Submit expense reimbursement claims",
            "department": departments["FIN"],
            "ai_generated": False,
            "fields": [
                {"name": "expense_type", "label": "Expense Type", "field_type": "SELECT", "required": True,
                 "options": ["Travel", "Meals", "Accommodation", "Office Supplies", "Training", "Other"]},
                {"name": "expense_date", "label": "Date of Expense", "field_type": "DATE", "required": True},
                {"name": "amount", "label": "Amount (RM)", "field_type": "NUMBER", "required": True},
                {"name": "description", "label": "Description", "field_type": "TEXTAREA", "required": True},
                {"name": "receipt_number", "label": "Receipt/Invoice Number", "field_type": "TEXT", "required": True},
                {"name": "project_code", "label": "Project Code (if applicable)", "field_type": "TEXT", "required": False},
            ]
        },
        {
            "name": "IT Equipment Request",
            "code": "IT-EQUIP",
            "description": "Request for new IT equipment or hardware",
            "department": departments["IT"],
            "ai_generated": True,
            "ai_prompt": "Create a form for employees to request IT equipment like laptops, monitors, or accessories",
            "fields": [
                {"name": "equipment_type", "label": "Equipment Type", "field_type": "SELECT", "required": True,
                 "options": ["Laptop", "Desktop", "Monitor", "Keyboard/Mouse", "Headset", "Other"]},
                {"name": "brand_preference", "label": "Brand Preference", "field_type": "TEXT", "required": False},
                {"name": "specifications", "label": "Required Specifications", "field_type": "TEXTAREA", "required": True},
                {"name": "justification", "label": "Business Justification", "field_type": "TEXTAREA", "required": True},
                {"name": "urgency", "label": "Urgency Level", "field_type": "RADIO", "required": True,
                 "options": ["Low - Within 1 month", "Medium - Within 2 weeks", "High - Within 1 week", "Critical - Immediate"]},
                {"name": "budget_approved", "label": "Budget Pre-approved", "field_type": "CHECKBOX", "required": False},
            ]
        },
        {
            "name": "Training Request Form",
            "code": "TRAIN-REQ",
            "description": "Request to attend training courses or workshops",
            "department": departments["HR"],
            "ai_generated": True,
            "ai_prompt": "Create a form for employees to request training or professional development courses",
            "fields": [
                {"name": "training_name", "label": "Training/Course Name", "field_type": "TEXT", "required": True},
                {"name": "training_provider", "label": "Training Provider", "field_type": "TEXT", "required": True},
                {"name": "training_date", "label": "Training Date", "field_type": "DATE", "required": True},
                {"name": "duration", "label": "Duration (days)", "field_type": "NUMBER", "required": True},
                {"name": "cost", "label": "Cost (RM)", "field_type": "NUMBER", "required": True},
                {"name": "benefits", "label": "Expected Benefits", "field_type": "TEXTAREA", "required": True},
                {"name": "training_mode", "label": "Training Mode", "field_type": "RADIO", "required": True,
                 "options": ["Online", "In-person", "Hybrid"]},
            ]
        },
        {
            "name": "Work From Home Request",
            "code": "WFH-REQ",
            "description": "Request to work from home",
            "department": departments["HR"],
            "ai_generated": False,
            "fields": [
                {"name": "wfh_date", "label": "Work From Home Date", "field_type": "DATE", "required": True},
                {"name": "reason", "label": "Reason for WFH", "field_type": "TEXTAREA", "required": True},
                {"name": "tasks_planned", "label": "Tasks Planned", "field_type": "TEXTAREA", "required": True},
                {"name": "contactable", "label": "Contactable via", "field_type": "MULTISELECT", "required": True,
                 "options": ["Email", "Phone", "Teams", "WhatsApp"]},
                {"name": "equipment_needed", "label": "Equipment Needed from Office", "field_type": "TEXT", "required": False},
            ]
        },
    ]

    created_forms = []
    for form_data in forms_data:
        form, created = Form.objects.get_or_create(
            code=form_data["code"],
            defaults={
                "name": form_data["name"],
                "description": form_data["description"],
                "department": form_data["department"],
                "created_by": admin,
                "status": Form.FormStatus.ACTIVE,
                "ai_generated": form_data.get("ai_generated", False),
                "ai_prompt": form_data.get("ai_prompt", ""),
            }
        )

        if created:
            # Create form fields
            for i, field_data in enumerate(form_data["fields"]):
                FormField.objects.create(
                    form=form,
                    name=field_data["name"],
                    label=field_data["label"],
                    field_type=field_data["field_type"],
                    required=field_data.get("required", False),
                    options=field_data.get("options", []),
                    order=i
                )

        created_forms.append(form)
        print(f"  {'Created' if created else 'Found'}: {form.name}")

    return created_forms


def create_workflows(forms, managers, admin):
    """Create workflows for forms"""
    print("\n=== Creating Workflows ===")

    created_workflows = []

    # Leave Request - Sequential: Manager -> HR Manager
    leave_form = next((f for f in forms if f.code == "LEAVE-REQ"), None)
    if leave_form:
        workflow, created = Workflow.objects.get_or_create(
            form=leave_form,
            defaults={
                "name": "Leave Approval Workflow",
                "code": "WF-LEAVE",
                "description": "Two-step approval: Department Manager then HR Manager",
                "workflow_type": Workflow.WorkflowType.SEQUENTIAL,
                "status": Workflow.WorkflowStatus.ACTIVE,
                "created_by": admin,
            }
        )
        if created:
            # Step 1: Department Manager
            step1 = WorkflowStep.objects.create(
                workflow=workflow,
                name="Manager Approval",
                step_type=WorkflowStep.StepType.APPROVAL,
                order=1,
                assigned_role="MANAGER",
                approval_mode=WorkflowStep.ApprovalMode.ANY,
            )
            # Step 2: HR Manager
            step2 = WorkflowStep.objects.create(
                workflow=workflow,
                name="HR Approval",
                step_type=WorkflowStep.StepType.APPROVAL,
                order=2,
                assigned_user=managers["HR"],
                approval_mode=WorkflowStep.ApprovalMode.ANY,
            )
        created_workflows.append(workflow)
        print(f"  {'Created' if created else 'Found'}: {workflow.name}")

    # Expense Claim - Sequential: Manager -> Finance Manager
    expense_form = next((f for f in forms if f.code == "EXP-CLAIM"), None)
    if expense_form:
        workflow, created = Workflow.objects.get_or_create(
            form=expense_form,
            defaults={
                "name": "Expense Approval Workflow",
                "code": "WF-EXPENSE",
                "description": "Two-step approval: Department Manager then Finance Manager",
                "workflow_type": Workflow.WorkflowType.SEQUENTIAL,
                "status": Workflow.WorkflowStatus.ACTIVE,
                "created_by": admin,
            }
        )
        if created:
            step1 = WorkflowStep.objects.create(
                workflow=workflow,
                name="Manager Approval",
                step_type=WorkflowStep.StepType.APPROVAL,
                order=1,
                assigned_role="MANAGER",
                approval_mode=WorkflowStep.ApprovalMode.ANY,
            )
            step2 = WorkflowStep.objects.create(
                workflow=workflow,
                name="Finance Approval",
                step_type=WorkflowStep.StepType.APPROVAL,
                order=2,
                assigned_user=managers["FIN"],
                approval_mode=WorkflowStep.ApprovalMode.ANY,
            )
        created_workflows.append(workflow)
        print(f"  {'Created' if created else 'Found'}: {workflow.name}")

    # IT Equipment - Sequential: Manager -> IT Manager
    it_form = next((f for f in forms if f.code == "IT-EQUIP"), None)
    if it_form:
        workflow, created = Workflow.objects.get_or_create(
            form=it_form,
            defaults={
                "name": "IT Equipment Approval Workflow",
                "code": "WF-IT-EQUIP",
                "description": "Two-step approval: Department Manager then IT Manager",
                "workflow_type": Workflow.WorkflowType.SEQUENTIAL,
                "status": Workflow.WorkflowStatus.ACTIVE,
                "created_by": admin,
            }
        )
        if created:
            step1 = WorkflowStep.objects.create(
                workflow=workflow,
                name="Manager Approval",
                step_type=WorkflowStep.StepType.APPROVAL,
                order=1,
                assigned_role="MANAGER",
                approval_mode=WorkflowStep.ApprovalMode.ANY,
            )
            step2 = WorkflowStep.objects.create(
                workflow=workflow,
                name="IT Manager Approval",
                step_type=WorkflowStep.StepType.APPROVAL,
                order=2,
                assigned_user=managers["IT"],
                approval_mode=WorkflowStep.ApprovalMode.ANY,
            )
        created_workflows.append(workflow)
        print(f"  {'Created' if created else 'Found'}: {workflow.name}")

    # Training Request - Sequential: Manager -> HR Manager
    training_form = next((f for f in forms if f.code == "TRAIN-REQ"), None)
    if training_form:
        workflow, created = Workflow.objects.get_or_create(
            form=training_form,
            defaults={
                "name": "Training Approval Workflow",
                "code": "WF-TRAINING",
                "description": "Two-step approval: Department Manager then HR Manager",
                "workflow_type": Workflow.WorkflowType.SEQUENTIAL,
                "status": Workflow.WorkflowStatus.ACTIVE,
                "created_by": admin,
            }
        )
        if created:
            step1 = WorkflowStep.objects.create(
                workflow=workflow,
                name="Manager Approval",
                step_type=WorkflowStep.StepType.APPROVAL,
                order=1,
                assigned_role="MANAGER",
                approval_mode=WorkflowStep.ApprovalMode.ANY,
            )
            step2 = WorkflowStep.objects.create(
                workflow=workflow,
                name="HR Approval",
                step_type=WorkflowStep.StepType.APPROVAL,
                order=2,
                assigned_user=managers["HR"],
                approval_mode=WorkflowStep.ApprovalMode.ANY,
            )
        created_workflows.append(workflow)
        print(f"  {'Created' if created else 'Found'}: {workflow.name}")

    # WFH Request - Single step: Manager only
    wfh_form = next((f for f in forms if f.code == "WFH-REQ"), None)
    if wfh_form:
        workflow, created = Workflow.objects.get_or_create(
            form=wfh_form,
            defaults={
                "name": "WFH Approval Workflow",
                "code": "WF-WFH",
                "description": "Single-step approval: Department Manager",
                "workflow_type": Workflow.WorkflowType.SEQUENTIAL,
                "status": Workflow.WorkflowStatus.ACTIVE,
                "created_by": admin,
            }
        )
        if created:
            WorkflowStep.objects.create(
                workflow=workflow,
                name="Manager Approval",
                step_type=WorkflowStep.StepType.APPROVAL,
                order=1,
                assigned_role="MANAGER",
                approval_mode=WorkflowStep.ApprovalMode.ANY,
            )
        created_workflows.append(workflow)
        print(f"  {'Created' if created else 'Found'}: {workflow.name}")

    return created_workflows


def create_submissions(forms, employees, managers):
    """Create sample submissions with various statuses"""
    print("\n=== Creating Submissions ===")

    now = timezone.now()

    # Leave Request Submissions
    leave_form = next((f for f in forms if f.code == "LEAVE-REQ"), None)
    if leave_form:
        submissions_data = [
            {
                "user": employees[0],  # John Doe
                "status": FormSubmission.SubmissionStatus.APPROVED,
                "data": {
                    "leave_type": "Annual Leave",
                    "start_date": (now + timedelta(days=14)).strftime("%Y-%m-%d"),
                    "end_date": (now + timedelta(days=18)).strftime("%Y-%m-%d"),
                    "total_days": "5",
                    "reason": "Family vacation to Japan",
                    "handover_to": "Jane Smith",
                    "contact_number": "+60123456789"
                },
                "days_ago": 7
            },
            {
                "user": employees[1],  # Jane Smith
                "status": FormSubmission.SubmissionStatus.IN_REVIEW,
                "data": {
                    "leave_type": "Sick Leave",
                    "start_date": (now + timedelta(days=2)).strftime("%Y-%m-%d"),
                    "end_date": (now + timedelta(days=3)).strftime("%Y-%m-%d"),
                    "total_days": "2",
                    "reason": "Medical appointment and recovery",
                    "handover_to": "John Doe",
                    "contact_number": "+60198765432"
                },
                "days_ago": 1
            },
            {
                "user": employees[2],  # Bob Wilson
                "status": FormSubmission.SubmissionStatus.REJECTED,
                "data": {
                    "leave_type": "Annual Leave",
                    "start_date": (now + timedelta(days=5)).strftime("%Y-%m-%d"),
                    "end_date": (now + timedelta(days=12)).strftime("%Y-%m-%d"),
                    "total_days": "8",
                    "reason": "Extended holiday",
                    "handover_to": "Fiona Clark",
                    "contact_number": "+60111222333"
                },
                "days_ago": 5
            },
        ]

        for sub_data in submissions_data:
            submission = FormSubmission.objects.create(
                form=leave_form,
                submitted_by=sub_data["user"],
                status=sub_data["status"],
                data=sub_data["data"],
                submitted_at=now - timedelta(days=sub_data["days_ago"])
            )
            print(f"  Created: Leave request by {sub_data['user'].username} - {sub_data['status']}")

    # Expense Claim Submissions
    expense_form = next((f for f in forms if f.code == "EXP-CLAIM"), None)
    if expense_form:
        submissions_data = [
            {
                "user": employees[3],  # Alice Brown
                "status": FormSubmission.SubmissionStatus.APPROVED,
                "data": {
                    "expense_type": "Travel",
                    "expense_date": (now - timedelta(days=10)).strftime("%Y-%m-%d"),
                    "amount": "450.00",
                    "description": "Client meeting in Penang - flight and transport",
                    "receipt_number": "INV-2024-001234",
                    "project_code": "PROJ-CLIENT-A"
                },
                "days_ago": 8
            },
            {
                "user": employees[4],  # Charlie Davis
                "status": FormSubmission.SubmissionStatus.IN_REVIEW,
                "data": {
                    "expense_type": "Meals",
                    "expense_date": (now - timedelta(days=3)).strftime("%Y-%m-%d"),
                    "amount": "120.50",
                    "description": "Team lunch with marketing partners",
                    "receipt_number": "RCP-20240115",
                    "project_code": ""
                },
                "days_ago": 2
            },
            {
                "user": employees[0],  # John Doe
                "status": FormSubmission.SubmissionStatus.SUBMITTED,
                "data": {
                    "expense_type": "Training",
                    "expense_date": (now - timedelta(days=1)).strftime("%Y-%m-%d"),
                    "amount": "850.00",
                    "description": "AWS Cloud Certification exam fee",
                    "receipt_number": "AWS-CERT-2024-789",
                    "project_code": "TRAIN-2024"
                },
                "days_ago": 0
            },
        ]

        for sub_data in submissions_data:
            submission = FormSubmission.objects.create(
                form=expense_form,
                submitted_by=sub_data["user"],
                status=sub_data["status"],
                data=sub_data["data"],
                submitted_at=now - timedelta(days=sub_data["days_ago"])
            )
            print(f"  Created: Expense claim by {sub_data['user'].username} - {sub_data['status']}")

    # IT Equipment Submissions
    it_form = next((f for f in forms if f.code == "IT-EQUIP"), None)
    if it_form:
        submissions_data = [
            {
                "user": employees[1],  # Jane Smith
                "status": FormSubmission.SubmissionStatus.APPROVED,
                "data": {
                    "equipment_type": "Monitor",
                    "brand_preference": "Dell or LG",
                    "specifications": "27 inch, 4K resolution, USB-C connectivity",
                    "justification": "Current monitor is 5 years old and has display issues. Need higher resolution for design work.",
                    "urgency": "Medium - Within 2 weeks",
                    "budget_approved": True
                },
                "days_ago": 14
            },
            {
                "user": employees[6],  # Eric Taylor
                "status": FormSubmission.SubmissionStatus.IN_REVIEW,
                "data": {
                    "equipment_type": "Laptop",
                    "brand_preference": "MacBook Pro",
                    "specifications": "M3 Pro chip, 18GB RAM, 512GB SSD",
                    "justification": "Current laptop is too slow for development work. Need better performance for containerized development.",
                    "urgency": "High - Within 1 week",
                    "budget_approved": False
                },
                "days_ago": 3
            },
        ]

        for sub_data in submissions_data:
            submission = FormSubmission.objects.create(
                form=it_form,
                submitted_by=sub_data["user"],
                status=sub_data["status"],
                data=sub_data["data"],
                submitted_at=now - timedelta(days=sub_data["days_ago"])
            )
            print(f"  Created: IT equipment request by {sub_data['user'].username} - {sub_data['status']}")

    # Training Request Submissions
    training_form = next((f for f in forms if f.code == "TRAIN-REQ"), None)
    if training_form:
        submission = FormSubmission.objects.create(
            form=training_form,
            submitted_by=employees[5],  # Diana Miller
            status=FormSubmission.SubmissionStatus.SUBMITTED,
            data={
                "training_name": "Project Management Professional (PMP) Certification",
                "training_provider": "PMI Authorized Training Partner",
                "training_date": (now + timedelta(days=30)).strftime("%Y-%m-%d"),
                "duration": "5",
                "cost": "3500.00",
                "benefits": "Will improve project management skills and help in leading larger projects. PMP certification is recognized globally.",
                "training_mode": "Hybrid"
            },
            submitted_at=now - timedelta(days=1)
        )
        print(f"  Created: Training request by diana_miller - SUBMITTED")

    # WFH Submissions
    wfh_form = next((f for f in forms if f.code == "WFH-REQ"), None)
    if wfh_form:
        submissions_data = [
            {
                "user": employees[0],
                "status": FormSubmission.SubmissionStatus.APPROVED,
                "data": {
                    "wfh_date": (now + timedelta(days=1)).strftime("%Y-%m-%d"),
                    "reason": "Waiting for home repair service",
                    "tasks_planned": "Code review, documentation updates, team sync meeting",
                    "contactable": ["Email", "Teams", "Phone"],
                    "equipment_needed": ""
                },
                "days_ago": 2
            },
            {
                "user": employees[7],  # Fiona Clark
                "status": FormSubmission.SubmissionStatus.SUBMITTED,
                "data": {
                    "wfh_date": (now + timedelta(days=3)).strftime("%Y-%m-%d"),
                    "reason": "Child's school event in the morning",
                    "tasks_planned": "HR reports, interview scheduling, policy documentation",
                    "contactable": ["Email", "Teams", "WhatsApp"],
                    "equipment_needed": "None"
                },
                "days_ago": 0
            },
        ]

        for sub_data in submissions_data:
            submission = FormSubmission.objects.create(
                form=wfh_form,
                submitted_by=sub_data["user"],
                status=sub_data["status"],
                data=sub_data["data"],
                submitted_at=now - timedelta(days=sub_data["days_ago"])
            )
            print(f"  Created: WFH request by {sub_data['user'].username} - {sub_data['status']}")


def print_summary():
    """Print summary of created data"""
    print("\n" + "=" * 60)
    print("DEMO DATA CREATION COMPLETE!")
    print("=" * 60)

    print("\nDatabase Statistics:")
    print(f"  Departments: {Department.objects.count()}")
    print(f"  Users: {User.objects.count()}")
    print(f"    - Admins: {User.objects.filter(role=User.UserRole.ADMIN).count()}")
    print(f"    - Managers: {User.objects.filter(role=User.UserRole.MANAGER).count()}")
    print(f"    - Employees: {User.objects.filter(role=User.UserRole.USER).count()}")
    print(f"  Forms: {Form.objects.count()}")
    print(f"  Workflows: {Workflow.objects.count()}")
    print(f"  Submissions: {FormSubmission.objects.count()}")

    print("\nLogin Credentials:")
    print("-" * 60)
    print("ADMIN:")
    print("  Username: admin")
    print("  Password: Admin123!")
    print()
    print("MANAGERS (Password: Manager123!):")
    print("  - it_manager (IT Department)")
    print("  - hr_manager (HR Department)")
    print("  - fin_manager (Finance Department)")
    print("  - mkt_manager (Marketing Department)")
    print("  - ops_manager (Operations Department)")
    print()
    print("EMPLOYEES (Password: User123!):")
    print("  - john_doe (IT)")
    print("  - jane_smith (IT)")
    print("  - bob_wilson (HR)")
    print("  - alice_brown (Finance)")
    print("  - charlie_davis (Marketing)")
    print("  - diana_miller (Operations)")
    print("  - eric_taylor (IT)")
    print("  - fiona_clark (HR)")
    print("-" * 60)


class Command(BaseCommand):
    help = 'Create demo departments, users, forms, workflows and submissions.'

    def add_arguments(self, parser):
        parser.add_argument('--flush', action='store_true', help='Delete all existing data first.')

    def handle(self, *args, **options):
        if options['flush']:
            call_command('flush', interactive=False)

        departments = create_departments()
        admin, managers, employees = create_users(departments)
        forms = create_forms(departments, admin, managers)
        create_workflows(forms, managers, admin)
        create_submissions(forms, employees, managers)

        print_summary()
        print("\nDemo data is ready. Start the server with: python manage.py runserver")
