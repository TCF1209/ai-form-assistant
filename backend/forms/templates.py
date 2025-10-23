"""
Form templates for quick form creation.
"""

FORM_TEMPLATES = {
    'leave_request': {
        'name': 'Leave Request Form',
        'description': 'Employee leave request and approval form',
        'fields': [
            {
                'name': 'employee_name',
                'label': 'Employee Name',
                'field_type': 'TEXT',
                'required': True,
                'placeholder': 'Enter your full name',
                'order': 0
            },
            {
                'name': 'employee_id',
                'label': 'Employee ID',
                'field_type': 'TEXT',
                'required': True,
                'placeholder': 'Enter your employee ID',
                'order': 1
            },
            {
                'name': 'leave_type',
                'label': 'Type of Leave',
                'field_type': 'SELECT',
                'required': True,
                'options': ['Annual Leave', 'Sick Leave', 'Personal Leave', 'Maternity/Paternity Leave'],
                'order': 2
            },
            {
                'name': 'start_date',
                'label': 'Start Date',
                'field_type': 'DATE',
                'required': True,
                'order': 3,
                'width': 50
            },
            {
                'name': 'end_date',
                'label': 'End Date',
                'field_type': 'DATE',
                'required': True,
                'order': 4,
                'width': 50
            },
            {
                'name': 'reason',
                'label': 'Reason for Leave',
                'field_type': 'TEXTAREA',
                'required': True,
                'placeholder': 'Please provide detailed reason for your leave request',
                'order': 5
            },
            {
                'name': 'contact_during_leave',
                'label': 'Contact Number During Leave',
                'field_type': 'PHONE',
                'required': False,
                'placeholder': '+1234567890',
                'order': 6
            }
        ]
    },
    'expense_claim': {
        'name': 'Expense Claim Form',
        'description': 'Employee expense reimbursement claim form',
        'fields': [
            {
                'name': 'employee_name',
                'label': 'Employee Name',
                'field_type': 'TEXT',
                'required': True,
                'order': 0
            },
            {
                'name': 'department',
                'label': 'Department',
                'field_type': 'SELECT',
                'required': True,
                'options': ['Sales', 'Marketing', 'IT', 'HR', 'Finance', 'Operations'],
                'order': 1
            },
            {
                'name': 'expense_date',
                'label': 'Date of Expense',
                'field_type': 'DATE',
                'required': True,
                'order': 2
            },
            {
                'name': 'expense_category',
                'label': 'Expense Category',
                'field_type': 'SELECT',
                'required': True,
                'options': ['Travel', 'Meals', 'Accommodation', 'Office Supplies', 'Training', 'Other'],
                'order': 3
            },
            {
                'name': 'amount',
                'label': 'Amount',
                'field_type': 'NUMBER',
                'required': True,
                'placeholder': '0.00',
                'validation_rules': {'min': 0, 'step': 0.01},
                'order': 4
            },
            {
                'name': 'description',
                'label': 'Description',
                'field_type': 'TEXTAREA',
                'required': True,
                'placeholder': 'Describe the expense in detail',
                'order': 5
            },
            {
                'name': 'receipt',
                'label': 'Upload Receipt',
                'field_type': 'FILE',
                'required': True,
                'help_text': 'Please upload receipt or supporting documents',
                'order': 6
            }
        ]
    },
    'feedback': {
        'name': 'Customer Feedback Form',
        'description': 'Collect customer feedback and satisfaction ratings',
        'fields': [
            {
                'name': 'customer_name',
                'label': 'Your Name',
                'field_type': 'TEXT',
                'required': False,
                'placeholder': 'Optional',
                'order': 0
            },
            {
                'name': 'email',
                'label': 'Email Address',
                'field_type': 'EMAIL',
                'required': True,
                'placeholder': 'your.email@example.com',
                'order': 1
            },
            {
                'name': 'service_date',
                'label': 'Date of Service',
                'field_type': 'DATE',
                'required': True,
                'order': 2
            },
            {
                'name': 'service_rating',
                'label': 'How would you rate our service?',
                'field_type': 'RATING',
                'required': True,
                'order': 3
            },
            {
                'name': 'staff_rating',
                'label': 'How would you rate our staff?',
                'field_type': 'RATING',
                'required': True,
                'order': 4
            },
            {
                'name': 'recommend',
                'label': 'Would you recommend us to others?',
                'field_type': 'RADIO',
                'required': True,
                'options': ['Definitely Yes', 'Probably Yes', 'Not Sure', 'Probably No', 'Definitely No'],
                'order': 5
            },
            {
                'name': 'improvements',
                'label': 'Areas for Improvement',
                'field_type': 'CHECKBOX',
                'required': False,
                'options': ['Customer Service', 'Product Quality', 'Pricing', 'Delivery Time', 'Website', 'Other'],
                'order': 6
            },
            {
                'name': 'comments',
                'label': 'Additional Comments',
                'field_type': 'TEXTAREA',
                'required': False,
                'placeholder': 'Please share any additional feedback',
                'order': 7
            }
        ]
    },
    'job_application': {
        'name': 'Job Application Form',
        'description': 'Standard job application form for new candidates',
        'fields': [
            {
                'name': 'full_name',
                'label': 'Full Name',
                'field_type': 'TEXT',
                'required': True,
                'order': 0
            },
            {
                'name': 'email',
                'label': 'Email Address',
                'field_type': 'EMAIL',
                'required': True,
                'order': 1,
                'width': 50
            },
            {
                'name': 'phone',
                'label': 'Phone Number',
                'field_type': 'PHONE',
                'required': True,
                'order': 2,
                'width': 50
            },
            {
                'name': 'position',
                'label': 'Position Applied For',
                'field_type': 'SELECT',
                'required': True,
                'options': ['Software Engineer', 'Product Manager', 'Designer', 'Sales Executive', 'Marketing Manager'],
                'order': 3
            },
            {
                'name': 'experience_years',
                'label': 'Years of Experience',
                'field_type': 'NUMBER',
                'required': True,
                'validation_rules': {'min': 0, 'max': 50},
                'order': 4
            },
            {
                'name': 'availability',
                'label': 'Available Start Date',
                'field_type': 'DATE',
                'required': True,
                'order': 5
            },
            {
                'name': 'resume',
                'label': 'Upload Resume',
                'field_type': 'FILE',
                'required': True,
                'help_text': 'PDF or Word document only',
                'order': 6
            },
            {
                'name': 'cover_letter',
                'label': 'Cover Letter',
                'field_type': 'TEXTAREA',
                'required': False,
                'placeholder': 'Tell us why you are interested in this position',
                'order': 7
            },
            {
                'name': 'linkedin_url',
                'label': 'LinkedIn Profile',
                'field_type': 'URL',
                'required': False,
                'placeholder': 'https://linkedin.com/in/yourprofile',
                'order': 8
            }
        ]
    }
}