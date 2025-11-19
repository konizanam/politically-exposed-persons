import React from 'react';
import { FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';

const ConfirmationDialog = ({ isOpen, title, message, onConfirm, onCancel, isDeactivate }) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirmation-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirmation-header" style={{ 
          backgroundColor: isDeactivate ? '#ffebee' : '#e8f5e9',
          color: isDeactivate ? '#c62828' : '#2e7d32'
        }}>
          {isDeactivate ? (
            <FaExclamationTriangle style={{ fontSize: '24px', marginRight: '10px' }} />
          ) : (
            <FaCheckCircle style={{ fontSize: '24px', marginRight: '10px' }} />
          )}
          <h3>{title}</h3>
        </div>
        <div className="confirmation-content">
          <p style={{ wordBreak: 'break-word' }}>{message}</p>
        </div>
        <div className="confirmation-actions">
          <button 
            className="cancel-button" 
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            className={isDeactivate ? "deactivate-button" : "activate-button"}
            onClick={onConfirm}
          >
            {isDeactivate ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
