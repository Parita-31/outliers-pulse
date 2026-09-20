import React, { createContext, useReducer, useEffect } from 'react';
import { resourcesApi } from '../services/api/resourcesApi';
import { assignmentsApi } from '../services/api/assignmentsApi';
import { socketService } from '../services/socket';

export const ResourceContext = createContext(null);

const initialState = {
  resources: [],
  recommendations: {},
  compromisedPlans: {},
  isLoading: true,
  error: null,
};

function resourceReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'SET_RESOURCES':
      return { ...state, resources: action.payload, isLoading: false };

    case 'UPDATE_RESOURCE': {
      const updated = action.payload;
      return {
        ...state,
        resources: state.resources.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
      };
    }

    case 'ASSIGN_RESOURCE': {
      const { resourceId, incidentId } = action.payload;
      return {
        ...state,
        resources: state.resources.map((r) =>
          r.id === resourceId ? { ...r, status: 'DISPATCHED', assignedIncidentId: incidentId } : r
        )
      };
    }

    case 'SET_RECOMMENDATIONS': {
      const { incidentId, recommendations } = action.payload;
      return {
        ...state,
        recommendations: { ...state.recommendations, [incidentId]: recommendations }
      };
    }

    case 'SET_COMPROMISED_PLAN': {
      const payload = action.payload;
      return {
        ...state,
        compromisedPlans: { ...state.compromisedPlans, [payload.incidentId]: payload },
        resources: state.resources.map((r) =>
          r.id === payload.failedResourceId ? { ...r, status: 'FAILED' } : r
        )
      };
    }

    case 'CLEAR_COMPROMISED_PLAN': {
      const { incidentId, assignedResourceId } = action.payload;
      const nextPlans = { ...state.compromisedPlans };
      delete nextPlans[incidentId];
      return {
        ...state,
        compromisedPlans: nextPlans,
        resources: state.resources.map((r) =>
          r.id === assignedResourceId ? { ...r, status: 'DISPATCHED', assignedIncidentId: incidentId } : r
        )
      };
    }

    default:
      return state;
  }
}

export function ResourceProvider({ children }) {
  const [state, dispatch] = useReducer(resourceReducer, initialState);

  // Initial resources load
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await resourcesApi.getAll();
        if (isMounted && res.success) {
          dispatch({ type: 'SET_RESOURCES', payload: res.data });
        }
      } catch (err) {
        if (isMounted) dispatch({ type: 'SET_ERROR', payload: err.message });
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  // Real-time socket bindings
  useEffect(() => {
    const handleUpdated = (res) => dispatch({ type: 'UPDATE_RESOURCE', payload: res });
    const handleAssigned = (data) => dispatch({ type: 'ASSIGN_RESOURCE', payload: data });
    const handleFailed = (data) => dispatch({ type: 'SET_COMPROMISED_PLAN', payload: data });
    const handleReassigned = (data) => dispatch({ type: 'CLEAR_COMPROMISED_PLAN', payload: data });

    socketService.on('resource:updated', handleUpdated);
    socketService.on('resource:assigned', handleAssigned);
    socketService.on('resource:failed', handleFailed);
    socketService.on('resource:reassigned', handleReassigned);

    return () => {
      socketService.off('resource:updated', handleUpdated);
      socketService.off('resource:assigned', handleAssigned);
      socketService.off('resource:failed', handleFailed);
      socketService.off('resource:reassigned', handleReassigned);
    };
  }, []);

  const loadRecommendations = async (incidentId) => {
    try {
      const res = await assignmentsApi.getRecommendations(incidentId);
      if (res.success) {
        dispatch({
          type: 'SET_RECOMMENDATIONS',
          payload: { incidentId, recommendations: res.data }
        });
      }
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    }
  };

  const approveDispatch = async (recommendationId, incidentId, resourceId) => {
    try {
      dispatch({ type: 'ASSIGN_RESOURCE', payload: { resourceId, incidentId } });
      await assignmentsApi.approve(recommendationId, { incidentId, resourceId });
    } catch (err) {
      console.error('Failed to approve dispatch:', err);
    }
  };

  const simulateFailure = async (incidentId = 'INC-102') => {
    try {
      const res = await resourcesApi.simulateFailure(incidentId);
      if (res.success) {
        dispatch({ type: 'SET_COMPROMISED_PLAN', payload: res.data });
        return res.data;
      }
    } catch (err) {
      console.error('Failed to simulate failure:', err);
    }
  };

  const approveRecovery = async (incidentId = 'INC-102', newResourceId = 'AMB-12') => {
    try {
      const assignmentId = state.compromisedPlans[incidentId]?.compromised_assignment?.id || state.compromisedPlans[incidentId]?.alert?.metadata?.assignmentId;
      const res = await assignmentsApi.recover(incidentId, newResourceId, assignmentId);
      if (res.success) {
        dispatch({
          type: 'CLEAR_COMPROMISED_PLAN',
          payload: { incidentId, assignedResourceId: newResourceId }
        });
        return res.data;
      }
    } catch (err) {
      console.error('Failed to approve recovery reassignment:', err);
    }
  };

  return (
    <ResourceContext.Provider
      value={{
        ...state,
        loadRecommendations,
        approveDispatch,
        simulateFailure,
        approveRecovery,
        dispatch
      }}
    >
      {children}
    </ResourceContext.Provider>
  );
}
