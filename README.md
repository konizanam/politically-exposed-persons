PIP Intel Namibia

A comprehensive web application for managing Public Investment Projects (PIPs) in Namibia — providing secure data management, user administration, organisational control, and complete audit tracking.

🚀 Features
✅ Core Functionality

PIP Management – Full lifecycle management of Public Investment Projects

Data Capturing – Specialized interface for structured data entry

Audit Trail – Complete tracking of activities and system changes

User Management – Role-based access and account control

Organisation Management – Manage institutional structures and relationships

🔐 Security & Authentication

JWT-based authentication

Multi-Factor Authentication (MFA / 2FA)

Role-Based Access Control (RBAC)

Secure session management with expiration controls

🛠 Administrative Features

User account creation and management

Role and permission assignment

System package and feature management

PIP search history tracking

🧰 Technology Stack
Frontend

React 18 (hooks based)

React Router DOM

Axios

Context API

CSS3 (responsive design)

Backend

Node.js

Express.js

PostgreSQL

Additional Tools

JWT (authentication)

CORS

dotenv (environment variables)

🚦 Getting Started
✅ Prerequisites

Ensure you have:

Node.js (v14+)

PostgreSQL

npm or yarn

📌 Installation
1️⃣ Install backend dependencies
cd server
npm install

2️⃣ Install frontend dependencies
cd ../client
npm install

3️⃣ Configure Environment Variables

Copy .env.example → .env in both server and client

Set:

Database credentials

JWT secrets

Email config (if required)

4️⃣ Database Setup

Create PostgreSQL database

Run migrations (if applicable)

Seed initial data (optional)

▶️ Running the Application
Development Mode

Start backend (server folder):

node index.js


Start frontend (client folder):

npm run dev

🔐 Authentication & Authorization
User Roles
Role	Permissions
Admin	Full system access
OrgManager	Organisation-level management
DataCapturer	Data entry and modification
Viewer	Read-only access
Protected Routes

/pips/pips — PIP management (authenticated)

/audit — audit trail access

/DataCapturer/datacapturer — Admin only

/administrator/* — role-restricted

🌐 API Endpoints
Authentication
Method	Endpoint	Description
POST	/api/auth/login/init	Start login process
POST	/api/auth/login/verify	Verify MFA code
POST	/api/auth/logout	Logout user
PIP Data
Method	Endpoint
GET	/api/pipsdata
POST	/api/pipsdata
PUT	/api/pipsdata/:id
DELETE	/api/pipsdata/:id
Administrative

/api/users

/api/organisations

/api/packages

/api/audittrails

System

/api/health — system status

/api/endpoints — registered endpoint list

🔧 Configuration
Server .env Example
PORT=5000
NODE_ENV=development

DATABASE_URL=postgresql://postgres:password@localhost:5432/pips
JWT_SECRET=myUltraSecretKey123!@#

DB_USER=postgres
DB_HOST=localhost
DB_NAME=pips
DB_PASSWORD=password
DB_PORT=5432

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=pipintel0@gmail.com
EMAIL_PASSWORD=xxxx
EMAIL_FROM=noreply@pipintel.com
EMAIL_DEBUG=true

📊 Database Schema (Key Tables)

users – system accounts and profiles

organisations – institution data

pips – project records

audit_trails – change tracking

permissions – RBAC rules

packages – feature management

🛡 Security Features

JWT authentication

Password hashing (bcrypt)

CORS policy enforcement

Input validation & sanitization

SQL injection prevention

XSS and CSRF protection

🌍 Browser Support

Chrome (latest)

Firefox (latest)

Safari (latest)

Edge (latest)

🆘 Support

For technical assistance:

Contact system administrators

Refer to internal documentation

Review audit logs for issues

© 2024 PIP Intel Namibia — All Rights Reserve
