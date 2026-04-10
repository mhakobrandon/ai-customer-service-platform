# API Documentation

## AI-Powered Customer Service Platform API

**Base URL:** `http://localhost:8000/api/v1`  
**Version:** 1.0.0

---

## Authentication

All protected endpoints require authentication using JWT Bearer tokens.

### Headers
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

## Authentication Endpoints

### Register User
**POST** `/auth/register`

Creates a new user account.

**Request Body:**
```json
{
  "name": "Brandon Mhako",
  "email": "brandon@example.com",
  "password": "SecurePassword123!",
  "phone_number": "+263771234567",
  "role": "customer",
  "preferred_language": "en"
}
```

**Response:** `201 Created`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Brandon Mhako",
  "email": "brandon@example.com",
  "role": "customer",
  "preferred_language": "en",
  "is_active": true
}
```

### Login
**POST** `/auth/login`

Authenticates user and returns JWT tokens.

**Request Body:**
```json
{
  "email": "brandon@example.com",
  "password": "SecurePassword123!"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Brandon Mhako",
    "email": "brandon@example.com",
    "role": "customer",
    "preferred_language": "en"
  }
}
```

---

## Chat Endpoints

### Create Chat Session
**POST** `/chat/sessions`

Creates a new chat session for the authenticated user.

**Headers:** Authorization required

**Request Body:**
```json
{
  "initial_message": "Ndoda kuona mari yangu"
}
```

**Response:** `201 Created`
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440001",
  "session_id": "SESS12AB34CD",
  "status": "active",
  "initial_language": "sn",
  "created_at": "2026-02-13T10:30:00Z"
}
```

### Get Chat Sessions
**GET** `/chat/sessions?limit=10`

Retrieves user's chat sessions.

**Headers:** Authorization required

**Response:** `200 OK`
```json
[
  {
    "id": "650e8400-e29b-41d4-a716-446655440001",
    "session_id": "SESS12AB34CD",
    "status": "active",
    "initial_language": "sn",
    "created_at": "2026-02-13T10:30:00Z"
  }
]
```

### Send Message
**POST** `/chat/messages`

Sends a message and receives AI response.

**Headers:** Authorization required

**Request Body:**
```json
{
  "session_id": "SESS12AB34CD",
  "content": "Ndoda kuona mari yangu"
}
```

**Response:** `200 OK`
```json
{
  "message_id": "750e8400-e29b-41d4-a716-446655440002",
  "content": "Mari yako iri muaccount yako iUSD 250.00. Pane chimwe chandingakubatsira nacho?",
  "language": "sn",
  "intent": "balance_inquiry",
  "confidence": 0.92,
  "requires_escalation": false,
  "timestamp": "2026-02-13T10:30:05Z"
}
```

### Get Session Messages
**GET** `/chat/sessions/{session_id}/messages`

Retrieves all messages in a chat session.

**Headers:** Authorization required

**Response:** `200 OK`
```json
[
  {
    "id": "750e8400-e29b-41d4-a716-446655440002",
    "content": "Ndoda kuona mari yangu",
    "language": "sn",
    "is_from_customer": true,
    "is_from_ai": false,
    "detected_intent": "balance_inquiry",
    "confidence_score": "0.92",
    "timestamp": "2026-02-13T10:30:00Z"
  },
  {
    "id": "850e8400-e29b-41d4-a716-446655440003",
    "content": "Mari yako iri muaccount yako iUSD 250.00",
    "language": "sn",
    "is_from_customer": false,
    "is_from_ai": true,
    "detected_intent": "balance_inquiry",
    "confidence_score": "0.92",
    "timestamp": "2026-02-13T10:30:05Z"
  }
]
```

---

## Ticket Endpoints

### Create Ticket
**POST** `/tickets`

Creates a new support ticket.

**Headers:** Authorization required

**Request Body:**
```json
{
  "subject": "Transaction not received",
  "description": "I sent USD 50 to my sister but she hasn't received it",
  "category": "transaction_dispute",
  "priority": "high",
  "session_id": "SESS12AB34CD"
}
```

**Response:** `201 Created`
```json
{
  "id": "950e8400-e29b-41d4-a716-446655440004",
  "ticket_id": "TICKET89EF67GH",
  "subject": "Transaction not received",
  "description": "I sent USD 50 to my sister but she hasn't received it",
  "category": "transaction_dispute",
  "priority": "high",
  "status": "new",
  "created_at": "2026-02-13T10:35:00Z",
  "customer_name": "Brandon Mhako"
}
```

### Get Tickets
**GET** `/tickets?status_filter=open&limit=20`

Retrieves tickets for the authenticated user.

**Headers:** Authorization required

**Query Parameters:**
- `status_filter` (optional): Filter by status (new, assigned, in_progress, resolved, closed)
- `limit` (optional): Maximum number of tickets (default: 20)

