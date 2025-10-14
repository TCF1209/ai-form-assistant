@echo off
echo =============================================
echo AI Office Assistant - PostgreSQL Backend
echo =============================================
echo.

REM Check for Windows virtual environment
if exist venv_windows (
    echo Using Windows virtual environment...
    call venv_windows\Scripts\activate.bat
    goto check_deps
)

REM Create new Windows venv if not exists
echo Creating Windows virtual environment...
python -m venv venv_windows
call venv_windows\Scripts\activate.bat

:check_deps
REM Check if Django is installed
python -c "import django" 2>nul
if errorlevel 1 (
    echo Installing dependencies...
    pip install django==4.2.11 djangorestframework==3.14.0 django-cors-headers==4.3.1 djangorestframework-simplejwt==5.3.1 python-dotenv==1.0.1 Pillow==10.2.0 psycopg2-binary==2.9.9
)

echo.
echo Database Configuration:
echo   Engine: PostgreSQL
echo   Database: ai_office_assistant
echo   User: postgres
echo   Host: localhost:5432
echo.
echo Starting Django server...
echo =============================================
echo Server: http://localhost:8000
echo Admin: http://localhost:8000/admin/
echo API: http://localhost:8000/api/v1/
echo.
echo Test Credentials:
echo   Admin: admin@example.com / Admin123!
echo   Manager: it.manager@example.com / Manager123!
echo   User: john.doe@example.com / User123!
echo =============================================
echo.

python manage.py runserver

pause