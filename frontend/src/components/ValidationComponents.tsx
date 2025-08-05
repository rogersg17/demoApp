import React from 'react';
import { useValidation } from '../hooks/useValidation';
import type { ValidationResult } from '../utils/validation';
import '../styles/validation.css';

interface ValidationErrorsProps {
  fieldName: string;
}

export const ValidationErrors: React.FC<ValidationErrorsProps> = ({ fieldName }) => {
  const { getFieldError } = useValidation();
  const error = getFieldError(fieldName);

  if (!error) {
    return null;
  }

  return (
    <div className="validation-error">
      <span className="error-text">{error}</span>
    </div>
  );
};

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  fieldName: string;
  validationType: string;
  onValidationChange?: (isValid: boolean) => void;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  fieldName,
  validationType,
  onValidationChange,
  onChange,
  className,
  ...props
}) => {
  const { setFieldValidation, isFieldValid } = useValidation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Import validation functions dynamically to avoid circular dependencies
    import('../utils/validation').then(validators => {
      let result: ValidationResult = { isValid: true, errors: [] };

      switch (validationType) {
        case 'url':
          result = validators.validateUrl(value);
          break;
        case 'github-token':
          result = validators.validateGitHubToken(value);
          break;
        case 'github-repo':
          result = validators.validateGitHubRepository(value);
          break;
        case 'jenkins-url':
          result = validators.validateJenkinsUrl(value);
          break;
        case 'jenkins-token':
          result = validators.validateJenkinsApiToken(value);
          break;
        case 'ado-url':
          result = validators.validateAdoOrganizationUrl(value);
          break;
        case 'ado-pat':
          result = validators.validateAdoPat(value);
          break;
        case 'ado-org':
          result = validators.validateAdoOrganizationUrl(value);
          break;
        case 'ado-project':
          result = validators.validateProjectName(value);
          break;
        case 'jira-url':
          result = validators.validateJiraUrl(value);
          break;
        case 'jira-email':
          result = validators.validateEmail(value);
          break;
        case 'jira-token':
          result = validators.validateJiraApiToken(value);
          break;
        case 'jira-project':
          result = validators.validateProjectName(value);
          break;
        case 'email':
          result = validators.validateEmail(value);
          break;
        case 'required':
          result = validators.validateRequired(value, fieldName);
          break;
        case 'username':
          result = validators.validateUsername(value);
          break;
        case 'numeric':
          result = validators.validateNumeric(value);
          break;
        case 'branch':
          result = validators.validateBranchName(value);
          break;
        case 'job':
          result = validators.validateJobName(value);
          break;
      }

      setFieldValidation(fieldName, result);
      onValidationChange?.(result.isValid);
    });

    onChange?.(e);
  };

  const inputClassName = `${className || ''} ${isFieldValid(fieldName) ? 'valid' : 'invalid'}`.trim();

  return (
    <input
      {...props}
      className={inputClassName}
      onChange={handleChange}
    />
  );
};
