import React, { useEffect, useState } from 'react';
import axios from './axiosInstance';
import { CSVLink } from 'react-csv';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Pages.css';

function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const itemsPerPage = 10;

  useEffect(() => {
    axios.get('/audittrails/audittrailsfetch')
      .then(response => {
        setLogs(response.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleSort = (col) => {
    const order = sortColumn === col && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortColumn(col);
    setSortOrder(order);
  };

  const filtered = searchTerm
    ? logs.filter(log =>
        Object.values(log)
          .join(' ')
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
    : logs;

  const sorted = filtered.sort((a, b) => {
    const valA = (a[sortColumn] || '').toString().toLowerCase();
    const valB = (b[sortColumn] || '').toString().toLowerCase();
    return valA < valB ? (sortOrder === 'asc' ? -1 : 1) : valA > valB ? (sortOrder === 'asc' ? 1 : -1) : 0;
  });

  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const currentLogs = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(logs.map(log => ({
      Action: log.action_type,
      Module: log.module_name,
      Target: log.target,
      Summary: log.result_summary,
      Status: log.status,
      User: log.user_email || log.user_id || 'N/A',
      IP: log.ip_address,
      Time: new Date(log.timestamp).toLocaleString()
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');
    XLSX.writeFile(wb, 'audit_logs.xlsx');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['Action', 'Module', 'Target', 'Summary', 'Status', 'User', 'IP', 'Time']],
      body: logs.map(log => [
        log.action_type,
        log.module_name,
        log.target,
        log.result_summary,
        log.status,
        log.user_email || log.user_id || 'N/A',
        log.ip_address,
        new Date(log.timestamp).toLocaleString()
      ])
    });
    doc.save('audit_logs.pdf');
  };

  if (loading) return <div className="page-container">Loading Audit Logs...</div>;
  if (error) return <div className="page-container">Error: {error}</div>;

  const renderPagination = () => {
    const pages = [];
    const total = totalPages;
    const current = currentPage;

    if (total <= 5) {
      for (let i = 1; i <= total; i++) {
        pages.push(
          <button
            key={i}
            className={current === i ? 'active' : ''}
            onClick={() => setCurrentPage(i)}
          >
            {i}
          </button>
        );
      }
    } else {
      pages.push(
        <button
          key={1}
          className={current === 1 ? 'active' : ''}
          onClick={() => setCurrentPage(1)}
        >
          1
        </button>
      );

      if (current > 3) {
        pages.push(<span key="start-ellipsis">...</span>);
      }

      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(
          <button
            key={i}
            className={current === i ? 'active' : ''}
            onClick={() => setCurrentPage(i)}
          >
            {i}
          </button>
        );
      }

      if (current < total - 2) {
        pages.push(<span key="end-ellipsis">...</span>);
      }

      pages.push(
        <button
          key={total}
          className={current === total ? 'active' : ''}
          onClick={() => setCurrentPage(total)}
        >
          {total}
        </button>
      );
    }

    return pages;
  };

  return (
    <div className="page-container">
      <div className="table-controls">
        <input
          type="text"
          placeholder="Search logs..."
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
        />
        <div className="button-group">
          <CSVLink
            data={logs.map(log => ({
              Action: log.action_type,
              Module: log.module_name,
              Target: log.target,
              Summary: log.result_summary,
              Status: log.status,
              User: log.user_email || log.user_id || 'N/A',
              IP: log.ip_address,
              Time: new Date(log.timestamp).toLocaleString()
            }))}
            filename="audit_logs.csv"
            className="export-button"
          >
            Export CSV
          </CSVLink>
          <button className="export-button" onClick={exportExcel}>Export Excel</button>
          <button className="export-button" onClick={exportPDF}>Export PDF</button>
        </div>
      </div>

      <div style={{ marginBottom: '1rem', fontWeight: 'bold', fontSize: '1rem' }}>
        Showing {currentLogs.length} of {filtered.length} logs {searchTerm ? `(filtered from ${logs.length})` : ''}
      </div>

      <div className="table-container">
        <table className="pips-table">
          <thead>
            <tr>
              <th>#</th>
              <th onClick={() => handleSort('action_type')}>Action</th>
              <th onClick={() => handleSort('module_name')}>Module</th>
              <th onClick={() => handleSort('target')}>Target</th>
              <th onClick={() => handleSort('result_summary')}>Summary</th>
              <th onClick={() => handleSort('status')}>Status</th>
              <th>User</th>
              <th>IP</th>
              <th onClick={() => handleSort('timestamp')}>
                Time {sortColumn === 'timestamp' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {currentLogs.map((log, index) => (
              <tr key={log.id}>
                <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                <td>{log.action_type}</td>
                <td>{log.module_name}</td>
                <td>{log.target}</td>
                <td>{log.result_summary}</td>
                <td>{log.status}</td>
                <td>{log.user_email || log.user_id || 'N/A'}</td>
                <td>{log.ip_address}</td>
                <td>{new Date(log.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button onClick={() => setCurrentPage(prev => prev - 1)} disabled={currentPage === 1}>
          ← Prev
        </button>
        {renderPagination()}
        <button onClick={() => setCurrentPage(prev => prev + 1)} disabled={currentPage === totalPages}>
          Next →
        </button>
      </div>
    </div>
  );
}

export default AuditTrail;
