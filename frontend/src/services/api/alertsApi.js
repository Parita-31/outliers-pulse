import { apiClient, USE_MOCK, mockDelay } from './client';
import { MOCK_ALERTS, MOCK_TIMELINE } from '../../mock/mockData';

let mockAlertsState = [...MOCK_ALERTS];

export const alertsApi = {
  async getAll() {
    if (USE_MOCK) {
      await mockDelay(80);
      return { success: true, data: mockAlertsState };
    }
    return apiClient.get('/alerts');
  },

  async acknowledge(alertId) {
    if (USE_MOCK) {
      await mockDelay(100);
      const alert = mockAlertsState.find((a) => a.id === alertId);
      if (alert) alert.acknowledged = true;
      return { success: true, data: alert };
    }
    return apiClient.patch(`/alerts/${alertId}/acknowledge`);
  },

  async getTimeline() {
    if (USE_MOCK) {
      await mockDelay(80);
      return { success: true, data: MOCK_TIMELINE };
    }
    return apiClient.get('/timeline');
  }
};
