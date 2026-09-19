import React, { createContext, useReducer, useEffect } from 'react';
import { incidentsApi } from '../services/api/incidentsApi';
import { socketService } from '../services/socket';

export const IncidentContext = createContext(null);

const initialState = {
  incidents: [],
  selectedIncidentId: null,
  filters: { severity: 'ALL', status: 'ALL', search: '' },
  isLoading: true,
  error: null,
  activeBriefing: null,
};

function incidentReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'SET_INCIDENTS': {
      const incidents = action.payload;
      const selectedIncidentId = state.selectedIncidentId || (incidents.length > 0 ? incidents[0].id : null);
      return { ...state, incidents, selectedIncidentId, isLoading: false };
    }

    case 'SELECT_INCIDENT':
      return { ...state, selectedIncidentId: action.payload };

    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };

    case 'UPSERT_INCIDENT': {
      const inc = action.payload;
      const index = state.incidents.findIndex((i) => i.id === inc.id);
      let newIncidents;
      if (index >= 0) {
        newIncidents = [...state.incidents];
        newIncidents[index] = { ...newIncidents[index], ...inc };
      } else {
        newIncidents = [inc, ...state.incidents];
      }
      return { ...state, incidents: newIncidents };
    }

    case 'UPDATE_SEVERITY': {
      const { id, severity, priority, score } = action.payload;
      return {
        ...state,
        incidents: state.incidents.map((inc) => {
          if (inc.id === id) {
            return {
              ...inc,
              severity: severity || inc.severity,
              priority: priority || inc.priority,
              explainability: {
                ...inc.explainability,
                score: score || inc.explainability?.score || 91,
                severityLevel: severity || inc.severity
              }
            };
          }
          return inc;
        })
      };
    }

    case 'MERGE_INCIDENTS': {
      const { primaryId, mergedId, mergedIncident } = action.payload;
      return {
        ...state,
        incidents: state.incidents
          .filter((inc) => inc.id !== mergedId)
          .map((inc) => (inc.id === primaryId ? mergedIncident : inc)),
        selectedIncidentId: primaryId
      };
    }

    case 'SET_ACTIVE_BRIEFING':
      return { ...state, activeBriefing: action.payload };

    default:
      return state;
  }
}

export function IncidentProvider({ children }) {
  const [state, dispatch] = useReducer(incidentReducer, initialState);

  // Initial Load
  useEffect(() => {
    let isMounted = true;
    async function load() {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const res = await incidentsApi.getAll();
        if (isMounted && res.success) {
          dispatch({ type: 'SET_INCIDENTS', payload: res.data });
        }
      } catch (err) {
        if (isMounted) {
          dispatch({ type: 'SET_ERROR', payload: err.message });
        }
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  // Listen to Real-Time Socket Events
  useEffect(() => {
    const handleCreated = (inc) => dispatch({ type: 'UPSERT_INCIDENT', payload: inc });
    const handleUpdated = (inc) => dispatch({ type: 'UPSERT_INCIDENT', payload: inc });
    const handleSeverity = (data) => dispatch({ type: 'UPDATE_SEVERITY', payload: data });
    const handleMerged = (data) => dispatch({ type: 'MERGE_INCIDENTS', payload: data });

    socketService.on('incident:created', handleCreated);
    socketService.on('incident:updated', handleUpdated);
    socketService.on('incident:severity_changed', handleSeverity);
    socketService.on('incident:merged', handleMerged);

    return () => {
      socketService.off('incident:created', handleCreated);
      socketService.off('incident:updated', handleUpdated);
      socketService.off('incident:severity_changed', handleSeverity);
      socketService.off('incident:merged', handleMerged);
    };
  }, []);

  const selectIncident = (id) => dispatch({ type: 'SELECT_INCIDENT', payload: id });
  const setFilters = (filters) => dispatch({ type: 'SET_FILTERS', payload: filters });

  const mergeIncidents = async (primaryId, targetId) => {
    try {
      const res = await incidentsApi.merge(primaryId, targetId);
      if (res.success) {
        dispatch({
          type: 'MERGE_INCIDENTS',
          payload: { primaryId, mergedId: targetId, mergedIncident: res.data }
        });
        return res.data;
      }
    } catch (err) {
      console.error('Failed to merge incidents:', err);
      throw err;
    }
  };

  const selectedIncident = state.incidents.find((i) => i.id === state.selectedIncidentId) || state.incidents[0] || null;

  return (
    <IncidentContext.Provider
      value={{
        ...state,
        selectedIncident,
        selectIncident,
        setFilters,
        mergeIncidents,
        dispatch
      }}
    >
      {children}
    </IncidentContext.Provider>
  );
}
