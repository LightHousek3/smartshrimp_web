import {
    parseProtocolTemplateDetail,
    parseProtocolTemplatePage,
    parseTemplateCreationOptions,
    parseTemplateMaterialPage,
    parseTemplateEditor,
} from '../utils/protocolTemplateUtils';
import axios from 'axios';
import {
    parseMarkAllNotificationsRead,
    parseNotificationDetail,
    parseNotificationPage,
} from '../utils/notificationUtils.js';
import { apiClient, deviceId } from '../config/index.js';
import { RAG_DOCUMENT_RULES } from '../constants/ragDocument.js';
import {
    parseRagDocumentResponse,
    validateRagDocument,
} from '../utils/ragDocumentUtils.js';

const CLOUDINARY_CLOUD_NAME = import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET =
    import.meta.env?.VITE_CLOUDINARY_UPLOAD_PRESET || '';

// Authentication API
const authAPI = {
    /**
     * POST /auth/login
     * Sign in with account credentials.
     */
    login: (credentials) => apiClient.post('/auth/login', credentials),
    /**
     * POST /auth/logout
     * Revoke the refresh session using the authentication cookie.
     */
    logout: () => apiClient.post('/auth/logout', {}),
    /**
     * POST /auth/refresh-token
     * Refresh access credentials using the authentication cookie.
     */
    refreshToken: () => apiClient.post('/auth/refresh-token', {}),
    /**
     * POST /auth/activation/request-otp
     * Request an OTP for account activation.
     */
    requestActivationOtp: (email) =>
        apiClient.post('/auth/activation/request-otp', { email }),
    /**
     * POST /auth/activation/verify-otp
     * Verify the activation OTP and obtain an action token.
     */
    verifyActivationOtp: (email, code) =>
        apiClient.post('/auth/activation/verify-otp', { email, code }),
    /**
     * POST /auth/activation/complete
     * Complete account activation with the verified action token.
     */
    activateAccount: (payload) =>
        apiClient.post('/auth/activation/complete', payload),
    /**
     * POST /auth/forgot-password/request-otp
     * Request an OTP for password recovery.
     */
    requestPasswordResetOtp: (email) =>
        apiClient.post('/auth/forgot-password/request-otp', { email }),
    /**
     * POST /auth/forgot-password/verify-otp
     * Verify the recovery OTP and obtain an action token.
     */
    verifyPasswordResetOtp: (email, code) =>
        apiClient.post('/auth/forgot-password/verify-otp', { email, code }),
    /**
     * POST /auth/forgot-password/reset
     * Set a new password with the verified action token.
     */
    resetPassword: (payload) =>
        apiClient.post('/auth/forgot-password/reset', payload),
};

// Expert profile API
const profileAPI = {
    /**
     * GET /profile
     * Fetch the authenticated account profile.
     */
    getProfile: () => apiClient.get('/profile'),
    /**
     * PATCH /profile
     * Update editable profile fields.
     */
    updateProfile: (payload) => apiClient.patch('/profile', payload),
    /**
     * PATCH /profile/password
     * Change the password and identify the current device.
     */
    changePassword: (payload) =>
        apiClient.patch('/profile/password', { ...payload, deviceId }),
};

const expertDashboardAPI = {
    /**
     * GET /expert/dashboard
     * Fetch the expert dashboard; signal can cancel the request.
     */
    getDashboard: (signal) => apiClient.get('/expert/dashboard', { signal }),
};

const expertSeasonAPI = {
    /**
     * GET /expert/seasons
     * Fetch assigned seasons with query filters and optional cancellation.
     */
    getAssignedSeasons: (params, signal) =>
        apiClient.get('/expert/seasons', { params, signal }),
    getSeason: (seasonId, signal) =>
        apiClient.get(`/expert/seasons/${seasonId}`, { signal }),
};

const expertProductionProtocolAPI = {
    list: (seasonId, params, signal) =>
        apiClient.get(`/expert/seasons/${seasonId}/production-protocols`, {
            params,
            signal,
        }),
    detail: (seasonId, protocolId, signal) =>
        apiClient.get(
            `/expert/seasons/${seasonId}/production-protocols/${protocolId}`,
            { signal }
        ),
    create: (seasonId, body) =>
        apiClient.post(
            `/expert/seasons/${seasonId}/production-protocols`,
            body
        ),
    update: (seasonId, protocolId, body) =>
        apiClient.patch(
            `/expert/seasons/${seasonId}/production-protocols/${protocolId}`,
            body
        ),
    cancel: (seasonId, protocolId, body) =>
        apiClient.post(
            `/expert/seasons/${seasonId}/production-protocols/${protocolId}/cancel`,
            body
        ),
    submit: (seasonId, protocolId, body) =>
        apiClient.post(
            `/expert/seasons/${seasonId}/production-protocols/${protocolId}/submit`,
            body
        ),
    templates: (seasonId, params, signal) =>
        apiClient.get(
            `/expert/seasons/${seasonId}/production-protocol-templates`,
            { params, signal }
        ),
    templateDetail: (seasonId, templateId, signal) =>
        apiClient.get(
            `/expert/seasons/${seasonId}/production-protocol-templates/${templateId}`,
            { signal }
        ),
    products: (seasonId, params, signal) =>
        apiClient.get(`/expert/seasons/${seasonId}/products`, {
            params,
            signal,
        }),
};

