import React, { createContext, useEffect, useState } from 'react';
import { socketService } from '../services/socket';

export const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    socketService.connect();
    setIsConnected(socketService.isConnected);

    // Check status periodically or on mock events
    const timer = setInterval(() => {
      setIsConnected(socketService.isConnected);
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketService, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
