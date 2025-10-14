@echo off
echo =============================================
echo Starting AI Office Assistant Backend Server
echo =============================================
echo.

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if Django is installed
python -c "import django" 2>nul
if errorlevel 1 (
    echo Django not found. Installing dependencies...
    pip install -r requirements.txt
    echo.
    echo Running database migrations...
    python manage.py migrate
    echo.
    echo Creating test data...
    python manage.py shell < create_test_data.py
    echo.
)

REM Start the server
echo Starting Django development server...
echo =============================================
echo Server will run at: http://localhost:8000
echo Admin panel at: http://localhost:8000/admin/
echo API at: http://localhost:8000/api/v1/
echo.
echo Press Ctrl+C to stop the server
echo =============================================
echo.

python manage.py runserver

pause