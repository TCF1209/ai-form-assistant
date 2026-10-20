"""
Seed the database with demo departments, users, forms, workflows and submissions.

    python manage.py migrate
    python manage.py seed_demo            # add demo data (safe to re-run)
    python manage.py seed_demo --flush    # wipe the database first
"""

import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone

from users.models import Department
from forms.models import Form, FormField, FormSubmission
from workflows.engine import WorkflowEngine
from workflows.models import Workflow, WorkflowApproval, WorkflowInstance, WorkflowStep, WorkflowStepApprover

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


def create_workflows(forms, employees, admin):
    """
    One workflow per form. Approvers are employees (only the USER role approves); the
    engine never assigns submitters their own request.
    """
    print("\n=== Creating Workflows ===")
    by_code = {f.code: f for f in forms}
    people = {e.username: e for e in employees}

    specs = [
        ("LEAVE-REQ", "Leave Approval", Workflow.WorkflowType.SEQUENTIAL, {}, [
            ("Team Lead Review", "ANY", ["jane_smith", "eric_taylor"], None),
            ("HR Review", "ANY", ["bob_wilson", "fiona_clark"], None),
        ]),
        ("EXP-CLAIM", "Expense Approval", Workflow.WorkflowType.SEQUENTIAL, {}, [
            ("Team Lead Review", "ANY", ["jane_smith", "charlie_davis"], None),
            ("Finance Review", "ALL", ["alice_brown"], None),
        ]),
        ("IT-EQUIP", "IT Equipment Sign-off", Workflow.WorkflowType.PARALLEL, {"approval_threshold": 100}, [
            ("IT and Finance Sign-off", "ALL", ["eric_taylor", "alice_brown"], None),
        ]),
        ("TRAIN-REQ", "Training Approval", Workflow.WorkflowType.CONDITIONAL, {}, [
            ("HR Review", "ANY", ["fiona_clark", "bob_wilson"], None),
            ("Finance Review (cost over RM 1,000)", "ALL", ["alice_brown"],
             {"logic": "AND", "rules": [{"field": "cost", "operator": "gt", "value": 1000}]}),
        ]),
        ("WFH-REQ", "Work From Home Approval", Workflow.WorkflowType.SEQUENTIAL, {}, [
            ("Team Lead Review", "ANY", ["jane_smith", "diana_miller"], None),
        ]),
    ]

    workflows = []
    for code, name, workflow_type, options, steps in specs:
        form = by_code.get(code)
        if form is None:
            continue
        workflow, created = Workflow.objects.get_or_create(
            form=form,
            defaults={
                "name": name,
                "code": f"WF-{code}",
                "description": f"{name} for the {form.name}",
                "workflow_type": workflow_type,
                "status": Workflow.WorkflowStatus.ACTIVE,
                "created_by": admin,
                **options,
            },
        )
        if created:
            for order, (step_name, mode, approvers, conditions) in enumerate(steps):
                step = WorkflowStep.objects.create(
                    workflow=workflow,
                    name=step_name,
                    step_type=WorkflowStep.StepType.APPROVAL,
                    order=order,
                    approval_mode=mode,
                    conditions=conditions or {},
                )
                for position, username in enumerate(approvers):
                    WorkflowStepApprover.objects.create(workflow_step=step, user=people[username], order=position)
        workflows.append(workflow)
        print(f"  {'Created' if created else 'Found'}: {workflow.name}")
    return workflows


def _form_data(code, rng, when):
    day = when.date()
    if code == "LEAVE-REQ":
        days = rng.randint(1, 5)
        return {
            "leave_type": rng.choice(["Annual Leave", "Sick Leave", "Personal Leave"]),
            "start_date": str(day + timedelta(days=7)),
            "end_date": str(day + timedelta(days=6 + days)),
            "total_days": days,
            "reason": rng.choice(["Family trip", "Medical appointment", "Wedding", "Moving house"]),
            "contact_number": "012-3456789",
        }
    if code == "EXP-CLAIM":
        return {
            "expense_type": rng.choice(["Travel", "Meals", "Accommodation", "Training"]),
            "expense_date": str(day),
            "amount": rng.choice([45, 120, 380, 650, 1200, 2400]),
            "description": rng.choice(["Client visit", "Team lunch", "Conference hotel", "Course fee"]),
            "receipt_number": f"INV-{rng.randint(1000, 9999)}",
        }
    if code == "IT-EQUIP":
        return {
            "equipment_type": rng.choice(["Laptop", "Monitor", "Headset", "Keyboard/Mouse"]),
            "specifications": "Standard office specification",
            "justification": rng.choice(["Replacement for a broken unit", "New hire setup", "Second screen"]),
            "urgency": rng.choice(["Low - Within 1 month", "Medium - Within 2 weeks", "High - Within 1 week"]),
        }
    if code == "TRAIN-REQ":
        return {
            "training_name": rng.choice(["AWS Cloud Practitioner", "Leadership Essentials", "Advanced Excel"]),
            "training_provider": rng.choice(["Coursera", "Udemy", "Local Training Centre"]),
            "training_date": str(day + timedelta(days=30)),
            "duration": rng.randint(1, 3),
            "cost": rng.choice([350, 800, 1500, 2800]),
            "benefits": "Apply the new skills to current projects",
            "training_mode": rng.choice(["Online", "In-person", "Hybrid"]),
        }
    return {
        "wfh_date": str(day + timedelta(days=2)),
        "reason": rng.choice(["Home repairs", "Focus time for a deadline", "Waiting for a delivery"]),
        "tasks_planned": "Code review and documentation",
        "contactable": ["Email", "Teams"],
    }


