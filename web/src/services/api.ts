import api from './http';

export const fetchCustomers = () => api.get('/api/customers').then((r) => r.data);
export const fetchManufacturers = () => api.get('/api/manufacturers').then((r) => r.data);
export const fetchProducts = (manufacturerId?: number) =>
  api.get('/api/products', { params: { manufacturerId } }).then((r) => r.data);

export const createMeeting = (payload: any) => api.post('/api/meetings', payload).then((r) => r.data);
export const fetchMeetings = (params?: any) => api.get('/api/meetings', { params }).then((r) => r.data);
export const fetchMeeting = (id: number) => api.get(`/api/meetings/${id}`).then((r) => r.data);

export const fetchFollowups = (params?: any) => api.get('/api/followups', { params }).then((r) => r.data);
export const updateFollowup = (id: number, payload: any) =>
  api.patch(`/api/followups/${id}`, payload).then((r) => r.data);
export const addFollowupComment = (id: number, content: string) =>
  api.post(`/api/followups/${id}/comments`, { content }).then((r) => r.data);

export const createCustomer = (payload: any) => api.post('/api/customers', payload).then((r) => r.data);
export const updateCustomer = (id: number, payload: any) =>
  api.put(`/api/customers/${id}`, payload).then((r) => r.data);
export const deleteCustomer = (id: number) => api.delete(`/api/customers/${id}`);

export const createManufacturer = (payload: any) =>
  api.post('/api/manufacturers', payload).then((r) => r.data);
export const updateManufacturer = (id: number, payload: any) =>
  api.put(`/api/manufacturers/${id}`, payload).then((r) => r.data);
export const deleteManufacturer = (id: number) => api.delete(`/api/manufacturers/${id}`);

export const createProduct = (payload: any) => api.post('/api/products', payload).then((r) => r.data);
export const updateProduct = (id: number, payload: any) =>
  api.put(`/api/products/${id}`, payload).then((r) => r.data);
export const deleteProduct = (id: number) => api.delete(`/api/products/${id}`);
