# **PIP Intel Namibia**

A comprehensive web application for managing **Public Investment Projects (PIPs)** in Namibia — providing secure data management, user administration, organisational control, and full audit tracking.

---

## 🚀 Features

<details>
<summary><strong>Core Functionality</strong></summary>

- **PIP Management** – Full lifecycle management of Public Investment Projects  
- **Data Capturing** – Structured data entry and management  
- **Audit Trail** – Complete tracking of activities and system changes  
- **User Management** – Role-based access and account control  
- **Organisation Management** – Manage institutional structures and relationships  

</details>

<details>
<summary><strong>Security & Authentication</strong></summary>

- JWT-based authentication  
- Multi-Factor Authentication (MFA / 2FA)  
- Role-Based Access Control (RBAC)  
- Secure session management with expiration controls  

</details>

<details>
<summary><strong>Administrative Features</strong></summary>

- User account creation and management  
- Role and permission assignment  
- System package and feature management  
- PIP search history tracking  

</details>

---

## 🧰 Technology Stack

<details>
<summary><strong>Frontend</strong></summary>

- React 18 (hooks-based)  
- React Router DOM  
- Axios  
- Context API  
- CSS3 (responsive design)  

</details>

<details>
<summary><strong>Backend</strong></summary>

- Node.js  
- Express.js  
- PostgreSQL  

</details>

<details>
<summary><strong>Additional Tools</strong></summary>

- JWT (authentication)  
- CORS  
- dotenv (environment variables)  

</details>

---

## 🚦 Getting Started

<details>
<summary><strong>Prerequisites</strong></summary>

- Node.js (v14 or higher)  
- PostgreSQL  
- npm or yarn  

</details>

## ✅ Installation Steps

### **2️⃣ Install Frontend Dependencies**
To install client-side packages, run:

```bash
cd ../client
npm install
```
3️⃣ Configure Environment Variables

Copy .env.example → .env in both folders.

Set required values:

Database credentials

JWT secret keys

Email configuration (if required)

4️⃣ Database Setup

Perform the following:

Create a PostgreSQL database

Run database migrations (if applicable)

Seed initial data (optional)

🚀 Running the Application
```bash
Start Backend (from /server)
node index.js
```
```bash
Start Frontend (from /client)
npm run dev
```
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

/administrator/* — restricted to specific roles

🌐 API Endpoints
Authentication
Method	Endpoint	Description
POST	/api/auth/login/init	Start login process
POST	/api/auth/login/verify	Verify MFA code
POST	/api/auth/logout	Logout user
PIP Data

GET /api/pipsdata

POST /api/pipsdata

PUT /api/pipsdata/:id

DELETE /api/pipsdata/:id

Administrative

/api/users

/api/organisations

/api/packages

/api/audittrails

System

/api/health — Health check

/api/endpoints — List all registered endpoints

🔧 Server Configuration Example
```env
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
```
📊 Database Schema

Key tables include:

users

organisations

pips

audit_trails

permissions

packages

🛡 Security Layers

JWT authentication

Password hashing (bcrypt)

CORS enforcement

Input validation & sanitization

SQL injection prevention

XSS & CSRF protection

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

© 2024 PIP Intel Namibia — All Rights Reserved
