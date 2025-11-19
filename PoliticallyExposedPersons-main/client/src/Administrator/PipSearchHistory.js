import React, { useEffect, useState, useContext } from 'react';
import axios from '../axiosInstance';
import { CSVLink } from 'react-csv';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UserContext } from '../UserContext';
import '../Pages.css';
import './PipSearchHistory.css';

export default function PipSearchHistory() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState('');
  // Helper to pretty-print JSON or fallback to string
  const prettyResult = (result) => {
    try {
      return JSON.stringify(JSON.parse(result), null, 2);
    } catch {
      return result;
    }
  };
  const { user } = useContext(UserContext);
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [allOrgs, setAllOrgs] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [orgIdForApi, setOrgIdForApi] = useState('');

  // Initial setup - runs once when component mounts
  useEffect(() => {
    if (user) {
      // Fetch organization data for all users
      fetchOrgs();
      
      // For non-admin users without org ID, fetch complete user details
      if (!user.is_system_admin && !user.organisation_id) {
        fetchUserDetails();
      }
      
      // If user already has organization ID, set it
      if (user.organisation_id) {
        setSelectedOrg(user.organisation_id);
        setOrgIdForApi(user.organisation_id);
      }
      
      // Ensure we fetch logs even if there's no organization ID yet
      // This will allow the backend to determine what the user can see
      if (!user.organisation_id && !user.is_system_admin) {
        fetchLogs('');
      }
    }
    // eslint-disable-next-line
  }, [user]);
  
  // Function to fetch complete user details including organization ID
  const fetchUserDetails = async () => {
    try {
      const res = await axios.get('/users/me');
      
      if (res.data && res.data.organisation_id) {
        setSelectedOrg(res.data.organisation_id);
        setOrgIdForApi(res.data.organisation_id);
        
        // Update local storage with complete user data
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = { ...currentUser, organisation_id: res.data.organisation_id };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (e) {
      console.error('Error fetching user details:', e);
    }
  };
  
  // When organizations are loaded or user selects an organization
  useEffect(() => {
    // If we have orgs and user is admin without a selection, select the first org
    if (user?.is_system_admin && allOrgs.length > 0 && !selectedOrg) {
      setSelectedOrg(allOrgs[0]?.id || '');
      setOrgIdForApi(allOrgs[0]?.id || '');
    } else if (!user?.is_system_admin && allOrgs.length > 0 && user?.organisation_id) {
      // For regular users, find their organization in the list and select it
      const userOrg = allOrgs.find(org => org.id === user.organisation_id);
      if (userOrg) {
        setSelectedOrg(userOrg.id);
        setOrgIdForApi(userOrg.id);
      }
    }
    // eslint-disable-next-line
  }, [allOrgs]);
  
  // When selected org changes, update the API org ID
  useEffect(() => {
    if (selectedOrg) {
      setOrgIdForApi(selectedOrg);
    }
  }, [selectedOrg]);
  
  // Data fetching based on organization ID for API
  useEffect(() => {
    if (orgIdForApi) {
      fetchLogs(orgIdForApi);
      fetchDashboard(orgIdForApi);
    } else {
      // Admin with no org selected - just fetch logs for all orgs
      if (user?.is_system_admin) {
        fetchLogs('');
      }
    }
    // eslint-disable-next-line
  }, [orgIdForApi]);
  // Update the useEffect that fetches dashboard data
  useEffect(() => {
    if (user) {
      const userOrgId = user.organisation_id;
      if (userOrgId) {
        setOrgIdForApi(userOrgId);
        if (!user.is_system_admin) {
          fetchDashboard(userOrgId);
        }
      }
    }
  }, [user]);

  // Update another useEffect that depends on orgIdForApi
  useEffect(() => {
    if (!user) return;
    if (!orgIdForApi) {
      setDashboard(null);
      return;
    }
    fetchDashboard(orgIdForApi);
  }, [orgIdForApi, user]);

  // Update the fetchDashboard function to ensure proper data mapping
  const fetchDashboard = (orgId) => {
    if (!orgId) return;
    
    axios.get(`/audittrails/pipsearchdashboard?organisation_id=${orgId}`)
      .then(response => {
        const data = response.data;
        
        // Map the response data to match the expected dashboard structure
        setDashboard({
          organisation: data.organisation,
          package: data.package,
          user_limit: data.user_limit,
          user_count: data.user_count,
          screening_limit: data.screening_limit,
          screenings_done: data.screenings_done,
          screenings_left: data.screenings_left,
          batch_screening_limit: data.batch_screening_limit,
          batch_screenings_done: data.batch_screenings_done || 0,
          batch_screenings_left: data.batch_screenings_left || (data.batch_screening_limit === null ? 'Unlimited' : 0)
        });
      })
      .catch(err => {
        console.error('Failed to fetch PIP search dashboard:', err);
        setDashboard(null);
      });
  };

  const fetchOrgs = async () => {
    try {
      const res = await axios.get('/organisations/organisationsfetch');
      const orgs = res.data || [];
      setAllOrgs(orgs);
      
      // For admin users: if we have orgs but no selection yet, select the first one by default
      if (user?.is_system_admin && orgs.length > 0 && !selectedOrg) {
        setSelectedOrg(orgs[0]?.id || '');
        setOrgIdForApi(orgs[0]?.id || '');
      }
      
      // For regular users: find and select their organization
      if (!user?.is_system_admin && user?.organisation_id && orgs.length > 0) {
        const userOrg = orgs.find(org => org.id === user.organisation_id);
        if (userOrg) {
          setSelectedOrg(userOrg.id);
          setOrgIdForApi(userOrg.id);
        }
      }
    } catch (e) {
  console.error('Error fetching organisations:', e);
      setAllOrgs([]);
    }
  };

  const fetchLogs = async (orgId = '') => {
    setLoading(true);
    setError('');
    
    try {
      let url = '/audittrails/pipsearchhistory';
      if (orgId) url += `?organisation_id=${orgId}`;
      
      const res = await axios.get(url);
      
      setLogs(res.data || []);
      // Clear any previous errors if successful
      setError('');
    } catch (e) {
      console.error('Error fetching logs:', e);
      setLogs([]);
      
      if (e.response?.status === 401) {
        setError('You need to log in to view search history');
      } else if (e.response?.status === 403) {
        setError(e.response?.data?.error || 'You do not have permission to view search history');
      } else {
        setError(e.response?.data?.error || e.message || 'Failed to fetch PIP search history');
      }
    }
    
    setLoading(false);
  };

  // Export functions
  // Filtering and sorting (no sort for now, but can add if needed)
  const filtered = searchTerm
    ? logs.filter(l =>
        Object.values(l).join(' ').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : logs;
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentLogs = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportData = filtered.map(log => ({
    Date: new Date(log.searched_at).toLocaleString(),
    User: log.user_email,
    Query: log.search_query,
    Result: log.search_result
  }));

  const exportExcel = () => {
    // Create metadata sheet with user details
    const metadataWs = XLSX.utils.json_to_sheet([
      { 'Key': 'Export Date', 'Value': new Date().toLocaleString() },
      { 'Key': 'Exported By', 'Value': user ? `${user.first_name || user.name || ''} ${user.last_name || user.surname || ''}`.trim() || 'Unknown User' : 'Unknown User' },
      { 'Key': 'User ID', 'Value': user?.id || 'Unknown' },
  { 'Key': 'Organisation', 'Value': (user?.organisation_name || user?.organization_name || 'N/A') },
      { 'Key': 'Email', 'Value': user?.email || 'N/A' },
  { 'Key': 'Selected Organisation', 'Value': selectedOrg || 'All' },
      { 'Key': 'Search Term', 'Value': searchTerm || 'All' },
      { 'Key': 'Results Count', 'Value': exportData.length }
    ]);
    
    // Create data sheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Create workbook with both sheets
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, metadataWs, 'Export Info');
    XLSX.utils.book_append_sheet(wb, ws, 'PIP Search History');
    
    // Generate filename with date
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    XLSX.writeFile(wb, `pip_search_history_${dateStr}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.setTextColor(22, 160, 133);
    doc.text('PIP Search History Report', 14, 15);
    
    // Add export metadata
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const now = new Date();
    const dateStr = now.toLocaleString();
    doc.text(`Export Date: ${dateStr}`, 14, 25);
    const userName = user ? `${user.first_name || user.name || ''} ${user.last_name || user.surname || ''}`.trim() || 'Unknown User' : 'Unknown User';
    const userId = user?.id || 'Unknown';
    doc.text(`Exported By: ${userName} (ID: ${userId})`, 14, 30);
  doc.text(`Organisation: ${user?.organisation_name || user?.organization_name || 'N/A'}`, 14, 35);
  doc.text(`Selected Organisation: ${selectedOrg || 'All'}`, 14, 40);
    doc.text(`Search Term: ${searchTerm || 'All'}`, 14, 45);
    doc.text(`Total Records: ${exportData.length}`, 14, 50);
    
    // Add search history table
    autoTable(doc, {
      head: [['Date', 'User', 'Query', 'Result']],
      body: exportData.map(row => Object.values(row)),
      styles: { fontSize: 8, cellWidth: 'wrap' },
      headStyles: { fillColor: [22, 160, 133] },
      margin: { top: 55 }, // Increased top margin to accommodate metadata
    });
    
    // Add footer with confidentiality notice
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      const footerName = user ? `${user.first_name || user.name || ''} ${user.last_name || user.surname || ''}`.trim() || 'Unknown User' : 'Unknown User';
    doc.text(`Confidential - Generated by ${footerName} on ${dateStr}`, 14, doc.internal.pageSize.height - 10);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
    }
    
    // Generate filename with date
    const fileDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    doc.save(`pip_search_history_${fileDate}.pdf`);
  };

  // Update document title when dashboard data is loaded
  useEffect(() => {
    document.title = dashboard ? 'PIP Search History | Dashboard' : 'PIP Search History';
  }, [dashboard]);

  return (
    <div className="page-container">
      {/* Dashboard section - always show this container */}
      <div style={{
        borderRadius: '12px',
        padding: '20px',
        margin: '0 0 25px 0',
        backgroundColor: '#f8f9fa',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        border: '1px solid #e9ecef'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px'
        }}>
          <h2 style={{
            margin: 0,
            color: '#2c3e50',
            fontSize: '1.5rem',
            fontWeight: '600'
          }}>Package Statistics</h2>
          {orgIdForApi && allOrgs.length > 0 && (
            <span style={{
              color: '#6c757d',
              fontSize: '15px',
              backgroundColor: '#e9ecef',
              padding: '3px 10px',
              borderRadius: '15px'
            }}>
              {allOrgs.find(org => org.id === parseInt(orgIdForApi))?.name || 'Organisation'}
            </span>
          )}
        </div>
        
        {/* Show loading or error message when appropriate */}
        {!dashboard && (
          <div style={{ 
            textAlign: 'center', 
            padding: '30px', 
            background: 'white', 
            borderRadius: '8px',
            border: '1px dashed #dee2e6'
          }}>
            {!user ? (
              <div>
                <div style={{ fontSize: '18px', marginBottom: '10px' }}>Loading user information...</div>
                <div className="loader"></div>
              </div>
            ) : !user.is_system_admin && !user.organisation_id ? (
              <div>
                <div style={{ fontWeight: 'bold', color: '#dc3545', fontSize: '18px' }}>Missing Organisation Association</div>
                <div style={{ marginTop: '15px', color: '#6c757d' }}>Your user account is not associated with any organisation.</div>
                <div style={{ marginTop: '10px', color: '#6c757d' }}>Please contact your administrator.</div>
              </div>
            ) : !orgIdForApi ? (
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '18px' }}>No Organisation Selected</div>
                {user?.is_system_admin && allOrgs.length > 0 && (
                  <div style={{ marginTop: '15px', color: '#6c757d' }}>Please select an organisation from the dropdown above</div>
                )}
                {user?.is_system_admin && allOrgs.length === 0 && (
                  <div style={{ marginTop: '15px', color: '#6c757d' }}>Loading organisations...</div>
                )}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '18px', marginBottom: '10px' }}>Loading Dashboard Data</div>
                <div className="loader"></div>
                <div style={{ fontSize: '13px', color: '#6c757d', marginTop: '15px' }}>
                  If this persists, try selecting a different organisation
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Dashboard cards showing package information and search statistics */}
        {dashboard && (
          <>
            {/* First row - Package and Single Search Info */}
            <div className="dashboard-row">
              <div className="dashboard-card" style={{ flex: '1' }}>
                <div className="dashboard-label">Package Name</div>
                <div className="dashboard-value" style={{ color: '#1abc9c' }}>{dashboard.package}</div>
              </div>
              
              <div className="dashboard-card" style={{ flex: '1' }}>
                <div className="dashboard-label">Single Screening Limit</div>
                <div className="dashboard-value" style={{ color: '#3498db' }}>
                  {dashboard.screening_limit === null ? 'Unlimited' : dashboard.screening_limit}
                </div>
              </div>
              
              <div className="dashboard-card" style={{ flex: '1' }}>
                <div className="dashboard-label">Single Screenings Done</div>
                <div className="dashboard-value" style={{ color: '#f39c12' }}>{dashboard.screenings_done}</div>
              </div>
              
              <div className="dashboard-card" style={{ 
                flex: '1',
                backgroundColor: dashboard.screenings_left === 0 && dashboard.screening_limit !== null ? '#fef2f2' : '#fff',
                border: dashboard.screenings_left === 0 && dashboard.screening_limit !== null ? '1px solid #e74c3c' : '1px solid #e9ecef'
              }}>
                <div className="dashboard-label">Single Screenings Left</div>
                <div className="dashboard-value" style={{ 
                  color: dashboard.screenings_left === 0 && dashboard.screening_limit !== null ? '#e74c3c' : '#27ae60' 
                }}>
                  {dashboard.screenings_left === 'Unlimited' ? 'Unlimited' : dashboard.screenings_left}
                </div>
              </div>
            </div>

            {/* Second row - Bulk Search Info */}
            <div className="dashboard-row">
              <div className="dashboard-card" style={{ flex: '1' }}>
                <div className="dashboard-label">Bulk Screening Limit</div>
                <div className="dashboard-value" style={{ color: '#9c27b0' }}>
                  {dashboard.batch_screening_limit === null ? 'Unlimited' : dashboard.batch_screening_limit}
                </div>
              </div>
              
              <div className="dashboard-card" style={{ flex: '1' }}>
                <div className="dashboard-label">Bulk Screenings Done</div>
                <div className="dashboard-value" style={{ color: '#ff5722' }}>{dashboard.batch_screenings_done || 0}</div>
              </div>
              
              <div className="dashboard-card" style={{ 
                flex: '1',
                backgroundColor: dashboard.batch_screenings_left === 0 && dashboard.batch_screening_limit !== null ? '#fef2f2' : 
                                dashboard.batch_screenings_left <= 5 && dashboard.batch_screening_limit !== null ? '#fff3cd' : '#fff',
                border: dashboard.batch_screenings_left === 0 && dashboard.batch_screening_limit !== null ? '1px solid #e74c3c' : 
                        dashboard.batch_screenings_left <= 5 && dashboard.batch_screening_limit !== null ? '1px solid #ffeaa7' : '1px solid #e9ecef'
              }}>
                <div className="dashboard-label">Bulk Screenings Left</div>
                <div className="dashboard-value" style={{ 
                  color: dashboard.batch_screenings_left === 0 && dashboard.batch_screening_limit !== null ? '#e74c3c' : 
                         dashboard.batch_screenings_left <= 5 && dashboard.batch_screening_limit !== null ? '#f39c12' : '#27ae60' 
                }}>
                  {dashboard.batch_screenings_left === 'Unlimited' ? 'Unlimited' : dashboard.batch_screenings_left}
                </div>
              </div>
              
              <div className="dashboard-card" style={{ flex: '1' }}>
                <div className="dashboard-label">Total Searches</div>
                <div className="dashboard-value" style={{ color: '#795548' }}>
                  {(dashboard.screenings_done || 0) + (dashboard.batch_screenings_done || 0)}
                </div>
              </div>
            </div>
            
            {/* Warning messages */}
            {dashboard.screenings_left === 0 && dashboard.screening_limit !== null && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #e74c3c',
                borderRadius: '8px',
                padding: '10px 15px',
                marginTop: '10px',
                color: '#e74c3c',
                fontSize: '0.9rem'
              }}>
                <strong>Warning:</strong> This organisation has reached the maximum number of single searches allowed by their package. 
                Users will not be able to perform additional single searches until the package is upgraded.
              </div>
            )}
            
            {dashboard.batch_screenings_left === 0 && dashboard.batch_screening_limit !== null && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #e74c3c',
                borderRadius: '8px',
                padding: '10px 15px',
                marginTop: '10px',
                color: '#e74c3c',
                fontSize: '0.9rem'
              }}>
                <strong>Warning:</strong> This organisation has reached the maximum number of bulk searches allowed by their package. 
                Users will not be able to perform additional bulk searches until the package is upgraded.
              </div>
            )}
            
            {dashboard.batch_screenings_left > 0 && dashboard.batch_screenings_left <= 5 && dashboard.batch_screening_limit !== null && (
              <div style={{
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '8px',
                padding: '10px 15px',
                marginTop: '10px',
                color: '#856404',
                fontSize: '0.9rem'
              }}>
                <strong>Notice:</strong> This organisation has only {dashboard.batch_screenings_left} bulk search{dashboard.batch_screenings_left === 1 ? '' : 'es'} remaining.
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="table-controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="text"
            placeholder="Search history..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="search-filter"
          />
          {user?.is_system_admin && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label htmlFor="org-select" style={{ marginRight: 8, whiteSpace: 'nowrap' }}>Organisation:</label>
              <select
                id="org-select"
                value={selectedOrg || ''}
                onChange={e => {
                  const newOrgId = e.target.value;
                  
                  // Don't allow clearing the selection - if empty, select the first org
                  if (!newOrgId && allOrgs.length > 0) {
                    const defaultOrgId = allOrgs[0]?.id;
                    setSelectedOrg(defaultOrgId);
                    setOrgIdForApi(defaultOrgId);
                  } else {
                    setSelectedOrg(newOrgId);
                    setOrgIdForApi(newOrgId);
                  }
                }}
                className="org-select"
              >
                {allOrgs.length === 0 ? (
                  <option value="">Loading organisations...</option>
                ) : (
                  allOrgs.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))
                )}
              </select>
            </div>
          )}
        </div>
        <div className="button-group">
          <CSVLink 
            filename={`pip_search_history_${new Date().toISOString().split('T')[0]}.csv`} 
            data={[
              // Metadata rows
              { Date: 'EXPORT INFORMATION', User: '', Query: '', Result: '' },
              { Date: 'Export Date', User: new Date().toLocaleString(), Query: '', Result: '' },
              { 
                Date: 'Exported By',
                User: user
                  ? `${user.first_name || user.name || ''} ${user.last_name || user.surname || ''}`.trim() || 'Unknown User'
                  : `Unknown User (ID: ${user?.id || 'Unknown'})`, // <-- FIXED: use template literal, not concatenation
                Query: '', 
                Result: '' 
              },
              { 
                Date: 'Organisation', 
                User: user?.organisation_name || user?.organization_name || 'N/A', 
                Query: '', 
                Result: '' 
              },
              { Date: 'Email', User: user?.email || 'N/A', Query: '', Result: '' },
              { Date: 'Selected Organisation', User: selectedOrg || 'All', Query: '', Result: '' },
              { Date: 'Search Term', User: searchTerm || 'All', Query: '', Result: '' },
              { Date: 'Total Records', User: exportData.length.toString(), Query: '', Result: '' },
              { Date: '', User: '', Query: '', Result: '' }, // Empty row as separator
              { Date: 'SEARCH HISTORY DATA', User: '', Query: '', Result: '' },
              ...exportData
            ]}
            className="export-button">Export CSV</CSVLink>
          <button className="export-button" onClick={exportExcel}>Export Excel</button>
          <button className="export-button" onClick={exportPDF}>Export PDF</button>
        </div>
      </div>
      
      <div style={{ marginBottom: '1rem', fontWeight: 'bold', fontSize: '1rem' }}>
        Showing {currentLogs.length} of {filtered.length} search records {searchTerm ? `(filtered from ${logs.length})` : ''}
      </div>
      
      <div className="table-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="loading-spinner"></div>
            <div>Loading search history...</div>
          </div>
        ) : error ? (
          <div style={{ 
            color: '#e74c3c', 
            textAlign: 'center', 
            padding: '2rem',
            border: '1px solid #e74c3c',
            borderRadius: '8px',
            margin: '1rem',
            backgroundColor: '#fadbd8'
          }}>
            <h3>Access Error</h3>
            <p>{error}</p>
            {(!user || !user.id) && (
              <p>Please make sure you are properly logged in and try again.</p>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>No search history found.</div>
        ) : (
          <table className="pips-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>User</th>
                <th>Query</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {currentLogs.map((log, idx) => {
                const preview = log.search_result && log.search_result.length > 40
                  ? log.search_result.slice(0, 40) + '...'
                  : log.search_result;
                return (
                  <tr key={log.id}>
                    <td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td>{new Date(log.searched_at).toLocaleString()}</td>
                    <td>{log.user_email}</td>
                    <td>{log.search_query}</td>
                    <td>
                      <pre style={{ maxWidth: 300, whiteSpace: 'pre-wrap', display: 'inline' }}>{preview}</pre>
                      {log.search_result && log.search_result.length > 100 && (
                        <button
                          className="view-more-btn"
                          onClick={() => { setModalContent(prettyResult(log.search_result)); setModalOpen(true); }}
                          style={{ marginLeft: 8 }}
                        >
                          View More
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {/* Pagination */}
      <div className="pagination">
        <button onClick={() => setCurrentPage(c => c - 1)} disabled={currentPage === 1}>← Prev</button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (currentPage <= 3) {
            pageNum = i + 1;
          } else if (currentPage >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = currentPage - 2 + i;
          }
          return (
            <button key={pageNum} className={currentPage === pageNum ? 'active' : ''} onClick={() => setCurrentPage(pageNum)}>
              {pageNum}
            </button>
          );
        })}
        <button onClick={() => setCurrentPage(c => c + 1)} disabled={currentPage === totalPages}>Next →</button>
      </div>
      {/* Modal for full result */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h4>Full Result</h4>
            <pre style={{ maxHeight: 400, overflow: 'auto', background: '#f4f4f4', padding: 12, borderRadius: 4 }}>{modalContent}</pre>
            <button onClick={() => setModalOpen(false)} className="export-button" style={{ marginTop: 12 }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
