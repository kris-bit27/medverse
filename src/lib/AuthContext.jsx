import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

const mapSupabaseUser = (user) => {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
    role: user.app_metadata?.role || user.user_metadata?.role || 'student',
    settings: user.user_metadata?.settings || null,
    ...user.user_metadata,
    _supabase: user
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      setIsLoadingAuth(true);
      setAuthError(null);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (error) {
          setUser(null);
          setIsAuthenticated(false);
          setAuthError({ type: 'unknown', message: error.message });
        } else if (data?.session?.user) {
          setUser(mapSupabaseUser(data.session.user));
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setAuthError({ type: 'auth_required', message: 'Authentication required' });
        }
      } catch (error) {
        if (!isMounted) return;
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({ type: 'unknown', message: error.message || 'Unexpected auth error' });
      } finally {
        if (isMounted) {
          setIsLoadingAuth(false);
        }
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
      setIsLoadingAuth(false);
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const logout = async (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    await supabase.auth.signOut();
    if (shouldRedirect) {
      window.location.href = '/login';
    }
  };

  const navigateToLogin = () => {
    const returnTo = window.location.href;
    window.location.href = `/login?redirectTo=${encodeURIComponent(returnTo)}`;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      authError,
      logout,
      navigateToLogin,
    }}>
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
