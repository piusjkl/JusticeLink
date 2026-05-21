import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const Index = () => {
  const { isAuthenticated } = useAuth();
  
  // Redirect authenticated users to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Redirect unauthenticated users to login
  return <Navigate to="/login" replace />;
};

export default Index;
