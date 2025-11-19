import React, { useEffect, useState } from 'react';
import axios from '../axiosInstance';
import { CSVLink } from 'react-csv';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../Pages.css';

export default function ManagePackages() {
  const [packages, setPackages] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [msg, setMsg] = useState('');
  const [showMsg, setShowMsg] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/packages/packagesfetch');
      setPackages(res.data);
      setLoading(false);
    } catch (e) {
      setPackages([]);
      setError(e.response?.data?.error || e.message || 'Failed to fetch packages');
      setLoading(false);
    }
  };

  const handleEdit = (pkg) => {
    setEditId(pkg.id);
    setEditData({ ...pkg });
  };

  const handleCancel = () => {
    setEditId(null);
    setEditData({});
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    try {
      await axios.put(`/packages/packageupdate/${editId}`, editData);
      setMsg('✅ Package updated');
      setShowMsg(true);
      setEditId(null);
      setEditData({});
      fetchPackages();
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.error || e.message));
      setShowMsg(true);
    }
  };
  
  // Filter packages based on search term
  const filtered = searchTerm
    ? packages.filter(pkg =>
        Object.values(pkg).join(' ').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : packages;
    
  // Calculate pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentPackages = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  
  // Prepare data for export
  const exportData = filtered.map(pkg => ({
    'Name': pkg.name,
    'User Limit': pkg.user_limit ?? 'Unlimited',
    'Onboarding Limit': pkg.onboarding_screening_limit ?? 'Unlimited',
    'Batch Limit': pkg.batch_screening_limit ?? 'Unlimited',
    'Monthly Price': pkg.price_monthly,
    'Annual Price': pkg.price_annual
  }));
  
  // Export functions
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Packages');
    XLSX.writeFile(wb, 'packages.xlsx');
  };
  
  const exportPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['Name', 'User Limit', 'Onboarding Limit', 'Batch Limit', 'Monthly Price', 'Annual Price']],
      body: exportData.map(o => Object.values(o))
    });
    doc.save('packages.pdf');
  };

  return (
    <div className="page-container">
      {showMsg && (
        <div className="message-popup">
          <div className="message-popup-content">
            <p>{msg}</p>
            <button className="close-popup-button" onClick={() => setShowMsg(false)}>Close</button>
          </div>
        </div>
      )}
      
      <div className="table-controls">
        <input
          type="text"
          placeholder="Search packages..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
        />
        <div className="button-group">
          <CSVLink filename="packages.csv" data={exportData} className="export-button">Export CSV</CSVLink>
          <button className="export-button" onClick={exportExcel}>Export Excel</button>
          <button className="export-button" onClick={exportPDF}>Export PDF</button>
        </div>
      </div>
      
      <div style={{ marginBottom: '1rem', fontWeight: 'bold', fontSize: '1rem' }}>
        Showing {currentPackages.length} of {filtered.length} packages {searchTerm ? `(filtered from ${packages.length})` : ''}
      </div>
      
      <div className="table-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading packages...</div>
        ) : error ? (
          <div style={{ color: 'red', textAlign: 'center', padding: '2rem' }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>No packages found.</div>
        ) : (
        <table className="pips-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>User Limit</th>
              <th>Onboarding Limit</th>
              <th>Batch Limit</th>
              <th>Monthly Price</th>
              <th>Annual Price</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {currentPackages.map((pkg, idx) => (
              <tr key={pkg.id}>
                <td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                <td>{pkg.name}</td>
                <td>
                  {editId === pkg.id ? (
                    <input name="user_limit" type="number" value={editData.user_limit ?? ''} onChange={handleChange} />
                  ) : (
                    pkg.user_limit ?? 'Unlimited'
                  )}
                </td>
                <td>
                  {editId === pkg.id ? (
                    <input name="onboarding_screening_limit" type="number" value={editData.onboarding_screening_limit ?? ''} onChange={handleChange} />
                  ) : (
                    pkg.onboarding_screening_limit ?? 'Unlimited'
                  )}
                </td>
                <td>
                  {editId === pkg.id ? (
                    <input name="batch_screening_limit" type="number" value={editData.batch_screening_limit ?? ''} onChange={handleChange} />
                  ) : (
                    pkg.batch_screening_limit ?? 'Unlimited'
                  )}
                </td>
                <td>
                  {editId === pkg.id ? (
                    <input name="price_monthly" type="number" value={editData.price_monthly ?? ''} onChange={handleChange} />
                  ) : (
                    pkg.price_monthly
                  )}
                </td>
                <td>
                  {editId === pkg.id ? (
                    <input name="price_annual" type="number" value={editData.price_annual ?? ''} onChange={handleChange} />
                  ) : (
                    pkg.price_annual
                  )}
                </td>
                <td>
                  {editId === pkg.id ? (
                    <>
                      <button className="export-button" onClick={handleSave} type="button">Save</button>
                      <button className="export-button" style={{ background: '#ccc' }} onClick={handleCancel} type="button">Cancel</button>
                    </>
                  ) : (
                    <button className="export-button" onClick={() => handleEdit(pkg)} type="button">Edit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
      
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
    </div>
  );
}
