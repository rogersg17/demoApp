import React, { useState } from 'react';
import type { ReactNode } from 'react';
import type { FieldValidation, ValidationResult } from '../utils/validation';
import { ValidationContext } from './validation';

export { ValidationContext };

interface ValidationProviderProps {
  children: ReactNode;
}

export const ValidationProvider: React.FC<ValidationProviderProps> = ({ children }) => {
  const [validation, setValidation] = useState<FieldValidation>({});

  const setFieldValidation = (fieldName: string, result: ValidationResult) => {
    setValidation(prev => ({
      ...prev,
      [fieldName]: result
    }));
  };

  const clearValidation = () => {
    setValidation({});
  };

  const getFieldError = (fieldName: string): string | null => {
    const fieldValidation = validation[fieldName];
    if (!fieldValidation || fieldValidation.isValid) {
      return null;
    }
    return fieldValidation.errors[0] || null;
  };

  const isFieldValid = (fieldName: string): boolean => {
    const fieldValidation = validation[fieldName];
    return !fieldValidation || fieldValidation.isValid;
  };

  const hasErrors = Object.values(validation).some(field => !field.isValid);

  return (
    <ValidationContext.Provider value={{
      validation,
      setFieldValidation,
      clearValidation,
      getFieldError,
      isFieldValid,
      hasErrors
    }}>
      {children}
    </ValidationContext.Provider>
  );
};
