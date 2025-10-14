@echo off
echo =============================================
echo Fixing Django Migrations for PostgreSQL
echo =============================================
echo.

REM Activate virtual environment
if exist venv_windows (
    call venv_windows\Scripts\activate.bat
) else (
    echo ERROR: Virtual environment not found. Run SETUP_POSTGRESQL.bat first
    pause
    exit /b 1
)

echo Step 1: Creating migrations for custom apps first...
echo.

REM Create migrations for users app first (has custom User model)
echo Creating migrations for users app (custom User model)...
python manage.py makemigrations users

echo.
echo Creating migrations for other apps...
python manage.py makemigrations forms
python manage.py makemigrations workflows
python manage.py makemigrations analytics
python manage.py makemigrations ai_integration

echo.
echo Step 2: Creating all other migrations...
python manage.py makemigrations

echo.
echo Step 3: Applying all migrations to database...
python manage.py migrate

echo.
echo Step 4: Creating superuser account...
echo.
echo Please create a superuser account for Django Admin:
python manage.py createsuperuser

echo.
echo Step 5: Loading test data...
python manage.py shell -c "exec(open('create_test_data.py').read())"

echo.
echo =============================================
echo Migrations fixed successfully!
echo =============================================
echo.
echo You can now run the server with:
echo   START_SERVER_POSTGRESQL.bat
echo.
echo Or start it now? (Y/N)
set /p start_server=

if /i "%start_server%"=="Y" (
    echo.
    echo Starting server...
    python manage.py runserver
)

pause