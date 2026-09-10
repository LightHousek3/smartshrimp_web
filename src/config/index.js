import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/vi';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1').replace(
    /\/+$/,
    '',
);

let accessToken = null;

const getAccessToken = () => accessToken;
const setAccessToken = (token) => {
    accessToken = token || null;
};
const clearAccessToken = () => setAccessToken(null);

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
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

const refreshIgnoredPaths = ['/auth/login', '/auth/refresh-token', '/auth/logout'];

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

        if (!shouldRefresh(error, originalRequest)) {
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return new Promise((resolve, reject) => failedQueue.push({ resolve, reject })).then(
                (token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return apiClient(originalRequest);
                },
            );
        }

        originalRequest._retry = true;
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
            clearAccessToken();
            window.dispatchEvent(new Event('auth-unauthorized'));
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    },
);

const DEVICE_ID_KEY = 'smartshrimp_device_id';
let deviceId = localStorage.getItem(DEVICE_ID_KEY);

if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
}

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.locale('vi');

export { apiClient, deviceId, getAccessToken, setAccessToken, clearAccessToken };
