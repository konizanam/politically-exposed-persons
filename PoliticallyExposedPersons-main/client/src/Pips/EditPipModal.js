import React, { useEffect, useRef, useState } from 'react';
import PersonalInfoForm from '../DataCapturer/forms/PersonalInfoForm';
import ForeignDetailsForm from '../DataCapturer/forms/ForeignDetailsForm';
import InstitutionsForm from '../DataCapturer/forms/InstitutionsForm';
import AssociatesForm from '../DataCapturer/forms/AssociatesForm';

const EditPipModal = ({
  showEditModal,
  closeEditModal,
  editingPip,
  editCurrentStep,
  editCompletedSteps,
  handleEditStepClick,
  successMessage,
  savingStep,
  handleSaveStep,
  // Form states
  editFirstName,
  setEditFirstName,
  editMiddleName,
  setEditMiddleName,
  editLastName,
  setEditLastName,
  editAssociates,
  editInstitutions,
  editForeignDetails,
  editValidationErrors,
  setEditValidationErrors,
  // Handler functions
  handleEditAssociateChange,
  addEditAssociate,
  removeEditAssociate,
  handleEditInstitutionChange,
  addEditInstitution,
  removeEditInstitution,
  handleEditCountryChange,
  selectEditCountry,
  editSuggestions,
  viewMode,
  user
}) => {
  const modalRef = useRef(null);
  const contentRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  // Accessibility + UX: ESC to close, focus trap, body scroll lock, scroll shadow
  useEffect(() => {
    if (!showEditModal) return;

    const previouslyFocused = document.activeElement;
    const node = modalRef.current;

    // Lock background scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Initial focus inside modal
    const focusableSelectors = [
      'a[href]', 'area[href]', 'input:not([disabled])', 'select:not([disabled])',
      'textarea:not([disabled])', 'button:not([disabled])', 'iframe', 'object', 'embed',
      '[tabindex]:not([tabindex="-1"])', '[contenteditable="true"]'
    ];
    const getFocusable = () => node ? Array.from(node.querySelectorAll(focusableSelectors.join(','))) : [];
    const focusables = getFocusable();
    if (focusables.length) {
      focusables[0].focus();
    } else if (node) {
      node.setAttribute('tabindex', '-1');
      node.focus();
    }

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeEditModal();
      } else if (e.key === 'Tab') {
        const items = getFocusable();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    const onScroll = () => {
      if (!node) return;
      setScrolled(node.scrollTop > 0);
    };

    document.addEventListener('keydown', onKeyDown, true);
    if (node) node.addEventListener('scroll', onScroll);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      if (node) node.removeEventListener('scroll', onScroll);
      document.body.style.overflow = originalOverflow;
      if (previouslyFocused && previouslyFocused.focus) {
        previouslyFocused.focus();
      }
    };
  }, [showEditModal, closeEditModal]);

  if (!showEditModal) return null;

  // Smoothly scroll the stepper content to the bottom and focus the first input of the last section
  const scrollToNewSection = () => {
    const container = contentRef.current;
    if (!container) return;
    // Delay to allow React to render the newly added section
    setTimeout(() => {
      const sections = container.querySelectorAll('.form-section');
      const lastSection = sections[sections.length - 1];
      if (!lastSection) return;

      // Try to bring the new section near the top of the viewport
      const sectionTop = lastSection.offsetTop;
      const desiredTop = Math.max(0, sectionTop - 20);
      container.scrollTo({ top: desiredTop, behavior: 'smooth' });

      // Safety: if still not visible, jump to very bottom after the smooth scroll kicks in
      setTimeout(() => {
        const cRect = container.getBoundingClientRect();
        const sRect = lastSection.getBoundingClientRect();
        const visible = sRect.top >= cRect.top && sRect.bottom <= cRect.bottom;
        if (!visible) {
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
        // Focus first interactive field
        const focusable = lastSection.querySelector('input, select, textarea, button');
        if (focusable && focusable.focus) focusable.focus();
      }, 250);
    }, 120);
  };

  // Helper function to get steps based on PIP type
  const getEditSteps = () => {
    const baseSteps = [
      { label: 'Personal Info', description: 'PIP personal information' },
      { label: 'Institutions', description: 'Institution affiliations' },
      { label: 'Associates', description: 'Related associates' }
    ];

    if (editingPip?.pip_type === 'Foreign') {
      baseSteps.splice(1, 0, { label: 'Foreign Details', description: 'Country and additional notes' });
    }

    return baseSteps;
  };

  // Render step content based on current step
  const renderEditStepContent = () => {
    switch (editCurrentStep) {
      case 0:
        return (
          <PersonalInfoForm
            pipType={editingPip?.pip_type}
            firstName={editFirstName}
            setFirstName={setEditFirstName}
            middleName={editMiddleName}
            setMiddleName={setEditMiddleName}
            lastName={editLastName}
            setLastName={setEditLastName}
            validationErrors={editValidationErrors}
            setValidationErrors={setEditValidationErrors}
            viewMode={viewMode}
            user={user}
          />
        );

      case 1:
        if (editingPip?.pip_type === 'Foreign') {
          return (
            <ForeignDetailsForm
              foreignDetails={editForeignDetails}
              setForeignDetails={() => {}}
              handleCountryChange={handleEditCountryChange}
              selectCountry={selectEditCountry}
              suggestions={editSuggestions}
              validationErrors={editValidationErrors}
              viewMode={viewMode}
            />
          );
        }
        // Fall through to institutions for Local PIPs
        return (
          <InstitutionsForm
            institutions={editInstitutions}
            handleInstitutionChange={handleEditInstitutionChange}
            addInstitution={() => {
              addEditInstitution();
              scrollToNewSection();
            }}
            removeInstitution={removeEditInstitution}
            validationErrors={editValidationErrors}
            viewMode={viewMode}
          />
        );

      case editingPip?.pip_type === 'Foreign' ? 2 : 1:
        if (editingPip?.pip_type === 'Foreign' && editCurrentStep === 2) {
          return (
            <InstitutionsForm
              institutions={editInstitutions}
              handleInstitutionChange={handleEditInstitutionChange}
              addInstitution={() => {
                addEditInstitution();
                scrollToNewSection();
              }}
              removeInstitution={removeEditInstitution}
              validationErrors={editValidationErrors}
              viewMode={viewMode}
            />
          );
        }
        // Fall through to associates

      case editingPip?.pip_type === 'Foreign' ? 3 : 2:
        return (
          <AssociatesForm
            associates={editAssociates}
            handleAssociateChange={handleEditAssociateChange}
            addAssociate={() => {
              addEditAssociate();
              scrollToNewSection();
            }}
            removeAssociate={removeEditAssociate}
            viewMode={viewMode}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay open" onClick={closeEditModal}>
      <div
        className="modal-content condensed"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-pip-modal-title"
        ref={modalRef}
        style={{
          width: 'min(1100px, max(320px, calc(100vw - var(--sidebar-width, 220px) - 64px)))',
          maxWidth: 'max(320px, calc(100vw - var(--sidebar-width, 220px) - 64px))',
          maxHeight: '90vh',
          borderRadius: 10,
          overflowY: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 12px 32px rgba(0,0,0,0.18)'
        }}
      >
        <div className="modal-header" style={{ boxShadow: scrolled ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}>
          <h2 id="edit-pip-modal-title">{viewMode ? 'PIP Details' : 'Edit PIP Information'}</h2>
          <button className="modal-close" onClick={closeEditModal}>×</button>
        </div>
        
        <div className="stepper-container" style={{ marginBottom: 8 }}>
          <div className="stepper-header">
            {getEditSteps().map((step, index) => (
              <div
                key={index}
                className={`stepper-step ${
                  index === editCurrentStep ? 'active' : ''
                } ${editCompletedSteps.includes(index) ? 'completed' : ''}`}
                onClick={() => handleEditStepClick(index)}
                style={{ cursor: 'pointer', pointerEvents: 'auto' }}
              >
                <div className="step-number">
                  {editCompletedSteps.includes(index) ? '✓' : index + 1}
                </div>
                <div className="step-label">{step.label}</div>
              </div>
            ))}
          </div>
          
          <div className="progress-bar-container">
            <div 
              className="progress-bar" 
              style={{ width: `${((editCurrentStep + 1) / getEditSteps().length) * 100}%` }}
            />
          </div>

          <div className="stepper-content" style={{ paddingBottom: 8 }} ref={contentRef}>
            {successMessage && !viewMode && (
              <div style={{ 
                padding: '10px 15px', 
                marginBottom: '15px', 
                backgroundColor: '#d4edda', 
                color: '#155724', 
                border: '1px solid #c3e6cb', 
                borderRadius: '4px' 
              }}>
                {successMessage}
              </div>
            )}
            {renderEditStepContent()}
          </div>

          {!viewMode && (
            <div className="stepper-navigation" style={{ borderTop: '1px solid #e9ecef', background: '#fff' }}>
              <button
                className="step-button save"
                onClick={handleSaveStep}
                disabled={savingStep}
              >
                {savingStep ? 'Updating...' : 'Update Info'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditPipModal;