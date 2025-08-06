import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { Backdrop, CircularProgress, Typography, Box, Fade } from '@mui/material';
import ProgressIndicator, { ProgressStatus } from '../progress/ProgressIndicator';

export interface LoadingState {
  id: string;
  message: string;
  progress?: number;
  status?: ProgressStatus;
  type: 'overlay' | 'inline' | 'component' | 'global';
  priority: 'low' | 'medium' | 'high';
  persistent?: boolean;
  timeout?: number;
  startTime: Date;
}

interface LoadingStateContextType {
  loadingStates: LoadingState[];
  startLoading: (config: Omit<LoadingState, 'id' | 'startTime'>) => string;
  updateLoading: (id: string, updates: Partial<Pick<LoadingState, 'message' | 'progress' | 'status'>>) => void;
  stopLoading: (id: string) => void;
  clearAll: () => void;
  isLoading: (id?: string) => boolean;
  getGlobalLoading: () => LoadingState | null;
}

type LoadingAction = 
  | { type: 'START_LOADING'; payload: LoadingState }
  | { type: 'UPDATE_LOADING'; payload: { id: string; updates: Partial<LoadingState> } }
  | { type: 'STOP_LOADING'; payload: string }
  | { type: 'CLEAR_ALL' }
  | { type: 'CLEANUP_EXPIRED' };

const LoadingStateContext = createContext<LoadingStateContextType | null>(null);

const loadingReducer = (state: LoadingState[], action: LoadingAction): LoadingState[] => {
  switch (action.type) {
    case 'START_LOADING':
      // Replace existing loading state with same ID, or add new one
      const filtered = state.filter(item => item.id !== action.payload.id);
      return [...filtered, action.payload].sort((a, b) => {
        // Sort by priority (high > medium > low) then by start time
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.startTime.getTime() - b.startTime.getTime();
      });
    
    case 'UPDATE_LOADING':
      return state.map(item => 
        item.id === action.payload.id 
          ? { ...item, ...action.payload.updates }
          : item
      );
    
    case 'STOP_LOADING':
      return state.filter(item => item.id !== action.payload);
    
    case 'CLEAR_ALL':
      return [];
    
    case 'CLEANUP_EXPIRED':
      const now = new Date();
      return state.filter(item => {
        if (!item.timeout) return true;
        return (now.getTime() - item.startTime.getTime()) < item.timeout;
      });
    
    default:
      return state;
  }
};

