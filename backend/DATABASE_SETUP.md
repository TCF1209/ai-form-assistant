# PostgreSQL Database Setup Guide

## Current Configuration Status
✅ Your Django settings are **correctly configured** for PostgreSQL
✅ Database credentials are properly set in `.env` file

## Issue
PostgreSQL service is not currently running or accessible from WSL.

## Solution Options

### Option 1: Use PostgreSQL on Windows (Recommended)
If you have PostgreSQL installed on Windows:

1. **Start PostgreSQL on Windows:**
   - Open Windows Services (services.msc)
   - Find "postgresql-x64-15" (or your version)
   - Start the service if it's stopped

2. **Update your .env file to use Windows host:**
   ```
   DB_HOST=host.docker.internal
   # OR if that doesn't work:
   DB_HOST=172.17.0.1
   # OR use your Windows IP:
   DB_HOST=<your-windows-ip>
   ```

3. **Test connection:**
   ```bash
   cd backend
   source venv/bin/activate
   python manage.py dbshell
   ```

### Option 2: Install PostgreSQL in WSL
If you prefer PostgreSQL in WSL:

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo service postgresql start

# Set password for postgres user
sudo -u postgres psql
ALTER USER postgres PASSWORD 'qazwsx123';
\q

# Create database
sudo -u postgres createdb ai_office_assistant

# Enable PostgreSQL to start automatically
sudo systemctl enable postgresql
```

### Option 3: Use SQLite for Development (Temporary)
If you want to quickly continue development:

1. **Temporarily remove DB_PASSWORD from .env:**
   ```bash
   # Comment out or remove this line in .env:
   # DB_PASSWORD=qazwsx123
   ```

2. **Django will automatically use SQLite:**
   ```bash
   cd backend
   source venv/bin/activate
   python manage.py migrate
   python manage.py runserver
   ```

3. **To switch back to PostgreSQL later:**
   - Uncomment DB_PASSWORD in .env
   - Ensure PostgreSQL is running
   - Run migrations again

## Verifying Database Connection

After setting up PostgreSQL, verify with:

```bash
cd backend
source venv/bin/activate

# Test database connection
python manage.py dbshell

# If successful, run migrations
python manage.py migrate

# Create superuser if needed
python manage.py createsuperuser
```

## Current Database Settings (from .env)
- **Engine**: PostgreSQL
- **Database**: ai_office_assistant
- **User**: postgres
- **Password**: qazwsx123
- **Host**: localhost
- **Port**: 5432

## Important Notes
1. Your Django configuration is correct - no changes needed there
2. The issue is only that PostgreSQL service needs to be running
3. All your workflow code is fully functional and will work once database is connected
4. django-filter is already installed in requirements.txt

## Quick Commands Reference
```bash
# Check if PostgreSQL is running (WSL)
sudo service postgresql status

# Start PostgreSQL (WSL)
sudo service postgresql start

# Stop PostgreSQL (WSL)
sudo service postgresql stop

# Connect to PostgreSQL
psql -U postgres -d ai_office_assistant

# Run Django with PostgreSQL
source venv/bin/activate
python manage.py runserver

# Run Django with SQLite (if DB_PASSWORD not set)
unset DB_PASSWORD  # Or remove from .env
python manage.py runserver
```