# PowerShell script to start the backend server

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Starting AI Office Assistant Backend Server" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Check if Django is installed
try {
    python -c "import django" 2>$null
    Write-Host "Django is installed." -ForegroundColor Green
} catch {
    Write-Host "Django not found. Installing dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt

    Write-Host ""
    Write-Host "Running database migrations..." -ForegroundColor Yellow
    python manage.py migrate

    Write-Host ""
    Write-Host "Creating test data..." -ForegroundColor Yellow
    python manage.py shell < create_test_data.py
    Write-Host ""
}

# Start the server
Write-Host "Starting Django development server..." -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Server will run at: http://localhost:8000" -ForegroundColor White
Write-Host "Admin panel at: http://localhost:8000/admin/" -ForegroundColor White
Write-Host "API at: http://localhost:8000/api/v1/" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

python manage.py runserver