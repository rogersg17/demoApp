import React from 'react';
import { CircularProgress, LinearProgress, Box, Typography, Fade, Chip } from '@mui/material';
import type { ChipProps } from '@mui/material/Chip';
import { CheckCircle, Error as ErrorIcon, Warning, Schedule } from '@mui/icons-material';
import './ProgressIndicator.css';

export type ProgressStatus = 'idle' | 'pending' | 'running' | 'completed' | 'failed' | 'warning' | 'cancelled';

export interface ProgressStep {
  id: string;
  label: string;
  status: ProgressStatus;
  progress?: number;
  message?: string;
  duration?: number;
  startTime?: string;
  endTime?: string;
}

export interface ProgressIndicatorProps {
  type?: 'linear' | 'circular' | 'steps' | 'dots';
  progress?: number;
  status?: ProgressStatus;
  label?: string;
  message?: string;
  steps?: ProgressStep[];
  showPercentage?: boolean;
  showStatus?: boolean;
  showTimer?: boolean;
  animated?: boolean;
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  variant?: 'determinate' | 'indeterminate';
}

const getStatusIcon = (status: ProgressStatus, size: 'small' | 'medium' | 'large' = 'medium') => {
  const iconSize = size === 'small' ? 16 : size === 'medium' ? 20 : 24;
  
  switch (status) {
    case 'completed':
      return <CheckCircle sx={{ fontSize: iconSize, color: 'success.main' }} />;
    case 'failed':
      return <ErrorIcon sx={{ fontSize: iconSize, color: 'error.main' }} />;
    case 'warning':
      return <Warning sx={{ fontSize: iconSize, color: 'warning.main' }} />;
    case 'running':
      return <CircularProgress size={iconSize} sx={{ color: 'primary.main' }} />;
    case 'pending':
      return <Schedule sx={{ fontSize: iconSize, color: 'text.secondary' }} />;
    case 'cancelled':
      return <Warning sx={{ fontSize: iconSize, color: 'text.disabled' }} />;
    default:
      return <Schedule sx={{ fontSize: iconSize, color: 'text.secondary' }} />;
  }
};

