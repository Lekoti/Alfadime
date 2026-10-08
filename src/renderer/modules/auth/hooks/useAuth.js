import { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { USER_ROLES } from '../constants/userRoles';

export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await authService.getCurrentSession();
      if (result.success && result.data) {
        setSession(result.data);
      } else {
        setSession(null);
      }
    } catch (err) {
      setError(err.message);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username, isPersistent = false) => {
    try {
      setLoading(true);
      setError(null);
      const result = await authService.login(username, isPersistent);
      if (result.success) {
        setSession(result.data);
        return { success: true, data: result.data };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await authService.logout();
      if (result.success) {
        setSession(null);
        return { success: true };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const hasPermission = useCallback((moduleKey, action = 'can_view') => {
    if (!session?.user) return false;
    if (session.user.role === USER_ROLES.CREATOR) return true;
    if (!session.permissions) return false;
    
    const modulePerm = session.permissions.find(p => p.module_key === moduleKey);
    if (!modulePerm) return false;
    
    return !!modulePerm[action];
  }, [session]);

  const isCreator = session?.user?.role === USER_ROLES.CREATOR;
  const isAdmin = session?.user?.role === USER_ROLES.ADMIN;
  const isEditor = session?.user?.role === USER_ROLES.EDITOR;
  const isViewer = session?.user?.role === USER_ROLES.VIEWER;
  const isPending = session?.user?.role === USER_ROLES.PENDING;

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  return {
    session,
    user: session?.user,
    loading,
    error,
    isAuthenticated: !!session,
    isCreator,
    isAdmin,
    isEditor,
    isViewer,
    isPending,
    login,
    logout,
    refreshSession: loadSession,
    hasPermission,
  };
}

export default useAuth;