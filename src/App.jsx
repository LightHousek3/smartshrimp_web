import { App as AntdApp, ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import {
    AdminLayout,
    ExpertLayout,
    GlobalAuthListener,
    ProtectedRoute,
    PublicRoute,
} from './components';
import { AccountList, Dashboard } from './pages/admin';
import { EmptyExpertPage } from './pages/expert';
import { NotFound, UnAuthorized } from './pages/error';
import { Login } from './pages/auth';
import { USER_ROLES } from './constants/portal';

function App() {
    return (
        <ConfigProvider
            locale={viVN}
            theme={{
                token: {
                    colorPrimary: '#3f91d5',
                    colorText: '#17243a',
                    borderRadius: 12,
                    fontFamily: "'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif",
                },
            }}
        >
            <AntdApp message={{ maxCount: 3 }}>
                <AuthProvider>
                    <BrowserRouter>
                        <GlobalAuthListener />
                        <Routes>
                            <Route path="/" element={<Navigate to="/login" replace />} />
                            <Route
                                path="/login"
                                element={
                                    <PublicRoute>
                                        <Login />
                                    </PublicRoute>
                                }
                            />

                            <Route
                                path="/admin"
                                element={
                                    <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                                        <AdminLayout />
                                    </ProtectedRoute>
                                }
                            >
                                <Route index element={<Dashboard />} />
                                <Route path="accounts" element={<AccountList />} />
                            </Route>

                            <Route
                                path="/expert"
                                element={
                                    <ProtectedRoute allowedRoles={[USER_ROLES.EXPERT]}>
                                        <ExpertLayout />
                                    </ProtectedRoute>
                                }
                            >
                                <Route index element={<Navigate to="protocols" replace />} />
                                <Route path="protocols" element={<EmptyExpertPage />} />
                                <Route path="seasons" element={<EmptyExpertPage />} />
                                <Route path="disease-cases" element={<EmptyExpertPage />} />
                                <Route path="treatments" element={<EmptyExpertPage />} />
                            </Route>

                            <Route path="/unauthorized" element={<UnAuthorized />} />
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </BrowserRouter>
                </AuthProvider>
            </AntdApp>
        </ConfigProvider>
    );
}

export default App;
