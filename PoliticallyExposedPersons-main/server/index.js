const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
require('dotenv').config();

// Determine environment
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;

// Log environment
console.log('=== SERVER STARTED ===');
console.log(`Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`Database: ${isProduction ? 'Railway PostgreSQL' : 'Local PostgreSQL'}`);
console.log(`Port: ${process.env.PORT || 5000}`);

// Import database to test connection
require('./config/database');

// ✅ Add this to serve error CSVs from public/
app.use(express.static(path.join(__dirname, 'public')));

// Serve files from the temp directory at /temp (e.g. /temp/import_errors_xxx.csv)
// Placed before authentication so import error CSVs are publicly accessible for download
app.use('/temp', express.static(path.join(__dirname, 'temp')));
console.log(`Serving temp files at /temp from ${path.join(__dirname, 'temp')}`);

app.use(cors());
app.use(express.json());

// Health check endpoint (no auth required)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// THEN your authentication middleware
const authenticateToken = require('./middleware/authenticateToken');
app.use(authenticateToken);

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const pipsRoutes = require('./routes/pipsdata');
app.use('/api/pipsdata', pipsRoutes);

const auditTrailRoutes = require('./routes/audittrails');
app.use('/api/audittrails', auditTrailRoutes);

const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

const organisationRoutes = require('./routes/organisations');
app.use('/api/organisations', organisationRoutes);

const packagesRoutes = require('./routes/packages');
app.use('/api/packages', packagesRoutes);

const permissionsRoutes = require('./routes/permissions');
app.use('/api/permissions', permissionsRoutes);

// ADD THIS: Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}


// Endpoint to list all registered routes
app.get('/api/endpoints', (req, res) => {
  const routes = [];
  app._router.stack.forEach(middleware => {
    if (middleware.route) { // routes registered directly on the app
      const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase());
      routes.push({ path: middleware.route.path, methods });
    } else if (middleware.name === 'router') { // router middleware
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          const methods = Object.keys(handler.route.methods).map(m => m.toUpperCase());
          routes.push({ path: handler.route.path, methods });
        }
      });
    }
  });
  res.json({ endpoints: routes });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
