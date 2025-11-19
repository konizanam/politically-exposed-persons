import React from 'react';

const ReviewForm = ({ 
  pipType, 
  firstName, 
  middleName, 
  lastName, 
  foreignDetails, 
  institutions, 
  associates 
}) => {
  return (
    <div className="step-form active">
      <h3 className="step-title">Review {pipType} PIP Information</h3>
      <p className="step-description">Please review all information before submitting</p>
      
      <div className="review-section">
        {/* Personal Information Section */}
        <div className="review-category">
          <h3 className="review-heading">Personal Information</h3>
          <div className="step-summary">
            <ul className="summary-list">
              <li className="summary-item">
                <span className="summary-label">Full Name:</span>
                <span className="summary-value">
                  {[firstName, middleName, lastName].filter(Boolean).join(' ')}
                </span>
              </li>
              {/* National ID removed from review */}
              <li className="summary-item">
                <span className="summary-label">PIP Type:</span>
                <span className="summary-value">{pipType}</span>
              </li>
              {/* Reason removed from review */}
            </ul>
          </div>
        </div>

        {/* Foreign Details Section (if applicable) */}
        {pipType === 'Foreign' && (
          <div className="review-category">
            <h3 className="review-heading">Foreign PIP Details</h3>
            <div className="step-summary">
              <ul className="summary-list">
                <li className="summary-item">
                  <span className="summary-label">Country:</span>
                  <span className="summary-value">{foreignDetails.country}</span>
                </li>
                {foreignDetails.additional_notes && (
                  <li className="summary-item">
                    <span className="summary-label">Additional Notes:</span>
                    <span className="summary-value" style={{ whiteSpace: 'pre-wrap' }}>
                      {foreignDetails.additional_notes}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Institutions Section */}
        <div className="review-category">
          <h3 className="review-heading">
            Institutions ({institutions.filter(i => i.institution_name.trim()).length})
          </h3>
          <div className="step-summary">
            {institutions.filter(i => i.institution_name.trim()).length > 0 ? (
              <ul className="summary-list">
                {institutions.filter(i => i.institution_name.trim()).map((inst, idx) => (
                  <li key={idx} className="summary-item" style={{ marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      {inst.institution_name}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      {[
                        inst.institution_type && `Type: ${inst.institution_type}`,
                        inst.position && `Position: ${inst.position}`,
                        (inst.start_date || inst.end_date) && `Period: ${inst.start_date || 'Unknown'} - ${inst.end_date || 'Present'}`
                      ].filter(Boolean).join(' | ')}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#666', fontStyle: 'italic' }}>No institutions added</p>
            )}
          </div>
        </div>

        {/* Associates Section */}
        <div className="review-category">
          <h3 className="review-heading">
            Associates ({associates.filter(a => Object.values(a).some(v => v.trim())).length})
          </h3>
          <div className="step-summary">
            {associates.filter(a => Object.values(a).some(v => v.trim())).length > 0 ? (
              <ul className="summary-list">
                {associates.filter(a => Object.values(a).some(v => v.trim())).map((assoc, idx) => {
                  const associateName = [assoc.first_name, assoc.middle_name, assoc.last_name]
                    .filter(Boolean)
                    .join(' ') || 'Unnamed Associate';
                  
                  return (
                    <li key={idx} className="summary-item" style={{ marginBottom: '1rem' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                        {associateName}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>
                        {[
                          assoc.relationship_type && `Relationship: ${assoc.relationship_type}`,
                          assoc.national_id && `ID: ${assoc.national_id}`
                        ].filter(Boolean).join(' | ') || 'No additional details'}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p style={{ color: '#666', fontStyle: 'italic' }}>No associates added</p>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .review-category {
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #e0e0e0;
        }
        .review-category:last-child {
          border-bottom: none;
        }
        .review-heading {
          color: #333;
          font-size: 1.2rem;
          margin-bottom: 1rem;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default ReviewForm;