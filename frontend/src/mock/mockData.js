// Mock Data Fixtures for AI INCIDENT COMMANDER — SURGE
// Schema aligned with Express Backend Contract

export const MOCK_INCIDENTS = [
  {
    id: 'INC-102',
    title: 'Flash Flooding & Trapped Vehicles',
    type: 'WATER_RESCUE',
    description: 'Rapid water level rise to 1.4m following heavy storm surge. Commuter passenger van marooned with 14 passengers trapped on roof. Fast currents with debris.',
    severity: 'CRITICAL',
    priority: 'P1',
    confidence: 94,
    peopleAtRisk: 14,
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    location: {
      lat: 22.6916,
      lng: 72.8634,
      address: 'Shedhi River Bridge, Station Road, Nadiad',
      sector: 'Nadiad Central'
    },
    aiSummary: 'Critical flash flood incident with imminent hypothermia and vehicle submersion risks. Rapid deployment of Swiftwater Rescue Unit and ALS Trauma Ambulance required immediately.',
    explainability: {
      score: 91,
      severityLevel: 'CRITICAL',
      factors: [
        { name: 'High people at risk (14 trapped on roof)', weight: '+35 pts', category: 'HUMAN_RISK' },
        { name: 'Multiple corroborating 911 calls (4 reports)', weight: '+25 pts', category: 'CORROBORATION' },
        { name: 'Shedhi River Depth Sensor > 1.4m (Escalating)', weight: '+20 pts', category: 'SENSOR_DATA' },
        { name: 'Arterial bridge roadway submerged', weight: '+11 pts', category: 'INFRASTRUCTURE' }
      ]
    },
    evidence: [
      { id: 'EV-01', source: 'Emergency Dispatch (112)', timestamp: '08:42:10', text: 'Caller reports passenger van stalled in deep rushing water near river bridge.' },
      { id: 'EV-02', source: 'Citizen App Upload', timestamp: '08:43:15', text: 'Photo uploaded showing 14 passengers climbing onto roof of white van.' },
      { id: 'EV-03', source: 'River Gauge Sensor #RS-04', timestamp: '08:44:00', text: 'Hydrological gauge: +18cm rise per 10min. Flow rate: 4.2 m/s.' },
      { id: 'EV-04', source: 'Traffic CCTV Cam-08', timestamp: '08:44:30', text: 'Visual confirmation of marooned vehicle surrounded by fast flowing water.' }
    ],
    risks: [
      'Vehicle rollover if water level rises an additional 20cm',
      'Hypothermia hazard due to water temperature below 12°C',
      'Structural bridge scouring downstream'
    ],
    reports: ['REP-881', 'REP-882', 'REP-885', 'REP-889'],
    currentResponse: {
      assignedResources: [],
      status: 'AWAITING_COMMANDER_APPROVAL'
    }
  },
  {
    id: 'INC-104',
    title: 'Water Rescue Request - Marooned Van',
    type: 'WATER_RESCUE',
    description: 'Separate citizen phone report describing trapped passengers in high water near Station Road crossing.',
    severity: 'HIGH',
    priority: 'P2',
    confidence: 89,
    peopleAtRisk: 12,
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    location: {
      lat: 22.6942,
      lng: 72.8660,
      address: 'Near Station Road Crossing, Nadiad',
      sector: 'Nadiad Central'
    },
    aiSummary: 'Likely duplicate cluster of Incident #INC-102. Geospatial and temporal proximity strongly suggest single physical event.',
    explainability: {
      score: 78,
      severityLevel: 'HIGH',
      factors: [
        { name: 'People at risk identified', weight: '+30 pts', category: 'HUMAN_RISK' },
        { name: 'Citizen mobile emergency report', weight: '+28 pts', category: 'CORROBORATION' },
        { name: 'Proximity to primary flood zone (280m)', weight: '+20 pts', category: 'GEOSPATIAL' }
      ]
    },
    evidence: [
      { id: 'EV-05', source: 'Emergency Phone Call', timestamp: '08:45:00', text: 'Driver states van cannot move, water entering cabin door seams.' }
    ],
    risks: ['Correlates with #INC-102 flash flood event'],
    reports: ['REP-890'],
    currentResponse: {
      assignedResources: [],
      status: 'AWAITING_MERGE_TRIAGE'
    }
  },
  {
    id: 'INC-105',
    title: 'Chemical Warehouse Hazmat Alarm',
    type: 'HAZMAT_FIRE',
    description: 'Industrial storage warehouse automated thermal sensor alert. Toxic solvent vapors detected near GIDC storage bay 3.',
    severity: 'HIGH',
    priority: 'P2',
    confidence: 91,
    peopleAtRisk: 6,
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    location: {
      lat: 22.7050,
      lng: 72.8780,
      address: 'Plot 42, GIDC Industrial Estate, Nadiad',
      sector: 'GIDC North'
    },
    aiSummary: 'Hazmat thermal spike with chemical vapor plume potential. Hazmat unit and heavy pumper dispatched on standby.',
    explainability: {
      score: 82,
      severityLevel: 'HIGH',
      factors: [
        { name: 'Flammable vapor release risk', weight: '+35 pts', category: 'HAZARD' },
        { name: 'Automated IoT Sensor telemetry', weight: '+30 pts', category: 'SENSOR_DATA' },
        { name: '6 night-shift workers evacuated', weight: '+17 pts', category: 'HUMAN_RISK' }
      ]
    },
    evidence: [
      { id: 'EV-06', source: 'IoT Smoke & VOC Sensor #14', timestamp: '08:34:00', text: 'VOC ppm reading exceeds 450ppm limit.' },
      { id: 'EV-07', source: 'Site Safety Supervisor Call', timestamp: '08:36:12', text: 'Confirmed facility evacuated, containment valves closed.' }
    ],
    risks: ['Vapor cloud drift toward adjacent residential zone if wind shifts'],
    reports: ['REP-870'],
    currentResponse: {
      assignedResources: ['FIRE-03'],
      status: 'RESPONDING'
    }
  }
];

