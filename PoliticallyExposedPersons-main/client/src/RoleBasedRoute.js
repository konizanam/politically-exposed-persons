// src/RoleBasedRoute.js
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { UserContext } from './UserContext';

/**
 * Component to restrict access to routes based on user roles and system admin status
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {Array} props.allowedRoles - List of roles that can access this route
 * @param {boolean} props.systemAdminOnly - If true, only system admins can access
 * @param {boolean} props.organizationAdminsOnly - If true, only organization admins (OrgManager) can access
 * @param {string} props.redirectTo - Where to redirect if not authorized (defaults to '/pips/pips')
 */
export default function RoleBasedRoute({ 
  children, 
  allowedRoles = [],
  systemAdminOnly = false,
  organizationAdminsOnly = false,
  redirectTo = '/Pips/pips'
}) {
  const { user } = useContext(UserContext);
  const token = localStorage.getItem('token');

  // Redirect to login if not authenticated
  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  // System admin check
  if (systemAdminOnly && !(user && user.is_system_admin)) {
    return <Navigate to={redirectTo} replace />;
  }

  // Organization admin check
  if (organizationAdminsOnly && !(user && user.roles && user.roles.includes('OrgManager'))) {
    return <Navigate to={redirectTo} replace />;
  }

  // Role-based check
  if (allowedRoles.length > 0) {
    const hasAllowedRole = user && user.roles && allowedRoles.some(role => user.roles.includes(role));
    if (!hasAllowedRole && !(user && user.is_system_admin)) {
      return <Navigate to={redirectTo} replace />;
    }
  }

  return children;
}
