import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const GlobalAuthListener = () => {
    const navigate = useNavigate();
    const { clearSession } = useAuth();

    useEffect(() => {
        const handleUnauthorized = () => {
            clearSession();
            navigate('/login', { replace: true });
        };

        window.addEventListener('auth-unauthorized', handleUnauthorized);

        // Cleanup listener when unmount
        return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
    }, [clearSession, navigate]);

    return null;
};

export default GlobalAuthListener;
