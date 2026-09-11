import axios from 'axios';
import { apiClient } from '../config';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

// Authentication API
const authAPI = {
    login: (credentials) => apiClient.post('/auth/login', credentials),
    logout: () => apiClient.post('/auth/logout', {}),
    refreshToken: () => apiClient.post('/auth/refresh-token', {}),
};

// Admin account management API
const adminAccountAPI = {
    getAccounts: (params = {}) => apiClient.get('/admin/accounts', { params }),
    getAccount: (accountId) => apiClient.get(`/admin/accounts/${accountId}`),
    createAccount: (payload) => apiClient.post('/admin/accounts', payload),
    resendActivation: (accountId) =>
        apiClient.post(`/admin/accounts/${accountId}/resend-activation`),
    updateStatus: (accountId, payload) =>
        apiClient.patch(`/admin/accounts/${accountId}/status`, payload),
};

// Cloudinary API
const cloudinaryAPI = {
    upload: (file, { resourceType = 'image', folder, onProgress } = {}) => {
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
            return Promise.reject(
                new Error('Missing VITE_CLOUDINARY_CLOUD_NAME or VITE_CLOUDINARY_UPLOAD_PRESET'),
            );
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        if (folder) {
            formData.append('folder', folder);
        }

        return axios.post(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
            formData,
            {
                onUploadProgress: (event) => {
                    if (!event.total) return;
                    onProgress?.(Math.round((event.loaded / event.total) * 100));
                },
            },
        );
    },
    uploadImage: (file, folder, onProgress) =>
        cloudinaryAPI.upload(file, { resourceType: 'image', folder, onProgress }),
};

/* ─── Exports ───────────────────────────────────────────────── */
export { adminAccountAPI, authAPI, cloudinaryAPI };
