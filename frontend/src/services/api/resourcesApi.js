import { apiClient, USE_MOCK, mockDelay } from './client';
import { MOCK_RESOURCES, MOCK_COMPROMISED_PLAN } from '../../mock/mockData';

let mockResourcesState = [...MOCK_RESOURCES];

export const resourcesApi = {
  async getAll() {
    if (USE_MOCK) {
      await mockDelay(100);
      return { success: true, data: mockResourcesState };
    }
    return apiClient.get('/resources');
  },

  async updateStatus(id, status) {
    if (USE_MOCK) {
      await mockDelay(100);
      const res = mockResourcesState.find((r) => r.id === id);
      if (res) res.status = status;
      return { success: true, data: res };
    }
    return apiClient.patch(`/resources/${id}/status`, { status });
  },

  async simulateFailure(incidentId = 'INC-102') {
    if (USE_MOCK) {
      await mockDelay(150);
      const failed = mockResourcesState.find((r) => r.id === 'AMB-07');
      if (failed) failed.status = 'FAILED';
      return {
        success: true,
        data: MOCK_COMPROMISED_PLAN
      };
    }
    return apiClient.post(`/incidents/${incidentId}/simulate-resource-failure`);
  }
};
