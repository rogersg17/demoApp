import { createContext } from 'react';
import type { FieldValidation, ValidationResult } from '../utils/validation';

export interface ValidationContextType {
  validation: FieldValidation;
  setFieldValidation: (fieldName: string, result: ValidationResult) => void;
  clearValidation: () => void;
  getFieldError: (fieldName: string) => string | null;
  isFieldValid: (fieldName: string) => boolean;
  hasErrors: boolean;
}

export const ValidationContext = createContext<ValidationContextType | null>(null);