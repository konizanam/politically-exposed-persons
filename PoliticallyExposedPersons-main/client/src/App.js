import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { UserProvider } from './UserContext';

import Login         from './Login';
import Navbar        from './Navbar';
import PIPs          from './Pips/Pips';
import AuditTrail    from './AuditTrail';
import DataCapturer  from './DataCapturer/DataCapturer';

import ManageUsers   from './Administrator/ManageUsers';
import ManageRoles   from './Administrator/ManageRoles';
import ManageOrganisations   from './Administrator/ManageOrganisations.js';
import ManagePackages from './Administrator/ManagePackages';
import PipSearchHistory from './Administrator/PipSearchHistory';
import ManagePermissions from './Administrator/ManagePermissions';

import PrivateRoute  from './PrivateRoute';
import RoleBasedRoute from './RoleBasedRoute';
import DisclaimerModal from './components/DisclaimerModal';

// Create a layout component that conditionally shows the Navbar
function Layout({ children }) {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login' || location.pathname === '/';
  
  // Don't render anything extra for login page
  if (isLoginPage) {
    return children;
  }
  
  const currentYear = new Date().getFullYear();
  return (
  <div className="app-layout" style={{ background: '#fff', minHeight: '100vh' }}>
      <Navbar />
      <div className="content-wrapper" style={{ paddingBottom: '80px' }}>
        {children}
      </div>
      <footer style={{
        width: '100%',
        background: '#2c3e50',
        color: '#fff',
        textAlign: 'center',
        padding: '18px 0 8px 0',
        fontSize: '1rem',
        position: 'fixed',
        left: 0,
        bottom: 0,
        zIndex: 100,
        boxShadow: '0 -2px 8px rgba(0,0,0,0.05)'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>
          &copy; {currentYear} All Rights Reserved | PIP Intel Namibia
        </div>
        <div style={{ position: 'absolute', right: 30, top: 5, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            display: 'inline-block',
            width: 38,
            height: 38,
            borderRadius: '50%',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            border: '2px solid #fff',
            background: '#fff'
          }}>
            <img src={require('./assets/Flag_of_Namibia.svg.png')} alt="Namibia Flag" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          </span>
          <span style={{
            display: 'inline-block',
            width: 38,
            height: 38,
            borderRadius: '50%',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            border: '2px solid #fff',
            background: '#fff'
          }}>
            <img src={require('./assets/1.jpg')} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          </span>
        </div>
      </footer>
    </div>
  );
}

function AppContent({ showDisclaimer, handleAgree }) {
  return (
    <Layout>
      {showDisclaimer && <DisclaimerModal onAgree={handleAgree} />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        {/* ✅ Protected Routes */}
        <Route
          path="/Pips/pips"
          element={
            <PrivateRoute>
              <PIPs />
            </PrivateRoute>
          }
        />
        <Route
          path="/audit"
          element={
            <PrivateRoute>
              <AuditTrail />
            </PrivateRoute>
          }
        />
        <Route
          path="/DataCapturer/datacapturer"
          element={
           <RoleBasedRoute allowedRoles={['Admin']}>
              <DataCapturer />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/administrator/manageusers"
          element={
            <RoleBasedRoute allowedRoles={['Admin', 'OrgManager']}>
              <ManageUsers />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/administrator/manageroles"
          element={
           <RoleBasedRoute allowedRoles={['Admin']}>
              <ManageRoles />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/administrator/ManageOrganisations"
          element={
            <RoleBasedRoute allowedRoles={['Admin', 'OrgManager']}>
              <ManageOrganisations />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/administrator/managepackages"
          element={
            <RoleBasedRoute allowedRoles={['Admin']}>
              <ManagePackages />
            </RoleBasedRoute>
          }
        />
        <Route
          path="/administrator/manage-permissions"
          element={<ManagePermissions />}
        />
        <Route
          path="/pip-search-history"
          element={
            <PrivateRoute>
              <PipSearchHistory />
            </PrivateRoute>
          }
        />
      </Routes>
    </Layout>
  );
}

function App() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // Listen for login event from Login component
  useEffect(() => {
    const handleLogin = () => {
      setShowDisclaimer(true);
    };
    window.addEventListener('pip-login-success', handleLogin);
    return () => {
      window.removeEventListener('pip-login-success', handleLogin);
    };
  }, []);

  const handleAgree = () => {
    setShowDisclaimer(false);
  };

  return (
    <UserProvider>
      <Router>
        <AppContent showDisclaimer={showDisclaimer} handleAgree={handleAgree} />
      </Router>
    </UserProvider>
  );
}

export default App;
