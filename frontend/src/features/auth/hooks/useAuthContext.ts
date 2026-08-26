import { useContext } from 'react';
import { AuthContext } from '../state/authContextObject';
import { UseAuthReturn } from './useAuth';

export const useAuthContext = (): UseAuthReturn => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export default useAuthContext;
