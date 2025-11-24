PIP Intel Namibia
A comprehensive web application for managing Public Investment Projects (PIPs) in Namibia, providing tools for data management, user administration, and audit trail tracking.

🚀 Features
Core Functionality
PIP Management: Comprehensive management of Public Investment Projects

Data Capturing: Specialized interface for data entry and management

Audit Trail: Complete tracking of system activities and changes

User Management: Role-based user administration

Organisation Management: Manage organizational structures and relationships

Security & Authentication
JWT-based Authentication: Secure token-based authentication system

Multi-Factor Authentication (MFA): Optional 2FA for enhanced security

Role-Based Access Control: Granular permissions system

Session Management: Secure session handling with expiration controls

Administrative Features
User Management: Create, edit, and manage user accounts

Role Management: Define and assign user roles and permissions

Package Management: Manage system packages and features

Search History: Track and review PIP search activities

🛠 Technology Stack
Frontend
React 18 - Modern React with hooks

React Router DOM - Client-side routing

Axios - HTTP client for API calls

Context API - State management

CSS3 - Custom styling with responsive design

Backend
Node.js - Runtime environment

Express.js - Web application framework

PostgreSQL - Primary database
Prerequisites
Node.js (v14 or higher)

PostgreSQL database

npm or yarn package manager

JWT - JSON Web Tokens for authentication

CORS - Cross-origin resource sharing

dotenv - Environment variable management
🚦 Getting Started
Prerequisites
Node.js (v14 or higher)

PostgreSQL database

npm or yarn package manager

Installation
1.Install backend dependencies

bash
cd server
npm install

2.Install frontend dependencies

bash
cd ../client
npm install

3.Environment Configuration

Copy .env.example to .env in both server and client directories

Configure database connection strings

Set JWT secret keys

Configure other environment-specific variables

4.Database Setup

Create PostgreSQL database

Run database migrations (if applicable)

Seed initial data (if needed)

Running the Application
Development Mode:

bash
# Start backend server (from server directory)
node index.js

# Start frontend development server (from client directory)
npm run dev

🔐 Authentication & Authorization
User Roles
Admin: Full system access and administrative privileges

OrgManager: Organization management capabilities

DataCapturer: Data entry and management permissions

Viewer: Read-only access to PIP data

Protected Routes
/Pips/pips - PIP management (authenticated users)

/audit - Audit trail (authenticated users)

/DataCapturer/datacapturer - Data capturing (Admin only)

/administrator/* - Administrative functions (role-based access)

🌐 API Endpoints
Authentication
POST /api/auth/login/init - Initiate login process

POST /api/auth/login/verify - Verify MFA code

POST /api/auth/logout - User logout

Data Management
GET /api/pipsdata - Retrieve PIPs data

POST /api/pipsdata - Create new PIP entry

PUT /api/pipsdata/:id - Update PIP entry

DELETE /api/pipsdata/:id - Delete PIP entry

Administrative
GET /api/users - User management

GET /api/organisations - Organization management

GET /api/packages - Package management

GET /api/audittrails - Audit trail data

System
GET /api/health - Health check endpoint

GET /api/endpoints - List all registered API endpoints

🔧 Configuration
Environment Variables
Server (.env):

env
PORT=5000
NODE_ENV=development

# Local PostgreSQL for development
DATABASE_URL=postgresql://postgres:K0ndj@B0y@localhost:5432/pips
JWT_SECRET=myUltraSecretKey123!@#

# Individual DB variables for local development
DB_USER=postgres
DB_HOST=localhost
DB_NAME=pips
DB_PASSWORD=K0ndj@B0y
DB_PORT=5432

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=pipintel0@gmail.com
EMAIL_PASSWORD='xxna qwbx wnfn hkpt'
EMAIL_FROM=noreply@pipintel.com
EMAIL_DEBUG = true

Configure API base URL

Set authentication timeout values

Configure feature flags

📊 Database Schema
Key tables include:

users - User accounts and profiles

organisations - Organizational data

pips - Public Investment Projects data

audit_trails - System activity logs

permissions - Role-based access controls

packages - System feature packages

🛡 Security Features
JWT token-based authentication

Password hashing with bcrypt

CORS configuration

Input validation and sanitization

SQL injection prevention

XSS protection

CSRF protection measures

📱 Browser Support
Chrome (latest)

Firefox (latest)

Safari (latest)

Edge (latest)

🆘 Support
For technical support or questions:

Contact system administrators

Refer to internal documentation

Check audit logs for system issues

© 2024 All Rights Reserved | PIP Intel Namibia
