# How to Start the Backend Server (Windows)

## For PowerShell:

```powershell
# Navigate to backend directory
cd C:\Users\tchye\Desktop\fyp_claude_code\backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# If you get an execution policy error, run PowerShell as Administrator and execute:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# After activation, you should see (venv) in your prompt
# Install dependencies (only needed first time)
pip install -r requirements.txt

# Run migrations (only needed first time or after model changes)
python manage.py migrate

# Create test data (only needed first time)
python manage.py shell < create_test_data.py

# Start the development server
python manage.py runserver
```

## For Command Prompt (cmd):

```cmd
# Navigate to backend directory
cd C:\Users\tchye\Desktop\fyp_claude_code\backend

# Activate virtual environment
venv\Scripts\activate.bat

# After activation, you should see (venv) in your prompt
# Install dependencies (only needed first time)
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create test data
python manage.py shell < create_test_data.py

# Start the development server
python manage.py runserver
```

## For Git Bash or WSL:

```bash
# Navigate to backend directory
cd /mnt/c/Users/tchye/Desktop/fyp_claude_code/backend

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create test data
python manage.py shell < create_test_data.py

# Start the development server
python manage.py runserver
```

## Quick Start (PowerShell):

If this is your first time running the backend:

```powershell
cd C:\Users\tchye\Desktop\fyp_claude_code\backend
.\venv\Scripts\Activate.ps1
pip install django djangorestframework django-cors-headers djangorestframework-simplejwt python-dotenv psycopg2-binary Pillow
python manage.py migrate
python manage.py shell < create_test_data.py
python manage.py runserver
```

## Troubleshooting:

### Issue: "cannot be loaded because running scripts is disabled"
**Solution:** Run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: "No module named 'django'"
**Solution:** Make sure the virtual environment is activated (you should see `(venv)` in your prompt)

### Issue: Virtual environment not working
**Solution:** Recreate it:
```powershell
# Delete old venv
Remove-Item -Recurse -Force venv

# Create new venv
python -m venv venv

# Activate it
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

## Test Credentials:

After running `create_test_data.py`, use these credentials:

**Admin:**
- Email: admin@example.com
- Password: Admin123!

**Manager:**
- Email: it.manager@example.com
- Password: Manager123!

**Regular User:**
- Email: john.doe@example.com
- Password: User123!

## Verify Server is Running:

1. Open browser to: http://localhost:8000/admin/
2. You should see Django admin login page
3. API endpoints available at: http://localhost:8000/api/v1/

## Next Steps:

Once the backend is running, open a new terminal and start the frontend:
```powershell
cd C:\Users\tchye\Desktop\fyp_claude_code\frontend
npm install
npm run dev
```

Then access the application at: http://localhost:5173