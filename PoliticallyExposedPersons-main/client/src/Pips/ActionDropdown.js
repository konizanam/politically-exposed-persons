import React, { useState, useRef, useEffect } from 'react';
import { FaEllipsisV, FaEdit, FaEye, FaToggleOff, FaToggleOn } from 'react-icons/fa';
import ConfirmationDialog from './ConfirmationDialog';

const ActionDropdown = ({ pip, onEdit, onViewDetails, isPrivilegedUser, onToggleStatus }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState({ newStatus: false, isDeactivate: true });
  const dropdownRef = useRef(null);
  const toggleRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          toggleRef.current && !toggleRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    
    // Add event listener with capture to ensure it fires before other handlers
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [dropdownRef, toggleRef]);

  // Toggle dropdown visibility
  const toggleDropdown = (e) => {
    e.stopPropagation();
    
    // Calculate position for dropdown
    if (toggleRef.current) {
      const rect = toggleRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
    
    setIsOpen(!isOpen);
  };

  // Handle edit action
  const handleEdit = (e) => {
    e.stopPropagation();
    setIsOpen(false);
    onEdit();
  };

  // Handle view details action
  const handleViewDetails = (e) => {
    e.stopPropagation();
    setIsOpen(false);
    onViewDetails();
  };

  // Handle toggle status action
  const handleToggleStatus = (e) => {
    e.stopPropagation();
    
    if (loading) return;
    
    // Use optional chaining to safely access pip.is_active
    const isActive = pip?.is_active !== false; // Default to true if undefined
    const newStatus = !isActive;
    const isDeactivate = isActive;
    
    // Show confirmation dialog instead of window.confirm
    setConfirmationAction({ newStatus, isDeactivate });
    setShowConfirmation(true);
    setIsOpen(false); // Close dropdown when showing confirmation
  };
  
  // Handle confirmation from dialog
  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onToggleStatus(confirmationAction.newStatus);
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };
  
  // Handle cancel from dialog
  const handleCancel = () => {
    setShowConfirmation(false);
  };

  return (
    <div className="action-dropdown">
      <button className="dropdown-toggle" onClick={toggleDropdown} title="Actions" ref={toggleRef}>
        <FaEllipsisV />
      </button>
      
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="dropdown-menu" 
          style={{
            zIndex: 9999,
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}
        >
          <button onClick={handleViewDetails} className="dropdown-item">
            <FaEye /> View Details
          </button>
          
          {isPrivilegedUser && (
            <>
              <button onClick={handleEdit} className="dropdown-item">
                <FaEdit /> Edit
              </button>
              
              <button 
                onClick={handleToggleStatus} 
                className={`dropdown-item ${loading ? 'disabled' : ''}`}
                disabled={loading}
                style={{color: pip?.is_active !== false ? '#d32f2f' : '#4caf50'}}
              >
                {pip?.is_active !== false ? (
                  <><FaToggleOff /> Deactivate</>
                ) : (
                  <><FaToggleOn /> Activate</>
                )}
              </button>
            </>
          )}
        </div>
      )}
      
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmation}
        title={confirmationAction.isDeactivate ? "Confirm Deactivation" : "Confirm Activation"}
        message={confirmationAction.isDeactivate
          ? `Are you sure you want to deactivate ${pip.full_name || ''}?`
          : `Are you sure you want to activate ${pip.full_name || ''}?`
        }
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isDeactivate={confirmationAction.isDeactivate}
      />
    </div>
  );
};

export default ActionDropdown;
