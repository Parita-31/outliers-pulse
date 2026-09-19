import { apiClient, USE_MOCK, mockDelay } from './client';
import { MOCK_ANALYTICS } from '../../mock/mockData';

export const analyticsApi = {
  async getStats() {
    if (USE_MOCK) {
      await mockDelay(120);
      return { success: true, data: MOCK_ANALYTICS };
    }
    return apiClient.get('/analytics');
  }
};
