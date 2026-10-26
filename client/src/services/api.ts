const API_BASE = import.meta.env.VITE_API_URL || '';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP error! status: ${res.status}`);
  }
  return data;
}

export const api = {
  // Dashboard & Reports
  getDashboardSummary: () => fetchJson<any>('/api/dashboard/summary'),
  getReports: () => fetchJson<any>('/api/reports/summary'),
  getDiagnostics: () => fetchJson<any>('/api/diagnostics'),
  testScanPayload: (rawText: string, recordType = 'text') =>
    fetchJson<any>('/api/diagnostics/test-scan', {
      method: 'POST',
      body: JSON.stringify({ rawText, recordType }),
    }),

  // Pouches
  getPouches: (params?: Record<string, string | number | boolean>) => {
    const qs = params
      ? '?' +
        Object.entries(params)
          .filter(([_, v]) => v !== undefined && v !== '')
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return fetchJson<any>(`/api/pouches${qs}`);
  },
  getPouch: (id: string) => fetchJson<any>(`/api/pouches/${id}`),
  getPouchHistory: (id: string) => fetchJson<any>(`/api/pouches/${id}/history`),
  lookupPouch: (identifier: string) => fetchJson<any>(`/api/pouches/lookup/${identifier}`),
  generatePouchSerial: () => fetchJson<{ success: boolean; serialNumber: string }>('/api/pouches/generate-serial'),
  createPouch: (data: any) =>
    fetchJson<any>('/api/pouches', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePouch: (id: string, data: any) =>
    fetchJson<any>(`/api/pouches/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  markTagProgrammed: (id: string) =>
    fetchJson<any>(`/api/pouches/${id}/tag-programmed`, {
      method: 'POST',
    }),

  // Checkpoints & Departments
  getDepartments: (all = false) => fetchJson<any>(`/api/departments${all ? '?all=true' : ''}`),
  createDepartment: (data: { name: string; description?: string }) =>
    fetchJson<any>('/api/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDepartment: (id: string, data: any) =>
    fetchJson<any>(`/api/departments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getCheckpoints: (departmentId?: string, all = false) => {
    const qs = new URLSearchParams();
    if (departmentId) qs.set('departmentId', departmentId);
    if (all) qs.set('all', 'true');
    return fetchJson<any>(`/api/checkpoints?${qs.toString()}`);
  },
  createCheckpoint: (data: { name: string; departmentId: string; description?: string }) =>
    fetchJson<any>('/api/checkpoints', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCheckpoint: (id: string, data: any) =>
    fetchJson<any>(`/api/checkpoints/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Movements
  recordMovement: (data: {
    pouchSerialNumber?: string;
    pouchId?: string;
    destinationCheckpointId: string;
    targetStatus?: string;
    operatorName?: string;
    source?: string;
    notes?: string;
    idempotencyKey?: string;
    bypassWorkflowRules?: boolean;
  }) =>
    fetchJson<any>('/api/movements', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMovements: (params?: Record<string, string | number | boolean>) => {
    const qs = params
      ? '?' +
        Object.entries(params)
          .filter(([_, v]) => v !== undefined && v !== '')
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return fetchJson<any>(`/api/movements${qs}`);
  },
  getMovementCsvUrl: (params?: Record<string, string | number | boolean>) => {
    const qs = params
      ? '?' +
        Object.entries(params)
          .filter(([_, v]) => v !== undefined && v !== '')
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&') +
        '&format=csv'
      : '?format=csv';
    return `${API_BASE}/api/movements${qs}`;
  },

  // Alerts
  getAlerts: (params?: Record<string, string | number | boolean>) => {
    const qs = params
      ? '?' +
        Object.entries(params)
          .filter(([_, v]) => v !== undefined && v !== '')
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return fetchJson<any>(`/api/alerts${qs}`);
  },
  createAlert: (data: { type: string; severity?: string; pouchId?: string; checkpointId?: string; description: string }) =>
    fetchJson<any>('/api/alerts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  resolveAlert: (id: string, data: { resolutionStatus: string; resolutionNotes?: string }) =>
    fetchJson<any>(`/api/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
