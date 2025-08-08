import { useState, useCallback, useEffect, useRef } from 'react';
import type { StatusUpdate } from '../components/notifications/StatusNotification';
import type { ProgressStatus } from '../components/progress/ProgressIndicator';

export interface UseStatusUpdatesOptions {
  maxUpdates?: number;
  autoHideDelay?: number;
  persistentTypes?: Array<StatusUpdate['type']>;
}

export interface ProgressTracker {
  id: string;
  title: string;
  progress: number;
  status: ProgressStatus;
  message?: string;
  startTime: Date;
  estimatedDuration?: number;
}

export const useStatusUpdates = (options: UseStatusUpdatesOptions = {}) => {
  const {
    maxUpdates = 50,
    autoHideDelay = 5000,
    persistentTypes = ['progress']
  } = options;

  const [updates, setUpdates] = useState<StatusUpdate[]>([]);
  const [progressTrackers, setProgressTrackers] = useState<Map<string, ProgressTracker>>(new Map());
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const generateId = useCallback(() => {
    return `status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const addUpdate = useCallback((update: Omit<StatusUpdate, 'id' | 'timestamp'>) => {
    const newUpdate: StatusUpdate = {
      ...update,
      id: generateId(),
      timestamp: new Date(),
      autoHide: update.autoHide ?? !persistentTypes.includes(update.type)
    };

    setUpdates(prev => {
      const filtered = prev.slice(0, maxUpdates - 1);
      return [newUpdate, ...filtered];
    });

    // Auto-hide non-persistent updates
    if (newUpdate.autoHide && !persistentTypes.includes(newUpdate.type)) {
      const timeout = setTimeout(() => {
        dismissUpdate(newUpdate.id);
      }, autoHideDelay);
      
      timeoutsRef.current.set(newUpdate.id, timeout);
    }

    return newUpdate.id;
  }, [generateId, maxUpdates, autoHideDelay, persistentTypes]);

  const dismissUpdate = useCallback((id: string) => {
    setUpdates(prev => prev.filter(update => update.id !== id));
    
    // Clear timeout if exists
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const clearAll = useCallback(() => {
    setUpdates([]);
    // Clear all timeouts
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current.clear();
  }, []);

  const updateProgress = useCallback((id: string, progress: number, status?: ProgressStatus, message?: string) => {
    setUpdates(prev => prev.map(update => {
      if (update.id === id && update.type === 'progress') {
        return {
          ...update,
          progress,
          status: status || update.status,
          message: message || update.message,
          timestamp: new Date()
        };
      }
      return update;
    }));

    // Update progress tracker
    setProgressTrackers(prev => {
      const tracker = prev.get(id);
      if (tracker) {
        const updated = new Map(prev);
        updated.set(id, {
          ...tracker,
          progress,
          status: status || tracker.status,
          message: message || tracker.message
        });
        return updated;
      }
      return prev;
    });
  }, []);

  const startProgress = useCallback((title: string, message?: string, estimatedDuration?: number) => {
    const id = addUpdate({
      type: 'progress',
      title,
      message,
      progress: 0,
      status: 'running',
      persistent: true
    });

    // Create progress tracker
    const tracker: ProgressTracker = {
      id,
      title,
      progress: 0,
      status: 'running',
      message,
      startTime: new Date(),
      estimatedDuration
    };

    setProgressTrackers(prev => new Map(prev).set(id, tracker));
    return id;
  }, [addUpdate]);

  const completeProgress = useCallback((id: string, message?: string, duration?: number) => {
    updateProgress(id, 100, 'completed', message);
    
    setUpdates(prev => prev.map(update => {
      if (update.id === id) {
        return {
          ...update,
          type: 'success' as const,
          progress: undefined,
          status: undefined,
          duration,
          autoHide: true
        };
      }
      return update;
    }));

    // Auto-hide completed progress after delay
    setTimeout(() => {
      dismissUpdate(id);
    }, autoHideDelay);

    // Remove from progress trackers
    setProgressTrackers(prev => {
      const updated = new Map(prev);
      updated.delete(id);
      return updated;
    });
  }, [updateProgress, dismissUpdate, autoHideDelay]);

  const failProgress = useCallback((id: string, error: string, details?: string[]) => {
    setUpdates(prev => prev.map(update => {
      if (update.id === id) {
        return {
          ...update,
          type: 'error' as const,
          message: error,
          details,
          progress: undefined,
          status: undefined,
          persistent: true
        };
      }
      return update;
    }));

    // Remove from progress trackers
    setProgressTrackers(prev => {
      const updated = new Map(prev);
      updated.delete(id);
      return updated;
    });
  }, []);

  // Convenience methods for different update types
  const success = useCallback((title: string, message?: string, details?: string[]) => {
    return addUpdate({ type: 'success', title, message, details });
  }, [addUpdate]);

  const error = useCallback((title: string, message?: string, details?: string[]) => {
    return addUpdate({ type: 'error', title, message, details, persistent: true });
  }, [addUpdate]);

  const warning = useCallback((title: string, message?: string, details?: string[]) => {
    return addUpdate({ type: 'warning', title, message, details });
  }, [addUpdate]);

  const info = useCallback((title: string, message?: string, details?: string[]) => {
    return addUpdate({ type: 'info', title, message, details });
  }, [addUpdate]);

  // Batch operations
  const addBatch = useCallback((updates: Array<Omit<StatusUpdate, 'id' | 'timestamp'>>) => {
    const ids = updates.map(update => addUpdate(update));
    return ids;
  }, [addUpdate]);

  // Get progress tracker by ID
  const getProgressTracker = useCallback((id: string) => {
    return progressTrackers.get(id);
  }, [progressTrackers]);

  // Get all active progress trackers
  const getActiveProgress = useCallback(() => {
    return Array.from(progressTrackers.values());
  }, [progressTrackers]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, []);

  return {
    updates,
    progressTrackers: Array.from(progressTrackers.values()),
    addUpdate,
    dismissUpdate,
    clearAll,
    updateProgress,
    startProgress,
    completeProgress,
    failProgress,
    success,
    error,
    warning,
    info,
    addBatch,
    getProgressTracker,
    getActiveProgress
  };
};

export default useStatusUpdates;