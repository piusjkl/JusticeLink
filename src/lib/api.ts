import api from './http';

export async function getCases() {
  const res = await api.get('/cases');
  return res.data;
}

export async function getCase(id: string) {
  const res = await api.get(`/cases/${id}`);
  return res.data;
}

export async function createCase(payload: any) {
  const res = await api.post('/cases', payload);
  return res.data;
}

export async function createCaseFromComplaint(complaintId: string) {
  const res = await api.post(`/cases/from-complaint/${encodeURIComponent(complaintId)}`);
  return res.data;
}

export async function updateCase(id: string, payload: any) {
  const res = await api.put(`/cases/${id}`, payload);
  return res.data;
}

export async function deleteCase(id: string) {
  const res = await api.delete(`/cases/${id}`);
  return res.data;
}

export async function getUsers() {
  const res = await api.get('/users');
  return res.data;
}

export async function createUser(payload: { email: string; name: string; role: string; department?: string; password: string; dateOfBirth: string; address: string; }) {
  const res = await api.post('/users', payload);
  return res.data;
}

export async function updateUser(id: string, payload: Partial<{ name: string; department: string; status: 'active' | 'inactive'; role: string; }>) {
  const res = await api.put(`/users/${id}`, payload);
  return res.data;
}

export async function deleteUser(id: string) {
  const res = await api.delete(`/users/${id}`);
  return res.data;
}

export async function getCaseFiles(caseId: string) {
  const res = await api.get(`/evidence/${caseId}`);
  return res.data;
}

export async function uploadCaseFile(caseId: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post(`/evidence/${caseId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
}

export async function downloadEvidenceFile(evidenceId: string) {
  // Returns a full URL that can be used as an href
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
  return `${base}/evidence/file/${encodeURIComponent(evidenceId)}`;
}

export async function getTimeline(caseId: string) {
  const res = await api.get(`/cases/${caseId}/timeline`);
  return res.data;
}

// Notifications
export async function getMyNotifications() {
  const res = await api.get('/notifications');
  return res.data;
}

export async function markNotificationRead(id: string) {
  const res = await api.post(`/notifications/${id}/read`);
  return res.data;
}

// Manuals
export async function getManual(role: string) {
  const res = await api.get(`/manuals/${role}`);
  return res.data;
}
export async function saveManual(role: string, content: string) {
  const res = await api.post(`/manuals/${role}`, { content });
  return res.data;
}

// Profile
export async function getMe() { const res = await api.get('/users/me'); return res.data; }
export async function updateMe(payload: Partial<{ name: string; dateOfBirth: string; address: string }>) { const res = await api.put('/users/me', payload); return res.data; }

// Video sessions
export async function startVideo(caseId: string) { const res = await api.post(`/video/${caseId}/start`); return res.data; }
export async function endVideo(sessionId: string) { const res = await api.post(`/video/session/${sessionId}/end`); return res.data; }
export async function joinVideo(sessionId: string, role: string) { const res = await api.post(`/video/session/${sessionId}/join`, { role }); return res.data; }
export async function recordSessionAction(sessionId: string, action: string, details?: string) { const res = await api.post(`/video/session/${sessionId}/action`, { action, details }); return res.data; }
export async function getSession(sessionId: string) { const res = await api.get(`/video/session/${sessionId}`); return res.data; }
export async function getActiveSessionForCase(caseId: string) { const res = await api.get(`/video/${caseId}/active`); return res.status === 204 ? null : res.data; }
export async function createVideoShareLinks(sessionId: string) { const res = await api.post(`/video/session/${sessionId}/share`); return res.data as { publicToken: string; prisonToken: string; expiresIn: string }; }
export async function getPublicSession(token: string) { const res = await api.get(`/video/public/${token}`); return res.data; }
export async function prisonJoin(token: string) { const res = await api.post(`/video/prison/${token}/join`); return res.data; }

// Bail
export async function createBailRequest(payload: { caseId: string; amount: number; reason?: string }) { const res = await api.post('/bail', payload); return res.data; }
export async function listBailRequests(caseId: string) { const res = await api.get(`/bail/${caseId}`); return res.data; }
export async function decideBail(id: string, status: 'approved'|'declined', notes?: string) { const res = await api.post(`/bail/decision/${id}`, { status, notes }); return res.data; }

// JUSTICELINK citizen access
export type CitizenComplaintPayload = {
  phone: string;
  fullName?: string;
  district?: string;
  language?: 'en' | 'lg' | 'nyn' | 'ach' | 'xog';
  description: string;
  incidentLocation?: string;
  consentToShare?: boolean;
  lowLiteracy?: boolean;
  disabilityNeeds?: string;
  offlineClientId?: string;
};

export async function submitCitizenComplaint(payload: CitizenComplaintPayload) {
  const res = await api.post('/citizen/complaints', payload);
  return res.data;
}

export async function trackCitizenComplaint(trackingCode: string, phone: string) {
  const res = await api.get(`/citizen/track/${encodeURIComponent(trackingCode)}`, { params: { phone } });
  return res.data;
}

export async function initiateMobileMoneyPayment(provider: 'mtn' | 'airtel', payload: { trackingCode: string; phone: string; amount?: number }) {
  const res = await api.post(`/payments/${provider}/initiate`, payload);
  return res.data;
}

export async function getTriageQueue(status?: string) {
  const res = await api.get('/triage', { params: status ? { status } : undefined });
  return res.data;
}

export async function reviewTriage(complaintId: string, payload: { category?: string; urgency?: 'normal' | 'high' | 'emergency'; recommendedInstitutionType?: string; notes?: string }) {
  const res = await api.put(`/triage/${encodeURIComponent(complaintId)}/review`, payload);
  return res.data;
}

export async function getReferrals(params?: { status?: string; district?: string }) {
  const res = await api.get('/referrals', { params });
  return res.data;
}

export async function updateReferral(id: string, payload: { status: string; assignedToId?: string | null; notes?: string }) {
  const res = await api.put(`/referrals/${id}`, payload);
  return res.data;
}

export async function getPartnerAnalytics(params?: { district?: string; from?: string; to?: string }) {
  const res = await api.get('/partner-analytics', { params });
  return res.data;
}

export async function verifyRegistry() {
  const res = await api.get('/registry/verify');
  return res.data;
}
