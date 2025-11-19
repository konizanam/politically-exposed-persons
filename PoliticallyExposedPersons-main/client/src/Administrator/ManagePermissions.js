import React, { useEffect, useState } from 'react';
import axios from '../axiosInstance';
import { FaPlus, FaEdit, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../Pages.css';

function ManagePermissions() {
  const [permissions, setPermissions] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editPermission, setEditPermission] = useState(null);
  const [permissionName, setPermissionName] = useState('');
  const [permissionDesc, setPermissionDesc] = useState('');
  const [msg, setMsg] = useState('');
  const [showMsg, setShowMsg] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const res = await axios.get('/permissions/permissionsfetch');
      setPermissions(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Error fetching permissions:', e);
      setMsg('❌ Failed to fetch permissions');
      setShowMsg(true);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setMsg('');
    setShowMsg(false);

    if (!permissionName.trim()) {
      setMsg('❌ Permission name is required');
      setShowMsg(true);
      return;
    }

    try {
      if (editPermission) {
        // Update existing permission
        await axios.put(`/permissions/permissionupdate/${editPermission.id}`, {
          name: permissionName,
          description: permissionDesc
        });
        setMsg('✅ Permission updated successfully');
      } else {
        // Create new permission
        await axios.post('/permissions/permissionadd', {
          name: permissionName,
          description: permissionDesc
        });
        setMsg('✅ Permission created successfully');
      }
      
      setShowMsg(true);
      resetForm();
      fetchPermissions();
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.error || e.message));
      setShowMsg(true);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await axios.put(`/permissions/permissiontoggle/${id}`);
      setMsg('✅ Permission status updated successfully');
      setShowMsg(true);
      fetchPermissions();
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.error || e.message));
      setShowMsg(true);
    }
  };

  const handleEdit = (permission) => {
    setPermissionName(permission.name);
    setPermissionDesc(permission.description || '');
    setEditPermission(permission);
    setShowForm(true);
  };

  const resetForm = () => {
    setPermissionName('');
    setPermissionDesc('');
    setEditPermission(null);
    setShowForm(false);
  };

  const filteredList = search
    ? permissions.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
      )
    : permissions;

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
    const csvRows = [['#', 'Permission', 'Description', 'Status'], ...filteredList.map((p, i) => [i + 1, p.name, p.description || '-', p.is_active ? 'Active' : 'Inactive'])];
    const csv = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'permissions.csv';
    a.click();
  };

  const handleExportExcel = () => {
    const ws = utils.json_to_sheet(filteredList.map((p, i) => ({
      '#': i + 1,
      Permission: p.name,
      Description: p.description || '-',
      Status: p.is_active ? 'Active' : 'Inactive'
    })));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Permissions');
    writeFile(wb, 'permissions.xlsx');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('Permissions List', 14, 16);
    const tableData = filteredList.map((p, i) => [i + 1, p.name, p.description || '-', p.is_active ? 'Active' : 'Inactive']);
    autoTable(doc, {
      startY: 20,
      head: [['#', 'Permission', 'Description', 'Status']],
      body: tableData,
    });
    doc.save('permissions.pdf');
  };

  return (
    <div className="page-container">
      <div className="table-controls">
        <input
          placeholder="Search permissions..."
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />
        <div className="button-group">
          <button className="export-button" onClick={() => { setShowForm(true); setEditPermission(null); }}>
            <FaPlus style={{ marginRight: 5 }} /> Add Permission
          </button>
          <button className="export-button" onClick={handleExportCSV}>Export CSV</button>
          <button className="export-button" onClick={handleExportExcel}>Export Excel</button>
          <button className="export-button" onClick={handleExportPDF}>Export PDF</button>
        </div>
      </div>

      {showForm && (
        <form className="table-container" onSubmit={handleSubmit}>
          <h3>{editPermission ? 'Edit Permission' : 'Add New Permission'}</h3>
          <div className="form-group">
            <input
              placeholder="Permission Name (e.g., manage_users)"
              required
              value={permissionName}
              onChange={e => setPermissionName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <textarea
              placeholder="Description (optional)"
              value={permissionDesc}
              onChange={e => setPermissionDesc(e.target.value)}
              rows="3"
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="export-button">
              {editPermission ? 'Update' : 'Submit'}
            </button>
            <button
              type="button"
              className="export-button"
              style={{ marginLeft: '1rem', background: '#ccc' }}
              onClick={resetForm}
            >
              Cancel
            </button>
          </div>
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
        Showing {paginatedList.length} of {filteredList.length} permissions {search ? `(filtered from ${permissions.length})` : ''}
      </div>

      <div className="table-container">
        <table className="pips-table permissions-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Permission</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedList.map((p, i) => (
              <tr key={p.id}>
                <td>{(currentPage - 1) * itemsPerPage + i + 1}</td>
                <td style={{ fontFamily: 'monospace' }}>{p.name}</td>
                <td>{p.description || '-'}</td>
                <td className={p.is_active ? 'status-active' : 'status-inactive'}>
                  {p.is_active ? 'Active' : 'Inactive'}
                </td>
                <td>
                  <button className="action-button" onClick={() => handleEdit(p)} title="Edit">
                    <FaEdit />
                  </button>
                  <button 
                    className="action-button" 
                    onClick={() => handleToggleStatus(p.id)} 
                    title={p.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {p.is_active ? <FaToggleOff /> : <FaToggleOn />}
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

export default ManagePermissions;