const getStatusColor = (status: ProgressStatus): NonNullable<ChipProps['color']> => {
  switch (status) {
    case 'completed': return 'success';
    case 'failed': return 'error';
    case 'warning': return 'warning';
    case 'running': return 'primary';
    case 'pending': return 'default';
    case 'cancelled': return 'default';
    default: return 'default';
  }
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
};

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  type = 'linear',
  progress = 0,
  status = 'idle',
  label,
  message,
  steps,
  showPercentage = true,
  showStatus = true,
  showTimer = false,
  animated = true,
  size = 'medium',
  color = 'primary',
  variant = 'determinate'
}) => {
  const [elapsedTime, setElapsedTime] = React.useState(0);
  const startTimeRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (status === 'running' && showTimer) {
      startTimeRef.current = Date.now();
      const interval = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Date.now() - startTimeRef.current);
        }
      }, 100);
      return () => clearInterval(interval);
    } else if (status !== 'running') {
      startTimeRef.current = null;
      setElapsedTime(0);
    }
  }, [status, showTimer]);

  if (type === 'steps' && steps) {
    return (
      <Box className={`progress-steps ${animated ? 'animated' : ''}`}>
        {label && (
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            {label}
          </Typography>
        )}
        <Box className="steps-container">
          {steps.map((step, index) => (
            <Fade key={step.id} in timeout={300 + index * 100}>
              <Box className={`step-item step-${step.status}`}>
                <Box className="step-indicator">
                  <Box className="step-number">
                    {step.status === 'idle' || step.status === 'pending' ? (
                      <Typography variant="caption">{index + 1}</Typography>
                    ) : (
                      getStatusIcon(step.status, 'small')
                    )}
                  </Box>
                  {index < steps.length - 1 && (
                    <Box className={`step-connector ${step.status === 'completed' ? 'completed' : ''}`} />
                  )}
                </Box>
                <Box className="step-content">
                  <Typography variant="body2" fontWeight={500}>
                    {step.label}
                  </Typography>
                  {step.message && (
                    <Typography variant="caption" color="text.secondary">
                      {step.message}
                    </Typography>
                  )}
                  {step.progress !== undefined && step.status === 'running' && (
                    <LinearProgress
                      variant="determinate"
                      value={step.progress}
                      sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                    />
                  )}
                  {step.duration && step.status === 'completed' && (
                    <Typography variant="caption" color="success.main">
                      Completed in {formatDuration(step.duration)}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Fade>
          ))}
        </Box>
      </Box>
    );
  }

  if (type === 'dots') {
    return (
      <Box className={`progress-dots ${animated ? 'animated' : ''}`}>
        {label && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            {label}
          </Typography>
        )}
        <Box className="dots-container">
          {[...Array(5)].map((_, i) => (
            <Box
              key={i}
              className={`dot ${status === 'running' ? 'active' : ''}`}
              sx={{
                animationDelay: `${i * 0.1}s`,
                backgroundColor: status === 'running' ? 'primary.main' : 'grey.300'
              }}
            />
          ))}
        </Box>
        {message && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            {message}
          </Typography>
        )}
      </Box>
    );
  }

  if (type === 'circular') {
    return (
      <Box className={`progress-circular ${animated ? 'animated' : ''}`}>
        <Box className="circular-container">
          <CircularProgress
            variant={variant}
            value={progress}
            size={size === 'small' ? 40 : size === 'medium' ? 60 : 80}
            thickness={4}
            sx={{
              color: `${color}.main`,
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              },
            }}
          />
          {showPercentage && variant === 'determinate' && (
            <Box className="circular-label">
              <Typography variant={size === 'small' ? 'caption' : 'body2'} fontWeight={600}>
                {Math.round(progress)}%
              </Typography>
            </Box>
          )}
          {showStatus && (
            <Box className="circular-status">
              {getStatusIcon(status, size)}
            </Box>
          )}
        </Box>
        {label && (
          <Typography variant="body2" align="center" sx={{ mt: 1 }}>
            {label}
          </Typography>
        )}
        {message && (
          <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 0.5 }}>
            {message}
          </Typography>
        )}
        {showTimer && elapsedTime > 0 && (
          <Typography variant="caption" color="primary.main" align="center" sx={{ mt: 0.5 }}>
            {formatDuration(elapsedTime)}
          </Typography>
        )}
      </Box>
    );
  }

  // Default: linear progress
  return (
    <Box className={`progress-linear ${animated ? 'animated' : ''}`}>
      <Box className="progress-header">
        {label && (
          <Typography variant="body2" fontWeight={500}>
            {label}
          </Typography>
        )}
        <Box className="progress-indicators">
          {showStatus && (
            <Chip
              icon={getStatusIcon(status, 'small')}
              label={status.charAt(0).toUpperCase() + status.slice(1)}
              size="small"
              color={getStatusColor(status)}
              variant="outlined"
            />
          )}
          {showPercentage && variant === 'determinate' && (
            <Typography variant="body2" color="text.secondary">
              {Math.round(progress)}%
            </Typography>
          )}
          {showTimer && elapsedTime > 0 && (
            <Typography variant="caption" color="primary.main">
              {formatDuration(elapsedTime)}
            </Typography>
          )}
        </Box>
      </Box>
      <LinearProgress
        variant={variant}
        value={progress}
        sx={{
          height: size === 'small' ? 4 : size === 'medium' ? 6 : 8,
          borderRadius: 3,
          backgroundColor: 'grey.200',
          '& .MuiLinearProgress-bar': {
            borderRadius: 3,
            backgroundColor: `${color}.main`,
          },
        }}
      />
      {message && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default ProgressIndicator;