**Response:** `200 OK`
```json
[
  {
    "id": "950e8400-e29b-41d4-a716-446655440004",
    "ticket_id": "TICKET89EF67GH",
    "subject": "Transaction not received",
    "description": "I sent USD 50 to my sister but she hasn't received it",
    "category": "transaction_dispute",
    "priority": "high",
    "status": "assigned",
    "created_at": "2026-02-13T10:35:00Z"
  }
]
```

### Get Ticket Details
**GET** `/tickets/{ticket_id}`

Retrieves detailed ticket information.

**Headers:** Authorization required

**Response:** `200 OK`
```json
{
  "id": "950e8400-e29b-41d4-a716-446655440004",
  "ticket_id": "TICKET89EF67GH",
  "subject": "Transaction not received",
  "description": "I sent USD 50 to my sister but she hasn't received it",
  "category": "transaction_dispute",
  "priority": "high",
  "status": "in_progress",
  "resolution": null,
  "resolution_notes": null,
  "created_at": "2026-02-13T10:35:00Z",
  "updated_at": "2026-02-13T10:45:00Z",
  "resolved_at": null,
  "is_overdue": false
}
```

### Update Ticket
**PATCH** `/tickets/{ticket_id}`

Updates ticket information (agents can update status, customers can rate).

**Headers:** Authorization required

**Request Body (Agent):**
```json
{
  "status": "resolved",
  "resolution": "Transaction located and processed",
  "resolution_notes": "Transaction was delayed due to network issues"
}
```

**Request Body (Customer):**
```json
{
  "customer_satisfaction": 5
}
```

**Response:** `200 OK`
```json
{
  "id": "950e8400-e29b-41d4-a716-446655440004",
  "ticket_id": "TICKET89EF67GH",
  "status": "resolved",
  "message": "Ticket updated successfully"
}
```

---

## Analytics Endpoints

### Get Dashboard Analytics
**GET** `/analytics/dashboard`

Retrieves dashboard metrics (agents and admins only).

**Headers:** Authorization required  
**Required Role:** agent or admin

**Response:** `200 OK`
```json
{
  "tickets": {
    "total": 150,
    "open": 45,
    "resolved": 105,
    "resolution_rate": 70.0
  },
  "chat_sessions": {
    "total": 500,
    "active": 25
  },
  "messages": {
    "total": 2500,
    "ai_handled": 1875,
    "ai_resolution_rate": 75.0
  },
  "system_health": {
    "status": "healthy",
    "uptime": "99.5%"
  }
}
```

### Get Performance Metrics
**GET** `/analytics/performance?days=7`

Retrieves performance metrics for specified period.

**Headers:** Authorization required  
**Required Role:** agent or admin

**Query Parameters:**
- `days` (optional): Number of days to analyze (default: 7)

**Response:** `200 OK`
```json
{
  "period_days": 7,
  "average_resolution_time_hours": 4.5,
  "average_customer_satisfaction": 4.2,
  "first_contact_resolution_rate": 72.5,
  "escalation_rate": 15.3
}
```

---

## Admin Endpoints

### List All Users
**GET** `/admin/users?role_filter=customer`

Lists all system users (admin only).

**Headers:** Authorization required  
**Required Role:** admin

**Query Parameters:**
- `role_filter` (optional): Filter by role (customer, agent, admin)

**Response:** `200 OK`
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Brandon Mhako",
    "email": "brandon@example.com",
    "role": "customer",
    "is_active": true
  }
]
```

### Get System Statistics
**GET** `/admin/system-stats`

Retrieves comprehensive system statistics (admin only).

**Headers:** Authorization required  
**Required Role:** admin

**Response:** `200 OK`
```json
{
  "users": {
    "total": 250,
    "customers": 200,
    "agents": 45,
    "admins": 5
  },
  "tickets": {
    "total": 150
  },
  "sessions": {
    "total": 500
  },
  "system_info": {
    "version": "1.0.0",
    "status": "operational"
  }
}
```

---

## WebSocket API

### Real-time Chat Connection
**WS** `/ws/chat/{session_id}`

Establishes WebSocket connection for real-time chat.

**Connection Example (JavaScript):**
```javascript
const socket = new WebSocket('ws://localhost:8000/ws/chat/SESS12AB34CD')

socket.onopen = () => {
  console.log('Connected')
}

socket.onmessage = (event) => {
  const message = JSON.parse(event.data)
  console.log('Received:', message)
}

socket.send(JSON.stringify({
  message: 'Hello',
  timestamp: new Date().toISOString()
}))
```

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid request data"
}
```

### 401 Unauthorized
```json
{
  "detail": "Could not validate credentials"
}
```

### 403 Forbidden
```json
{
  "detail": "User role 'admin' required"
}
```

### 404 Not Found
```json
{
  "detail": "Ticket not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "An internal server error occurred"
}
```

---

## Rate Limiting

- **Rate Limit:** 60 requests per minute per user
- **Header:** `X-RateLimit-Remaining`

---

**API Documentation Version 1.0**  
**Last Updated:** February 2026  
**Author:** Brandon K Mhako (R223931W)