export const MOCK_DUPLICATE_CANDIDATES = {
  'INC-102': [
    {
      targetIncidentId: 'INC-104',
      similarityScore: 91,
      reasons: [
        'Identical incident classification: WATER_RESCUE',
        'Geospatial proximity: 280 meters apart (Station Road)',
        'Temporal clustering: Reports filed 3 minutes apart',
        'Corroborating text: Trapped passengers in marooned vehicle'
      ],
      sharedEvidenceCount: 2,
      confidence: 95
    }
  ]
};

export const MOCK_RESOURCES = [
  {
    id: 'AMB-07',
    name: 'Ambulance 07 (ALS Trauma 108)',
    type: 'AMBULANCE',
    status: 'AVAILABLE',
    lat: 22.6880,
    lng: 72.8590,
    speedKmH: 45,
    heading: 180,
    baseStation: 'Civil Hospital Nadiad',
    capabilities: ['Advanced Life Support', 'Hypothermia Trauma Kit', '4-Stretcher Capacity'],
    workload: '0 Active Tasks (Ready)'
  },
  {
    id: 'AMB-12',
    name: 'Ambulance 12 (ALS Trauma Backup)',
    type: 'AMBULANCE',
    status: 'AVAILABLE',
    lat: 22.7010,
    lng: 72.8710,
    speedKmH: 50,
    heading: 210,
    baseStation: 'North Relief Center Nadiad',
    capabilities: ['Advanced Life Support', 'Pediatric Trauma', '2-Stretcher Capacity'],
    workload: '0 Active Tasks (Ready)'
  },
  {
    id: 'FIRE-03',
    name: 'Fire Pumper Engine 03',
    type: 'FIRE_ENGINE',
    status: 'DISPATCHED',
    lat: 22.7030,
    lng: 72.8750,
    speedKmH: 38,
    heading: 45,
    baseStation: 'GIDC Fire Station Nadiad',
    capabilities: ['Heavy Water Cannon', 'Foam Suppression', 'Hazmat Containment'],
    assignedIncidentId: 'INC-105',
    workload: '1 Active Task (#INC-105)'
  },
  {
    id: 'RESCUE-01',
    name: 'Swiftwater Boat Team 01',
    type: 'RESCUE_BOAT',
    status: 'AVAILABLE',
    lat: 22.6850,
    lng: 72.8550,
    speedKmH: 25,
    heading: 90,
    baseStation: 'Shedhi River Water Rescue Dock',
    capabilities: ['Inflatable Raft (16 Pax)', 'Current Navigation', 'Divers Onboard'],
    workload: '0 Active Tasks (Ready)'
  },
  {
    id: 'POL-09',
    name: 'Police Tactical Cruiser 09',
    type: 'POLICE',
    status: 'AVAILABLE',
    lat: 22.6930,
    lng: 72.8610,
    speedKmH: 0,
    heading: 0,
    baseStation: 'Nadiad Town Police Station',
    capabilities: ['Traffic Perimeter Control', 'Public Warning PA'],
    workload: '0 Active Tasks (Ready)'
  },
  {
    id: 'HOSP-CITY',
    name: 'Civil Trauma Hospital Nadiad',
    type: 'HOSPITAL',
    status: 'OPERATIONAL',
    lat: 22.6960,
    lng: 72.8680,
    speedKmH: 0,
    heading: 0,
    capabilities: ['Level 1 Trauma', 'Decontamination Bay', 'ICU Surge Beds: 12 Available'],
    workload: '84% Capacity'
  }
];