def _decide_until(engine, instance, outcome, rng):
    """Drive a submission through the engine until it reaches the wanted outcome."""
    instance.refresh_from_db()
    while instance.status in ("IN_PROGRESS", "NEEDS_ADMIN_ACTION"):
        task = instance.approvals.filter(status="PENDING").order_by("assigned_at").first()
        if task is None:
            break
        last_step = not instance.workflow.steps.filter(order__gt=task.workflow_step.order).exists()
        if outcome == "pending" and (instance.approvals.exclude(status="PENDING").exists() or rng.random() < 0.5):
            break
        if outcome == "rejected" and (last_step or rng.random() < 0.5):
            engine.reject_step(task, task.assigned_to, "Please revise and resubmit.")
        else:
            engine.approve_step(task, task.assigned_to, "Looks good.")
        instance.refresh_from_db()


def create_submissions(forms, employees):
    """
    About 50 requests spread over the last six months. Each one goes through its workflow so
    approval history, statuses and analytics all agree. Recent ones are left pending so the
    approvers have work in My Approvals.
    """
    print("\n=== Creating Submissions ===")
    rng = random.Random(42)
    engine = WorkflowEngine()
    now = timezone.now()

    for index in range(50):
        form = rng.choice(forms)
        # john_doe is the demo employee, so give him a share of the requests
        submitter = employees[0] if index % 4 == 0 else rng.choice(employees)
        # The last ten requests are from the past week and mostly still open
        days_ago = rng.randint(0, 6) if index >= 40 else rng.randint(7, 175)
        submitted_at = now - timedelta(days=days_ago, hours=rng.randint(0, 8))

        if index >= 40:
            outcome = rng.choice(["pending", "pending", "pending", "approved", "withdrawn"])
        else:
            outcome = rng.choices(["approved", "rejected"], weights=[4, 1])[0]

        submission = FormSubmission.objects.create(
            form=form,
            submitted_by=submitter,
            status=FormSubmission.SubmissionStatus.SUBMITTED,
            data=_form_data(form.code, rng, submitted_at),
            submitted_at=submitted_at,
        )
        instance = WorkflowInstance.objects.filter(submission=submission).first()
        if instance is not None:
            if outcome == "withdrawn":
                engine.cancel(instance, submitter, "Withdrawn by submitter", submission_status="WITHDRAWN")
            else:
                _decide_until(engine, instance, outcome, rng)

            # Spread the history over the real dates instead of "now"
            decided_at = submitted_at + timedelta(hours=rng.randint(4, 72))
            WorkflowInstance.objects.filter(pk=instance.pk).update(
                started_at=submitted_at,
                completed_at=decided_at if instance.completed_at or outcome != "pending" else None,
            )
            WorkflowApproval.objects.filter(workflow_instance=instance).update(assigned_at=submitted_at)
            WorkflowApproval.objects.filter(workflow_instance=instance, completed_at__isnull=False).update(
                completed_at=decided_at)
        FormSubmission.objects.filter(pk=submission.pk).update(created_at=submitted_at)

    # A few drafts so the "continue your draft" flow has something to show
    for submitter in employees[:2]:
        FormSubmission.objects.create(
            form=forms[0], submitted_by=submitter, status=FormSubmission.SubmissionStatus.DRAFT,
            data={"leave_type": "Annual Leave", "reason": "Planning a holiday"},
        )
    print(f"  Created: {FormSubmission.objects.count()} submissions")


def print_summary():
    """Print summary of created data"""
    print("\n" + "=" * 60)
    print("DEMO DATA CREATION COMPLETE!")
    print("=" * 60)

    print("\nDatabase Statistics:")
    print(f"  Departments: {Department.objects.count()}")
    print(f"  Users: {User.objects.count()}")
    print(f"  Forms: {Form.objects.count()}")
    print(f"  Workflows: {Workflow.objects.count()}")
    print(f"  Submissions: {FormSubmission.objects.count()}")
    for status, label in FormSubmission.SubmissionStatus.choices:
        count = FormSubmission.objects.filter(status=status).count()
        if count:
            print(f"    - {label}: {count}")
    print(f"  Pending approval tasks: {WorkflowApproval.objects.filter(status='PENDING').count()}")

    print("\nLogin Credentials:")
    print("-" * 60)
    print("ADMIN:      admin / Admin123!")
    print("MANAGERS:   it_manager, hr_manager, fin_manager, mkt_manager, ops_manager / Manager123!")
    print("EMPLOYEES:  john_doe, jane_smith, bob_wilson, alice_brown, charlie_davis,")
    print("            diana_miller, eric_taylor, fiona_clark / User123!")
    print("Approvers:  jane_smith, eric_taylor, bob_wilson, fiona_clark, alice_brown,")
    print("            charlie_davis, diana_miller")
    print("-" * 60)


class Command(BaseCommand):
    help = 'Create demo departments, users, forms, workflows and submissions.'

    def add_arguments(self, parser):
        parser.add_argument('--flush', action='store_true', help='Delete all existing data first.')

    def handle(self, *args, **options):
        if options['flush']:
            call_command('flush', interactive=False)
        if FormSubmission.objects.exists():
            print("The database already has submissions; run with --flush to start from a clean demo.")
            return

        departments = create_departments()
        admin, managers, employees = create_users(departments)
        forms = create_forms(departments, admin, managers)
        create_workflows(forms, employees, admin)
        create_submissions(forms, employees)

        print_summary()
        print("\nDemo data is ready. Start the server with: python manage.py runserver")
