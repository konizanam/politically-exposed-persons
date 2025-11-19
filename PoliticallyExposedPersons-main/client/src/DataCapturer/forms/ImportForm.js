import React from 'react';
import { FaDownload } from 'react-icons/fa';

const ImportForm = ({ importFile, setImportFile, handleImport, importing, importProgress, setImportProgress }) => {
  const downloadSampleCSV = () => {
    const sampleData = `first_name,middle_name,last_name,pip_type,reason,is_foreign,institution_1_name,institution_1_type,institution_1_position,institution_1_start,institution_1_end,institution_2_name,institution_2_type,institution_2_position,institution_2_start,institution_2_end,associate_1_first,associate_1_middle,associate_1_last,associate_1_relationship,associate_1_national_id,associate_2_first,associate_2_middle,associate_2_last,associate_2_relationship,associate_2_national_id,country,additional_notes
  Micheal,A.,Jackson,Domestic PIP,Politician,FALSE,Ministry of Finance,Government,Director,01/01/2015,31/12/2020,,,,,,,,,,,,,,,,,
  Jeremy,,Clark,Foreign PIP,Offshore assets,TRUE,UNESCO,NGO,Consultant,10/05/2018,01/07/2023,Acme Corp,Private,Advisor,01/03/2014,30/09/2017,Liam,,Nguyen,Spouse,80020200028,Anna,,Smith,Friend,80101000099,Vietnam,Resides in Hanoi with offshore accounts
  Amina,,Khan,International Organisation PIP,Head of Mission,TRUE,World Health Organization,IGO,Director,01/02/2020,31/10/2024,,,,,,,,,,,,,,,,,Switzerland,Stationed in Geneva`;
    
    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Sample_PIPs_Import_CSV_Format.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="form-section" style={{ marginTop: '2rem' }}>
      <h3 className="form-section-title">Import PIPs from CSV</h3>
      
      <button 
        type="button" 
        className="export-button" 
        onClick={downloadSampleCSV}
        style={{ marginBottom: '1rem' }}
      >
        <FaDownload style={{ marginRight: '0.5rem' }} /> Download Template
      </button>
      
      <div className="step-form-group">
        <label>Select CSV File</label>
        <input
          type="file"
          id="csvFileInput"
          accept=".csv"
          onChange={(e) => setImportFile(e.target.files[0])}
          disabled={importing}
        />
      </div>
      
      {importing && importProgress && (
        <div className="import-progress">
          <div className="progress-text">
            <strong>Importing record {importProgress.current} of {importProgress.total}</strong>
          </div>
          
          <div className="progress-stats">
            <span className="stat-success">✅ Successful: {importProgress.successful || 0}</span>
            <span className="stat-failed">❌ Failed: {importProgress.failed || 0}</span>
          </div>
          
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
            />
          </div>
          
          {importProgress.currentRecord && (
            <div className="current-record">
              Processing: {importProgress.currentRecord}
            </div>
          )}
        </div>
      )}
      
      <button 
        className="export-button" 
        onClick={() => handleImport()} 
        disabled={importing || !importFile} 
        style={{ marginTop: '1rem' }}
      >
        {importing ? `Importing...` : 'Submit CSV'}
      </button>
    </div>
  );
};

export default ImportForm;