import React, { useState } from 'react';
import axios, { baseURL } from '../axiosInstance';
import '../Pages.css';
import './StepperForm.css';

// Import form components
import PersonalInfoForm from './forms/PersonalInfoForm';
import ForeignDetailsForm from './forms/ForeignDetailsForm';
import InstitutionsForm from './forms/InstitutionsForm';
import AssociatesForm from './forms/AssociatesForm';
import ReviewForm from './forms/ReviewForm';
import ImportForm from './forms/ImportForm';

// Import constants
import { countries } from './constants';

function DataCapturer() {
  // Initialize with Local PIP capture by default
  const [pipType, setPipType] = useState('Local');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  // National ID removed
  
  const [associates, setAssociates] = useState([{ first_name: '', middle_name: '', last_name: '', relationship_type: '', national_id: '' }]);
  const [institutions, setInstitutions] = useState([{ institution_name: '', institution_type: '', position: '', start_date: '', end_date: '' }]);
  const [foreignDetails, setForeignDetails] = useState({ country: '', additional_notes: '' });
  const [suggestions, setSuggestions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showMessagePopup, setShowMessagePopup] = useState(false);

  const [showImportForm, setShowImportForm] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);

  // Stepper state - show stepper by default for Local PIP
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [showStepper, setShowStepper] = useState(true);
  const [validationErrors, setValidationErrors] = useState({});

  // Define steps based on PIP type
  const getSteps = () => {
    const baseSteps = [
      { label: 'Personal Info', description: 'PIP personal information' },
      { label: 'Institutions', description: 'Institution affiliations' },
      { label: 'Associates', description: 'Related associates' },
      { label: 'Review', description: 'Review and submit' }
    ];

    if (pipType === 'Foreign') {
      baseSteps.splice(1, 0, { label: 'Foreign Details', description: 'Country and additional notes' });
    }

    return baseSteps;
  };

  const steps = getSteps();

  // Validation function for each step
  const validateStep = (stepIndex) => {
    const errors = {};

    if (stepIndex === 0) {
      // Personal Information validation
      if (!firstName.trim()) errors.firstName = 'First name is required';
      if (!lastName.trim()) errors.lastName = 'Last name is required';
      // National ID validation removed
  // Reason removed from the form
    }

    if (pipType === 'Foreign' && stepIndex === 1) {
      // Foreign Details validation
      if (!foreignDetails.country.trim()) {
        errors.country = 'Country is required';
      } else if (!countries.includes(foreignDetails.country)) {
        errors.country = 'Please select a valid country from the list';
      }
    }

    const institutionStepIndex = pipType === 'Foreign' ? 2 : 1;
    if (stepIndex === institutionStepIndex) {
      // At least one institution is required
      const hasValidInstitution = institutions.some(inst => inst.institution_name.trim());
      if (!hasValidInstitution) {
        errors.institutions = 'At least one institution is required';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
        setCompletedSteps([...completedSteps, currentStep]);
        setCurrentStep(currentStep + 1);
        setValidationErrors({});
      }
    } else {
      setMessage('❌ Please fill in all required fields');
      setShowMessagePopup(true);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setValidationErrors({});
    }
  };

  const handleStepClick = (index) => {
    // Only allow navigation to completed steps or the current step
    if (index <= Math.max(...completedSteps, currentStep)) {
      // Validate current step before moving
      if (index > currentStep && !validateStep(currentStep)) {
        setMessage('❌ Please complete the current step before proceeding');
        setShowMessagePopup(true);
        return;
      }
      setCurrentStep(index);
      setValidationErrors({});
    }
  };

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  const addAssociate = () => {
    setAssociates([...associates, { first_name: '', middle_name: '', last_name: '', relationship_type: '', national_id: '' }]);
  };

  const removeAssociate = (index) => {
    if (associates.length > 1) {
      const updated = associates.filter((_, idx) => idx !== index);
      setAssociates(updated);
    }
  };

  const addInstitution = () => {
    setInstitutions([...institutions, { institution_name: '', institution_type: '', position: '', start_date: '', end_date: '' }]);
  };

  const removeInstitution = (index) => {
    if (institutions.length > 1) {
      const updated = institutions.filter((_, idx) => idx !== index);
      setInstitutions(updated);
    }
  };

  const handleAssociateChange = (index, field, value) => {
    const updated = [...associates];
    updated[index][field] = value;
    setAssociates(updated);
  };

  const handleInstitutionChange = (index, field, value) => {
    const updated = [...institutions];
    updated[index][field] = value;
    setInstitutions(updated);
    // Clear institution error when user starts typing
    if (field === 'institution_name' && value.trim() && validationErrors.institutions) {
      setValidationErrors({ ...validationErrors, institutions: null });
    }
  };

  // National ID handler removed

  const handleCountryChange = (e) => {
    const val = e.target.value;
    setForeignDetails({ ...foreignDetails, country: val });
    setSuggestions(val ? countries.filter(c => c.toLowerCase().startsWith(val.toLowerCase())) : []);
    // Clear error when user starts typing
    if (validationErrors.country) {
      setValidationErrors({ ...validationErrors, country: null });
    }
  };

  const selectCountry = (country) => {
    setForeignDetails({ ...foreignDetails, country });
    setSuggestions([]);
    // Clear error when country is selected
    if (validationErrors.country) {
      setValidationErrors({ ...validationErrors, country: null });
    }
  };

  const closeMessagePopup = () => {
    setShowMessagePopup(false);
    setMessage('');
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setMessage('');
    setShowMessagePopup(false);

    // Final validation before submit
    if (pipType === 'Foreign' && !countries.includes(foreignDetails.country)) {
      setMessage('❌ Please select a valid country from the list');
      setShowMessagePopup(true);
      return;
    }

    setSubmitting(true);

    const pipData = {
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
  // national_id removed
      pip_type: pipType,
      is_foreign: pipType === 'Foreign',
      associates: associates.filter(a => Object.values(a).some(v => v.trim())),
      institutions: institutions.filter(i => i.institution_name.trim()),
      foreign: pipType === 'Foreign' ? foreignDetails : null
    };

    try {
      const response = await axios.post('/pipsdata/create', pipData);
      const result = response.data;
      if (!response.status === 200) throw new Error(result.error || 'Failed to save data');

      setMessage('✅ PIP successfully captured!');
      setShowMessagePopup(true);

  // Reset form
      setFirstName('');
      setMiddleName('');
      setLastName('');
  // nationalId reset removed
      setAssociates([{ first_name: '', middle_name: '', last_name: '', relationship_type: '', national_id: '' }]);
      setInstitutions([{ institution_name: '', institution_type: '', position: '', start_date: '', end_date: '' }]);
      setForeignDetails({ country: '', additional_notes: '' });
      setCurrentStep(0);
      setCompletedSteps([]);
      setValidationErrors({});

    } catch (err) {
      setMessage('❌ Error: ' + err.message);
      setShowMessagePopup(true);
    } finally {
      setSubmitting(false);
    }
  };

  // Update the handleImport function
  const handleImport = async (e) => {
    if (e) e.preventDefault();
    setMessage('');
    setShowMessagePopup(false);
    setImportProgress(null);

    if (!importFile || !importFile.name.toLowerCase().endsWith('.csv')) {
      setMessage('❌ Please select a valid CSV file.');
      setShowMessagePopup(true);
      return;
    }

    const formData = new FormData();
    formData.append('file', importFile);

    // Declare progressInterval outside try block
    let progressInterval;

    try {
      setImporting(true);
      
      // Parse CSV on client side to get total count
      const fileText = await importFile.text();
      const lines = fileText.split('\n').filter(line => line.trim());
      const totalRecords = Math.max(lines.length - 1, 1); // Subtract header row, minimum 1
      
      // Initialize progress
      setImportProgress({
        current: 0,
        total: totalRecords,
        successful: 0,
        failed: 0,
        currentRecord: ''
      });

      // Simulate progress updates
      let currentProgress = 0;
      
      progressInterval = setInterval(() => {
        currentProgress++;
        if (currentProgress <= totalRecords) {
          // Try to parse the current line for name
          let currentName = '';
          if (lines[currentProgress]) {
            const fields = lines[currentProgress].split(',');
            currentName = `${fields[0] || ''} ${fields[2] || ''}`.trim();
          }
          
          setImportProgress(prev => ({
            ...prev,
            current: currentProgress,
            currentRecord: currentName || `Record ${currentProgress}`,
            // Simulate some successes/failures
            successful: Math.floor(currentProgress * 0.9),
            failed: Math.floor(currentProgress * 0.1)
          }));
        }
      }, 300); // Update every 300ms to make it visible

      // Make the actual request
      const response = await axios.post('/pipsdata/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        // We may receive either JSON (success) or CSV (errors) from the server
        responseType: 'arraybuffer',
        validateStatus: (status) => status >= 200 && status < 300
      });

      // Clear the interval
      if (progressInterval) {
        clearInterval(progressInterval);
      }

      // Handle dual-mode response: JSON (no failures) or CSV (failures)
      const contentType = (response.headers && response.headers['content-type']) || '';
      if (contentType.includes('text/csv')) {
        // Build download from CSV body
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const filename = `import_errors_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        // Pull counts from headers if present
        const successCount = parseInt(response.headers['x-import-success'] || '0', 10);
        const failedCount = parseInt(response.headers['x-import-failed'] || '0', 10);
        const totalProcessed = parseInt(response.headers['x-import-total'] || `${totalRecords}`, 10);

        setImportProgress({
          current: totalProcessed,
          total: totalProcessed,
          successful: isNaN(successCount) ? 0 : successCount,
          failed: isNaN(failedCount) ? (totalProcessed - (isNaN(successCount) ? 0 : successCount)) : failedCount,
          currentRecord: 'Import completed with errors'
        });

        const summary = `✅ Import completed!\n\nSuccessful: ${isNaN(successCount) ? 0 : successCount}\nFailed: ${isNaN(failedCount) ? (totalProcessed - (isNaN(successCount) ? 0 : successCount)) : failedCount}\nTotal Processed: ${totalProcessed}\n\nA CSV with errors has been downloaded.`;
        setMessage(summary.trim());
        setShowMessagePopup(true);
        setImportFile(null);

        setTimeout(() => setImportProgress(null), 3000);
      } else {
        // Assume JSON success
        const text = new TextDecoder('utf-8').decode(response.data);
        const result = JSON.parse(text);

        setImportProgress({
          current: totalRecords,
          total: totalRecords,
          successful: result.success_count || 0,
          failed: result.failed_count || 0,
          currentRecord: 'Import completed!'
        });

        let summary = `✅ Import completed!\n\nSuccessful: ${result.success_count || 0}\nFailed: ${result.failed_count || 0}`;
        if (result.total_processed) summary += `\nTotal Processed: ${result.total_processed}`;

        setMessage(summary.trim());
        setShowMessagePopup(true);
        setImportFile(null);
        setTimeout(() => setImportProgress(null), 3000);
      }

    } catch (err) {
      // Now progressInterval is accessible here
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      console.error('Import error:', err);
      setMessage(`❌ Import failed: ${err.response?.data?.error || err.message}`);
      setShowMessagePopup(true);
      setImportProgress(null);
    } finally {
      setImporting(false);
      const fileInput = document.getElementById('csvFileInput');
      if (fileInput) fileInput.value = '';
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <PersonalInfoForm
            pipType={pipType}
            firstName={firstName}
            setFirstName={setFirstName}
            middleName={middleName}
            setMiddleName={setMiddleName}
            lastName={lastName}
            setLastName={setLastName}
            validationErrors={validationErrors}
            setValidationErrors={setValidationErrors}
          />
        );

      case 1:
        if (pipType === 'Foreign') {
          return (
            <ForeignDetailsForm
              foreignDetails={foreignDetails}
              setForeignDetails={setForeignDetails}
              handleCountryChange={handleCountryChange}
              selectCountry={selectCountry}
              suggestions={suggestions}
              validationErrors={validationErrors}
            />
          );
        }
        // Fall through to institutions for Local PIPs

      case pipType === 'Foreign' ? 2 : 1:
        return (
          <InstitutionsForm
            institutions={institutions}
            handleInstitutionChange={handleInstitutionChange}
            addInstitution={addInstitution}
            removeInstitution={removeInstitution}
            validationErrors={validationErrors}
          />
        );

      case pipType === 'Foreign' ? 3 : 2:
        return (
          <AssociatesForm
            associates={associates}
            handleAssociateChange={handleAssociateChange}
            addAssociate={addAssociate}
            removeAssociate={removeAssociate}
          />
        );

      case pipType === 'Foreign' ? 4 : 3:
        return (
          <ReviewForm
            pipType={pipType}
            firstName={firstName}
            middleName={middleName}
            lastName={lastName}
            foreignDetails={foreignDetails}
            institutions={institutions}
            associates={associates}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="page-container">
      <div className="button-group">
        <button className={`export-button ${pipType === 'Local' && showStepper ? 'active-button' : ''}`} onClick={() => {
          setPipType('Local');
          setShowImportForm(false);
          setShowStepper(true);
          setCurrentStep(0);
          setCompletedSteps([]);
          setValidationErrors({});
        }}>
          + Capture Domestic PIP
        </button>
        <button className={`export-button ${pipType === 'Foreign' && showStepper ? 'active-button' : ''}`} onClick={() => {
          setPipType('Foreign');
          setShowImportForm(false);
          setShowStepper(true);
          setCurrentStep(0);
          setCompletedSteps([]);
          setValidationErrors({});
        }}>
          + Capture Foreign PIP
        </button>
        <button className={`export-button ${showImportForm ? 'active-button' : ''}`} onClick={() => {
          setShowImportForm(true);
          setShowStepper(false);
          setPipType(null);
        }}>
          + Import PIPs
        </button>
      </div>

      {showStepper && pipType && (
        <div className="stepper-container">
          <div className="stepper-header">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`stepper-step ${
                  index === currentStep ? 'active' : ''
                } ${completedSteps.includes(index) ? 'completed' : ''}`}
                onClick={() => handleStepClick(index)}
              >
                <div className="step-number">
                  {completedSteps.includes(index) ? '✓' : index + 1}
                </div>
                <div className="step-label">{step.label}</div>
              </div>
            ))}
          </div>
          
          <div className="progress-bar-container">
            <div 
              className="progress-bar" 
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <div className="stepper-content">
            {renderStepContent()}
          </div>

          <div className="stepper-navigation">
            <button
              className="step-button previous"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              Previous
            </button>
            
            {currentStep === steps.length - 1 ? (
              <button
                className="step-button submit"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit PIP'}
              </button>
            ) : (
              <button
                className="step-button next"
                onClick={handleNext}
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}

      {showImportForm && (
        <ImportForm
          importFile={importFile}
          setImportFile={setImportFile}
          handleImport={handleImport}
          importing={importing}
          importProgress={importProgress}
          setImportProgress={setImportProgress}
        />
      )}

      {showMessagePopup && (
        <div className="message-popup">
          <div className="message-popup-content">
            <pre style={{ whiteSpace: 'pre-wrap' }}>{message}</pre>
            <button onClick={closeMessagePopup} className="close-popup-button">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataCapturer;
