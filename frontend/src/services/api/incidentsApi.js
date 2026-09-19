import { apiClient, USE_MOCK, mockDelay } from './client';
import { MOCK_INCIDENTS, MOCK_DUPLICATE_CANDIDATES } from '../../mock/mockData';

// In-memory state store for mock mutations
let mockIncidentsState = [...MOCK_INCIDENTS];

export const incidentsApi = {
  async getAll() {
    if (USE_MOCK) {
      await mockDelay(100);
      return { success: true, data: mockIncidentsState };
    }
    return apiClient.get('/incidents');
  },

  async getById(id) {
    if (USE_MOCK) {
      await mockDelay(80);
      const inc = mockIncidentsState.find((item) => item.id === id);
      if (!inc) throw new Error(`Incident ${id} not found`);
      return { success: true, data: inc };
    }
    return apiClient.get(`/incidents/${id}`);
  },

  async analyze(id) {
    if (USE_MOCK) {
      await mockDelay(250);
      const inc = mockIncidentsState.find((item) => item.id === id);
      return {
        success: true,
        data: inc?.explainability || {
          score: 85,
          severityLevel: 'HIGH',
          factors: [{ name: 'Sensor Confirmation', weight: '+30 pts', category: 'SENSOR_DATA' }]
        }
      };
    }
    return apiClient.post(`/incidents/${id}/analyze`);
  },

  async merge(id, targetIncidentId) {
    if (USE_MOCK) {
      await mockDelay(200);
      const primary = mockIncidentsState.find((item) => item.id === id);
      const target = mockIncidentsState.find((item) => item.id === targetIncidentId);

      if (primary && target) {
        // Combine evidence and reports
        primary.evidence = [...primary.evidence, ...target.evidence];
        primary.reports = Array.from(new Set([...primary.reports, ...target.reports]));
        primary.peopleAtRisk = Math.max(primary.peopleAtRisk, target.peopleAtRisk);
        // Remove merged target from active feed
        mockIncidentsState = mockIncidentsState.filter((item) => item.id !== targetIncidentId);
      }
      return { success: true, data: primary, mergedIncidentId: targetIncidentId };
    }
    return apiClient.post(`/incidents/${id}/merge`, { targetIncidentId });
  },

  async getBriefing(id) {
    if (USE_MOCK) {
      await mockDelay(300);
      const inc = mockIncidentsState.find((item) => item.id === id) || mockIncidentsState[0];
      const markdown = `
# OPERATIONAL INCIDENT BRIEFING
**Incident ID:** ${inc.id} | **Severity:** ${inc.severity} (${inc.priority})
**Type:** ${inc.type} | **Sector:** ${inc.location?.sector}

---

### Situation Assessment
${inc.description}

### Critical Factors & Evidence
- **At-Risk Civilians:** ${inc.peopleAtRisk} identified
- **Confidence Rating:** ${inc.confidence}% (Multi-source corroborated)
- **Primary Risks:**
${inc.risks?.map((r) => `  * ${r}`).join('\n')}

### Response Plan
- **Status:** ${inc.currentResponse?.status || 'ACTIVE DISPATCH'}
- **Assigned Units:** ${inc.currentResponse?.assignedResources?.join(', ') || 'Pending Command Approval'}

*Generated automatically by AI Incident Commander — SURGE at ${new Date().toISOString()}*
      `.trim();
      return { success: true, data: { briefingMarkdown: markdown } };
    }
    return apiClient.post(`/incidents/${id}/briefing`);
  }
};
