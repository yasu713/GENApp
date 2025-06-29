'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  getCurrentUser, 
  signOut as amplifySignOut,
  fetchAuthSession,
  AuthUser
} from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  userGroups: string[];
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userGroups, setUserGroups] = useState<string[]>([]);

  const checkAuthState = async () => {
    try {
      setIsLoading(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      // Get user groups from JWT token
      const session = await fetchAuthSession();
      const accessToken = session.tokens?.accessToken;
      if (accessToken) {
        const groups = accessToken.payload['cognito:groups'] as string[] || [];
        setUserGroups(groups);
      }
    } catch (error) {
      console.log('User not authenticated:', error);
      setUser(null);
      setUserGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await amplifySignOut();
      setUser(null);
      setUserGroups([]);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const refreshAuth = async () => {
    await checkAuthState();
  };

  useEffect(() => {
    checkAuthState();

    // Listen for auth state changes
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
          checkAuthState();
          break;
        case 'signedOut':
          setUser(null);
          setUserGroups([]);
          break;
        case 'tokenRefresh':
          checkAuthState();
          break;
        default:
          break;
      }
    });

    return unsubscribe;
  }, []);

  const contextValue: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    userGroups,
    isAdmin: userGroups.includes('admin'),
    signOut,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}