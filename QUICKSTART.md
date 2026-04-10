# Quick Start Guide

## AI-Powered Customer Service Platform
**Brandon K Mhako (R223931W) - Capstone Project**

---

## 🚀 Getting Started in 5 Minutes

### Prerequisites Check
```powershell
# Verify installations
python --version  # Should be 3.10+
node --version    # Should be 18.0+

# Optional (can use SQLite instead)
psql --version    # PostgreSQL 14+ (if installed)

# Optional (Redis for caching - not required)
redis-cli ping    # Should return PONG (if installed)
```

**Note:** Don't have PostgreSQL or Redis? See the "Running Without PostgreSQL/Redis" section below.

---

## 📦 Installation

### 1. Backend Setup (2 minutes)

```powershell
# Navigate to project
cd ai-customer-service-platform\backend

# Create virtual environment
python -m venv venv

# Activate it
.\venv\Scripts\Activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
Copy-Item .env.example .env
# Edit .env with your database credentials
```

### 2. Database Setup (1 minute)

**Option A: With PostgreSQL (Recommended)**
```powershell
# Connect to PostgreSQL
psql -U postgres

# Run these SQL commands
CREATE DATABASE ai_customer_service;
CREATE USER serviceuser WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE ai_customer_service TO serviceuser;
\q
```

**Option B: Without PostgreSQL (Quick Start)**
```powershell
# Edit backend/.env and use SQLite instead:
# DATABASE_URL=sqlite+aiosqlite:///./ai_customer_service.db

# No additional setup needed! Database file will be created automatically.
```

### 3. Frontend Setup (2 minutes)

```powershell
# Navigate to frontend
cd ..\frontend

# Install dependencies
npm install

# Create environment file
@"
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=http://localhost:8000
"@ | Out-File -FilePath .env
```

---

## ▶️ Running the Application

### Start Backend (Terminal 1)
```powershell
cd backend
.\venv\Scripts\Activate
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Verify:** Open http://localhost:8000/health  
**API Docs:** http://localhost:8000/api/docs

### Start Frontend (Terminal 2)
```powershell
cd frontend
npm run dev
```

**Access:** http://localhost:3000

---

## 🧪 Testing the Application

### 1. Create Test User

**Option A: Via API Docs**
1. Go to http://localhost:8000/api/docs
2. Find `POST /api/v1/auth/register`
3. Click "Try it out"
4. Use this test data:
```json
{
  "name": "Test Customer",
  "email": "test@example.com",
  "password": "Test123!",
  "role": "customer",
  "preferred_language": "en"
}
```
5. Click "Execute"

**Option B: Via Frontend**
1. Go to http://localhost:3000/register
2. Fill in the form
3. Click "Sign Up"

### 2. Login
1. Go to http://localhost:3000/login
2. Enter credentials
3. Click "Sign In"

### 3. Test Chat
1. Select language (English/Shona/Ndebele)
2. Type a message:
   - English: "What is my balance?"
   - Shona: "Ndoda kuona mari yangu"
   - Ndebele: "Ngifuna ukubona imali yami"
3. Watch AI respond in your language!

---

## 📝 Common Commands

### Backend
```powershell
# Start server
cd backend; .\venv\Scripts\Activate; uvicorn app.main:app --reload

# Check API health
Invoke-WebRequest http://localhost:8000/health

# View logs
# Check terminal output

# Build retraining dataset from reviewed NLP feedback (no training)
python -m app.services.retraining_pipeline

# Build dataset and retrain model
python -m app.services.retraining_pipeline --train

# One-command: export reviewed feedback from API then build dataset
cd ..; .\retrain-from-feedback.ps1

# One-command with training
cd ..; .\retrain-from-feedback.ps1 -Train
```

### Frontend
```powershell
# Start dev server
cd frontend; npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Database
```powershell
# Connect to database
psql -U serviceuser -d ai_customer_service

# List tables
\dt

# View users
SELECT * FROM users;

# Exit
\q
```

---

## 🔍 API Quick Reference

### Authentication
```powershell
# Register
curl -X POST http://localhost:8000/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -d '{"name":"Test","email":"test@test.com","password":"Test123!"}'

# Login
curl -X POST http://localhost:8000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"test@test.com","password":"Test123!"}'
```

### Chat
```powershell
# Create session (requires token)
curl -X POST http://localhost:8000/api/v1/chat/sessions `
  -H "Authorization: Bearer YOUR_TOKEN"

# Send message
curl -X POST http://localhost:8000/api/v1/chat/messages `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"session_id":"SESS123","content":"Hello"}'
```

---

## 🐛 Troubleshooting

### Backend won't start
```powershell
# Check if port 8000 is in use
netstat -ano | findstr :8000

# Kill process if needed
taskkill /PID <PID> /F

