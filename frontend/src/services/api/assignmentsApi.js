import { apiClient, USE_MOCK, mockDelay } from './client';
import { MOCK_RECOMMENDATIONS } from '../../mock/mockData';

export const assignmentsApi = {
  async getRecommendations(incidentId = 'INC-102') {
    if (USE_MOCK) {
      await mockDelay(120);
      const recs = MOCK_RECOMMENDATIONS[incidentId] || MOCK_RECOMMENDATIONS['INC-102'];
      return { success: true, data: recs };
    }
    return apiClient.get(`/incidents/${incidentId}/recommendations`);
  },

  async approve(assignmentId, payload = {}) {
    if (USE_MOCK) {
      await mockDelay(180);
      return {
        success: true,
        data: {
          assignmentId,
          status: 'DISPATCHED',
          timestamp: new Date().toISOString(),
          ...payload
        }
      };
    }
    return apiClient.post(`/assignments/${assignmentId}/approve`, payload);
  },

  async recover(incidentId = 'INC-102', newResourceId = 'AMB-12', assignmentId = null) {
    if (USE_MOCK) {
      await mockDelay(200);
      return {
        success: true,
        data: {
          incidentId,
          assignedResourceId: newResourceId,
          status: 'REASSIGNED_ACTIVE',
          newEtaMinutes: 9,
          timestamp: new Date().toISOString()
        }
      };
    }
    return apiClient.post(`/incidents/${incidentId}/recover`, { newResourceId, assignmentId });
  }
};
