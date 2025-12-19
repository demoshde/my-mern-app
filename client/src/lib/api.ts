import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  register: (username: string, password: string) =>
    api.post('/auth/register', { username, password }),
  me: () => api.get('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { currentPassword, newPassword }),
};

// PPE Items API
export const itemsAPI = {
  getAll: (params?: { search?: string; lowStock?: boolean; type?: string; size?: string }) =>
    api.get('/items', { params }),
  getById: (id: string) => api.get(`/items/${id}`),
  getByBarcode: (barcode: string) => api.get(`/items/barcode/${barcode}`),
  create: (data: any) => api.post('/items', data),
  update: (id: string, data: any) => api.put(`/items/${id}`, data),
  delete: (id: string) => api.delete(`/items/${id}`),
  getLowStockCount: () => api.get('/items/low-stock-count'),
  regenerateQR: (id: string) => api.post(`/items/${id}/regenerate-qr`),
};

// Drivers API
export const driversAPI = {
  getAll: (params?: { search?: string; isActive?: boolean; department?: string }) =>
    api.get('/drivers', { params }),
  getById: (id: string) => api.get(`/drivers/${id}`),
  getByEmployeeId: (employeeId: string) => api.get(`/drivers/employee/${employeeId}`),
  create: (data: any) => api.post('/drivers', data),
  update: (id: string, data: any) => api.put(`/drivers/${id}`, data),
  delete: (id: string, force?: boolean) => api.delete(`/drivers/${id}`, { params: { force } }),
  getHistory: (id: string, params?: { limit?: number; skip?: number }) =>
    api.get(`/drivers/${id}/history`, { params }),
  getDepartments: () => api.get('/drivers/meta/departments'),
};

// Transactions API
export const transactionsAPI = {
  getAll: (params?: {
    type?: string;
    driverId?: string;
    itemId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    skip?: number;
  }) => api.get('/transactions', { params }),
  getById: (id: string) => api.get(`/transactions/${id}`),
  issue: (data: { driverId: string; items: any[]; notes?: string }) =>
    api.post('/transactions/issue', data),
  return: (data: {
    driverId: string;
    items: any[];
    notes?: string;
    originalTransactionId?: string;
  }) => api.post('/transactions/return', data),
};

// Reports API
export const reportsAPI = {
  getDashboard: () => api.get('/reports/dashboard'),
  getStock: () => api.get('/reports/stock'),
  getItemsPerDriver: () => api.get('/reports/items-per-driver'),
  getIssuanceHistory: (params?: { startDate?: string; endDate?: string; type?: string }) =>
    api.get('/reports/issuance-history', { params }),
  getLowStockAlerts: () => api.get('/reports/low-stock-alerts'),
  exportStock: () => api.get('/reports/export/stock', { responseType: 'blob' }),
  exportItemsPerDriver: () =>
    api.get('/reports/export/items-per-driver', { responseType: 'blob' }),
  exportTransactions: (params?: { startDate?: string; endDate?: string; type?: string }) =>
    api.get('/reports/export/transactions', { params, responseType: 'blob' }),
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: { username: string; password: string; fullName?: string; position?: string; role?: string }) =>
    api.post('/users', data),
  update: (id: string, data: { username?: string; password?: string; fullName?: string; position?: string; role?: string; isActive?: boolean }) =>
    api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  toggleActive: (id: string) => api.patch(`/users/${id}/toggle-active`),
};

// Orders API
export const ordersAPI = {
  getAll: (params?: { status?: string; search?: string }) =>
    api.get('/orders', { params }),
  getById: (id: string) => api.get(`/orders/${id}`),
  getPendingForItem: (itemId: string) => api.get(`/orders/pending-for-item/${itemId}`),
  getPendingQuantities: () => api.get<Record<string, number>>('/orders/pending-quantities'),
  create: (data: { items: { itemId: string; orderQuantity: number }[]; notes?: string }) =>
    api.post('/orders', data),
  receive: (id: string, data: FormData | { items: { itemId: string; receivedQuantity: number }[]; receivedAt?: string }) => {
    if (data instanceof FormData) {
      return api.post(`/orders/${id}/receive`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.post(`/orders/${id}/receive`, data);
  },
  updateStatus: (id: string, status: string) =>
    api.put(`/orders/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/orders/${id}`),
};

export default api;
