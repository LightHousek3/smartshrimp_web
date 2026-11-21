import axios from 'axios';
import { v4 as uuidv4, validate as validateUuid, version as uuidVersion } from 'uuid';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/vi';
import { normalizeApiError } from '../utils/errorMessage.js';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1').replace(
    /\/+$/,
    '',
);
const SOCKET_BASE_URL = new URL(API_BASE_URL, window.location.origin).origin;

let accessToken = null;

const getAccessToken = () => accessToken;
const setAccessToken = (token) => {
    accessToken = token || null;
};
const clearAccessToken = () => setAccessToken(null);

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
});

apiClient.interceptors.request.use(
    (request) => {
        const token = getAccessToken();
        if (token) {
            request.headers.Authorization = `Bearer ${token}`;
        }
        return request;
    },
    (error) => Promise.reject(error),
);

let isRefreshing = false;
let failedQueue = [];

const settleRefreshQueue = (error, token = null) => {
    failedQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token)));
    failedQueue = [];
};

const refreshIgnoredPaths = [
    '/auth/login',
    '/auth/refresh-token',
    '/auth/logout',
    '/auth/activation/',
    '/auth/forgot-password/',
];

const shouldRefresh = (error, request) =>
    Boolean(
        request &&
        error.response?.status === 401 &&
        !request._retry &&
        !refreshIgnoredPaths.some((path) => request.url?.includes(path)),
    );

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.data instanceof Blob) {
            try {
                error.response.data = JSON.parse(await error.response.data.text());
            } catch {
                error.response.data = null;
            }
        }

        if (!shouldRefresh(error, originalRequest)) {
            return Promise.reject(normalizeApiError(error));
        }

        originalRequest._retry = true;
        if (isRefreshing) {
            return new Promise((resolve, reject) => failedQueue.push({ resolve, reject })).then(
                (token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return apiClient(originalRequest);
                },
            );
        }

        isRefreshing = true;

        try {
            const response = await apiClient.post('/auth/refresh-token');
            const token = response.data?.data?.accessToken;

            if (!token) {
                throw new Error('Phản hồi làm mới phiên không hợp lệ.');
            }

            setAccessToken(token);
            originalRequest.headers.Authorization = `Bearer ${token}`;
            settleRefreshQueue(null, token);

            return apiClient(originalRequest);
        } catch (refreshError) {
            settleRefreshQueue(refreshError);
            // A transport outage does not revoke the session or its refresh cookie.
            const status = refreshError.response?.status;
            if ([400, 401, 403].includes(status) || !refreshError.isAxiosError) {
                clearAccessToken();
                window.dispatchEvent(new Event('auth-unauthorized'));
            }
            return Promise.reject(normalizeApiError(refreshError));
        } finally {
            isRefreshing = false;
        }
    },
);

const DEVICE_ID_KEY = 'smartshrimp_device_id';
let deviceId = localStorage.getItem(DEVICE_ID_KEY);

if (!deviceId || !validateUuid(deviceId) || uuidVersion(deviceId) !== 4) {
    deviceId = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
}

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.locale('vi');

export { apiClient, deviceId, getAccessToken, setAccessToken, clearAccessToken, SOCKET_BASE_URL };
