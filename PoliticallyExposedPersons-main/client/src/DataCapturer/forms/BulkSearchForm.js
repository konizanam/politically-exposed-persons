import React, { useState } from 'react';
import axios from '../../axiosInstance';
import { FaDownload, FaInfoCircle, FaTimesCircle } from 'react-icons/fa';
import '../StepperForm.css';

const BulkSearchForm = ({ closeModal, onSearchComplete }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) {
      setFile(null);
      return;
    }

    const validExtensions = ['csv', 'xlsx', 'xls'];
    const fileExtension = uploadedFile.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      setError('Please upload a valid CSV or Excel file.');
      setFile(null);
    } else {
      setError('');
      setFile(uploadedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      setError('');
      
      const response = await axios.post('/pipsdata/bulk-search', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { data, searchLimitInfo, bulkSearchInfo } = response.data;
      
      // Pass the results to parent component
      if (onSearchComplete) {
        onSearchComplete(data, searchLimitInfo, bulkSearchInfo);
      }
      
      // Close the modal
      closeModal();
      
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to process the file.');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "first_name,middle_name,last_name,national_id\nJohn,Michael,Doe,123456789\nJane,,Smith,987654321";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bulk_search_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>Bulk Search Upload</h2>
        <button className="modal-close" onClick={closeModal}>×</button>
      </div>
      
      <div className="modal-body">
        <div className="form-section">
          <div className="info-box" style={{ marginBottom: '1.5rem' }}>
            <FaInfoCircle style={{ marginRight: '0.5rem' }} />
            <span>Upload a CSV or Excel file with columns: first_name, middle_name, last_name, national_id</span>
          </div>
          
          <button 
            type="button" 
            className="export-button" 
            onClick={downloadTemplate}
            style={{ marginBottom: '1rem' }}
          >
            <FaDownload style={{ marginRight: '0.5rem' }} /> Download Template
          </button>

          <form onSubmit={handleSubmit}>
            <div className="step-form-group">
              <label htmlFor="bulkFile">Select File</label>
              <input 
                type="file" 
                id="bulkFile" 
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                disabled={loading}
              />
              {file && (
                <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
                  Selected: {file.name}
                </p>
              )}
            </div>
            
            {error && (
              <div className="field-error" style={{ marginTop: '1rem' }}>
                <FaTimesCircle /> {error}
              </div>
            )}
            
            <button 
              type="submit" 
              className="export-button" 
              disabled={loading || !file}
              style={{ marginTop: '1rem', width: '100%' }}
            >
              {loading ? 'Processing...' : 'Upload and Search'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BulkSearchForm;