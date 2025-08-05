import React, { useEffect, useState } from 'react';
import './SuccessNotification.css';

export interface SuccessInfo {
  message: string;
  details?: string;
  operation?: string;
  timestamp: Date;
  autoHide?: boolean;
  hideDelay?: number;
}

interface SuccessNotificationProps {
  success: SuccessInfo | null;
  onDismiss: () => void;
  className?: string;
}

const SuccessNotification: React.FC<SuccessNotificationProps> = ({
  success,
  onDismiss,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleDismiss = React.useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss();
    }, 300); // Wait for animation to complete
  }, [onDismiss]);

  useEffect(() => {
    if (success) {
      // Show notification
      setIsVisible(true);
      
      // Auto-hide if enabled
      if (success.autoHide !== false) {
        const hideDelay = success.hideDelay || 4000;
        const timer = setTimeout(() => {
          handleDismiss();
        }, hideDelay);
        
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
      setShowDetails(false);
    }
  }, [success, handleDismiss]);

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  if (!success) {
    return null;
  }

  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleTimeString();
  };

  return (
    <div className={`success-notification ${isVisible ? 'visible' : ''} ${className}`}>
      <div className="success-notification-content">
        <div className="success-header">
          <div className="success-icon">✅</div>
          <div className="success-message">
            <strong>{success.message}</strong>
            {success.operation && (
              <div className="success-operation">Operation: {success.operation}</div>
            )}
          </div>
          <button
            className="success-dismiss"
            onClick={handleDismiss}
            aria-label="Dismiss success notification"
          >
            ×
          </button>
        </div>

        {success.details && (
          <div className="success-expandable">
            <button
              className="success-expand-toggle"
              onClick={toggleDetails}
              aria-expanded={showDetails}
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
            
            {showDetails && (
              <div className="success-details">
                <div className="success-details-text">
                  <strong>Details:</strong> {success.details}
                </div>
                <div className="success-timestamp">
                  <strong>Completed at:</strong> {formatTimestamp(success.timestamp)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuccessNotification;
