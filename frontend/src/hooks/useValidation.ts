import { useContext } from 'react';
import { ValidationContext } from '../contexts/validation';

export const useValidation = () => {
  const context = useContext(ValidationContext);
  if (!context) {
    throw new Error('useValidation must be used within a ValidationProvider');
  }
  return context;
};
