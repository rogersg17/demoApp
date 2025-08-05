import { useState, useEffect, useCallback, useRef } from 'react';

export interface WebSocketMessage {
  type: 'build_completed' | 'test_failure' | 'jira_issue_created' | 'pipeline_status' | 'system_health';
  data: Record<string, unknown>;
  timestamp: string;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: WebSocketMessage | null;
  reconnectAttempts: number;
}

export const useWebSocketMVP = (config: WebSocketConfig): WebSocketState & {
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: Record<string, unknown>) => boolean;
  subscribe: (messageType: string, handler: (data: Record<string, unknown>) => void) => () => void;
} => {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
    reconnectAttempts: 0
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageHandlersRef = useRef<Map<string, ((data: Record<string, unknown>) => void)[]>>(new Map());

  const {
    url,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
    heartbeatInterval = 30000
  } = config;

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' } as const));
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || state.isConnecting) {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = (): void => {
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
          reconnectAttempts: 0
        }));
        startHeartbeat();
      };

      ws.onmessage = (event: MessageEvent): void => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setState(prev => ({ ...prev, lastMessage: message }));

          // Call registered handlers
          const handlers = messageHandlersRef.current.get(message.type) || [];
          handlers.forEach(handler => {
            try {
              handler(message.data);
            } catch (error) {
              console.error('Error in message handler:', error);
            }
          });
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event: CloseEvent): void => {
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          isConnecting: false,
          error: event.code !== 1000 ? `Connection closed: ${event.reason || 'Unknown reason'}` : null
        }));

        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Attempt reconnection if not a normal closure
        if (event.code !== 1000 && state.reconnectAttempts < maxReconnectAttempts) {
          setState(prev => ({ ...prev, reconnectAttempts: prev.reconnectAttempts + 1 }));
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (): void => {
        setState(prev => ({ 
          ...prev, 
          error: 'WebSocket connection error',
          isConnecting: false 
        }));
      };

    } catch (err) {
      console.error('Failed to create WebSocket connection:', err)
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to create WebSocket connection',
        isConnecting: false 
      }));
    }
  }, [url, state.isConnecting, state.reconnectAttempts, maxReconnectAttempts, reconnectInterval, startHeartbeat]);

  const disconnect = useCallback(() => {
    cleanup();
    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      error: null,
      reconnectAttempts: 0
    }));
  }, [cleanup]);

  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const subscribe = useCallback((messageType: string, handler: (data: Record<string, unknown>) => void) => {
    const handlers = messageHandlersRef.current.get(messageType) || [];
    handlers.push(handler);
    messageHandlersRef.current.set(messageType, handlers);

    // Return unsubscribe function
    return () => {
      const currentHandlers = messageHandlersRef.current.get(messageType) || [];
      const updatedHandlers = currentHandlers.filter(h => h !== handler);
      if (updatedHandlers.length === 0) {
        messageHandlersRef.current.delete(messageType);
      } else {
        messageHandlersRef.current.set(messageType, updatedHandlers);
      }
    };
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
    subscribe
  };
};
