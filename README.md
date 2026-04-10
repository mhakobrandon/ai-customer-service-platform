# AI-Powered Customer Service Platform

**AI-Powered Customer Service Platform with Integrated Ticketing System for Zimbabwe's Financial Sector**

## Project Information

- **Author:** Brandon K Mhako
- **Registration Number:** R223931W
- **Supervisor:** Mrs Mhlanga
- **Institution:** Faculty of Computer Engineering, Informatics and Communications
- **Department:** Computer Science
- **Project Type:** Capstone Project
- **Degree:** Bachelor Honours in Computer Science
- **Submission Date:** June 2026

## Executive Summary

This project develops a comprehensive AI-powered customer service platform specifically designed for Zimbabwe's financial services sector, addressing critical challenges in customer support delivery for banks and mobile network operators (MNOs) such as EcoCash, OneMoney, and Telecash. The platform provides multilingual support (English, Shona, Ndebele), intelligent query processing, automated ticketing, and seamless escalation protocols.

## Key Features

### 🌍 Multilingual Support
- **Supported Languages:** English, Shona, Ndebele
- **Automatic Language Detection:** AI-powered detection of user's preferred language
- **Culturally Appropriate Responses:** Context-aware responses respecting local customs

### 🤖 AI-Powered Query Processing
- **Natural Language Processing:** XLM-RoBERTa-based multilingual model
- **Intent Classification:** 15+ financial service intent categories
- **85% Accuracy Target:** High-confidence autonomous resolution
- **Entity Extraction:** Automatic extraction of key information (amounts, dates, account numbers)

### 🎫 Integrated Ticketing System
- **Automatic Ticket Creation:** Seamless escalation from AI to human agents
- **Priority Assignment:** Intelligent priority levels (Low, Medium, High, Critical)
- **SLA Tracking:** Response and resolution time monitoring
- **Complete Audit Trail:** Full conversation history preservation

### 🔄 Intelligent Escalation
- **Agent Matching:** Language proficiency, specialization, workload balancing
- **Real-time Routing:** <30 second assignment for complex queries
- **Context Preservation:** Complete chat history available to agents

### 📊 Analytics Dashboard
- **Real-time Metrics:** Resolution times, satisfaction scores, agent performance
- **Performance Monitoring:** KPIs, trends, and insights
- **System Health:** Uptime, capacity, and operational status

### 🔒 Security & Compliance
- **AES-256 Encryption:** Data at rest
- **TLS 1.3:** Data in transit
- **OAuth 2.0 + JWT:** Secure authentication
- **RBAC:** Role-based access control
- **Zimbabwe Data Protection Act Compliance**

## Technology Stack

### Backend
- **Framework:** FastAPI 0.104.1
- **Language:** Python 3.10+
- **Database:** PostgreSQL 14+ with SQLAlchemy ORM
- **Caching:** Redis 6+
- **WebSocket:** Real-time communication
- **NLP:** Transformers (XLM-RoBERTa), PyTorch 2.0+

### Frontend
- **Framework:** React 18+ with TypeScript
- **UI Library:** Material-UI (MUI) 5
- **State Management:** React Hooks
- **API Client:** Axios
- **Real-time:** Socket.IO Client
- **Build Tool:** Vite 5

### Infrastructure
- **Containerization:** Docker
- **Cloud Platform:** AWS/Google Cloud (deployment ready)
- **Monitoring:** Prometheus, Grafana
- **Logging:** ELK Stack

## Project Structure

```
ai-customer-service-platform/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── endpoints/
│   │   │       ├── auth.py
│   │   │       ├── chat.py
│   │   │       ├── tickets.py
│   │   │       ├── users.py
│   │   │       ├── analytics.py
│   │   │       └── admin.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── security.py
│   │   ├── database/
│   │   │   └── session.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── chat_session.py
│   │   │   ├── message.py
│   │   │   ├── ticket.py
│   │   │   └── escalation.py
│   │   ├── services/
│   │   │   ├── nlp_service.py
│   │   │   └── websocket_manager.py
│   │   └── main.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   ├── chat/
│   │   │   ├── dashboard/
│   │   │   └── admin/
│   │   ├── services/
│   │   │   ├── apiService.ts
│   │   │   ├── authService.ts
│   │   │   └── websocketService.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── docs/
├── tests/
└── README.md
```

## Installation & Setup

### Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher
- PostgreSQL 14 or higher
- Redis 6 or higher

### Backend Setup

1. **Navigate to backend directory:**
```powershell
cd backend
```

2. **Create virtual environment:**
```powershell
python -m venv venv
.\venv\Scripts\Activate
```

3. **Install dependencies:**
```powershell
pip install -r requirements.txt
```

