# PowerShell script to start backend with PostgreSQL

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "AI Office Assistant - PostgreSQL Backend" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Check if virtual environment exists
if (Test-Path "venv_windows\Scripts\Activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & ".\venv_windows\Scripts\Activate.ps1"
} else {
    Write-Host "Creating new virtual environment..." -ForegroundColor Yellow
    python -m venv venv_windows
    & ".\venv_windows\Scripts\Activate.ps1"

    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    pip install django==4.2.11 djangorestframework==3.14.0 django-cors-headers==4.3.1 djangorestframework-simplejwt==5.3.1 python-dotenv==1.0.1 Pillow==10.2.0 psycopg2-binary==2.9.9
}

Write-Host ""
Write-Host "PostgreSQL Configuration:" -ForegroundColor Green
Write-Host "  Database: ai_office_assistant" -ForegroundColor White
Write-Host "  User: postgres" -ForegroundColor White
Write-Host "  Password: qazwsx123" -ForegroundColor White
Write-Host "  Host: localhost:5432" -ForegroundColor White
Write-Host ""

# Check if migrations are needed
Write-Host "Checking database migrations..." -ForegroundColor Yellow
python manage.py showmigrations --plan | Select-String "^\[ \]" -Quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "Running migrations..." -ForegroundColor Yellow
    python manage.py migrate

    Write-Host "Creating test data..." -ForegroundColor Yellow
    python manage.py shell -c "exec(open('create_test_data.py').read())"
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Starting Django Development Server" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URLs:" -ForegroundColor Yellow
Write-Host "  Server: http://localhost:8000" -ForegroundColor White
Write-Host "  Admin: http://localhost:8000/admin/" -ForegroundColor White
Write-Host "  API: http://localhost:8000/api/v1/" -ForegroundColor White
Write-Host ""
Write-Host "Test Credentials:" -ForegroundColor Yellow
Write-Host "  Admin: admin@example.com / Admin123!" -ForegroundColor White
Write-Host "  Manager: it.manager@example.com / Manager123!" -ForegroundColor White
Write-Host "  User: john.doe@example.com / User123!" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Red
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

python manage.py runserver