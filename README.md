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

<details>
<summary><strong>Installation</strong></summary>

#### 1️⃣ Install backend dependencies
```bash
cd server
npm install 
```
### 2️⃣ Install Frontend Dependencies
```bash
cd ../client
npm install
```
3️⃣ Configure Environment Variables

Copy .env.example → .env in both folders

Set:

Database credentials

JWT secrets

Email config (if required)

4️⃣ Database Setup

Create PostgreSQL database

Run migrations (if applicable)

Seed initial data (optional)

</details> <details> <summary><strong>Running the Application</strong></summary>
Start backend (server folder)
node index.js

Start frontend (client folder)
npm run dev

</details>
🔐 Authentication & Authorization
<details> <summary><strong>User Roles</strong></summary>
Role	Permissions
Admin	Full system access
OrgManager	Organisation-level management
DataCapturer	Data entry and modification
Viewer	Read-only access
</details> <details> <summary><strong>Protected Routes</strong></summary>

/pips/pips — PIP management (authenticated)

/audit — audit trail access

/DataCapturer/datacapturer — Admin only

/administrator/* — role-restricted

</details>
🌐 API Endpoints
<details> <summary><strong>Authentication</strong></summary>
Method	Endpoint	Description
POST	/api/auth/login/init	Start login process
POST	/api/auth/login/verify	Verify MFA code
POST	/api/auth/logout	Logout user
</details> <details> <summary><strong>PIP Data</strong></summary>

GET /api/pipsdata

POST /api/pipsdata

PUT /api/pipsdata/:id

DELETE /api/pipsdata/:id

</details> <details> <summary><strong>Administrative</strong></summary>

/api/users

/api/organisations

/api/packages

/api/audittrails

</details> <details> <summary><strong>System</strong></summary>

/api/health — health check

/api/endpoints — list all endpoints

</details>
🔧 Configuration
<details> <summary><strong>Server .env Example</strong></summary>
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

</details>
📊 Database Schema
<details> <summary><strong>Key Tables</strong></summary>

users

organisations

pips

audit_trails

permissions

packages

</details>
🛡 Security Features
<details> <summary><strong>Security Layers</strong></summary>

JWT authentication

Password hashing (bcrypt)

CORS enforcement

Input validation & sanitization

SQL injection prevention

XSS & CSRF protection

</details>
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