// Admin account management API
const adminAccountAPI = {
    /**
     * GET /admin/accounts
     * List accounts with query filters and pagination.
     */
    getAccounts: (params = {}) => apiClient.get('/admin/accounts', { params }),
    /**
     * GET /admin/accounts/:accountId
     * Fetch an account by ID.
     */
    getAccount: (accountId) => apiClient.get(`/admin/accounts/${accountId}`),
    /**
     * POST /admin/accounts
     * Create an account through the admin workflow.
     */
    createAccount: (payload) => apiClient.post('/admin/accounts', payload),
    /**
     * POST /admin/accounts/:accountId/resend-activation
     * Resend the activation invitation for an account.
     */
    resendActivation: (accountId) =>
        apiClient.post(`/admin/accounts/${accountId}/resend-activation`),
    /**
     * PATCH /admin/accounts/:accountId
     * Update an account awaiting activation.
     */
    updatePendingAccount: (accountId, payload) =>
        apiClient.patch(`/admin/accounts/${accountId}`, payload),
    /**
     * PATCH /admin/accounts/:accountId/status
     * Change an account status.
     */
    updateStatus: (accountId, payload) =>
        apiClient.patch(`/admin/accounts/${accountId}/status`, payload),
};

const notificationAPI = {
    /**
     * GET /notifications
     * Validate and return the parsed notification page.
     */
    getNotifications: async (params, signal) => {
        const response = await apiClient.get('/notifications', {
            params,
            signal,
        });
        return parseNotificationPage(response.data);
    },
    /**
     * GET /notifications/:notificationId
     * Encode the ID and validate the notification detail response.
     */
    getNotification: async (notificationId, signal) => {
        const response = await apiClient.get(
            `/notifications/${encodeURIComponent(notificationId)}`,
            {
                signal,
            }
        );
        return parseNotificationDetail(response.data);
    },
    /**
     * PATCH /notifications/read-all
     * Mark notifications as read and validate the response.
     */
    markAllAsRead: async () => {
        const response = await apiClient.patch('/notifications/read-all');
        return parseMarkAllNotificationsRead(response.data);
    },
};

// Cloudinary API
const cloudinaryAPI = {
    /**
     * Upload directly to Cloudinary with the configured unsigned upload preset.
     * Support a resource type, optional folder and progress percentage.
     * Return the Axios response; reject when Cloudinary configuration is missing.
     */
    upload: (file, { resourceType = 'image', folder, onProgress } = {}) => {
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
            return Promise.reject(
                new Error(
                    'Missing VITE_CLOUDINARY_CLOUD_NAME or VITE_CLOUDINARY_UPLOAD_PRESET'
                )
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
                    onProgress?.(
                        Math.round((event.loaded / event.total) * 100)
                    );
                },
            }
        );
    },
    /**
     * Upload an image through the shared Cloudinary upload method.
     */
    uploadImage: (file, folder, onProgress) =>
        cloudinaryAPI.upload(file, {
            resourceType: 'image',
            folder,
            onProgress,
        }),
};

// Keep app cookies, bearer tokens and auth interceptors away from Cloudinary.
const cloudinaryDocumentClient = axios.create({ withCredentials: false });

/**
 * Upload a raw document using the signed fields issued by the backend.
 * Restrict uploads to authenticated Cloudinary storage without overwriting.
 * Check receipt fields and return the public ID, version and signature for
 * the backend to verify before it accepts the upload.
 */
