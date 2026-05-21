import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';

export default function SettingsPage({ onBack }: { onBack?: () => void }) {
  const { user, updateUser } = useAuth() as any;
  const { toast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [emailNotifications, setEmailNotifications] = useState<boolean>(() => {
    try {
      return JSON.parse(localStorage.getItem('pref_email_notifications') || 'true');
    } catch {
      return true;
    }
  });
  const { theme, setTheme } = useTheme();
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pref_dark_mode');
      if (saved !== null) return JSON.parse(saved);
    } catch {}
    return theme === 'dark';
  });

  useEffect(() => {
    setName(user?.name || '');
    setEmail(user?.email || '');
  }, [user]);

  const handleSave = () => {
    // Update auth user if updateUser exists (demo hook)
    if (updateUser) {
      updateUser({ ...user, name, email });
    }

    // Persist preferences locally (demo)
    localStorage.setItem('pref_email_notifications', JSON.stringify(emailNotifications));
    localStorage.setItem('pref_dark_mode', JSON.stringify(darkMode));

    // apply theme via next-themes immediately
    try {
      setTheme(darkMode ? 'dark' : 'light');
    } catch {}

    toast({ title: 'Settings saved', description: 'Your profile and preferences have been updated.' });
  };

  // keep theme in sync when darkMode toggle changes
  useEffect(() => {
    try {
      setTheme(darkMode ? 'dark' : 'light');
    } catch {}
  }, [darkMode, setTheme]);

  const handlePasswordChange = () => {
    toast({ title: 'Password change', description: 'Password change requested (demo). Please contact system administrator.' });
  };

  return (
    <div className="p-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label className="text-xs">Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div>
              <Label className="text-xs">Email Address</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            </div>

            <div>
              <Label className="text-xs">Role</Label>
              <div className="p-2 border border-border rounded-md text-sm">{user?.role || 'N/A'}</div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                <Label className="text-xs">Email Notifications</Label>
                <div className="mt-2">
                  <Switch checked={emailNotifications} onCheckedChange={(v) => setEmailNotifications(Boolean(v))} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Dark Mode</Label>
                <div className="mt-2">
                  <Switch checked={darkMode} onCheckedChange={(v) => setDarkMode(Boolean(v))} />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs">Change Password</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Button variant="outline" onClick={handlePasswordChange}>Change Password</Button>
                <div className="text-sm text-muted-foreground">This is a demo action — no backend integration.</div>
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-4">
              <Button onClick={handleSave}>Save Changes</Button>
              {onBack ? <Button variant="outline" onClick={onBack}>Back</Button> : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
