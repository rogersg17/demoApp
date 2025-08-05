// Error types for better error handling
export interface ErrorInfo {
  type: 'network' | 'validation' | 'server' | 'auth' | 'timeout' | 'unknown';
  message: string;
  details?: string;
  code?: string | number;
  timestamp: Date;
  operation?: string;
  recoveryAction?: string;
}

// Success types for success notifications
export interface SuccessInfo {
  message: string;
  details?: string;
  operation?: string;
  timestamp: Date;
  autoHide?: boolean;
  hideDelay?: number;
  type?: 'save' | 'load' | 'connection' | 'reset' | 'general';
}

export class SettingsError extends Error {
  public readonly errorInfo: ErrorInfo;

  constructor(errorInfo: ErrorInfo) {
    super(errorInfo.message);
    this.name = 'SettingsError';
    this.errorInfo = errorInfo;
  }
}

// Error handling utilities
export const createErrorInfo = (
  type: ErrorInfo['type'],
  message: string,
  options: Partial<ErrorInfo> = {}
): ErrorInfo => ({
  type,
  message,
  timestamp: new Date(),
  ...options
});

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof SettingsError) {
    return error.errorInfo.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
};

export const getRecoveryAction = (errorInfo: ErrorInfo): string => {
  if (errorInfo.recoveryAction) {
    return errorInfo.recoveryAction;
  }

  switch (errorInfo.type) {
    case 'network':
      return 'Please check your internet connection and try again.';
    case 'validation':
      return 'Please correct the validation errors and try again.';
    case 'server':
      return 'The server is experiencing issues. Please try again later.';
    case 'auth':
      return 'Please log in again and try the operation.';
    case 'timeout':
      return 'The operation timed out. Please try again.';
    default:
      return 'Please try again or contact support if the problem persists.';
  }
};

export const parseApiError = async (response: Response): Promise<SettingsError> => {
  let errorMessage = 'Server error occurred';
  let errorDetails = '';
  let errorCode: string | number = response.status;

  try {
    const errorData = await response.json();
    errorMessage = errorData.error || errorData.message || errorMessage;
    errorDetails = errorData.details || '';
    errorCode = errorData.code || errorCode;
  } catch {
    // If we can't parse the response, use the status text
    errorMessage = response.statusText || errorMessage;
  }

  const errorType: ErrorInfo['type'] = response.status >= 500 ? 'server' : 
                                       response.status === 401 ? 'auth' : 
                                       response.status === 422 ? 'validation' : 
                                       'server';

  return new SettingsError(createErrorInfo(
    errorType,
    errorMessage,
    {
      details: errorDetails,
      code: errorCode,
      operation: 'API Request'
    }
  ));
};

export const parseNetworkError = (error: Error): SettingsError => {
  if (error.name === 'AbortError') {
    return new SettingsError(createErrorInfo(
      'timeout',
      'Request timed out',
      {
        details: 'The operation took too long to complete',
        operation: 'Network Request',
        recoveryAction: 'Please check your connection and try again'
      }
    ));
  }

  if (error.message.includes('fetch')) {
    return new SettingsError(createErrorInfo(
      'network',
      'Network connection failed',
      {
        details: error.message,
        operation: 'Network Request',
        recoveryAction: 'Please check your internet connection'
      }
    ));
  }

  return new SettingsError(createErrorInfo(
    'unknown',
    error.message,
    {
      details: error.stack,
      operation: 'Network Request'
    }
  ));
};

// Success handling utilities
export const createSuccessInfo = (
  message: string,
  options: Partial<SuccessInfo> = {}
): SuccessInfo => ({
  message,
  timestamp: new Date(),
  autoHide: true,
  hideDelay: 4000,
  type: 'general',
  ...options
});

export const createSaveSuccessInfo = (
  itemsSaved: string[] = [],
  options: Partial<SuccessInfo> = {}
): SuccessInfo => {
  const message = itemsSaved.length > 0 
    ? `Successfully saved ${itemsSaved.join(', ')}`
    : 'Settings saved successfully!';
  
  return createSuccessInfo(message, {
    operation: 'save-settings',
    type: 'save',
    details: itemsSaved.length > 0 ? `${itemsSaved.length} setting(s) updated` : undefined,
    ...options
  });
};

export const createLoadSuccessInfo = (
  source: 'server' | 'local' = 'server',
  options: Partial<SuccessInfo> = {}
): SuccessInfo => {
  const message = source === 'server' 
    ? 'Settings loaded from server'
    : 'Settings loaded from local storage';
  
  return createSuccessInfo(message, {
    operation: 'load-settings',
    type: 'load',
    details: `Settings retrieved from ${source}`,
    autoHide: true,
    hideDelay: 3000,
    ...options
  });
};

export const createConnectionSuccessInfo = (
  service: string,
  details?: string,
  options: Partial<SuccessInfo> = {}
): SuccessInfo => {
  const message = `${service} connection test successful`;
  
  return createSuccessInfo(message, {
    operation: `test-connection-${service.toLowerCase()}`,
    type: 'connection',
    details: details || `Successfully connected to ${service}`,
    hideDelay: 5000,
    ...options
  });
};

export const createResetSuccessInfo = (
  options: Partial<SuccessInfo> = {}
): SuccessInfo => {
  return createSuccessInfo('Settings reset to defaults', {
    operation: 'reset-settings',
    type: 'reset',
    details: 'All settings have been restored to their default values',
    hideDelay: 4000,
    ...options
  });
};
