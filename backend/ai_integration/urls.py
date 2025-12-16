"""
URLs for AI Integration endpoints
"""
from django.urls import path, include
from django.http import HttpResponse
from django.utils import timezone
from datetime import timedelta
import io

from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .views import (
    AIFormGenerationViewSet,
    ConversationalAssistantViewSet,
    NaturalLanguageQueryView,
    RecommendationView,
    WorkflowOptimizationView,
    AIHealthCheckView,
    ChatHistoryViewSet,
    AnalyticsHistoryViewSet
)
from forms.models import FormSubmission

app_name = 'ai_integration'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_submissions(request):
    """Export submissions to Excel or PDF format."""
    if request.user.role not in ['ADMIN', 'MANAGER']:
        return Response({"error": "Only Form Managers and Admins can export."}, status=403)

    export_format = request.query_params.get('format', 'excel')
    days = int(request.query_params.get('days', 30))

    end_date = timezone.now()
    start_date = end_date - timedelta(days=days)

    queryset = FormSubmission.objects.filter(
        submitted_at__gte=start_date,
        submitted_at__lte=end_date
    )

    if request.user.role == 'MANAGER':
        queryset = queryset.filter(form__department=request.user.department)

    submissions = queryset.select_related('form', 'submitted_by', 'form__department').order_by('-submitted_at')

    if export_format == 'pdf':
        return _export_pdf(submissions, start_date, end_date)
    else:
        return _export_excel(submissions, start_date, end_date)


def _export_excel(submissions, start_date, end_date):
    """Generate Excel export."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

    wb = Workbook()
    ws = wb.active
    ws.title = "Submissions Report"

    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="0EA5E9", end_color="0EA5E9", fill_type="solid")
    thin_border = Border(
        left=Side(style='thin'), right=Side(style='thin'),
        top=Side(style='thin'), bottom=Side(style='thin')
    )

    ws.merge_cells('A1:F1')
    ws['A1'] = f"Submissions Report ({start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')})"
    ws['A1'].font = Font(bold=True, size=14)
    ws['A1'].alignment = Alignment(horizontal="center")

    headers = ['ID', 'Form Name', 'Submitted By', 'Status', 'Submitted At', 'Department']
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=3, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.border = thin_border

    submissions_list = list(submissions)
    for row, sub in enumerate(submissions_list, 4):
        ws.cell(row=row, column=1, value=str(sub.id)[:8]).border = thin_border
        ws.cell(row=row, column=2, value=sub.form.name).border = thin_border
        ws.cell(row=row, column=3, value=sub.submitted_by.username if sub.submitted_by else 'N/A').border = thin_border
        ws.cell(row=row, column=4, value=sub.status).border = thin_border
        ws.cell(row=row, column=5, value=sub.submitted_at.strftime('%Y-%m-%d %H:%M') if sub.submitted_at else 'N/A').border = thin_border
        ws.cell(row=row, column=6, value=sub.form.department.name if sub.form.department else 'N/A').border = thin_border

    for col, width in [('A', 12), ('B', 25), ('C', 18), ('D', 15), ('E', 18), ('F', 18)]:
        ws.column_dimensions[col].width = width

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    response = HttpResponse(output.read(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = f'attachment; filename="submissions_report_{timezone.now().strftime("%Y%m%d")}.xlsx"'
    return response


def _export_pdf(submissions, start_date, end_date):
    """Generate PDF export."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.units import inch

    output = io.BytesIO()
    doc = SimpleDocTemplate(output, pagesize=landscape(A4), topMargin=0.5*inch, bottomMargin=0.5*inch)
    elements = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=16, spaceAfter=20, alignment=1)
    title = Paragraph(f"Submissions Report<br/>{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}", title_style)
    elements.append(title)
    elements.append(Spacer(1, 20))

    submissions_list = list(submissions)
    data = [['ID', 'Form Name', 'Submitted By', 'Status', 'Submitted At', 'Department']]
    for sub in submissions_list:
        data.append([
            str(sub.id)[:8],
            sub.form.name[:30] if len(sub.form.name) > 30 else sub.form.name,
            sub.submitted_by.username if sub.submitted_by else 'N/A',
            sub.status,
            sub.submitted_at.strftime('%Y-%m-%d %H:%M') if sub.submitted_at else 'N/A',
            sub.form.department.name if sub.form.department else 'N/A'
        ])

    table = Table(data, colWidths=[1*inch, 2.5*inch, 1.5*inch, 1.2*inch, 1.5*inch, 1.5*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0EA5E9')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(table)

    doc.build(elements)
    output.seek(0)

    response = HttpResponse(output.read(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="submissions_report_{timezone.now().strftime("%Y%m%d")}.pdf"'
    return response


# Create router for ViewSets
router = DefaultRouter()
router.register(r'form-generation', AIFormGenerationViewSet, basename='form-generation')
router.register(r'assistant', ConversationalAssistantViewSet, basename='assistant')
router.register(r'chat', ChatHistoryViewSet, basename='chat')
router.register(r'analytics-history', AnalyticsHistoryViewSet, basename='analytics-history')

# Define URL patterns
urlpatterns = [
    # Export endpoint - accessible at /api/v1/ai/reports/export/
    path('reports/export/', export_submissions, name='reports-export'),

    # Include router URLs
    path('', include(router.urls)),

    # API Views
    path('query/', NaturalLanguageQueryView.as_view(), name='nl-query'),
    path('recommendations/', RecommendationView.as_view(), name='recommendations'),
    path('workflow-optimization/', WorkflowOptimizationView.as_view(), name='workflow-optimization'),
    path('health/', AIHealthCheckView.as_view(), name='health-check'),
]