const uploadCloudinaryDocument = async (
    file,
    upload,
    { signal, onProgress } = {}
) => {
    if (
        !/^https:\/\/api\.cloudinary\.com\/v1_1\/[a-zA-Z0-9_-]+\/raw\/upload$/.test(
            upload?.url
        ) ||
        upload.fields?.type !== 'authenticated' ||
        upload.fields?.overwrite !== 'false'
    ) {
        throw new Error('Thông tin tải lên Cloudinary không hợp lệ.');
    }
    const body = new FormData();
    body.append('file', file);
    for (const key of [
        'public_id',
        'timestamp',
        'type',
        'overwrite',
        'api_key',
        'signature',
    ]) {
        body.append(key, String(upload.fields[key]));
    }
    // Older backend instances may still issue intents without an asset folder.
    if (upload.fields.asset_folder)
        body.append('asset_folder', upload.fields.asset_folder);
    const { data } = await cloudinaryDocumentClient.post(upload.url, body, {
        signal,
        timeout: RAG_DOCUMENT_RULES.uploadTimeoutMs,
        onUploadProgress: ({ loaded, total }) => {
            if (total)
                onProgress?.(Math.min(100, Math.round((loaded / total) * 100)));
        },
    });
    if (
        data.public_id !== upload.fields.public_id ||
        data.resource_type !== 'raw' ||
        data.type !== 'authenticated' ||
        data.bytes !== file.size ||
        !Number.isSafeInteger(data.version) ||
        !/^[a-f0-9]{40}$/.test(data.signature || '')
    ) {
        throw new Error('Không thể xác nhận file đã tải lên Cloudinary.');
    }
    return {
        publicId: data.public_id,
        version: data.version,
        signature: data.signature,
    };
};

// RAG document API
const ragDocumentEndpoint = '/admin/rag/documents';

const ragDocumentAPI = {
    /**
     * Validate and hash a document, request a signed upload, then confirm ingestion.
     * Reuse a supplied session receipt to retry confirmation without uploading again.
     * reuploadId restores an existing document; callbacks report phases, progress
     * and the session needed for a later confirmation retry.
     */
    createDocument: async (
        file,
        {
            title,
            description,
            category,
            signal,
            onProgress,
            onPhase,
            session,
            onSession,
            reuploadId,
        } = {}
    ) => {
        const problem = validateRagDocument(file);
        if (problem) throw new Error(problem);
        let current = session;
        if (!current) {
            onPhase?.('hashing');
            const bytes = await file.arrayBuffer();
            const hash = await crypto.subtle.digest('SHA-256', bytes);
            const fileHash = Array.from(new Uint8Array(hash), (byte) =>
                byte.toString(16).padStart(2, '0')
            ).join('');
            signal?.throwIfAborted();
            const { data: envelope } = await apiClient.post(
                reuploadId
                    ? `${ragDocumentEndpoint}/${reuploadId}/reupload-intents`
                    : `${ragDocumentEndpoint}/upload-intents`,
                {
                    ...(!reuploadId && {
                        title: title || file.name.replace(/\.[^.]+$/, ''),
                        description,
                        category,
                    }),
                    originalFilename: file.name,
                    fileSize: file.size,
                    fileHash,
                },
                { signal }
            );
            const intent = envelope?.data;
            if (
                !envelope?.success ||
                typeof intent?.id !== 'string' ||
                !intent.upload
            ) {
                throw new Error('Không thể tạo phiên tải lên tài liệu.');
            }
            try {
                onPhase?.('uploading');
                const receipt = await uploadCloudinaryDocument(
                    file,
                    intent.upload,
                    { signal, onProgress }
                );
                current = {
                    id: intent.id,
                    receipt,
                    ...(reuploadId && {
                        kind: 'reupload',
                        originalFilename: intent.originalFilename,
                    }),
                };
                // Preserve the receipt so a failed confirmation retries the same document.
                onSession?.(current);
            } catch (error) {
                // Cleanup has its own request: the upload signal may already be aborted.
                if (!reuploadId) {
                    try {
                        await ragDocumentAPI.cancelUpload(intent.id);
                    } catch {
                        /* The worker also reaps abandoned intents. */
                    }
                }
                throw error;
            }
        }
        onPhase?.('confirming');
        const action =
            current.kind === 'reupload'
                ? 'complete-reupload'
                : 'complete-upload';
        const { data } = await apiClient.post(
            `${ragDocumentEndpoint}/${current.id}/${action}`,
            current.receipt,
            { signal }
        );
        return parseRagDocumentResponse(
            data,
            current.originalFilename || file.name
        );
    },
    /**
     * POST /admin/rag/documents/:id/cancel-upload
     * Cancel an unfinished upload and let the backend schedule cleanup.
     */
    cancelUpload: (id) =>
        apiClient.post(`${ragDocumentEndpoint}/${id}/cancel-upload`),
    /**
     * GET /admin/rag/documents
     * Return the response envelope containing documents and pagination metadata.
     */
    list: async (params, signal) =>
        (await apiClient.get(ragDocumentEndpoint, { params, signal })).data,
    /**
     * GET /admin/rag/documents/:id
     * Return document details from the response data.
     */
    get: async (id, signal) =>
        (await apiClient.get(`${ragDocumentEndpoint}/${id}`, { signal })).data
            .data,
    /**
     * PATCH /admin/rag/documents/:id
     * Update document metadata or retrieval availability and return the document.
     */
    update: async (id, body) =>
        (await apiClient.patch(`${ragDocumentEndpoint}/${id}`, body)).data.data,
    /**
     * POST /admin/rag/documents/:id/retry
     * Queue a failed document for processing again and return the document.
     */
    retry: async (id) =>
        (await apiClient.post(`${ragDocumentEndpoint}/${id}/retry`)).data.data,
    /**
     * GET /admin/rag/documents/:id/file
     * Return the original file as a Blob. Decode JSON error blobs so callers
     * can read the backend error message when a download fails.
     */
    download: async (id) => {
        try {
            return (
                await apiClient.get(`${ragDocumentEndpoint}/${id}/file`, {
                    responseType: 'blob',
                    timeout: 90000,
                })
            ).data;
        } catch (error) {
            if (error.response?.data instanceof Blob) {
                try {
                    error.response.data = JSON.parse(
                        await error.response.data.text()
                    );
                } catch {
                    /* Keep the original error if the server did not return JSON. */
                }
            }
            throw error;
        }
    },
};

