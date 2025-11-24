# PIP Intel Namibia

A comprehensive web application for managing Public Investment Projects (PIPs) in Namibia, providing tools for data management, user administration, and audit trail tracking.

## Table of Contents
- [Overview](#overview)
- [Architecture At A Glance](#architecture-at-a-glance)
- [Tech Stack](#tech-stack)
- [End-to-End Capabilities](#end-to-end-capabilities)
- [Repository Layout](#repository-layout)
- [Getting Started](#getting-started)
- [Running The App Locally](#running-the-app-locally)
- [Database Toolkit](#database-toolkit)
- [Configuration Reference](#configuration-reference)
- [NPM Scripts](#npm-scripts)
- [Deployment Notes](#deployment-notes)
- [Testing & Quality](#testing--quality)
- [Maintenance Utilities](#maintenance-utilities)
- [Troubleshooting](#troubleshooting)
- [Additional Docs & Next Steps](#additional-docs--next-steps)

## Overview

**PIP Intel Namibia** is a full-stack public investment project management platform that pairs a React 18 single-page application with an Express/PostgreSQL API. It streamlines project tracking, data management, user administration, audit logging, and role-based access control with an emphasis on governance and configurability.

## Architecture At A Glance

| Layer | Responsibilities | Key Paths |
| --- | --- | --- |
| Client (React 18 + CRA) | Auth flow (password + 2FA), dashboards, PIP management, data capturing, audit trails, user administration | `client/src` (pages, components, context, utils) |
| Server (Express + Node) | REST API for users, roles, permissions, organisations, PIPs data, audit trails, packages, authentication | `server/index.js`, `server/routes`, `server/middleware` |
| Database (PostgreSQL) | User accounts, organisations, PIPs data, audit trails, permissions, packages | `database/` schemas and migrations |
| DevOps | Deployment configurations, environment management, static file serving | `Procfile`, environment configurations |

## Tech Stack

- **Frontend:** React 18, React Router v6, Context API, Axios, CSS3 with responsive design
- **Backend:** Node.js, Express, PostgreSQL, JWT authentication, CORS, dotenv
- **Security & Compliance:** JWT sessions, Multi-Factor Authentication (MFA), role-based permissions, audit trail persistence, CORS configuration
- **DevOps:** Environment-based configuration, static file serving, production build optimization

## End-to-End Capabilities

- **PIP Management:** Comprehensive management of Public Investment Projects with CRUD operations, search, and filtering capabilities
- **User Administration:** Role-based user management with Admin, OrgManager, DataCapturer, and Viewer roles
- **Data Capturing:** Specialized interface for data entry and management with validation and error handling
- **Audit Trail:** Complete tracking of system activities, user actions, and data changes
- **Organisation Management:** Manage organizational structures and relationships
- **Security Model:** Email + password login with optional email-based 6-digit 2FA before issuing JWTs

## Repository Layout

```
PIP-Intel-Namibia/
├── client/                  # React SPA
│   ├── public/              # Static assets (logos, manifest, favicon)
│   └── src/
│       ├── Administrator/   # Admin management components
│       ├── AuditTrail/      # Audit trail components
│       ├── DataCapturer/    # Data entry components
│       ├── Pips/           # PIP management components
│       ├── components/      # Reusable UI components
│       ├── context/         # UserContext with authentication state
│       └── assets/          # Images, logos, and static files
├── server/                  # Express API
│   ├── routes/              # REST endpoints (auth, pipsdata, users, organisations, etc.)
│   ├── middleware/          # Authentication, authorization, error handling
│   ├── config/              # Database configuration
│   └── temp/, public/       # File storage and static serving
├── database/                # Database schemas and configurations
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- npm package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url> PIP-Intel-Namibia
   cd PIP-Intel-Namibia
   ```

2. **Install backend dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Environment Configuration**
   Create `server/.env` file with the following variables:
   ```env
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
    ```

5. **Database Setup**
   - Create PostgreSQL database named `pip_intel`
   - Run database schema setup scripts
   - Seed initial data if needed

## Running The App Locally

1. **Start the backend API**
   ```bash
   cd server
   node index.js
   ```
   - API runs on `http://localhost:5000`
   - Health check available at `/api/health`

2. **Start the frontend application**
   ```bash
   cd client
   npm run dev
   ```
   - React app runs on `http://localhost:3000`
   - Proxies API calls to backend

3. **Access the application**
   - Open `http://localhost:3000` in your browser
   - Use provided credentials to login

## Database Toolkit

| Asset | Purpose |
| --- | --- |
| Database schemas | Core tables for users, organisations, PIPs data, audit trails, permissions |
| Migration scripts | Database structure updates and version control |
| Seed data | Initial roles, permissions, and administrative users |

## Configuration Reference

### Server Environment Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | Runtime environment (development/production) |
| `PORT` | No | `5000` | Express server port |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | - | Secret for JWT token signing |
| `RAILWAY_ENVIRONMENT` | Auto | - | Railway deployment detection |

### Client Environment Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `REACT_APP_API_BASE_URL` | No | `''` | API base URL override |

## NPM Scripts

### Server (`server/package.json`)

| Command | Description |
| --- | --- |
| `npm start` | Start production server |
| `npm run dev` | Start development server with hot reload |

### Client (`client/package.json`)

| Command | Description |
| --- | --- |
| `npm start` | Start development server |
| `npm run build` | Create production build |

## Deployment Notes

- **Production Build:** Client builds are served from `client/build` directory in production
- **Static File Serving:** Express serves static files from `public` and `temp` directories
- **Environment Detection:** Automatically detects Railway environment for production configuration
- **CORS Configuration:** Configured for cross-origin requests with environment-specific settings

## Testing & Quality

- **Frontend:** React component testing available via CRA test utilities
- **Backend:** API endpoint testing recommended with tools like Jest and Supertest
- **Health Checks:** `/api/health` endpoint for system status monitoring

## Authentication & Authorization

### User Roles
- **Admin:** Full system access and administrative privileges
- **OrgManager:** Organization management capabilities  
- **DataCapturer:** Data entry and management permissions
- **Viewer:** Read-only access to PIP data

### Protected Routes
- `/Pips/pips` - PIP management (authenticated users)
- `/audit` - Audit trail (authenticated users)
- `/DataCapturer/datacapturer` - Data capturing (Admin only)
- `/administrator/*` - Administrative functions (role-based access)

## API Endpoints

### Authentication
- `POST /api/auth/login/init` - Initiate login process
- `POST /api/auth/login/verify` - Verify MFA code

### Data Management
- `GET /api/pipsdata` - Retrieve PIPs data
- `POST /api/pipsdata` - Create new PIP entry
- `PUT /api/pipsdata/:id` - Update PIP entry

### Administrative
- `GET /api/users` - User management
- `GET /api/organisations` - Organization management
- `GET /api/packages` - Package management
- `GET /api/audittrails` - Audit trail data

### System
- `GET /api/health` - Health check endpoint
- `GET /api/endpoints` - List all registered API endpoints

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Database connection errors | Verify `DATABASE_URL` in environment variables and ensure PostgreSQL is running |
| Authentication failures | Check JWT secret configuration and token expiration settings |
| CORS errors | Verify frontend URL is included in CORS configuration |
| Static file serving issues | Check file permissions and directory paths for `public` and `temp` folders |
| Build failures | Ensure Node.js version compatibility and all dependencies are installed |

## Security Features

- JWT token-based authentication with expiration
- Multi-Factor Authentication (MFA) support
- Role-based access control (RBAC)
- Input validation and sanitization
- CORS configuration for cross-origin protection
- Secure password handling

## Browser Support

- Chrome (latest)
- Firefox (latest) 
- Safari (latest)
- Edge (latest)

## Support & Maintenance

For technical support:
- Contact system administrators
- Check server logs for error details
- Verify database connectivity
- Review audit trails for system activity

---

**© 2024 All Rights Reserved | PIP Intel Namibia**

