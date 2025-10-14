@echo off
echo =============================================
echo AI Office Assistant - Backend Server
echo =============================================
echo.

REM Try Windows venv first
if exist venv_windows (
    echo Using Windows virtual environment...
    call venv_windows\Scripts\activate.bat
) else (
    REM Try WSL/Linux venv
    if exist venv (
        echo Warning: Found Linux venv, creating Windows venv...
        python -m venv venv_windows
        call venv_windows\Scripts\activate.bat
        pip install django==4.2.11 djangorestframework==3.14.0 django-cors-headers==4.3.1 djangorestframework-simplejwt==5.3.1 python-dotenv==1.0.1 Pillow==10.2.0
    ) else (
        echo No virtual environment found. Creating one...
        python -m venv venv_windows
        call venv_windows\Scripts\activate.bat
        pip install django==4.2.11 djangorestframework==3.14.0 django-cors-headers==4.3.1 djangorestframework-simplejwt==5.3.1 python-dotenv==1.0.1 Pillow==10.2.0
    )
)

echo.
echo Starting Django server with SQLite database...
python manage.py runserver

pause