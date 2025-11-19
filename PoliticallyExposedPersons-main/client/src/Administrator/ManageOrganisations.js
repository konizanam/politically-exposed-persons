import React, { useEffect, useState, useContext } from 'react';
import { UserContext } from '../UserContext';
import axios from '../axiosInstance';
import { FaEdit, FaPlus, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import { CSVLink } from 'react-csv';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../Pages.css';

function ManageOrganisations() {
  const { user } = useContext(UserContext);
  const [organisations, setOrganisations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    package_id: null
  });
  const [message, setMessage] = useState('');
  const [showMessagePopup, setShowMessagePopup] = useState(false);
  const [packages, setPackages] = useState([]);

  const itemsPerPage = 5;

  useEffect(() => {
    fetchOrganisations();
    fetchPackages();
  }, []);

  const fetchOrganisations = async () => {
    try {
      const res = await axios.get('/organisations/organisationsfetch');
      setOrganisations(res.data);
    } catch (err) {
      console.error('Error fetching organisations:', err);
    }
  };

  const fetchPackages = async () => {
    try {
      const res = await axios.get('/packages/packagesfetch');
      setPackages(res.data);
    } catch (err) {
      console.error('Error fetching packages:', err);
    }
  };

  const handleSort = (col) => {
    const order = sortColumn === col && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortColumn(col);
    setSortOrder(order);
  };

  const filtered = searchTerm
    ? organisations.filter(o =>
        Object.values(o).join(' ').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : organisations;

  const sorted = filtered.sort((a, b) => {
    const valA = (a[sortColumn] || '').toString().toLowerCase();
    const valB = (b[sortColumn] || '').toString().toLowerCase();
    return valA < valB ? (sortOrder === 'asc' ? -1 : 1) : valA > valB ? (sortOrder === 'asc' ? 1 : -1) : 0;
  });

  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const currentItems = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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

  const toggleStatus = async (id) => {
    try {
      const res = await axios.patch(`/organisations/toggle/${id}`);
      setMessage(res.data.message);
      setShowMessagePopup(true);
      fetchOrganisations();
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.error || err.message));
      setShowMessagePopup(true);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setShowMessagePopup(false);

    const url = editMode
      ? `/organisations/update/${editId}`
      : '/organisations/organisationadd';
    const method = editMode ? 'put' : 'post';

    try {
      await axios[method](url, formData);
      setMessage(editMode ? '✅ Organisation updated' : '✅ Organisation added');
      setShowMessagePopup(true);
      resetForm();
      fetchOrganisations();
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.error || err.message));
      setShowMessagePopup(true);
    }
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      description: '', 
      contact_email: '', 
      contact_phone: '', 
      address: '',
      package_id: null 
    });
    setEditMode(false);
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (org) => {
    setFormData({
      name: org.name,
      description: org.description,
      contact_email: org.contact_email || '',
      contact_phone: org.contact_phone || '',
      address: org.address || '',
      package_id: org.package_id || null
    });
    setEditMode(true);
    setEditId(org.id);
    setShowForm(true);
  };

  const exportData = organisations.map(o => ({
    Name: o.name,
    Description: o.description,
    Email: o.contact_email,
    Phone: o.contact_phone,
    Address: o.address,
    Status: o.is_active ? 'Active' : 'Inactive',
    'Created At': new Date(o.created_at).toLocaleString()
  }));

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Organisations');
    XLSX.writeFile(wb, 'organisations.xlsx');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['Name', 'Description', 'Email', 'Phone', 'Address', 'Status', 'Created At']],
      body: exportData.map(o => Object.values(o))
    });
    doc.save('organisations.pdf');
  };

  return (
    <div className="page-container">
      <div className="table-controls">
        <input
          type="text"
          placeholder="Search organisations..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
        />
        <div className="button-group">
          {/* Only system admins can add new organizations */}
          {user && user.is_system_admin && (
            <button className="export-button" onClick={() => {
              setEditMode(false);
              setEditId(null);
              setShowForm(true);
              setFormData({ name: '', description: '', contact_email: '', contact_phone: '', address: '' });
            }}>
              <FaPlus style={{ marginRight: 5 }} /> Add Organisation
            </button>
          )}
          <CSVLink filename="organisations.csv" data={exportData} className="export-button">Export CSV</CSVLink>
          <button className="export-button" onClick={exportExcel}>Export Excel</button>
          <button className="export-button" onClick={exportPDF}>Export PDF</button>
        </div>
      </div>
      

      {showForm && (
        <form className="table-container" onSubmit={handleFormSubmit}>
          <h3>{editMode ? 'Edit Organisation' : 'Add New Organisation'}</h3>
          
          <div className="form-group">
            <input 
              placeholder="Organisation Name" 
              required 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })} 
            />
          </div>

          <div className="form-group">
            <textarea 
              placeholder="Description" 
              value={formData.description} 
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows="3"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group name-group">
            <input 
              placeholder="Contact Email" 
              type="email" 
              value={formData.contact_email} 
              onChange={e => setFormData({ ...formData, contact_email: e.target.value })} 
            />
            <input 
              placeholder="Contact Phone" 
              value={formData.contact_phone} 
              onChange={e => setFormData({ ...formData, contact_phone: e.target.value })} 
            />
          </div>

          <div className="form-group">
            <textarea 
              placeholder="Address" 
              value={formData.address} 
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              rows="2"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label>Select Package:</label>
            <div className="package-cards-container">
              {packages.map(pkg => (
                <div 
                  key={pkg.id} 
                  className={`package-card ${formData.package_id === pkg.id ? 'selected' : ''}`}
                  onClick={() => setFormData({ ...formData, package_id: pkg.id })}
                >
                  <div className="package-card-header">
                    <input
                      type="radio"
                      name="package"
                      checked={formData.package_id === pkg.id}
                      onChange={() => setFormData({ ...formData, package_id: pkg.id })}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="package-name">{pkg.name}</span>
                  </div>
                  <div className="package-details">
                    <div className="package-price">
                      {pkg.price_monthly ? `$${pkg.price_monthly}/month` : 'Free'}
                    </div>
                    <ul className="package-features">
                      <li>Users: {pkg.user_limit === null ? 'Unlimited' : pkg.user_limit}</li>
                      <li>Onboarding Screenings: {pkg.onboarding_screening_limit === null ? 'Unlimited' : pkg.onboarding_screening_limit}</li>
                      <li>Batch Screenings: {pkg.batch_screening_limit === null ? 'Unlimited' : pkg.batch_screening_limit}</li>
                      {pkg.allow_export && <li>✓ Export Data</li>}
                      {pkg.allow_audit_trail && <li>✓ Audit Trail</li>}
                      {pkg.allow_batch_screening && <li>✓ Batch Screening</li>}
                      {pkg.allow_system_integration && <li>✓ System Integration</li>}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="export-button">
              {editMode ? 'Update' : 'Submit'}
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

      {showMessagePopup && (
        <div className="message-popup">
          <div className="message-popup-content">
            <p>{message}</p>
            <button className="close-popup-button" onClick={() => setShowMessagePopup(false)}>Close</button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '1rem', fontWeight: 'bold', fontSize: '1rem' }}>
        Showing {currentItems.length} of {filtered.length} organisations
      </div>

      <div className="table-container">
        <table className="pips-table organisations-table">
          <thead>
            <tr>
              <th>#</th>
              <th onClick={() => handleSort('name')}>Name</th>
              <th>Description</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Package</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((o, idx) => (
              <tr key={o.id}>
                <td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                <td>{o.name}</td>
                <td>{o.description}</td>
                <td>{o.contact_email}</td>
                <td>{o.contact_phone}</td>
                <td>{o.address}</td>
                <td>{o.package_name || 'None'}</td>
                <td>{o.is_active ? 'Active' : 'Inactive'}</td>
                <td>
                  <button title="Edit" className="action-button" onClick={() => handleEdit(o)}><FaEdit /></button>
                  {/* Only system admins can toggle organization status */}
                  {user && user.is_system_admin && (
                    <button title={o.is_active ? 'Deactivate' : 'Activate'} className="action-button" onClick={() => toggleStatus(o.id)}>
                      {o.is_active ? <FaToggleOff /> : <FaToggleOn />}
                    </button>
                  )}
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
    </div>
  );
}

export default ManageOrganisations;
