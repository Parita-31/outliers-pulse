import React, { createContext, useReducer, useEffect } from 'react';
import { alertsApi } from '../services/api/alertsApi';
import { socketService } from '../services/socket';

export const AlertContext = createContext(null);

const initialState = {
  alerts: [],
  timeline: [],
  toasts: [],
  isAlertDrawerOpen: false,
  isLoading: true,
};

function alertReducer(state, action) {
  switch (action.type) {
    case 'SET_ALERTS':
      return { ...state, alerts: action.payload, isLoading: false };

    case 'SET_TIMELINE':
      return { ...state, timeline: action.payload };

    case 'ADD_ALERT':
      return {
        ...state,
        alerts: [action.payload, ...state.alerts],
        toasts: [
          {
            id: action.payload.id || `toast-${Date.now()}`,
            title: action.payload.title,
            message: action.payload.message,
            severity: action.payload.severity || 'HIGH',
            timestamp: action.payload.timestamp || new Date().toLocaleTimeString()
          },
          ...state.toasts.slice(0, 4)
        ]
      };

    case 'ACK_ALERT':
      return {
        ...state,
        alerts: state.alerts.map((a) => (a.id === action.payload ? { ...a, acknowledged: true } : a))
      };

    case 'ADD_TIMELINE_EVENT':
      return {
        ...state,
        timeline: [action.payload, ...state.timeline]
      };

    case 'DISMISS_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.payload)
      };

    case 'TOGGLE_ALERT_DRAWER':
      return { ...state, isAlertDrawerOpen: !state.isAlertDrawerOpen };

    default:
      return state;
  }
}

export function AlertProvider({ children }) {
  const [state, dispatch] = useReducer(alertReducer, initialState);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const [alertsRes, timelineRes] = await Promise.all([
          alertsApi.getAll(),
          alertsApi.getTimeline()
        ]);
        if (isMounted) {
          if (alertsRes.success) dispatch({ type: 'SET_ALERTS', payload: alertsRes.data });
          if (timelineRes.success) dispatch({ type: 'SET_TIMELINE', payload: timelineRes.data });
        }
      } catch (err) {
        console.error('Failed to load alerts/timeline:', err);
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  // Socket bindings
  useEffect(() => {
    const handleAlert = (data) => dispatch({ type: 'ADD_ALERT', payload: data });
    const handleTimeline = (data) => dispatch({ type: 'ADD_TIMELINE_EVENT', payload: data });

    socketService.on('alert:created', handleAlert);
    socketService.on('notification:created', handleAlert);
    socketService.on('activity:new', handleTimeline);

    return () => {
      socketService.off('alert:created', handleAlert);
      socketService.off('notification:created', handleAlert);
      socketService.off('activity:new', handleTimeline);
    };
  }, []);

  const acknowledgeAlert = async (id) => {
    dispatch({ type: 'ACK_ALERT', payload: id });
    try {
      await alertsApi.acknowledge(id);
    } catch (err) {
      console.error('Failed to ack alert:', err);
    }
  };

  const addTimelineEvent = (event) => {
    const entry = {
      id: `TL-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      ...event
    };
    dispatch({ type: 'ADD_TIMELINE_EVENT', payload: entry });
  };

  const dismissToast = (id) => dispatch({ type: 'DISMISS_TOAST', payload: id });
  const toggleAlertDrawer = () => dispatch({ type: 'TOGGLE_ALERT_DRAWER' });

  const unackAlertsCount = state.alerts.filter((a) => !a.acknowledged).length;

  return (
    <AlertContext.Provider
      value={{
        ...state,
        unackAlertsCount,
        acknowledgeAlert,
        addTimelineEvent,
        dismissToast,
        toggleAlertDrawer,
        dispatch
      }}
    >
      {children}
    </AlertContext.Provider>
  );
}
