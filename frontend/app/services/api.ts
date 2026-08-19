import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url ?? '';
    const isSyncRequest = url.includes('/sync');

    if (err.response?.status === 401 && !isSyncRequest) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const templateService = {
  getAll:   ()              => api.get('/templates'),
  getById:  (id: number)    => api.get(`/templates/${id}`),
  create:   (data: FormData) =>
    api.post('/templates', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete:   (id: number)    => api.delete(`/templates/${id}`),   // ← tambah
};

export const letterService = {
  getAll:    (params?: { status?: string }) => api.get('/letters', { params }),
  getById:   (id: number)                   => api.get(`/letters/${id}`),
  create:    (data: Record<string, any>)    => api.post('/letters', data),
  update:    (id: number, data: Record<string, any>) => api.put(`/letters/${id}`, data),
  approve:   (id: number, catatan?: string) => api.patch(`/letters/${id}/approve`, { catatan }),
  reject: (id: number, catatan: string) => api.patch(`/letters/${id}/reject`, { catatan }),
  revise: (id: number, catatan: string) => api.patch(`/letters/${id}/revise`, { catatan }),
  exportDoc: (id: number, format: 'docx' | 'pdf') =>
    api.get(`/letters/${id}/export`, { params: { format }, responseType: 'blob' }),
  syncCsv:   (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/sync/csv', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  /**
   * Generate preview DOCX sementara untuk ditampilkan via ONLYOFFICE.
   * Tidak menyimpan surat ke database.
   * Response: { document_url: string, key: string }
   */
  generatePreview: (data: { template_id: number; data_surat: Record<string, string> }) =>
    api.post('/letters/preview', data),
};

export const userService = {
  getSignature: () => api.get('/user/signature'),
  uploadSignature: (file: File) => {
    const form = new FormData();
    form.append('signature', file);
    return api.post('/user/signature', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;