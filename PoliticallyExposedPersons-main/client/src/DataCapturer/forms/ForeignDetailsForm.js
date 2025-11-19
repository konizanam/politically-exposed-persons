import React from 'react';

const ForeignDetailsForm = ({ 
  foreignDetails, 
  setForeignDetails, 
  handleCountryChange, 
  selectCountry, 
  suggestions, 
  validationErrors,
  viewMode = false
}) => {
  const hasAdditionalNotes = foreignDetails?.additional_notes && foreignDetails.additional_notes.trim().length > 0;

  return (
    <div className="step-form active">
      <p className="step-description">
        {viewMode ? "Country & Additional Information" : "Country and additional information"}
      </p>
      
      <div className="form-section">
        <div className="step-form-group" style={{ position: 'relative' }}>
          <label className="required">Country</label>
          <input 
            placeholder="Start typing country name" 
            value={foreignDetails.country} 
            required 
            onChange={handleCountryChange} 
            autoComplete="off" 
            readOnly={viewMode}
          />
          {validationErrors.country && <span className="field-error">{validationErrors.country}</span>}
          {suggestions.length > 0 && !viewMode && (
            <ul className="suggestions-list">
              {suggestions.map((c, i) => (
                <li key={i} onClick={() => selectCountry(c)}>{c}</li>
              ))}
            </ul>
          )}
        </div>

        {(!viewMode || hasAdditionalNotes) && (
          <div className="step-form-group">
            <label>Additional Notes</label>
            <textarea 
              placeholder="Enter any additional notes about this foreign PIP" 
              value={foreignDetails.additional_notes} 
              onChange={e => setForeignDetails({ ...foreignDetails, additional_notes: e.target.value })}
              rows="4"
              readOnly={viewMode}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ForeignDetailsForm;