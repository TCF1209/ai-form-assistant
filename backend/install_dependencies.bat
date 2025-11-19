@echo off
echo Installing backend dependencies...
echo.

REM Check if virtual environment exists
if not exist "venv_windows\Scripts\activate.bat" (
    echo Error: Virtual environment not found at venv_windows
    echo Please create it first with: python -m venv venv_windows
    exit /b 1
)

REM Activate virtual environment
call venv_windows\Scripts\activate.bat

REM Upgrade pip first
echo Upgrading pip...
python -m pip install --upgrade pip

REM Install requirements
echo.
echo Installing requirements from requirements.txt...
python -m pip install -r requirements.txt

echo.
echo Installation complete!
echo.
echo To run the server:
echo   1. venv_windows\Scripts\activate
echo   2. python manage.py runserver
pause