import React, { useEffect, useRef } from 'react';
import { relationshipTypes } from '../constants';

const AssociatesForm = ({ 
  associates, 
  handleAssociateChange, 
  addAssociate, 
  removeAssociate,
  viewMode = false
}) => {
  const listRef = useRef(null);
  const isNonEmpty = (value) => value !== null && value !== undefined && String(value).trim().length > 0;
  const relevantKeys = ['first_name', 'middle_name', 'last_name', 'relationship_type', 'national_id'];
  const entries = associates.map((assoc = {}, idx) => ({ assoc, idx }));
  const displayEntries = viewMode
    ? entries.filter(({ assoc }) => relevantKeys.some((key) => isNonEmpty(assoc[key])))
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
      <div className="form-section associate-form-section">
        {showEmptyState && (
          <p style={{ color: '#6c757d', fontStyle: 'italic', marginBottom: '1.5rem' }}>
            No associates recorded.
          </p>
        )}

        {displayEntries.length > 0 && (
          <div className="form-repeat-list" ref={listRef}>
            {displayEntries.map(({ assoc, idx }, displayIdx) => {
          const showFirstName = !viewMode || isNonEmpty(assoc.first_name);
          const showMiddleName = !viewMode || isNonEmpty(assoc.middle_name);
          const showLastName = !viewMode || isNonEmpty(assoc.last_name);
          const showRelationship = !viewMode || isNonEmpty(assoc.relationship_type);
          const showNationalId = !viewMode || isNonEmpty(assoc.national_id);

              return (
                <div key={idx} style={{ marginBottom: '2rem', position: 'relative' }}>
                  <h4 className="form-section-title">
                    Associate {displayIdx + 1}
                    {associates.length > 1 && !viewMode && (
                      <button 
                        type="button" 
                        onClick={() => removeAssociate(idx)}
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
                  
                  {(showFirstName || showMiddleName) && (
                    <div className="form-row">
                      {showFirstName && (
                        <div className="step-form-group">
                          <label>First Name</label>
                          <input 
                            placeholder="Enter first name" 
                            value={assoc.first_name} 
                            onChange={e => handleAssociateChange(idx, 'first_name', e.target.value)} 
                            readOnly={viewMode}
                          />
                        </div>
                      )}
                      {showMiddleName && (
                        <div className="step-form-group">
                          <label>Middle Name</label>
                          <input 
                            placeholder="Enter middle name" 
                            value={assoc.middle_name} 
                            onChange={e => handleAssociateChange(idx, 'middle_name', e.target.value)} 
                            readOnly={viewMode}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {(showLastName || showRelationship) && (
                    <div className="form-row">
                      {showLastName && (
                        <div className="step-form-group">
                          <label>Last Name</label>
                          <input 
                            placeholder="Enter last name" 
                            value={assoc.last_name} 
                            onChange={e => handleAssociateChange(idx, 'last_name', e.target.value)} 
                            readOnly={viewMode}
                          />
                        </div>
                      )}
                      {showRelationship && (
                        <div className="step-form-group">
                          <label>Relationship Type</label>
                          <select 
                            value={assoc.relationship_type} 
                            onChange={e => handleAssociateChange(idx, 'relationship_type', e.target.value)}
                            disabled={viewMode}
                            style={{
                              padding: '0.75rem',
                              fontSize: '1rem',
                              border: '1px solid #e0e0e0',
                              borderRadius: '8px',
                              backgroundColor: '#fff',
                              cursor: viewMode ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <option value="">Select relationship type</option>
                            <optgroup label="Family Relations">
                              {relationshipTypes.slice(0, 43).map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </optgroup>
                            <optgroup label="Professional Relations">
                              {relationshipTypes.slice(43, 58).map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </optgroup>
                            <optgroup label="Personal Relations">
                              {relationshipTypes.slice(58, 67).map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </optgroup>
                            <optgroup label="Other Relations">
                              {relationshipTypes.slice(67).map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </optgroup>
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {showNationalId && (
                    <div className="step-form-group">
                      <label>Associate National ID</label>
                      <input 
                        placeholder="Enter associate's ID number" 
                        value={assoc.national_id} 
                        onChange={e => handleAssociateChange(idx, 'national_id', e.target.value)} 
                        readOnly={viewMode}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {!viewMode && (
          <button type="button" className="export-button" onClick={addAssociate}>
            + Add Another Associate
          </button>
        )}
      </div>
    </div>
  );
};

export default AssociatesForm;