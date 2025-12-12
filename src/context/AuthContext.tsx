import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isCloudEnabled: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const cloudEnabled = isSupabaseConfigured();

  useEffect(() => {
    console.log('🔐 [AuthContext] Initializing...', { cloudEnabled });
    
    if (!cloudEnabled) {
      console.warn('⚠️ [AuthContext] Cloud disabled - skipping auth');
      setIsLoading(false);
      return;
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('✅ [AuthContext] Session loaded:', session?.user?.email || 'No user');
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 [AuthContext] Auth state changed:', event, session?.user?.email || 'No user');
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [cloudEnabled]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isCloudEnabled: cloudEnabled,
      }}
    >
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