4. **Configure environment:**
```powershell
Copy-Item .env.example .env
# Edit .env with your configuration
```

	For live WhatsApp chatbot integration, set these variables in `backend/.env`:
	- `TWILIO_ACCOUNT_SID`
	- `TWILIO_AUTH_TOKEN`
	- `TWILIO_PHONE_NUMBER` (example: `whatsapp:+14155238886`)

5. **Initialize database:**
```powershell
# Ensure PostgreSQL is running
# Database tables will be created automatically on first run
```

6. **Run backend server:**
```powershell
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

1. **Navigate to frontend directory:**
```powershell
cd frontend
```

2. **Install dependencies:**
```powershell
npm install
```

3. **Run development server:**
```powershell
npm run dev
```

4. **Access application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/api/docs

## Database Configuration

### PostgreSQL Setup

1. **Create database:**
```sql
CREATE DATABASE ai_customer_service;
CREATE USER serviceuser WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE ai_customer_service TO serviceuser;
```

2. **Update .env file:**
```
DATABASE_URL=postgresql://serviceuser:your_password@localhost:5432/ai_customer_service
```

## API Documentation

### Authentication Endpoints

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/token` - OAuth2 token endpoint

### Chat Endpoints

- `POST /api/v1/chat/sessions` - Create chat session
- `GET /api/v1/chat/sessions` - Get user sessions
- `POST /api/v1/chat/messages` - Send message
- `GET /api/v1/chat/sessions/{session_id}/messages` - Get session messages

### Ticket Endpoints

- `POST /api/v1/tickets` - Create ticket
- `GET /api/v1/tickets` - Get tickets
- `GET /api/v1/tickets/{ticket_id}` - Get ticket details
- `PATCH /api/v1/tickets/{ticket_id}` - Update ticket
- `POST /api/v1/tickets/{ticket_id}/assign` - Assign ticket to agent

### Analytics Endpoints

- `GET /api/v1/analytics/dashboard` - Dashboard metrics
- `GET /api/v1/analytics/performance` - Performance metrics
- `GET /api/v1/analytics/frequent-queries` - Most frequent customer questions
- `GET /api/v1/analytics/integration-status` - Channel and provider integration readiness

### Integration Endpoints

- `GET /api/v1/integrations/channels` - Channel status + provider integration matrix
- `POST /api/v1/integrations/whatsapp/webhook` - WhatsApp/Twilio inbound webhook

### WhatsApp Webhook Setup (Twilio)

1. Set Twilio credentials in `backend/.env`.
2. Start backend server and expose it publicly (for example using ngrok).
3. In Twilio WhatsApp Sandbox/Sender settings, set inbound webhook URL to:
	- `https://<public-domain>/api/v1/integrations/whatsapp/webhook`
4. Send a WhatsApp message to your configured Twilio WhatsApp number; the bot will create/use a chat session and reply automatically.

### Admin Endpoints

- `GET /api/v1/admin/users` - List all users
- `GET /api/v1/admin/system-stats` - System statistics
- `PATCH /api/v1/admin/users/{user_id}/toggle-status` - Toggle user status

### WebSocket Endpoint

- `WS /ws/chat/{session_id}` - Real-time chat communication

## User Roles

### Customer
- Initiate chat sessions
- Send messages
- Create tickets
- View own tickets
- Rate service quality

### Agent
- View assigned tickets
- Respond to customer queries
- Update ticket status
- Resolve tickets
- View performance metrics

### Admin
- Manage users
- View system statistics
- Monitor system health
- Access all analytics
- Configure system settings

## Testing

### Backend Tests
```powershell
cd backend
pytest tests/ -v --cov=app
```

### Frontend Tests
```powershell
cd frontend
npm test
```

## Deployment

### Docker Deployment

1. **Build images:**
```powershell
docker-compose build
```

2. **Run containers:**
```powershell
docker-compose up -d
```

### Production Considerations

- Use environment-specific configuration files
- Enable HTTPS with valid SSL certificates
- Configure database backups
- Set up monitoring and logging
- Implement rate limiting
- Configure CORS for production domains

## Performance Targets

- **AI Response Time:** <2 seconds
- **Concurrent Users:** 500+
- **Intent Recognition Accuracy:** ≥85%
- **System Uptime:** 99.5%
- **Average Resolution Time:** <30 minutes
- **First Contact Resolution:** >70%

## Contributing

This is an academic capstone project. For inquiries or collaboration opportunities, please contact:

- **Email:** brandonmhako@example.com
- **Supervisor:** Mrs Mhlanga

## License

This project is submitted as part of academic requirements for Bachelor Honours in Computer Science at the Faculty of Computer Engineering, Informatics and Communications.

## Acknowledgments

- **Supervisor:** Mrs Mhlanga for guidance and support
- **Department of Computer Science** for providing resources
- **Zimbabwe's Financial Sector** for inspiring this solution

## References

See the full project documentation for complete literature review and references.

---

**© 2026 Brandon K Mhako | R223931W | Computer Science Department**
