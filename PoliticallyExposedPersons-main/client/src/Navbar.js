import React, { useContext, useState, useRef, useEffect } from 'react';
import { UserContext } from './UserContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaUser, FaClipboardList, FaDatabase,
  FaKey, FaUserCircle, FaUsers, FaUserShield, FaBuilding, FaBoxOpen, FaHistory, FaChevronLeft, FaChevronRight, FaBars
} from 'react-icons/fa';
import './Navbar.css';

function Navbar() {
  const { user, setUser }           = useContext(UserContext);
  const [collapsed, setCollapsed]   = useState(false);
  const [showProfile, setShowProf]  = useState(false);
  const [adminOpen, setAdminOpen]   = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate                    = useNavigate();
  const location                    = useLocation();
  const popupRef                    = useRef();

  /* ─────────── logout ─────────── */
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  /* ─────────── routes ─────────── */
  const mainRoutes = [
    { path: '/Pips/pips',          label: 'PIPs',         icon: <FaUser /> },
    { path: '/audit',         label: 'Audit Trail',  icon: <FaHistory /> },
    // Only show Data Capturer for system admins
    ...(user && user.is_system_admin ? [{ path: '/DataCapturer/datacapturer',  label: 'Data Capturer',icon: <FaDatabase /> }] : []),
  ];

  /* ─────────── outside-click for profile popup ─────────── */
  useEffect(() => {
    const clickOut = e => { if (popupRef.current && !popupRef.current.contains(e.target)) setShowProf(false); };
    document.addEventListener('mousedown', clickOut);
    return () => document.removeEventListener('mousedown', clickOut);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileMenuOpen]);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  // Helper: check if user has Admin or OrgManager role
  const isAdmin = user.roles && Array.isArray(user.roles) && (user.roles.includes('Admin') || user.roles.includes('OrgManager'));
  // Helper: check if user has manage_users permission, is system admin, or is OrgManager
  const hasManageUsers = (user.permissions && Array.isArray(user.permissions) && user.permissions.includes('manage_users')) || user.is_system_admin || (user.roles && Array.isArray(user.roles) && user.roles.includes('OrgManager'));

  /* ─────────── render ─────────── */
  return (
    <>
      {/* Mobile toggle button */}
      <button 
        className="mobile-menu-toggle" 
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle menu"
        style={{ background: 'none', border: 'none', padding: 0 }}
      >
        <FaBars size={32} />
      </button>
      
      {/* Mobile overlay - add 'active' class when menu is open */}
      {mobileMenuOpen && (
        <div 
          className="mobile-overlay active" 
          onClick={() => setMobileMenuOpen(false)} 
        />
      )}
      
      {/* Add mobile-open class to sidebar when mobileMenuOpen is true */}
      <div className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* header */}
        <div className="sidebar-header">
          <div className="toggle-btn" onClick={() => setCollapsed(!collapsed)} style={{ cursor: 'pointer', padding: '8px' }}>
            {collapsed ? <FaChevronRight size={28} /> : <FaChevronLeft size={28} />}
          </div>
          {!collapsed && (
            <div className="page-title">
              {mainRoutes.find(r => r.path === location.pathname)?.label ||
               (location.pathname === '/pip-search-history' ? 'PIP Search History' : '') ||
               (location.pathname.startsWith('/administrator') ? 'Administrator' : '')}
            </div>
          )}
        </div>

        {/* main menu */}
        <div className="menu">
          {mainRoutes.map(({ path, label, icon }) => (
            <div
              key={path}
              className={`menu-item ${location.pathname === path ? 'active' : ''}`}
              onClick={() => navigate(path)}
              title={collapsed ? label : ''}
            >
              <span className="menu-icon">{icon}</span>
              {!collapsed && <span className="menu-label">{label}</span>}
            </div>
          ))}
          {/* Pip Search History link for all users */}
          <div
            className={`menu-item ${location.pathname === '/pip-search-history' ? 'active' : ''}`}
            onClick={() => navigate('/pip-search-history')}
            title={collapsed ? 'PIP Search History' : ''}
          >
            <span className="menu-icon"><FaClipboardList /></span>
            {!collapsed && <span className="menu-label">PIP Search History</span>}
          </div>

          {/* administrator dropdown - only for Admins */}
          {isAdmin && (
            <>
              <div
                className={`menu-item ${location.pathname.startsWith('/administrator') ? 'active' : ''}`}
                onClick={() => !collapsed && setAdminOpen(!adminOpen)}
                title="Administrator"
              >
                <span className="menu-icon"><FaKey /></span>
                {!collapsed && <span className="menu-label">Administrator</span>}
              </div>

              {/* sub-menu */}
              {adminOpen && !collapsed && (
                <div className="submenu">
                  {/* Manage Users only for those with permission */}
                  {hasManageUsers && (
                    <div
                      className={`submenu-item ${location.pathname === '/administrator/manageusers' ? 'active' : ''}`}
                      onClick={() => navigate('/administrator/manageusers')}
                    >
                      <FaUsers className="submenu-icon" /> Manage Users
                    </div>
                  )}
                  {/* Manage Roles only for system admins */}
                  {user && user.is_system_admin && (
                    <div
                      className={`submenu-item ${location.pathname === '/administrator/manageroles' ? 'active' : ''}`}
                      onClick={() => navigate('/administrator/manageroles')}
                    >
                      <FaUserShield className="submenu-icon" /> Manage Roles
                    </div>
                  )}
                  {/* Manage Organizations - for system admins and OrgManagers */}
                  {user && (user.is_system_admin || (user.roles && user.roles.includes('OrgManager'))) && (
                    <div
                      className={`submenu-item ${location.pathname === '/administrator/manageorganisations' ? 'active' : ''}`}
                      onClick={() => navigate('/administrator/manageorganisations')}
                    >
                      <FaBuilding className="submenu-icon" /> Manage Organisations
                    </div>
                  )}
                  {/* Manage Packages - only for those with permission */}
                  {user && (user.is_system_admin || (user.permissions && Array.isArray(user.permissions) && user.permissions.includes('manage_packages'))) && (
                    <div
                      className={`submenu-item ${location.pathname === '/administrator/managepackages' ? 'active' : ''}`}
                      onClick={() => navigate('/administrator/managepackages')}
                    >
                      <FaBoxOpen className="submenu-icon" /> Manage Packages
                    </div>
                  )}
                  {/* Manage Permissions - only for those with permission */}
                  {user && (user.is_system_admin || (user.permissions && Array.isArray(user.permissions) && user.permissions.includes('manage_permissions'))) && (
                    <div
                      className={`submenu-item ${location.pathname === '/administrator/manage-permissions' ? 'active' : ''}`}
                      onClick={() => navigate('/administrator/manage-permissions')}
                    >
                       <FaKey className="submenu-icon" /> Manage Permissions
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* collapsed profile icon */}
        {collapsed && (
          <div
            className="collapsed-profile"
            onClick={() => setShowProf(!showProfile)}
            title={user.email}
          >
            <FaUserCircle className="profile-icon" />
          </div>
        )}

        {/* profile pop-up */}
        {collapsed && showProfile && (
          <div className="profile-popup" ref={popupRef}>
            <div className="user-email">{user.email}</div>
            <button onClick={handleLogout}>Logout</button>
          </div>
        )}

        {/* footer */}
        {!collapsed && (
          <div className="sidebar-footer">
            <div className="user-email">{user.email}</div>
            <button onClick={handleLogout}>Logout</button>
          </div>
        )}
      </div>
    </>
  );
}

export default Navbar;
