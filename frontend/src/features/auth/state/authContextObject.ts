import { createContext } from 'react';
import { UseAuthReturn } from '../hooks/useAuth';

export const AuthContext = createContext<UseAuthReturn | null>(null);
export default AuthContext;
