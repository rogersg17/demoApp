import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  IconButton,
  Button,
  Tooltip,
  CircularProgress,
  Collapse
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  BugReport as BugIcon,
  Link as LinkIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

interface TestFailure {
  id: string;
  testName: string;
  pipeline: {
    id: string;
    name: string;
  };
  buildId: string;
  failureReason: string;
  failureType: 'assertion' | 'timeout' | 'setup' | 'teardown' | 'flaky' | 'infrastructure';
  failedAt: string;
  duration: number;
  stackTrace?: string;
  screenshots?: string[];
  jiraIssue?: {
    key: string;
    status: string;
    url: string;
  };
  flakyScore?: number;
  similarFailures: number;
  isAnalyzed: boolean;
}

interface RecentFailuresProps {
  failures: TestFailure[];
  onRefresh: () => void;
  onNavigateToTest: (testId: string) => void;
  onCreateJiraIssue: (failure: TestFailure) => void;
  onViewJiraIssue: (jiraKey: string) => void;
  isLoading: boolean;
}

const RecentFailures: React.FC<RecentFailuresProps> = ({
  failures = [],
  onRefresh,
  onNavigateToTest,
  onCreateJiraIssue,
  onViewJiraIssue,
  isLoading
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getFailureTypeColor = (type: string) => {
    switch (type) {
      case 'assertion':
        return 'error';
      case 'timeout':
        return 'warning';
      case 'flaky':
        return 'info';
      case 'infrastructure':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getFailureTypeIcon = (type: string) => {
    switch (type) {
      case 'assertion':
      case 'setup':
      case 'teardown':
        return <ErrorIcon color="error" />;
      case 'timeout':
      case 'infrastructure':
        return <WarningIcon color="warning" />;
      case 'flaky':
        return <BugIcon color="info" />;
      default:
        return <ErrorIcon color="disabled" />;
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading && failures.length === 0) {
    return (
      <Card className="recent-failures">
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <Box textAlign="center">
              <CircularProgress size={40} />
              <Typography variant="body2" sx={{ mt: 2 }}>
                Loading recent failures...
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="recent-failures">
      <CardContent>
        {/* Header */}
        <Box className="recent-failures-header">
          <Typography variant="h6" component="h2">
            Recent Test Failures
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title="Refresh failures data">
              <IconButton 
                onClick={handleRefresh} 
                disabled={refreshing}
                size="small"
              >
                {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Summary */}
        {failures.length > 0 && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {failures.length} recent failures • {failures.filter(f => !f.jiraIssue).length} without JIRA issues • 
              {failures.filter(f => f.flakyScore && f.flakyScore > 0.7).length} likely flaky
            </Typography>
          </Box>
        )}

        {/* Failures List */}
        {failures.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography variant="body1" color="text.secondary">
              No recent test failures. Great job! 🎉
            </Typography>
          </Box>
        ) : (
          <List className="failures-list">
            {failures.map((failure) => {
              const isExpanded = expandedItems.has(failure.id);
              
              return (
                <React.Fragment key={failure.id}>
                  <ListItem 
                    className={`failure-item ${failure.failureType}`}
                    sx={{ 
                      border: 1, 
                      borderColor: 'divider', 
                      borderRadius: 1, 
                      mb: 1,
                      backgroundColor: 'background.paper'
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'transparent' }}>
                        {getFailureTypeIcon(failure.failureType)}
                      </Avatar>
                    </ListItemAvatar>

                    <ListItemText
                      primary={
                        <Box>
                          <Typography variant="subtitle2" component="div">
                            {failure.testName}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1} sx={{ mt: 0.5 }}>
                            <Chip 
                              size="small" 
                              label={failure.failureType}
                              color={getFailureTypeColor(failure.failureType) as any}
                              variant="outlined"
                            />
                            {failure.flakyScore && failure.flakyScore > 0.7 && (
                              <Chip 
                                size="small" 
                                label={`Flaky (${(failure.flakyScore * 100).toFixed(0)}%)`}
                                color="info"
                                variant="outlined"
                              />
                            )}
                            {failure.jiraIssue && (
                              <Chip 
                                size="small" 
                                label={failure.jiraIssue.key}
                                color="primary"
                                variant="outlined"
                                clickable
                                onClick={() => onViewJiraIssue(failure.jiraIssue!.key)}
                                icon={<LinkIcon />}
                              />
                            )}
                          </Box>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Pipeline: {failure.pipeline.name} • Build: {failure.buildId}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {getRelativeTime(failure.failedAt)} • Duration: {formatDuration(failure.duration)}
                          </Typography>
                          <Typography variant="body2" color="error.main" sx={{ mt: 0.5 }}>
                            {truncateText(failure.failureReason)}
                          </Typography>
                          {failure.similarFailures > 0 && (
                            <Typography variant="caption" color="warning.main">
                              {failure.similarFailures} similar failures found
                            </Typography>
                          )}
                        </Box>
                      }
                    />

                    <Box display="flex" flexDirection="column" alignItems="flex-end" gap={1}>
                      {/* Action Buttons */}
                      <Box display="flex" gap={1}>
                        <Tooltip title="View test details">
                          <IconButton 
                            size="small"
                            onClick={() => onNavigateToTest(failure.id)}
                          >
                            <BugIcon />
                          </IconButton>
                        </Tooltip>
                        
                        {!failure.jiraIssue && (
                          <Tooltip title="Create JIRA issue">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => onCreateJiraIssue(failure)}
                            >
                              Create Issue
                            </Button>
                          </Tooltip>
                        )}

                        <Tooltip title={isExpanded ? "Collapse details" : "Expand details"}>
                          <IconButton 
                            size="small"
                            onClick={() => toggleExpanded(failure.id)}
                          >
                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </Tooltip>
                      </Box>

                      <Typography variant="caption" color="text.secondary" textAlign="right">
                        <ScheduleIcon fontSize="inherit" sx={{ mr: 0.5 }} />
                        {getRelativeTime(failure.failedAt)}
                      </Typography>
                    </Box>
                  </ListItem>

                  {/* Expanded Details */}
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Box sx={{ ml: 7, mr: 2, mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      {/* Full Error Message */}
                      <Typography variant="subtitle2" gutterBottom>
                        Failure Details:
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                        {failure.failureReason}
                      </Typography>

                      {/* Stack Trace */}
                      {failure.stackTrace && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Stack Trace:
                          </Typography>
                          <Box 
                            sx={{ 
                              p: 1, 
                              bgcolor: 'grey.100', 
                              borderRadius: 1, 
                              maxHeight: 200, 
                              overflow: 'auto' 
                            }}
                          >
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                              {failure.stackTrace}
                            </Typography>
                          </Box>
                        </Box>
                      )}

                      {/* JIRA Issue Details */}
                      {failure.jiraIssue && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Associated JIRA Issue:
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip 
                              label={failure.jiraIssue.key}
                              color="primary"
                              variant="outlined"
                              clickable
                              onClick={() => onViewJiraIssue(failure.jiraIssue!.key)}
                            />
                            <Typography variant="body2">
                              Status: {failure.jiraIssue.status}
                            </Typography>
                          </Box>
                        </Box>
                      )}

                      {/* Screenshots */}
                      {failure.screenshots && failure.screenshots.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            Screenshots:
                          </Typography>
                          <Box display="flex" gap={1} flexWrap="wrap">
                            {failure.screenshots.map((screenshot, index) => (
                              <Button
                                key={index}
                                size="small"
                                variant="outlined"
                                onClick={() => window.open(screenshot, '_blank')}
                              >
                                Screenshot {index + 1}
                              </Button>
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Collapse>
                </React.Fragment>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentFailures;
