@echo off
echo =============================================
echo Setting up Backend for Windows
echo =============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from python.org
    pause
    exit /b 1
)

echo Step 1: Creating Windows virtual environment...
if exist venv_windows (
    echo Virtual environment already exists
) else (
    python -m venv venv_windows
    echo Virtual environment created
)

echo.
echo Step 2: Activating virtual environment...
call venv_windows\Scripts\activate.bat

echo.
echo Step 3: Installing Django and dependencies...
pip install django==4.2.11 djangorestframework==3.14.0 django-cors-headers==4.3.1 djangorestframework-simplejwt==5.3.1 python-dotenv==1.0.1 Pillow==10.2.0

echo.
echo Step 4: Running migrations...
python manage.py migrate

echo.
echo Step 5: Creating test data...
echo Creating test users and departments...
python manage.py shell -c "exec(open('create_test_data.py').read())"

echo.
echo =============================================
echo Setup complete! Starting server...
echo =============================================
echo.
echo Server: http://localhost:8000
echo Admin: http://localhost:8000/admin/
echo API: http://localhost:8000/api/v1/
echo.
echo Test Credentials:
echo   Admin: admin@example.com / Admin123!
echo   Manager: it.manager@example.com / Manager123!
echo   User: john.doe@example.com / User123!
echo.
echo Press Ctrl+C to stop the server
echo =============================================
echo.

python manage.py runserver

pause