# Verify virtual environment
Get-Command python  # Should be in venv
```

### Database connection error
```powershell
# Check PostgreSQL is running
Get-Service -Name postgresql*

# Test connection
psql -U serviceuser -d ai_customer_service -h localhost

# Check .env file has correct DATABASE_URL
```

### Frontend errors
```powershell
# Clear cache and reinstall
Remove-Item -Recurse -Force node_modules
npm cache clean --force
npm install
```

### Redis not found
```powershell
# Redis is OPTIONAL - the app will work without it
# If you don't have Redis, just ignore Redis-related errors in logs

# To install Redis on Windows:
# Download from: https://github.com/microsoftarchive/redis/releases
# Or use: winget install Redis.Redis

# App will work fine without Redis (just slower caching)
```

---

## 🚀 Running Without PostgreSQL/Redis

If you don't have PostgreSQL or Redis installed, you can still run the project:

### Quick Start (No Database Installation Required)

1. **Update backend/.env file:**
```ini
# Use SQLite instead of PostgreSQL
DATABASE_URL=sqlite+aiosqlite:///./ai_customer_service.db

# Comment out or ignore Redis URL
# REDIS_URL=redis://localhost:6379/0
```

2. **Install SQLite support:**
```powershell
cd backend
.\venv\Scripts\Activate
pip install aiosqlite
```

3. **Run the backend:**
```powershell
python -m uvicorn app.main:app --reload
```

The database file will be created automatically in the backend folder!

### Installing PostgreSQL (Optional - For Production)

**Windows:**
1. Download from: https://www.postgresql.org/download/windows/
2. Run installer, set password for `postgres` user
3. Add to PATH or use full path

**Using Chocolatey:**
```powershell
choco install postgresql
```

**Using winget:**
```powershell
winget install PostgreSQL.PostgreSQL
```

### Installing Redis (Optional - For Caching)

**Windows:**
1. Download from: https://github.com/microsoftarchive/redis/releases
2. Extract and run `redis-server.exe`

**Using Chocolatey:**
```powershell
choco install redis-64
```

---

## 📊 Project Structure

```
ai-customer-service-platform/
├── backend/              ← FastAPI backend
│   ├── app/
│   │   ├── api/         ← API endpoints
│   │   ├── models/      ← Database models
│   │   ├── services/    ← Business logic
│   │   └── main.py      ← Entry point
│   └── requirements.txt
├── frontend/            ← React frontend
│   ├── src/
│   │   ├── components/  ← React components
│   │   └── services/    ← API clients
│   └── package.json
└── docs/                ← Documentation
```

---

## 🎯 Key URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | Main application |
| Backend API | http://localhost:8000 | API endpoints |
| API Docs | http://localhost:8000/api/docs | Interactive API documentation |
| Health Check | http://localhost:8000/health | System status |
| Database | localhost:5432 | PostgreSQL |
| Redis | localhost:6379 | Cache server |

---

## 🌍 Multilingual Features

### Supported Languages
- **English (en)**: Full support
- **Shona (sn)**: Native Zimbabwean language
- **Ndebele (nd)**: Native Zimbabwean language

### Sample Queries by Language

**Balance Inquiry:**
- EN: "What is my balance?" / "How much money do I have?"
- SN: "Ndoda kuona mari yangu" / "Ndine mari yakawanda sei?"
- ND: "Ngifuna ukubona imali yami" / "Nginemali engakanani?"

**Transaction History:**
- EN: "Show my transactions" / "Transaction history"
- SN: "Ndoda kuona zvandakamboita" / "History yemari yangu"
- ND: "Ngifuna ukubona obekwenza" / "Umlando wemali"

**Password Reset:**
- EN: "I forgot my password" / "Reset password"
- SN: "Ndakanganwa password yangu" / "Ndoda kuchinja password"
- ND: "Ngibuye ngalibala i-password" / "Ngifuna ukubuyi sela i-password"

---

## 🔐 Default Test Credentials

After creating a test user, you can use:
- **Email:** test@example.com
- **Password:** Test123!
- **Role:** customer
- **Language:** en

---

## 📞 Getting Help

1. **Check documentation:** `docs/` folder
2. **View API docs:** http://localhost:8000/api/docs
3. **Check logs:** Terminal output from backend/frontend
4. **Common issues:** See Troubleshooting section above
5. **Contact supervisor:** Mrs Mhlanga

---

## ✅ Success Checklist

- [ ] PostgreSQL running
- [ ] Redis running (optional)
- [ ] Backend starts successfully
- [ ] Frontend starts successfully
- [ ] Can access http://localhost:3000
- [ ] Can register a new user
- [ ] Can login
- [ ] Can send chat messages
- [ ] AI responds in correct language

---

**Quick Start Guide Version 1.0**  
**Created:** February 13, 2026  
**Author:** Brandon K Mhako (R223931W)
