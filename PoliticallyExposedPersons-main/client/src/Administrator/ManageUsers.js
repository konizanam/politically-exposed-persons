import React, { useEffect, useState } from 'react';
import axios from '../axiosInstance';
import { FaEdit, FaPlus, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import { CSVLink } from 'react-csv';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../Pages.css';

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState('first_name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    roles: [],
    organisation_id: ''
  });
  const [message, setMessage] = useState('');
  const [showMessagePopup, setShowMessagePopup] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState({ show: false, userId: null, isActive: null });

  const itemsPerPage = 5;

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchOrganisations();
    // Fetch current user info
    axios.get('/users/me').then(res => {
      setCurrentUser(res.data && res.data.user ? res.data.user : null);
    }).catch(() => setCurrentUser(null));
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/users/usersfetch');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching users', err);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await axios.get('/users/rolesfetch');
      setRoles(res.data);
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const fetchOrganisations = async () => {
    try {
      const res = await axios.get('/organisations/organisationsfetch');
      setOrganisations(res.data);
    } catch (err) {
      console.error('Error fetching organisations:', err);
    }
  };

  const handleSort = (col) => {
    const order = sortColumn === col && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortColumn(col);
    setSortOrder(order);
  };

  const filtered = searchTerm
    ? users.filter(u =>
        Object.values(u).join(' ').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : users;

  const sorted = filtered.sort((a, b) => {
    const valA = (a[sortColumn] || '').toString().toLowerCase();
    const valB = (b[sortColumn] || '').toString().toLowerCase();
    return valA < valB ? (sortOrder === 'asc' ? -1 : 1) : valA > valB ? (sortOrder === 'asc' ? 1 : -1) : 0;
  });

  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const currentUsers = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const renderPagination = () => {
    const pages = [];
    const total = totalPages;
    const current = currentPage;

    if (total <= 5) {
      for (let i = 1; i <= total; i++) {
        pages.push(
          <button key={i} className={current === i ? 'active' : ''} onClick={() => setCurrentPage(i)}>{i}</button>
        );
      }
    } else {
      pages.push(<button key={1} className={current === 1 ? 'active' : ''} onClick={() => setCurrentPage(1)}>1</button>);
      if (current > 3) pages.push(<span key="start-ellipsis">...</span>);
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) {
        pages.push(<button key={i} className={current === i ? 'active' : ''} onClick={() => setCurrentPage(i)}>{i}</button>);
      }
      if (current < total - 2) pages.push(<span key="end-ellipsis">...</span>);
      pages.push(<button key={total} className={current === total ? 'active' : ''} onClick={() => setCurrentPage(total)}>{total}</button>);
    }

    return pages;
  };

  const toggleUserStatus = async (id, isActive) => {
    try {
      await axios.patch(`/users/toggle-status/${id}`);
      setMessage(`✅ User ${isActive ? 'deactivated' : 'activated'} successfully`);
      setShowMessagePopup(true);
      fetchUsers();
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.error || err.message));
      setShowMessagePopup(true);
    }
  };

  // Helper: is current user admin or has is_admin permission
  const isCurrentUserAdmin = () => {
    if (!currentUser) return false;
    if (currentUser.is_system_admin || currentUser.is_admin) return true;
    if (Array.isArray(currentUser.roles) && currentUser.roles.includes('Admin')) return true;
    if (Array.isArray(currentUser.permissions) && currentUser.permissions.includes('is_admin')) return true;
    return false;
  };

  const toggleRole = (roleName) => {
    setFormData(prev => {
      const roles = prev.roles.includes(roleName)
        ? prev.roles.filter(r => r !== roleName)
        : [...prev.roles, roleName];
      return { ...prev, roles };
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setShowMessagePopup(false);

    if (formData.roles.length === 0) {
      setMessage('❌ Please select at least one role');
      setShowMessagePopup(true);
      return;
    }

    try {
      const url = editMode
        ? `/users/userupdate/${editId}`
        : '/users/useradd';

      const method = editMode ? 'put' : 'post';
      await axios[method](url, formData);

      setMessage(editMode ? '✅ User updated successfully' : '✅ User added successfully');
      setShowMessagePopup(true);
      resetForm();
      fetchUsers();
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.error || err.message));
      setShowMessagePopup(true);
    }
  };

  const handleEdit = (u) => {
    const org = organisations.find(o => o.name === u.organisation);
    setFormData({
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      password: '',
      roles: u.roles || [],
      organisation_id: org ? org.id : ''
    });
    setEditMode(true);
    setEditId(u.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ first_name: '', last_name: '', email: '', password: '', roles: [], organisation_id: '' });
    setEditMode(false);
    setEditId(null);
    setShowForm(false);
  };

  const flattenedForExport = users.map(u => ({
    'First Name': u.first_name,
    'Last Name': u.last_name,
    Email: u.email,
    Organisation: u.organisation || '',
    Roles: (u.roles || []).join(', '),
    Status: u.is_active ? 'Active' : 'Inactive',
    'Created At': new Date(u.created_at).toLocaleString()
  }));

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(flattenedForExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    XLSX.writeFile(wb, 'users.xlsx');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['First Name', 'Last Name', 'Email', 'Organisation', 'Roles', 'Status', 'Created At']],
      body: flattenedForExport.map(o => Object.values(o))
    });
    doc.save('users.pdf');
  };

  return (
    <div className="page-container">
      <div className="table-controls">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
        />
        <div className="button-group">
          <button className="export-button" onClick={() => {
            setEditMode(false);
            setEditId(null);
            setShowForm(true);
            setFormData({ first_name: '', last_name: '', email: '', password: '', roles: [], organisation_id: '' });
          }}>
            <FaPlus style={{ marginRight: 5 }} /> Add User
          </button>
          <CSVLink filename="users.csv" data={flattenedForExport} className="export-button">Export CSV</CSVLink>
          <button className="export-button" onClick={exportExcel}>Export Excel</button>
          <button className="export-button" onClick={exportPDF}>Export PDF</button>
        </div>
      </div>

      {showForm && (
        <form className="table-container" onSubmit={handleFormSubmit}>
          <h3>{editMode ? 'Edit User' : 'Add New User'}</h3>
          <div className="form-group name-group">
            <input placeholder="First Name" required value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} />
            <input placeholder="Last Name" required value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} />
            <input type="email" placeholder="Email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} disabled={editMode} />
          </div>

          <div className="form-group">
            <input type="password" placeholder="Password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required={!editMode} />
          </div>

          <div className="form-group">
            <label>Organisation:</label>
            <select value={formData.organisation_id} onChange={e => setFormData({ ...formData, organisation_id: e.target.value })}>
              <option value="">-- Select Organisation --</option>
              {organisations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Assign Roles:</label>
            <div className="role-cards-container">
              {roles
                .filter(r => r.is_active)
                .filter(r => {
                  if (isCurrentUserAdmin()) return true;
                  // Only OrgManager and OrgUser for non-admins
                  return r.name === 'OrgManager' || r.name === 'OrgUser';
                })
                .map(r => (
                  <div 
                    key={r.id} 
                    className={`role-card ${formData.roles.includes(r.name) ? 'selected' : ''}`}
                    onClick={() => toggleRole(r.name)}
                  >
                    <div className="role-card-header">
                      <input
                        type="checkbox"
                        checked={formData.roles.includes(r.name)}
                        onChange={() => toggleRole(r.name)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="role-name">{r.name}</span>
                    </div>
                    {r.description && (
                      <p className="role-description">{r.description}</p>
                    )}
                  </div>
                ))}
            </div>
          </div>

          <button type="submit" className="export-button">{editMode ? 'Update' : 'Submit'}</button>
          <button type="button" className="export-button" style={{ marginLeft: '1rem', background: '#ccc' }} onClick={resetForm}>Cancel</button>
        </form>
      )}

      {showMessagePopup && (
        <div className="message-popup">
          <div className="message-popup-content">
            <p>{message}</p>
            <button className="close-popup-button" onClick={() => setShowMessagePopup(false)}>Close</button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '1rem', fontWeight: 'bold', fontSize: '1rem' }}>
        Showing {currentUsers.length} of {filtered.length} users {searchTerm ? `(filtered from ${users.length})` : ''}
      </div>

      <div className="table-container">
        <table className="pips-table users-table">
          <thead>
            <tr>
              <th>#</th>
              <th onClick={() => handleSort('first_name')}>First Name</th>
              <th onClick={() => handleSort('last_name')}>Last Name</th>
              <th onClick={() => handleSort('email')}>Email</th>
              <th>Organisation</th>
              <th>Roles</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentUsers.map((u, idx) => (
              <tr key={u.id}>
                <td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                <td>{u.first_name}</td>
                <td>{u.last_name}</td>
                <td>{u.email}</td>
                <td>{u.organisation || '-'}</td>
                <td>{u.roles?.join(', ') || '-'}</td>
                <td>{u.is_active ? 'Active' : 'Inactive'}</td>
                <td>
                  <button title="Edit" className="action-button" onClick={() => handleEdit(u)}><FaEdit /></button>
                  <button title={u.is_active ? 'Disable' : 'Enable'} className="action-button" onClick={() => setConfirmToggle({ show: true, userId: u.id, isActive: u.is_active })}>
                    {u.is_active ? <FaToggleOff /> : <FaToggleOn />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button onClick={() => setCurrentPage(c => c - 1)} disabled={currentPage === 1}>← Prev</button>
        {renderPagination()}
        <button onClick={() => setCurrentPage(c => c + 1)} disabled={currentPage === totalPages}>Next →</button>
      </div>

      {/* Confirmation Popup for Activate/Deactivate */}
      {confirmToggle.show && (
        <div className="message-popup">
          <div className="message-popup-content">
            <p>{confirmToggle.isActive ? 'Are you sure you want to deactivate this user?' : 'Are you sure you want to activate this user?'}</p>
            <button
              className="export-button"
              onClick={async () => {
                await toggleUserStatus(confirmToggle.userId, confirmToggle.isActive);
                setConfirmToggle({ show: false, userId: null, isActive: null });
              }}
            >
              Yes
            </button>
            <button
              className="export-button"
              style={{ marginLeft: '1rem', background: '#ccc' }}
              onClick={() => setConfirmToggle({ show: false, userId: null, isActive: null })}
            >
              No
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageUsers;
