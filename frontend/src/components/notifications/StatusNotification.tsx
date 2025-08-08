import React, { useState } from 'react';
import { 
  Alert, 
  Snackbar, 
  Box, 
  Typography, 
  IconButton, 
  Collapse, 
  Chip,
  Badge
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import ProgressIndicator from '../progress/ProgressIndicator';
import type { ProgressStatus } from '../progress/ProgressIndicator';
import './StatusNotification.css';

export interface StatusUpdate {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'progress';
  title: string;
  message?: string;
  details?: string[];
  progress?: number;
  status?: ProgressStatus;
  timestamp: Date;
  duration?: number;
  autoHide?: boolean;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'text' | 'outlined' | 'contained';
  }>;
}

interface StatusNotificationProps {
  updates: StatusUpdate[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
  maxVisible?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  showTimestamps?: boolean;
  groupSimilar?: boolean;
}

const StatusNotification: React.FC<StatusNotificationProps> = ({
  updates,
  onDismiss,
  onClearAll,
  maxVisible = 5,
  position = 'top-right',
  showTimestamps = true,
  groupSimilar = true
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // icon selection handled inline where needed

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return timestamp.toLocaleDateString();
  };

  const groupedUpdates = groupSimilar 
    ? updates.reduce((acc, update) => {
        const key = `${update.type}-${update.title}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(update);
        return acc;
      }, {} as Record<string, StatusUpdate[]>)
    : { single: updates };

  const visibleUpdates = Object.values(groupedUpdates)
    .map(group => group[group.length - 1]) // Take the latest from each group
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, maxVisible);

  const getAnchorOrigin = () => {
    switch (position) {
      case 'top-right':
        return { vertical: 'top' as const, horizontal: 'right' as const };
      case 'top-left':
        return { vertical: 'top' as const, horizontal: 'left' as const };
      case 'bottom-right':
        return { vertical: 'bottom' as const, horizontal: 'right' as const };
      case 'bottom-left':
        return { vertical: 'bottom' as const, horizontal: 'left' as const };
      case 'top-center':
        return { vertical: 'top' as const, horizontal: 'center' as const };
      case 'bottom-center':
        return { vertical: 'bottom' as const, horizontal: 'center' as const };
      default:
        return { vertical: 'top' as const, horizontal: 'right' as const };
    }
  };

  return (
    <Box className={`status-notifications position-${position}`}>
      {visibleUpdates.map((update) => {
        const isExpanded = expandedItems.has(update.id);
        const isHovered = hoveredItem === update.id;
        const hasDetails = update.details && update.details.length > 0;
        const group = groupedUpdates[`${update.type}-${update.title}`] || [update];
        const count = group.length;

        return (
          <Snackbar
            key={update.id}
            open={true}
            anchorOrigin={getAnchorOrigin()}
            sx={{ 
              position: 'relative',
              mb: 1,
              '& .MuiSnackbarContent-root': {
                padding: 0,
                backgroundColor: 'transparent',
                boxShadow: 'none',
              }
            }}
          >
            <Alert
              severity={update.type === 'progress' ? 'info' : update.type}
              variant="filled"
              onClose={() => onDismiss(update.id)}
              sx={{ 
                minWidth: 350,
                maxWidth: 450,
                borderRadius: 2,
                boxShadow: 3,
                transition: 'all 0.3s ease',
                transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                '& .MuiAlert-message': { 
                  width: '100%',
                  padding: 0
                }
              }}
              onMouseEnter={() => setHoveredItem(update.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <Box className="notification-content">
                <Box className="notification-header">
                  <Box className="notification-title">
                    <Typography variant="subtitle2" fontWeight={600}>
                      {update.title}
                      {count > 1 && (
                        <Badge 
                          badgeContent={count} 
                          color="secondary" 
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Typography>
                    {showTimestamps && (
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>
                        {formatTimestamp(update.timestamp)}
                      </Typography>
                    )}
                  </Box>
                  {hasDetails && (
                    <IconButton
                      size="small"
                      onClick={() => toggleExpanded(update.id)}
                      sx={{ color: 'inherit', p: 0.5 }}
                    >
                      {isExpanded ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  )}
                </Box>

                {update.message && (
                  <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9 }}>
                    {update.message}
                  </Typography>
                )}

                {update.type === 'progress' && (
                  <Box sx={{ mt: 1 }}>
                    <ProgressIndicator
                      type="linear"
                      progress={update.progress || 0}
                      status={update.status || 'running'}
                      variant={update.progress !== undefined ? 'determinate' : 'indeterminate'}
                      showPercentage={update.progress !== undefined}
                      showStatus={false}
                      size="small"
                      animated={true}
                    />
                  </Box>
                )}

                {update.duration && (
                  <Chip
                    size="small"
                    label={`${update.duration}ms`}
                    sx={{ mt: 1, opacity: 0.8 }}
                  />
                )}

                <Collapse in={isExpanded}>
                  {hasDetails && (
                    <Box sx={{ mt: 2, p: 1, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                      {update.details!.map((detail, index) => (
                        <Typography 
                          key={index} 
                          variant="caption" 
                          sx={{ display: 'block', mb: 0.5 }}
                        >
                          • {detail}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Collapse>

                {update.actions && update.actions.length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {update.actions.map((action, index) => (
                      <Chip
                        key={index}
                        label={action.label}
                        onClick={action.action}
                        size="small"
                        variant={action.variant === 'contained' ? 'filled' : 'outlined'}
                        clickable
                        sx={{ 
                          color: 'inherit',
                          borderColor: 'rgba(255,255,255,0.5)',
                          '&:hover': {
                            backgroundColor: 'rgba(255,255,255,0.2)'
                          }
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </Alert>
          </Snackbar>
        );
      })}

      {updates.length > maxVisible && (
        <Box className="notification-overflow">
          <Alert 
            severity="info" 
            variant="outlined"
            sx={{ 
              cursor: 'pointer',
              '&:hover': { backgroundColor: 'action.hover' }
            }}
            onClick={onClearAll}
          >
            <Typography variant="body2">
              +{updates.length - maxVisible} more notifications
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                Click to clear all
              </Typography>
            </Typography>
          </Alert>
        </Box>
      )}
    </Box>
  );
};

export default StatusNotification;