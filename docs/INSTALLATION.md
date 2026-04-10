# Installation Guide

## AI-Powered Customer Service Platform
**Installation and Configuration Guide**

---

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Backend Installation](#backend-installation)
3. [Frontend Installation](#frontend-installation)
4. [Database Setup](#database-setup)
5. [Configuration](#configuration)
6. [Running the Application](#running-the-application)
7. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Minimum Requirements
- **Operating System:** Windows 10/11, macOS 10.15+, or Linux
- **Python:** 3.10 or higher
- **Node.js:** 18.0 or higher
- **PostgreSQL:** 14 or higher
- **Redis:** 6 or higher
- **RAM:** 8GB minimum (16GB recommended)
- **Disk Space:** 10GB free space

### Software Dependencies
- Git
- Python pip
- npm or yarn
- PostgreSQL client
- Redis client

---

## Backend Installation

### Step 1: Clone Repository
```powershell
git clone <repository-url>
cd ai-customer-service-platform
```

### Step 2: Create Virtual Environment
```powershell
cd backend
python -m venv venv
```

### Step 3: Activate Virtual Environment

**Windows PowerShell:**
```powershell
.\venv\Scripts\Activate
```

**Windows CMD:**
```cmd
venv\Scripts\activate.bat
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

### Step 4: Install Python Dependencies
```powershell
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 5: Verify Installation
```powershell
python -c "import fastapi; print(fastapi.__version__)"
```

---

## Frontend Installation

### Step 1: Navigate to Frontend Directory
```powershell
cd ..\frontend
```

### Step 2: Install Node Dependencies
```powershell
npm install
```

Or using yarn:
```powershell
yarn install
```

### Step 3: Verify Installation
```powershell
npm list react
```

---

## Database Setup

### PostgreSQL Installation

**Windows:**
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer
3. Set password for postgres user
4. Note the port (default: 5432)

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Create Database

1. **Connect to PostgreSQL:**
```powershell
psql -U postgres
```

2. **Create database and user:**
```sql
CREATE DATABASE ai_customer_service;
CREATE USER serviceuser WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE ai_customer_service TO serviceuser;
\q
```

### Redis Installation

**Windows:**
1. Download Redis from https://github.com/microsoftarchive/redis/releases
2. Extract and run redis-server.exe

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install redis-server
sudo systemctl start redis-server
```

### Verify Redis is Running
```powershell
redis-cli ping
# Should return: PONG
```

---

## Configuration

### Backend Configuration

1. **Copy environment template:**
```powershell
cd backend
Copy-Item .env.example .env
```

2. **Edit .env file:**
```ini
# Database Configuration
DATABASE_URL=postgresql://serviceuser:your_secure_password@localhost:5432/ai_customer_service
DATABASE_POOL_SIZE=5
DATABASE_MAX_OVERFLOW=10

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=<generate-random-secret-key>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Application Settings
APP_NAME=AI-Powered Customer Service Platform
DEBUG=True
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000

# NLP Configuration
NLP_MODEL_NAME=xlm-roberta-base
NLP_CONFIDENCE_THRESHOLD=0.85
SUPPORTED_LANGUAGES=en,sn,nd
```

3. **Generate Secret Key:**
```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Frontend Configuration

1. **Create .env file:**
```powershell
cd ..\frontend
New-Item .env
```

2. **Add configuration:**
```ini
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=http://localhost:8000
```

---

## Running the Application

### Start Backend Server

1. **Activate virtual environment:**
```powershell
cd backend
.\venv\Scripts\Activate
```

2. **Run server:**
```powershell
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Verify backend is running:**
- Open browser: http://localhost:8000/health
- API docs: http://localhost:8000/api/docs

### Start Frontend Server

1. **Open new terminal:**
```powershell
cd frontend
npm run dev
```

2. **Access application:**
- Frontend: http://localhost:3000
- Login page: http://localhost:3000/login

---

## Initial Setup

### Create Admin User

1. **Open API documentation:** http://localhost:8000/api/docs

2. **Register admin user:**
   - Navigate to `/api/v1/auth/register`
   - Click "Try it out"
   - Enter user data:
   ```json
   {
     "name": "System Admin",
     "email": "admin@example.com",
     "password": "SecurePassword123!",
     "role": "admin",
     "preferred_language": "en"
   }
   ```
   - Click "Execute"

3. **Login with admin credentials**

### Create Test Data

You can use the API documentation to create:
- Additional users (customers, agents)
- Chat sessions
- Tickets

---

## Troubleshooting

### Common Issues

#### Backend Port Already in Use
**Error:** "Address already in use"

**Solution:**
```powershell
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

#### Database Connection Error
**Error:** "Could not connect to database"

**Solutions:**
1. Verify PostgreSQL is running:
```powershell
Get-Service -Name postgresql*
```

2. Check database credentials in .env file

3. Test connection:
```powershell
psql -U serviceuser -d ai_customer_service -h localhost
```

#### Module Not Found Error
**Error:** "ModuleNotFoundError: No module named 'fastapi'"

**Solution:**
```powershell
# Ensure virtual environment is activated
.\venv\Scripts\Activate

# Reinstall dependencies
pip install -r requirements.txt
```

#### Frontend Build Errors
**Error:** "Cannot find module"

**Solutions:**
```powershell
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
Remove-Item -Recurse -Force node_modules
npm install
```

#### Redis Connection Error
**Error:** "Error connecting to Redis"

**Solution:**
```powershell
# Start Redis server
redis-server

# Or on Windows, run redis-server.exe
```

### Verification Checklist

- [ ] PostgreSQL is running
- [ ] Redis is running
- [ ] Database created and accessible
- [ ] Backend virtual environment activated
- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed
- [ ] .env files configured correctly
- [ ] Backend server running on port 8000
- [ ] Frontend server running on port 3000
- [ ] Can access http://localhost:8000/health
- [ ] Can access http://localhost:3000

---

## Getting Help

If you encounter issues not covered in this guide:

1. Check application logs:
   - Backend: Console output from uvicorn
   - Frontend: Browser console (F12)

2. Review error messages carefully

3. Contact supervisor: Mrs Mhlanga

4. Refer to project documentation in `/docs` directory

---

**Installation Guide Version 1.0**  
**Last Updated:** February 2026  
**Author:** Brandon K Mhako (R223931W)
