"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse, HttpResponse
from django.utils import timezone
from datetime import timedelta
import io

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from forms.models import FormSubmission, Form


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_submissions(request):
    """Export submissions to Excel or PDF format."""
    if request.user.role not in ['ADMIN', 'MANAGER']:
        return Response(
            {"error": "Only Form Managers and Admins can export submissions."},
            status=403
        )

    export_format = request.query_params.get('format', 'excel')
    days = int(request.query_params.get('days', 30))
    form_id = request.query_params.get('form_id')

    # Calculate date range
    end_date = timezone.now()
    start_date = end_date - timedelta(days=days)

    # Filter submissions
    queryset = FormSubmission.objects.filter(
        submitted_at__gte=start_date,
        submitted_at__lte=end_date
    )

    # Filter by form if specified
    if form_id:
        queryset = queryset.filter(form_id=form_id)

    # Filter by department for managers
    if request.user.role == 'MANAGER':
        queryset = queryset.filter(form__department=request.user.department)

    submissions = queryset.select_related('form', 'submitted_by', 'form__department').order_by('-submitted_at')

    if export_format == 'pdf':
        return _export_pdf(submissions, start_date, end_date)
    else:
        return _export_excel(submissions, start_date, end_date)


def _export_excel(submissions, start_date, end_date):
    """Generate Excel export of submissions."""
    try:
        from openpyxl import Workbook
        from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
    except ImportError:
        return Response(
            {"error": "openpyxl is not installed. Run: pip install openpyxl"},
            status=500
        )

    wb = Workbook()
    ws = wb.active
    ws.title = "Submissions Report"

    # Styles
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="0EA5E9", end_color="0EA5E9", fill_type="solid")
    header_alignment = Alignment(horizontal="center", vertical="center")
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )

    # Title
    ws.merge_cells('A1:F1')
    ws['A1'] = f"Submissions Report ({start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')})"
    ws['A1'].font = Font(bold=True, size=14)
    ws['A1'].alignment = Alignment(horizontal="center")

    # Headers
    headers = ['ID', 'Form Name', 'Submitted By', 'Status', 'Submitted At', 'Department']
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=3, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = thin_border

    # Data
    submissions_list = list(submissions)
    for row, submission in enumerate(submissions_list, 4):
        ws.cell(row=row, column=1, value=str(submission.id)[:8]).border = thin_border
        ws.cell(row=row, column=2, value=submission.form.name).border = thin_border
        ws.cell(row=row, column=3, value=submission.submitted_by.username if submission.submitted_by else 'N/A').border = thin_border
        ws.cell(row=row, column=4, value=submission.status).border = thin_border
        ws.cell(row=row, column=5, value=submission.submitted_at.strftime('%Y-%m-%d %H:%M') if submission.submitted_at else 'N/A').border = thin_border
        ws.cell(row=row, column=6, value=submission.form.department.name if submission.form.department else 'N/A').border = thin_border

    # Adjust column widths
    ws.column_dimensions['A'].width = 12
    ws.column_dimensions['B'].width = 25
    ws.column_dimensions['C'].width = 18
    ws.column_dimensions['D'].width = 15
    ws.column_dimensions['E'].width = 18
    ws.column_dimensions['F'].width = 18

    # Summary section
    summary_row = len(submissions_list) + 6
    ws.cell(row=summary_row, column=1, value="Summary").font = Font(bold=True, size=12)
    ws.cell(row=summary_row + 1, column=1, value=f"Total Submissions: {len(submissions_list)}")
    ws.cell(row=summary_row + 2, column=1, value=f"Report Generated: {timezone.now().strftime('%Y-%m-%d %H:%M')}")

    # Save to response
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    response = HttpResponse(
        output.read(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename="submissions_report_{timezone.now().strftime("%Y%m%d")}.xlsx"'
    return response


def _export_pdf(submissions, start_date, end_date):
    """Generate PDF export of submissions."""
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.units import inch
    except ImportError:
        return Response(
            {"error": "reportlab is not installed. Run: pip install reportlab"},
            status=500
        )

    output = io.BytesIO()
    doc = SimpleDocTemplate(output, pagesize=landscape(A4), topMargin=0.5*inch, bottomMargin=0.5*inch)
    elements = []
    styles = getSampleStyleSheet()

    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=20,
        alignment=1  # Center
    )
    title = Paragraph(
        f"Submissions Report<br/>{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
        title_style
    )
    elements.append(title)
    elements.append(Spacer(1, 20))

    # Table data
    submissions_list = list(submissions)
    data = [['ID', 'Form Name', 'Submitted By', 'Status', 'Submitted At', 'Department']]
    for submission in submissions_list:
        data.append([
            str(submission.id)[:8],
            submission.form.name[:30] if len(submission.form.name) > 30 else submission.form.name,
            submission.submitted_by.username if submission.submitted_by else 'N/A',
            submission.status,
            submission.submitted_at.strftime('%Y-%m-%d %H:%M') if submission.submitted_at else 'N/A',
            submission.form.department.name if submission.form.department else 'N/A'
        ])

    # Create table
    table = Table(data, colWidths=[1*inch, 2.5*inch, 1.5*inch, 1.2*inch, 1.5*inch, 1.5*inch])

    # Sky blue header color matching design system
    sky_blue = colors.HexColor('#0EA5E9')

    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), sky_blue),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
    ]))
    elements.append(table)

    # Summary
    elements.append(Spacer(1, 30))
    summary_style = ParagraphStyle('Summary', parent=styles['Normal'], fontSize=10)
    elements.append(Paragraph(f"<b>Total Submissions:</b> {len(submissions_list)}", summary_style))
    elements.append(Paragraph(f"<b>Report Generated:</b> {timezone.now().strftime('%Y-%m-%d %H:%M')}", summary_style))

    # Build PDF
    doc.build(elements)
    output.seek(0)

    response = HttpResponse(output.read(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="submissions_report_{timezone.now().strftime("%Y%m%d")}.pdf"'
    return response


urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),

    # Export endpoint with proper implementation
    path('api/v1/submissions/export/', export_submissions, name='submission-export'),

    # API v1 endpoints (includes all routes: users, forms, workflows, ai)
    path('api/v1/', include('api.v1.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
