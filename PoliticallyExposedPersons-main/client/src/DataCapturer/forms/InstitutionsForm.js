import React, { useEffect, useRef } from 'react';

// Add your institution types here
const INSTITUTION_TYPES = [
  '',
  'Government',
  'Private',
  'Non-Profit',
  'International Organization',
  'Educational',
  'Religious',
  'State-Owned Enterprise',
  'Political Party',
  'Diplomatic Mission',
  'Research Institution',
  'Other'
];

const InstitutionsForm = ({ 
  institutions, 
  handleInstitutionChange, 
  addInstitution, 
  removeInstitution, 
  validationErrors,
  viewMode = false
}) => {
  const listRef = useRef(null);
  const isNonEmpty = (value) => value !== null && value !== undefined && String(value).trim().length > 0;
  const relevantKeys = ['institution_name', 'institution_type', 'position', 'start_date', 'end_date'];
  const entries = institutions.map((inst = {}, idx) => ({ inst, idx }));
  const displayEntries = viewMode
    ? entries.filter(({ inst }) => relevantKeys.some((key) => isNonEmpty(inst[key])))
    : entries;
  const showEmptyState = viewMode && displayEntries.length === 0;

  useEffect(() => {
    if (viewMode) return;
    const node = listRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [displayEntries.length, viewMode]);

  return (
    <div className="step-form active">
      <div className="form-section pep-form-section">
        {validationErrors.institutions && (
          <div className="field-error" style={{ marginBottom: '1rem' }}>
            {validationErrors.institutions}
          </div>
        )}
        {showEmptyState && (
          <p style={{ color: '#6c757d', fontStyle: 'italic', marginBottom: '1.5rem' }}>
            No institutions recorded.
          </p>
        )}

        {displayEntries.length > 0 && (
          <div className="form-repeat-list" ref={listRef}>
            {displayEntries.map(({ inst, idx }, displayIdx) => {
          const showName = !viewMode || isNonEmpty(inst.institution_name);
          const showType = !viewMode || isNonEmpty(inst.institution_type);
          const showPosition = !viewMode || isNonEmpty(inst.position);
          const showStartDate = !viewMode || isNonEmpty(inst.start_date);
          const showEndDate = !viewMode || isNonEmpty(inst.end_date);

              return (
                <div key={idx} style={{ marginBottom: '2rem', position: 'relative' }}>
                  <h4 className="form-section-title">
                    Institution {displayIdx + 1}
                    {institutions.length > 1 && !viewMode && (
                      <button 
                        type="button" 
                        onClick={() => removeInstitution(idx)}
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '0.25rem 0.75rem',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          borderRadius: '4px'
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </h4>
                  
                  {(showName || showType) && (
                    <div className="form-row">
                      {showName && (
                        <div className="step-form-group">
                          <label className={idx === 0 && !viewMode ? 'required' : ''}>Institution Name</label>
                          <input 
                            placeholder="Enter institution name" 
                            value={inst.institution_name}
                            required={idx === 0 && !viewMode}
                            onChange={e => handleInstitutionChange(idx, 'institution_name', e.target.value)} 
                            readOnly={viewMode}
                          />
                        </div>
                      )}
                      {showType && (
                        <div className="step-form-group">
                          <label>Institution Type</label>
                          <select
                            value={inst.institution_type}
                            onChange={e => handleInstitutionChange(idx, 'institution_type', e.target.value)}
                            disabled={viewMode}
                          >
                            {INSTITUTION_TYPES.map(type => (
                              <option key={type} value={type}>{type ? type : 'Select type'}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {showPosition && (
                    <div className="step-form-group">
                      <label>Position</label>
                      <input 
                        placeholder="Enter position held" 
                        value={inst.position} 
                        onChange={e => handleInstitutionChange(idx, 'position', e.target.value)} 
                        readOnly={viewMode}
                      />
                    </div>
                  )}

                  {(showStartDate || showEndDate) && (
                    <div className="form-row">
                      {showStartDate && (
                        <div className="step-form-group">
                          <label>Start Date</label>
                          <input 
                            type="date" 
                            value={inst.start_date} 
                            onChange={e => handleInstitutionChange(idx, 'start_date', e.target.value)} 
                            readOnly={viewMode}
                          />
                        </div>
                      )}
                      {showEndDate && (
                        <div className="step-form-group">
                          <label>End Date</label>
                          <input 
                            type="date" 
                            value={inst.end_date} 
                            onChange={e => handleInstitutionChange(idx, 'end_date', e.target.value)} 
                            readOnly={viewMode}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {!viewMode && (
          <button type="button" className="export-button" onClick={addInstitution}>
            + Add Another Institution
          </button>
        )}
      </div>
    </div>
  );
};

export default InstitutionsForm;