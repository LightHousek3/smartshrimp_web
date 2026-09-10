import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getRoleHomePath } from '../constants/portal';
import Loading from './Loading';

const PublicRoute = ({ children }) => {
    const { isAuthenticated, loading, user } = useAuth();

    if (loading) {
        return (
            <div className="full-page-loading">
                <Loading tip="Đang kiểm tra phiên đăng nhập..." />
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to={getRoleHomePath(user?.role)} replace />;
    }

    return children;
};

export default PublicRoute;
