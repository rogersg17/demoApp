export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ValidationOptions {
  [key: string]: unknown;
}

export interface ValidationContextType {
  errors: Record<string, string[]>;
  validateField: (field: string, value: string, type: string, options?: ValidationOptions) => ValidationResult;
  clearErrors: (field: string) => void;
  hasErrors: (field: string) => boolean;
  getErrors: (field: string) => string[];
}
