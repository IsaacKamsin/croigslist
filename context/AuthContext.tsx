import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

type MemberStatus = 'none' | 'pending' | 'approved' | 'rejected';

interface AuthState {
  isAuthenticated: boolean;
  memberStatus: MemberStatus;
  member: Member | null;
}

interface Member {
  id: string;
  name: string;
  handle: string;
  city: string;
  isVerified: boolean;
  memberSince: string;
  type: 'rider' | 'builder' | 'shop';
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  applyForMembership: (application: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    memberStatus: 'none',
    member: null,
  });

  const signIn = useCallback(async (email: string, password: string) => {
    // TODO: Wire to backend
    setState({
      isAuthenticated: true,
      memberStatus: 'approved',
      member: {
        id: '1',
        name: 'Demo Member',
        handle: 'demo',
        city: 'Minneapolis',
        isVerified: true,
        memberSince: '2026',
        type: 'rider',
      },
    });
  }, []);

  const signOut = useCallback(() => {
    setState({
      isAuthenticated: false,
      memberStatus: 'none',
      member: null,
    });
  }, []);

  const applyForMembership = useCallback(async (application: any) => {
    // TODO: Wire to backend + Stripe $100/yr
    setState((prev) => ({ ...prev, memberStatus: 'pending' }));
  }, []);

  const value = useMemo(
    () => ({ ...state, signIn, signOut, applyForMembership }),
    [state, signIn, signOut, applyForMembership],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
