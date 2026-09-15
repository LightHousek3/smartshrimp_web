import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { getRoleHomePath } from '../constants/portal';
import Loading from './Loading';

const PublicRoute = ({ children }) => {
    const { account, isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="full-page-loading">
                <Loading tip="Đang kiểm tra phiên đăng nhập..." />
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to={getRoleHomePath(account?.role)} replace />;
    }

    return children;
};

export default PublicRoute;
