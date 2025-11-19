import React from 'react';


const PersonalInfoForm = ({ 
  pipType, 
  firstName, 
  setFirstName, 
  middleName, 
  setMiddleName, 
  lastName, 
  setLastName, 
  validationErrors, 
  setValidationErrors,
  viewMode = false,
  user
}) => {
  const hasMiddleName = middleName && middleName.trim().length > 0;
  const shouldShowMiddleName = !viewMode || hasMiddleName;

  return (
    <div className="step-form active">
      <div className="form-section">
        <div className="form-row">
          <div className="step-form-group">
            <label className="required">First Name</label>
            <input 
              placeholder="Enter first name" 
              value={firstName} 
              required 
              onChange={e => {
                setFirstName(e.target.value);
                if (validationErrors.firstName) {
                  setValidationErrors({ ...validationErrors, firstName: null });
                }
              }} 
              readOnly={viewMode}
            />
            {validationErrors.firstName && <span className="field-error">{validationErrors.firstName}</span>}
          </div>
          
          {shouldShowMiddleName && (
            <div className="step-form-group">
              <label>Middle Name</label>
              <input 
                placeholder="Enter middle name" 
                value={middleName} 
                onChange={e => setMiddleName(e.target.value)} 
                readOnly={viewMode}
              />
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="step-form-group">
            <label className="required">Last Name</label>
            <input 
              placeholder="Enter last name" 
              value={lastName} 
              required 
              onChange={e => {
                setLastName(e.target.value);
                if (validationErrors.lastName) {
                  setValidationErrors({ ...validationErrors, lastName: null });
                }
              }} 
              readOnly={viewMode}
            />
            {validationErrors.lastName && <span className="field-error">{validationErrors.lastName}</span>}
          </div>
        </div>

        {/* Reason field removed intentionally */}
      </div>
    </div>
  );
};

export default PersonalInfoForm;