import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseSocketOptions {
  url?: string
  autoConnect?: boolean
}

interface SocketHook {
  socket: Socket | null
  isConnected: boolean
  emit: (event: string, data?: unknown) => void
  disconnect: () => void
}

export function useSocket(options: UseSocketOptions = {}): SocketHook {
  const { url = 'http://localhost:3000', autoConnect = true } = options
  const socketRef = useRef<Socket | null>(null)
  const isConnectedRef = useRef(false)

  useEffect(() => {
    if (autoConnect && !socketRef.current) {
      console.log('🔌 Connecting to WebSocket server...')
      
      socketRef.current = io(url, {
        withCredentials: true,
        transports: ['websocket', 'polling']
      })

      socketRef.current.on('connect', () => {
        console.log('✅ Connected to WebSocket server')
        isConnectedRef.current = true
      })

      socketRef.current.on('disconnect', () => {
        console.log('🔌 Disconnected from WebSocket server')
        isConnectedRef.current = false
      })

      socketRef.current.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error)
        isConnectedRef.current = false
      })
    }

    return () => {
      if (socketRef.current) {
        console.log('🔌 Cleaning up WebSocket connection')
        socketRef.current.disconnect()
        socketRef.current = null
        isConnectedRef.current = false
      }
    }
  }, [url, autoConnect])

  const emit = (event: string, data?: unknown) => {
    if (socketRef.current && isConnectedRef.current) {
      socketRef.current.emit(event, data)
    } else {
      console.warn('⚠️ Cannot emit event - WebSocket not connected')
    }
  }

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
      isConnectedRef.current = false
    }
  }

  return {
    socket: socketRef.current,
    isConnected: isConnectedRef.current,
    emit,
    disconnect
  }
}

export default useSocket