const expertProtocolTemplateAPI = {
    updateStatus: async (templateId, status, expectedVersionNo) => {
        const response = await apiClient.patch(
            `/expert/protocol-templates/${encodeURIComponent(templateId)}/status`,
            { status, expectedVersionNo }
        );
        const result = response.data?.data;
        if (
            response.data?.success !== true ||
            result?.id !== templateId ||
            result?.status !== status ||
            result?.versionNo !== expectedVersionNo + 1
        )
            throw new Error('Phản hồi đổi trạng thái mẫu không hợp lệ.');
        return result;
    },
    deleteTemplate: (templateId, expectedVersionNo) =>
        apiClient.delete(
            `/expert/protocol-templates/${encodeURIComponent(templateId)}`,
            { data: { expectedVersionNo } }
        ),
    getEditor: async (templateId, signal) => {
        const response = await apiClient.get(
            `/expert/protocol-templates/${encodeURIComponent(templateId)}/editor`,
            { signal }
        );
        return parseTemplateEditor(response.data);
    },
    updateTemplate: async (templateId, body) => {
        const response = await apiClient.put(
            `/expert/protocol-templates/${encodeURIComponent(templateId)}`,
            body
        );
        if (
            response.data?.success !== true ||
            typeof response.data.data?.id !== 'string'
        )
            throw new Error('Phản hồi cập nhật mẫu không hợp lệ.');
        return response.data.data;
    },
    getCreationOptions: async (signal) => {
        const response = await apiClient.get(
            '/expert/protocol-templates/creation-options',
            {
                signal,
            }
        );
        return parseTemplateCreationOptions(response.data);
    },
    getMaterials: async (params, signal) => {
        const response = await apiClient.get(
            '/expert/protocol-templates/materials',
            {
                params,
                signal,
            }
        );
        return parseTemplateMaterialPage(response.data);
    },
    createTemplate: async (body) => {
        const response = await apiClient.post(
            '/expert/protocol-templates',
            body
        );
        if (
            response.data?.success !== true ||
            typeof response.data.data?.id !== 'string'
        ) {
            throw new Error(
                'Phản hồi lưu mẫu không hợp lệ. Vui lòng kiểm tra danh sách trước khi lưu lại.'
            );
        }
        return response.data.data;
    },
    getTemplates: async (params, signal) => {
        const response = await apiClient.get('/expert/protocol-templates', {
            params,
            signal,
        });
        return parseProtocolTemplatePage(response.data);
    },
    getTemplate: async (templateId, signal) => {
        const response = await apiClient.get(
            `/expert/protocol-templates/${encodeURIComponent(templateId)}`,
            { signal }
        );
        return parseProtocolTemplateDetail(response.data);
    },
};

/* ─── Exports ───────────────────────────────────────────────── */
export {
    expertProtocolTemplateAPI,
    adminAccountAPI,
    authAPI,
    cloudinaryAPI,
    expertDashboardAPI,
    expertSeasonAPI,
    expertProductionProtocolAPI,
    notificationAPI,
    profileAPI,
    ragDocumentAPI,
    uploadCloudinaryDocument,
};
