import { io } from 'socket.io-client';
import { USE_MOCK } from './api/client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.mockListeners = new Map();
    this.isConnected = false;
  }

  connect() {
    if (USE_MOCK) {
      this.isConnected = true;
      console.log('[C2 SOCKET] Mock Real-Time Event Bus Connected');
      return this;
    }

    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        console.log('[C2 SOCKET] Live WebSocket Connected to', SOCKET_URL);
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        console.warn('[C2 SOCKET] WebSocket Disconnected');
      });
    }

    return this;
  }

  on(event, callback) {
    if (USE_MOCK) {
      if (!this.mockListeners.has(event)) {
        this.mockListeners.set(event, new Set());
      }
      this.mockListeners.get(event).add(callback);
      return;
    }

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (USE_MOCK) {
      if (this.mockListeners.has(event)) {
        this.mockListeners.get(event).delete(callback);
      }
      return;
    }

    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event, data) {
    if (USE_MOCK) {
      console.log(`[C2 MOCK SOCKET EMIT] ${event}:`, data);
      return;
    }

    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  // Simulator method to trigger socket events in mock mode
  simulateEvent(event, data) {
    if (this.mockListeners.has(event)) {
      this.mockListeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (err) {
          console.error(`Error in mock socket listener for ${event}:`, err);
        }
      });
    }
  }
}

export const socketService = new SocketService();
