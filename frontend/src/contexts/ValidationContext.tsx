import React, { createContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { FieldValidation, ValidationResult } from '../utils/validation';

interface ValidationContextType {
  validation: FieldValidation;
  setFieldValidation: (fieldName: string, result: ValidationResult) => void;
  clearValidation: () => void;
  getFieldError: (fieldName: string) => string | null;
  isFieldValid: (fieldName: string) => boolean;
  hasErrors: boolean;
}

export const ValidationContext = createContext<ValidationContextType | null>(null);

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