export const LoadingStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loadingStates, dispatch] = useReducer(loadingReducer, []);

  const generateId = useCallback(() => {
    return `loading-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const startLoading = useCallback((config: Omit<LoadingState, 'id' | 'startTime'>) => {
    const id = generateId();
    const loadingState: LoadingState = {
      ...config,
      id,
      startTime: new Date()
    };

    dispatch({ type: 'START_LOADING', payload: loadingState });

    // Auto-cleanup if timeout is set
    if (config.timeout) {
      setTimeout(() => {
        dispatch({ type: 'STOP_LOADING', payload: id });
      }, config.timeout);
    }

    return id;
  }, [generateId]);

  const updateLoading = useCallback((id: string, updates: Partial<Pick<LoadingState, 'message' | 'progress' | 'status'>>) => {
    dispatch({ type: 'UPDATE_LOADING', payload: { id, updates } });
  }, []);

  const stopLoading = useCallback((id: string) => {
    dispatch({ type: 'STOP_LOADING', payload: id });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const isLoading = useCallback((id?: string) => {
    if (id) {
      return loadingStates.some(state => state.id === id);
    }
    return loadingStates.length > 0;
  }, [loadingStates]);

  const getGlobalLoading = useCallback(() => {
    const globalLoadingStates = loadingStates.filter(state => state.type === 'global');
    return globalLoadingStates.length > 0 ? globalLoadingStates[0] : null;
  }, [loadingStates]);

  // Cleanup expired loading states periodically
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'CLEANUP_EXPIRED' });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const contextValue: LoadingStateContextType = {
    loadingStates,
    startLoading,
    updateLoading,
    stopLoading,
    clearAll,
    isLoading,
    getGlobalLoading
  };

  return (
    <LoadingStateContext.Provider value={contextValue}>
      {children}
      <GlobalLoadingOverlay />
    </LoadingStateContext.Provider>
  );
};

const GlobalLoadingOverlay: React.FC = () => {
  const context = useContext(LoadingStateContext);
  if (!context) return null;

  const { loadingStates } = context;
  const globalLoading = loadingStates.find(state => state.type === 'global' || state.type === 'overlay');

  if (!globalLoading) return null;

  return (
    <Backdrop
      sx={{ 
        color: '#fff', 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backdropFilter: 'blur(4px)',
        backgroundColor: 'rgba(0, 0, 0, 0.7)'
      }}
      open={true}
    >
      <Fade in timeout={300}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            p: 4,
            borderRadius: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            minWidth: 300
          }}
        >
          {globalLoading.progress !== undefined ? (
            <ProgressIndicator
              type="circular"
              progress={globalLoading.progress}
              status={globalLoading.status || 'running'}
              showPercentage={true}
              showStatus={false}
              size="large"
              animated={true}
              color="primary"
            />
          ) : (
            <CircularProgress size={60} thickness={4} sx={{ color: 'white' }} />
          )}
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
              {globalLoading.message}
            </Typography>
            {globalLoading.status && (
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                Status: {globalLoading.status.charAt(0).toUpperCase() + globalLoading.status.slice(1)}
              </Typography>
            )}
          </Box>
        </Box>
      </Fade>
    </Backdrop>
  );
};

export const useLoadingState = () => {
  const context = useContext(LoadingStateContext);
  if (!context) {
    throw new Error('useLoadingState must be used within a LoadingStateProvider');
  }
  return context;
};

// Higher-order component for automatic loading states
export const withLoadingState = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  defaultMessage: string = 'Loading...'
) => {
  return React.forwardRef<any, P & { loading?: boolean; loadingMessage?: string }>((props, ref) => {
    const { loading, loadingMessage, ...rest } = props;
    const { startLoading, stopLoading } = useLoadingState();
    const [loadingId, setLoadingId] = React.useState<string | null>(null);

    React.useEffect(() => {
      if (loading && !loadingId) {
        const id = startLoading({
          message: loadingMessage || defaultMessage,
          type: 'component',
          priority: 'medium'
        });
        setLoadingId(id);
      } else if (!loading && loadingId) {
        stopLoading(loadingId);
        setLoadingId(null);
      }
    }, [loading, loadingMessage, loadingId, startLoading, stopLoading]);

    React.useEffect(() => {
      return () => {
        if (loadingId) {
          stopLoading(loadingId);
        }
      };
    }, [loadingId, stopLoading]);

    return <WrappedComponent {...(rest as P)} ref={ref} />;
  });
};

// Hook for async operations with automatic loading states
export const useAsyncOperation = () => {
  const { startLoading, updateLoading, stopLoading } = useLoadingState();

  const executeWithLoading = useCallback(async <T>(
    operation: (updateProgress?: (progress: number, message?: string) => void) => Promise<T>,
    config: {
      message: string;
      type?: LoadingState['type'];
      priority?: LoadingState['priority'];
      showProgress?: boolean;
    }
  ): Promise<T> => {
    const loadingId = startLoading({
      message: config.message,
      type: config.type || 'global',
      priority: config.priority || 'medium',
      progress: config.showProgress ? 0 : undefined,
      status: 'running'
    });

    try {
      const updateProgress = config.showProgress ? (progress: number, message?: string) => {
        updateLoading(loadingId, { 
          progress, 
          message: message || config.message,
          status: progress === 100 ? 'completed' : 'running'
        });
      } : undefined;

      const result = await operation(updateProgress);
      
      if (config.showProgress) {
        updateLoading(loadingId, { progress: 100, status: 'completed' });
        // Brief delay to show completion
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      stopLoading(loadingId);
      return result;
    } catch (error) {
      updateLoading(loadingId, { status: 'failed' });
      // Brief delay to show error state
      setTimeout(() => stopLoading(loadingId), 1000);
      throw error;
    }
  }, [startLoading, updateLoading, stopLoading]);

  return { executeWithLoading };
};

export default LoadingStateProvider;