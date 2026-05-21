import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthState, LoginCredentials } from '@/types/auth';
import api from '@/lib/http';
import { updateMe } from '@/lib/api';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// No local mock users; use backend

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false
  });
  const [needsProfile, setNeedsProfile] = useState<{ open: boolean } | null>(null);

  const promptKey = (userId: string) => `profile_prompt_shown_${userId}`;
  const hasPromptBeenShown = (userId: string) => {
    try { return localStorage.getItem(promptKey(userId)) === '1'; } catch { return false; }
  };
  const markPromptShown = (userId: string) => {
    try { localStorage.setItem(promptKey(userId), '1'); } catch {}
  };

  // Backend login
  const login = async (credentials: LoginCredentials) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    try {
      const res = await api.post('/auth/login', credentials);
      const { token, user } = res.data as { token: string; user: User };
      localStorage.setItem('token', token);
      setAuthState({ user, isAuthenticated: true, isLoading: false });
      if ((!user.dateOfBirth || !user.address) && !hasPromptBeenShown(user.id)) {
        setNeedsProfile({ open: true });
      } else {
        setNeedsProfile(null);
      }
    } catch (e: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw new Error(e?.response?.data?.error || 'Login failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false
    });
  };

  // Bootstrap session on refresh: if token exists, fetch me and decide whether to prompt
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || authState.isAuthenticated || authState.isLoading) return;
    setAuthState(prev => ({ ...prev, isLoading: true }));
    api.get('/users/me')
      .then((res) => {
        const user = res.data as User;
        setAuthState({ user, isAuthenticated: true, isLoading: false });
        if ((!user.dateOfBirth || !user.address) && !hasPromptBeenShown(user.id)) {
          setNeedsProfile({ open: true });
        } else {
          setNeedsProfile(null);
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        setAuthState({ user: null, isAuthenticated: false, isLoading: false });
      });
  }, [authState.isAuthenticated, authState.isLoading]);

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
      {authState.isAuthenticated && needsProfile?.open && authState.user && (
        <ProfileCompletionModal onClose={() => { markPromptShown(authState.user!.id); setNeedsProfile(null); }} onSave={async (dob, address) => {
          await updateMe({ dateOfBirth: dob, address });
          setAuthState(prev => ({ ...prev, user: prev.user ? { ...prev.user, dateOfBirth: dob, address } : prev.user }));
          markPromptShown(authState.user!.id);
          setNeedsProfile(null);
        }} />
      )}
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

function ProfileCompletionModal({ onClose, onSave }: { onClose: () => void; onSave: (dob: string, address: string) => Promise<void> }) {
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-serif mb-2">Complete Your Profile</h2>
        <p className="text-sm text-muted-foreground mb-4">We collect your Date of Birth and Address to verify identity and comply with court procedures.</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs block mb-1">Date of Birth</label>
            <input className="w-full border rounded px-3 h-9 bg-background" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div>
            <label className="text-xs block mb-1">Address</label>
            <input className="w-full border rounded px-3 h-9 bg-background" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button className="h-9 px-3 rounded border" onClick={onClose}>Cancel</button>
          <button className="h-9 px-3 rounded bg-primary text-primary-foreground" disabled={!dob || !address || saving} onClick={async () => { setSaving(true); await onSave(new Date(dob).toISOString(), address); setSaving(false); }}>Save</button>
        </div>
      </div>
    </div>
  );
}
