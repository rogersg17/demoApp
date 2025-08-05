import React, { useState } from 'react';
import { useValidation } from '../../hooks/useValidation';
import LoadingSpinner from '../LoadingSpinner';
import '../../styles/SaveSettingsComponent.css';

interface SaveSettingsComponentProps {
  onSave: () => Promise<void>;
  onReset: () => void;
  saving: boolean;
  disabled?: boolean;
}

const SaveSettingsComponent: React.FC<SaveSettingsComponentProps> = ({
  onSave,
  onReset,
  saving,
  disabled = false
}) => {
  const [showValidationWarning, setShowValidationWarning] = useState(false);
  const { hasErrors } = useValidation();
  const hasValidationErrors = Boolean(hasErrors);

  const handleSave = async () => {
    // Show validation warning if there are errors
    if (hasValidationErrors) {
      setShowValidationWarning(true);
      setTimeout(() => setShowValidationWarning(false), 5000);
      return;
    }

    try {
      await onSave();
      setShowValidationWarning(false);
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const handleReset = () => {
    setShowValidationWarning(false);
    onReset();
  };

  return (
    <div className="settings-actions">
      {showValidationWarning && (
        <div className="validation-warning alert alert-warning">
          <strong>⚠️ Validation Errors:</strong> Please fix the validation errors before saving.
        </div>
      )}
      
      <div className="action-buttons">
        <button 
          className={`btn btn-primary ${hasValidationErrors ? 'btn-disabled' : ''}`}
          onClick={handleSave}
          disabled={saving || disabled}
          title={hasValidationErrors ? 'Please fix validation errors before saving' : 'Save all settings'}
        >
          {saving ? (
            <div className="btn-loading-content">
              <LoadingSpinner size="small" color="white" />
              <span>Saving...</span>
            </div>
          ) : (
            <>
              <span className="save-icon">💾</span>
              Save Settings
            </>
          )}
        </button>
        
        <button 
          className="btn btn-secondary" 
          onClick={handleReset}
          disabled={saving}
          title="Reset all settings to default values"
        >
          <span className="reset-icon">🔄</span>
          Reset to Defaults
        </button>
      </div>

      {hasValidationErrors && (
        <div className="validation-status">
          <span className="validation-icon">❌</span>
          <span className="validation-text">
            Some fields have validation errors. Please review and correct them before saving.
          </span>
        </div>
      )}
    </div>
  );
};

export default SaveSettingsComponent;
