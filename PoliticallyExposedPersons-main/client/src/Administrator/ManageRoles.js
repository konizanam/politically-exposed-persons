import React, { useEffect, useState } from 'react';
import axios from '../axiosInstance';
import { FaPlus, FaEdit, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../Pages.css';

 function ManageRoles() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [msg, setMsg] = useState('');
  const [showMsg, setShowMsg] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const res = await axios.get('/users/permissionsfetch');
      setPermissions(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setPermissions([]);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await axios.get('/users/rolesfetch');
      setRoles(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Error fetching roles:', e);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setMsg('');
    setShowMsg(false);

    if (!roleName.trim()) {
      setMsg('❌ Role name required');
      setShowMsg(true);
      return;
    }

    try {
      let roleId = editRole ? editRole.id : null;
      if (!editRole) {
        // Create new role
        const res = await axios.post('/users/roleadd', {
          name: roleName,
          description: roleDesc
        });
        // Use backend response to get new role's ID
        let newRoleId = null;
        if (res.data && res.data.role && res.data.role.id) {
          newRoleId = res.data.role.id;
        } else if (res.data && res.data.role && res.data.role.name === roleName) {
          // fallback if only name is returned
          await fetchRoles();
          const newRole = roles.find(r => r.name === roleName);
          newRoleId = newRole ? newRole.id : null;
        }
        roleId = newRoleId;
        await fetchRoles();
      } else {
        // Update role name/desc
        await axios.post('/users/roleupdate', {
          id: editRole.id,
          name: roleName,
          description: roleDesc
        });
        roleId = editRole.id;
        await fetchRoles();
      }
      // Update permissions for the role (even if none selected, to clear)
      if (roleId) {
        await axios.post(`/users/rolepermissions/${roleId}`, {
          permissionIds: selectedPermissions
        });
      }
      setMsg(`✅ Role ${editRole ? 'updated' : 'added'}`);
      setShowMsg(true);
      setRoleName('');
      setRoleDesc('');
      setSelectedPermissions([]);
      setShowForm(false);
      setEditRole(null);
      fetchRoles();
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.error || e.message));
      setShowMsg(true);
    }
  };

  const toggleStatus = async (id) => {
    try {
      const res = await axios.patch(`/users/roletoggle/${id}`);
      setMsg('✅ ' + res.data.message);
      setShowMsg(true);
      fetchRoles();
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.error || e.message));
      setShowMsg(true);
    }
  };

  const handleEdit = async (role) => {
    setRoleName(role.name);
    setRoleDesc(role.description || '');
    setEditRole(role);
    setShowForm(true);
    // Fetch role's permissions
    try {
      const res = await axios.get(`/users/rolepermissions/${role.id}`);
      setSelectedPermissions(res.data.map(p => p.id));
    } catch {
      setSelectedPermissions([]);
    }
  };

  const filteredList = search
    ? roles.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    : roles;

  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const paginatedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const renderPagination = () => {
    const pages = [];
    const total = totalPages;
    const current = currentPage;

    if (total <= 5) {
      for (let i = 1; i <= total; i++) {
        pages.push(
          <button key={i} className={current === i ? 'active' : ''} onClick={() => setCurrentPage(i)}>
            {i}
          </button>
        );
      }
    } else {
      pages.push(<button key={1} className={current === 1 ? 'active' : ''} onClick={() => setCurrentPage(1)}>1</button>);
      if (current > 3) pages.push(<span key="start-ellipsis">...</span>);
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) {
        pages.push(
          <button key={i} className={current === i ? 'active' : ''} onClick={() => setCurrentPage(i)}>
            {i}
          </button>
        );
      }
      if (current < total - 2) pages.push(<span key="end-ellipsis">...</span>);
      pages.push(<button key={total} className={current === total ? 'active' : ''} onClick={() => setCurrentPage(total)}>{total}</button>);
    }

    return pages;
  };

  const handleExportCSV = () => {
        const csvRows = [['#', 'Role', 'Description'], ...filteredList.map((r, i) => [i + 1, r.name, r.description || '-'])];
    const csv = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'roles.csv';
    a.click();
  };

  const handleExportExcel = () => {
    const ws = utils.json_to_sheet(filteredList.map((r, i) => ({
      '#': i + 1,
      Role: r.name,
      Description: r.description || '-'
    })));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Roles');
    writeFile(wb, 'roles.xlsx');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('Roles List', 14, 16);
    const tableData = filteredList.map((r, i) => [i + 1, r.name, r.description || '-']);
    autoTable(doc, {
      startY: 20,
      head: [['#', 'Role', 'Description']],
      body: tableData,
    });
    doc.save('roles.pdf');
  };

  return (
    <div className="page-container">
      <div className="table-controls">
        <input
          placeholder="Search roles…"
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />
        <div className="button-group">
          <button className="export-button" onClick={() => { setShowForm(true); setEditRole(null); }}>
            <FaPlus style={{ marginRight: 5 }} /> Add Role
          </button>
          <button className="export-button" onClick={handleExportCSV}>Export CSV</button>
          <button className="export-button" onClick={handleExportExcel}>Export Excel</button>
          <button className="export-button" onClick={handleExportPDF}>Export PDF</button>
        </div>
      </div>

      {showForm && (
        <form className="table-container" onSubmit={handleSubmit}>
          <h3>{editRole ? 'Edit Role' : 'Add New Role'}</h3>
          <div className="form-group">
            <input
              placeholder="Role Name"
              required
              value={roleName}
              onChange={e => setRoleName(e.target.value)}
            />
            <input
              placeholder="Description (optional)"
              value={roleDesc}
              onChange={e => setRoleDesc(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label style={{ fontWeight: 600 }}>Permissions:</label>
            <div className="permission-cards-container">
              {permissions.map(p => (
                <div 
                  key={p.id} 
                  className={`permission-card ${selectedPermissions.includes(p.id) ? 'selected' : ''}`}
                  onClick={() => {
                    if (selectedPermissions.includes(p.id)) {
                      setSelectedPermissions(prev => prev.filter(id => id !== p.id));
                    } else {
                      setSelectedPermissions(prev => [...prev, p.id]);
                    }
                  }}
                >
                  <div className="permission-card-header">
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPermissions(prev => [...prev, p.id]);
                        } else {
                          setSelectedPermissions(prev => prev.filter(id => id !== p.id));
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="permission-name">{p.name}</span>
                  </div>
                  {p.description && (
                    <p className="permission-description">{p.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
          <button type="submit" className="export-button">Submit</button>
          <button
            type="button"
            className="export-button"
            style={{ marginLeft: '1rem', background: '#ccc' }}
            onClick={() => { setShowForm(false); setRoleName(''); setRoleDesc(''); setEditRole(null); setSelectedPermissions([]); }}
          >
            Cancel
          </button>
        </form>
      )}

      {showMsg && (
        <div className="message-popup">
          <div className="message-popup-content">
            <p>{msg}</p>
            <button className="close-popup-button" onClick={() => setShowMsg(false)}>Close</button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '1rem', fontWeight: 'bold', fontSize: '1rem' }}>
        Showing {paginatedList.length} of {filteredList.length} roles {search ? `(filtered from ${roles.length})` : ''}
      </div>

      <div className="table-container">
        <table className="pips-table roles-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Role</th>
              <th>Description</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedList.map((r, i) => (
              <tr key={r.id}>
                <td>{(currentPage - 1) * itemsPerPage + i + 1}</td>
                <td>{r.name}</td>
                <td>{r.description || '-'}</td>
                <td>{r.is_active ? 'Active' : 'Inactive'}</td>
                <td>
                  <button onClick={() => handleEdit(r)} title="Edit"><FaEdit /></button>
                  <button onClick={() => toggleStatus(r.id)} title="Toggle Active">
                    {r.is_active ? <FaToggleOn /> : <FaToggleOff />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button onClick={() => setCurrentPage(prev => prev - 1)} disabled={currentPage === 1}>← Prev</button>
        {renderPagination()}
        <button onClick={() => setCurrentPage(prev => prev + 1)} disabled={currentPage === totalPages}>Next →</button>
      </div>
    </div>
  );
}

export default ManageRoles;
