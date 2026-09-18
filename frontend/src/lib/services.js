// Thin, endpoint-mapped service functions over the API client.
// Grouped by backend router so pages read clearly.

import api from "./apiClient";

// ---- Auth (/api/auth) ----
export const authService = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  register: (payload) => api.post("/auth/register", payload),
  me: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
};

// ---- Public (/api/public) — unauthenticated landing-page data ----
export const publicService = {
  stats: () => api.get("/public/stats"),
};

// ---- Citizen complaints (/api/complaints) ----
export const complaintService = {
  // Live AI category/priority suggestion while the citizen types.
  analyze: (description, signal) =>
    api.post("/complaints/analyze", { description }, { signal }),

  // Submit a new complaint. `fields` is a plain object; `photos` a File[].
  // Sent as multipart/form-data to match the FastAPI Form/File endpoint.
  create: ({ category, description, lat, lng, address, ward, reporter_name, reporter_contact }, photos = []) => {
    const fd = new FormData();
    fd.append("category", category);
    fd.append("description", description);
    fd.append("lat", String(lat));
    fd.append("lng", String(lng));
    if (address != null) fd.append("address", address);
    if (ward != null) fd.append("ward", ward);
    if (reporter_name != null) fd.append("reporter_name", reporter_name);
    if (reporter_contact != null) fd.append("reporter_contact", reporter_contact);
    for (const photo of photos) fd.append("photos", photo);
    return api.post("/complaints", fd);
  },

  // Complaints reported by the signed-in user (for the citizen dashboard).
  mine: () => api.get("/complaints/mine/list"),

  get: (idOrTicket) => api.get(`/complaints/${encodeURIComponent(idOrTicket)}`),
  comments: (idOrTicket) => api.get(`/complaints/${encodeURIComponent(idOrTicket)}/comments`),
  addComment: (idOrTicket, text) => api.post(`/complaints/${encodeURIComponent(idOrTicket)}/comments`, { text }),
  audit: (idOrTicket) => api.get(`/complaints/${encodeURIComponent(idOrTicket)}/audit`),
  resolve: (idOrTicket) => api.patch(`/complaints/${encodeURIComponent(idOrTicket)}/resolve`),
  reopen: (idOrTicket) => api.patch(`/complaints/${encodeURIComponent(idOrTicket)}/reopen`),
};

// ---- Admin operations (/api/admin) ----
export const adminService = {
  listComplaints: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== "")
    ).toString();
    return api.get(`/admin/complaints${qs ? `?${qs}` : ""}`);
  },
  getComplaint: (id) => api.get(`/admin/complaints/${encodeURIComponent(id)}`),
  updateStatus: (id, status, note) => api.patch(`/admin/complaints/${encodeURIComponent(id)}/status`, { status, note }),
  assign: (id, assigned_to, note) => api.patch(`/admin/complaints/${encodeURIComponent(id)}/assign`, { assigned_to, note }),
  dispatch: (id, crew, eta_hours, note) => api.patch(`/admin/complaints/${encodeURIComponent(id)}/dispatch`, { crew, eta_hours, note }),
  escalate: (id, reason, level) => api.post(`/admin/complaints/${encodeURIComponent(id)}/escalate`, { reason, level }),
  notify: (id, message, channel = "email") => api.post(`/admin/complaints/${encodeURIComponent(id)}/notify`, { channel, message }),
  notes: (id) => api.get(`/admin/complaints/${encodeURIComponent(id)}/notes`),
  addNote: (id, text, type = "internal") => api.post(`/admin/complaints/${encodeURIComponent(id)}/notes`, { text, type }),
  bulkAssign: (complaint_ids, assigned_to) => api.post("/admin/complaints/bulk-assign", { complaint_ids, assigned_to }),
};

// ---- Analytics (/api/admin/...) ----
export const analyticsService = {
  dashboardStats: () => api.get("/admin/dashboard/stats"),
  attention: () => api.get("/admin/dashboard/attention"),
  summary: (period = "30D") => api.get(`/admin/analytics/summary?period=${period}`),
  distribution: () => api.get("/admin/analytics/distribution"),
  aging: () => api.get("/admin/analytics/aging"),
  trajectory: (period = "30D") => api.get(`/admin/analytics/trajectory?period=${period}`),
  sla: () => api.get("/admin/analytics/sla"),
  departments: () => api.get("/admin/analytics/departments"),
  insights: () => api.get("/admin/analytics/insights"),
};

// ---- Map (/api/admin/map) ----
export const mapService = {
  complaints: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== "")
    ).toString();

    return api.get(`/admin/map/complaints${qs ? `?${qs}` : ""}`);
  },

  clusters: () => api.get("/admin/map/clusters"),

  fleet: () => api.get("/admin/map/fleet"),

  heatmap: () => api.get("/admin/map/heatmap"),

  // NYC 311 reference data with pagination.
  nyc311: (params = {}) => {
    const query = {
      limit: 1000,
      offset: 0,
      ...params,
    };

    const qs = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v != null && v !== "")
    ).toString();

    return api.get(`/admin/map/nyc-311?${qs}`);
  },
};
