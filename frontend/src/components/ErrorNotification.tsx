import React, { useState, useEffect, useCallback } from 'react';
import type { ErrorInfo } from '../utils/errorUtils';
import { getRecoveryAction } from '../utils/errorUtils';
import './ErrorNotification.css';

interface ErrorNotificationProps {
  error: string | ErrorInfo | null;
  onDismiss: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
  showRetry?: boolean;
  onRetry?: () => void;
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  onDismiss,
  autoHide = true,
  autoHideDelay = 5000,
  showRetry = false,
  onRetry
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss();
    }, 300); // Allow animation to complete
  }, [onDismiss]);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      
      if (autoHide) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, autoHideDelay);
        
        return () => clearTimeout(timer);
      }
    }
  }, [error, autoHide, autoHideDelay, onDismiss]);

  if (!error) return null;

  const errorInfo = typeof error === 'string' 
    ? { type: 'unknown' as const, message: error, timestamp: new Date() }
    : error;

  const getErrorIcon = (type: ErrorInfo['type']) => {
    switch (type) {
      case 'network': return '🌐';
      case 'validation': return '⚠️';
      case 'server': return '🔧';
      case 'auth': return '🔐';
      case 'timeout': return '⏱️';
      default: return '❌';
    }
  };

  const getErrorColor = (type: ErrorInfo['type']) => {
    switch (type) {
      case 'network': return 'error-network';
      case 'validation': return 'error-validation';
      case 'server': return 'error-server';
      case 'auth': return 'error-auth';
      case 'timeout': return 'error-timeout';
      default: return 'error-unknown';
    }
  };

  return (
    <div className={`error-notification ${getErrorColor(errorInfo.type)} ${isVisible ? 'visible' : ''}`}>
      <div className="error-notification-content">
        <div className="error-header">
          <span className="error-icon">{getErrorIcon(errorInfo.type)}</span>
          <div className="error-message">
            <strong>{errorInfo.message}</strong>
            {errorInfo.operation && (
              <span className="error-operation">in {errorInfo.operation}</span>
            )}
          </div>
          <button 
            className="error-dismiss"
            onClick={handleDismiss}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>

        <div className="error-recovery">
          <span className="recovery-text">
            {getRecoveryAction(errorInfo)}
          </span>
        </div>

        {(errorInfo.details || errorInfo.code) && (
          <div className="error-expandable">
            <button 
              className="error-expand-toggle"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Hide' : 'Show'} details
            </button>
            
            {isExpanded && (
              <div className="error-details">
                {errorInfo.code && (
                  <div className="error-code">
                    <strong>Error Code:</strong> {errorInfo.code}
                  </div>
                )}
                {errorInfo.details && (
                  <div className="error-details-text">
                    <strong>Details:</strong> {errorInfo.details}
                  </div>
                )}
                <div className="error-timestamp">
                  <strong>Time:</strong> {errorInfo.timestamp.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        )}

        {showRetry && onRetry && (
          <div className="error-actions">
            <button 
              className="btn btn-retry"
              onClick={onRetry}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorNotification;
