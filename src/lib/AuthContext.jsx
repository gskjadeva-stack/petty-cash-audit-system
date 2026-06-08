import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/api/supabase';
import { db } from '@/api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const sessionUserIdRef = useRef(null);
  const isAuthenticatedRef = useRef(false);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const checkUserAuth = useCallback(async ({ showLoading = false, allowSignOut = true } = {}) => {
    try {
      if (showLoading) setIsLoadingAuth(true);
      if (allowSignOut) setAuthError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        sessionUserIdRef.current = null;
        if (allowSignOut) {
          setIsAuthenticated(false);
          setUser(null);
        }
        setAuthChecked(true);
        return;
      }

      sessionUserIdRef.current = session.user?.id ?? null;

      const currentUser = await db.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthChecked(true);
      setAuthError(null);
    } catch (error) {
      console.error('User auth check failed:', error);
      if (allowSignOut) {
        sessionUserIdRef.current = null;
        setIsAuthenticated(false);
        setUser(null);
        setAuthChecked(true);

        if (error.status === 401 || error.status === 403) {
          setAuthError({
            type: 'auth_required',
            message: 'Authentication required',
          });
        }
      }
    } finally {
      if (showLoading) setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    checkUserAuth({ showLoading: true });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        sessionUserIdRef.current = session?.user?.id ?? null;
        return;
      }

      if (event === 'SIGNED_OUT') {
        sessionUserIdRef.current = null;
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
        setAuthError(null);
        return;
      }

      if (event === 'TOKEN_REFRESHED') return;

      if (event === 'SIGNED_IN') {
        if (isAuthenticatedRef.current) return;
        sessionUserIdRef.current = session?.user?.id ?? null;
        checkUserAuth({ showLoading: false, allowSignOut: false });
        return;
      }

      if (event === 'USER_UPDATED') {
        checkUserAuth({ showLoading: false, allowSignOut: false });
      }
    });

    return () => subscription.unsubscribe();
  }, [checkUserAuth]);

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);

    if (shouldRedirect) {
      db.auth.logout(window.location.origin + '/login');
    } else {
      db.auth.logout();
    }
  };

  const navigateToLogin = () => {
    db.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        authError,
        authChecked,
        logout,
        navigateToLogin,
        checkUserAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
