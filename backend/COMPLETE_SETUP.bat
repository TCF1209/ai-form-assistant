@echo off
echo =============================================
echo Complete PostgreSQL Setup for AI Office Assistant
echo =============================================
echo.
echo Database Configuration:
echo   Database: ai_office_assistant
echo   User: postgres
echo   Password: qazwsx123
echo.

REM Check if virtual environment exists
if exist venv_windows (
    echo Using existing virtual environment...
    call venv_windows\Scripts\activate.bat
) else (
    echo Creating virtual environment...
    python -m venv venv_windows
    call venv_windows\Scripts\activate.bat

    echo.
    echo Installing dependencies...
    pip install django==4.2.11 djangorestframework==3.14.0 django-cors-headers==4.3.1 djangorestframework-simplejwt==5.3.1 python-dotenv==1.0.1 Pillow==10.2.0 psycopg2-binary==2.9.9
)

echo.
echo =============================================
echo Step 1: Creating database (if not exists)
echo =============================================
echo If prompted for password, enter: qazwsx123
echo.
psql -U postgres -h localhost -c "CREATE DATABASE ai_office_assistant;" 2>nul
if %errorlevel% == 0 (
    echo Database created successfully!
) else (
    echo Database might already exist or PostgreSQL is not accessible.
    echo Continuing anyway...
)

echo.
echo =============================================
echo Step 2: Creating migrations for custom apps
echo =============================================

echo Creating migrations for users app (custom User model)...
python manage.py makemigrations users --noinput

echo Creating migrations for forms app...
python manage.py makemigrations forms --noinput

echo Creating migrations for workflows app...
python manage.py makemigrations workflows --noinput

echo Creating migrations for analytics app...
python manage.py makemigrations analytics --noinput

echo Creating migrations for ai_integration app...
python manage.py makemigrations ai_integration --noinput

echo.
echo =============================================
echo Step 3: Creating remaining migrations
echo =============================================
python manage.py makemigrations --noinput

echo.
echo =============================================
echo Step 4: Applying all migrations
echo =============================================
python manage.py migrate

echo.
echo =============================================
echo Step 5: Creating test data
echo =============================================
python manage.py shell -c "exec(open('create_test_data.py').read())"

echo.
echo =============================================
echo Setup Complete!
echo =============================================
echo.
echo Test Accounts Created:
echo   Admin: admin@example.com / Admin123!
echo   Manager: it.manager@example.com / Manager123!
echo   User: john.doe@example.com / User123!
echo.
echo Starting Django development server...
echo =============================================
echo Server: http://localhost:8000
echo Admin: http://localhost:8000/admin/
echo API: http://localhost:8000/api/v1/
echo.
echo Press Ctrl+C to stop the server
echo =============================================
echo.

python manage.py runserver

pause