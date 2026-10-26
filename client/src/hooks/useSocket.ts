import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(onEvent?: (event: string, data: any) => void) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected to PouchTrack live feed');
    });

    socket.on('movement:recorded', (data) => {
      onEvent?.('movement:recorded', data);
    });

    socket.on('dashboard:update', (data) => {
      onEvent?.('dashboard:update', data);
    });

    socket.on('alert:created', (data) => {
      onEvent?.('alert:created', data);
    });

    return () => {
      socket.disconnect();
    };
  }, [onEvent]);

  return socketRef.current;
}