export const MOCK_RECOMMENDATIONS = {
  'INC-102': [
    {
      id: 'REC-102-1',
      incidentId: 'INC-102',
      resourceId: 'AMB-07',
      resourceName: 'AMB-07 (ALS Trauma 108)',
      type: 'AMBULANCE',
      etaMinutes: 6,
      distanceKm: 1.8,
      matchScore: 95,
      capabilityMatch: 'High (ALS + Hypothermia Warming Units)',
      reasons: [
        'Shortest travel distance to flooded bridge (1.8 km)',
        'Equipped with cold-water immersion trauma gear',
        'Experienced flood rescue paramedic crew'
      ]
    },
    {
      id: 'REC-102-2',
      incidentId: 'INC-102',
      resourceId: 'RESCUE-01',
      resourceName: 'Swiftwater Boat Team 01',
      type: 'RESCUE_BOAT',
      etaMinutes: 8,
      distanceKm: 2.2,
      matchScore: 98,
      capabilityMatch: 'Optimal (16-Person Flood Evac Raft)',
      reasons: [
        'Crucial for extracting 14 marooned passengers from vehicle roof',
        'Capable of navigating 1.4m fast current depth'
      ]
    }
  ]
};

export const MOCK_COMPROMISED_PLAN = {
  incidentId: 'INC-102',
  failedResourceId: 'AMB-07',
  failedResourceName: 'AMB-07 (ALS Trauma 108)',
  failureReason: 'Mechanical Transmission Failure / Engine Stall En Route',
  originalEtaMinutes: 6,
  alternativeRecommendation: {
    resourceId: 'AMB-12',
    resourceName: 'AMB-12 (ALS Trauma Backup)',
    type: 'AMBULANCE',
    newEtaMinutes: 9,
    delayImpactMinutes: 3,
    distanceKm: 3.2,
    matchScore: 89,
    reasons: [
      'Nearest available ALS trauma-certified ambulance in Nadiad North',
      'Alternative route bypasses flooded arterial bridge',
      'ETA within survivability threshold for hypothermia triage'
    ]
  }
};

export const MOCK_TIMELINE = [
  {
    id: 'TL-01',
    timestamp: '08:42:10',
    type: 'REPORT',
    category: 'CITIZEN_REPORT',
    title: 'Citizen Report Logged',
    description: 'Flooding reported on Shedhi River Bridge, Station Road by 3 callers.',
    incidentId: 'INC-102'
  },
  {
    id: 'TL-02',
    timestamp: '08:43:02',
    type: 'TRIAGE',
    category: 'AI_CLASSIFICATION',
    title: 'Incident #INC-102 Created',
    description: 'Classified as WATER_RESCUE. Initial priority P2.',
    incidentId: 'INC-102'
  },
  {
    id: 'TL-03',
    timestamp: '08:44:15',
    type: 'ESCALATION',
    category: 'SEVERITY_CHANGED',
    title: 'Severity Escalated to CRITICAL',
    description: 'Score jumped to 91 due to 14 people trapped on roof + 1.4m water rise.',
    incidentId: 'INC-102'
  },
  {
    id: 'TL-04',
    timestamp: '08:45:00',
    type: 'DUPLICATE',
    category: 'DUPLICATE_DETECTED',
    title: 'Related Incident Detected',
    description: 'Incident #INC-104 flagged with 91% similarity to #INC-102.',
    incidentId: 'INC-104'
  }
];

export const MOCK_ALERTS = [
  {
    id: 'ALT-01',
    severity: 'CRITICAL',
    title: 'Critical Surge Escalation: #INC-102',
    message: '14 civilians trapped in water flow. Immediate dispatch authorization required.',
    timestamp: '08:44:15',
    acknowledged: false,
    incidentId: 'INC-102'
  },
  {
    id: 'ALT-02',
    severity: 'HIGH',
    title: 'Duplicate Cluster Detected: #INC-104',
    message: '91% probability of duplicate report for Flash Flooding event.',
    timestamp: '08:45:00',
    acknowledged: false,
    incidentId: 'INC-104'
  }
];

export const MOCK_ANALYTICS = {
  summary: {
    totalIncidents: 100,
    criticalIncidents: 14,
    meanTimeToDispatchSeconds: 108, // 1.8 min
    fleetUtilizationPercentage: 75,
    activeUnitsCount: 18,
    totalUnitsCount: 24,
    resolvedIncidentsCount: 86
  },
  timelineVolume: [
    { time: '00:00', critical: 1, high: 2, medium: 4 },
    { time: '04:00', critical: 0, high: 1, medium: 3 },
    { time: '08:00', critical: 3, high: 5, medium: 8 },
    { time: '12:00', critical: 2, high: 4, medium: 6 },
    { time: '16:00', critical: 4, high: 6, medium: 9 },
    { time: '20:00', critical: 2, high: 3, medium: 5 },
  ],
  responseTimesByUnit: [
    { unit: 'Ambulance (108 ALS)', target: 8, actual: 6.2 },
    { unit: 'Fire Rescue', target: 7, actual: 5.8 },
    { unit: 'Swiftwater Team', target: 12, actual: 9.4 },
    { unit: 'Police Tactical', target: 6, actual: 4.9 },
    { unit: 'Hazmat Unit', target: 15, actual: 11.2 },
  ]
};
