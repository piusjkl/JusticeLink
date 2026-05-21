import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';

export default function ProfileSettingsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user, updateUser } = useAuth() as any;
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pref_dark_mode');
      if (saved !== null) return JSON.parse(saved);
    } catch {}
    return theme === 'dark';
  });

  const initial = useRef(true);

  useEffect(() => {
    setName(user?.name || '');
    setEmail(user?.email || '');
  }, [user]);

  useEffect(() => {
    if (initial.current) {
      initial.current = false;
      return;
    }

    try { setTheme(darkMode ? 'dark' : 'light'); } catch {}
    toast({ title: darkMode ? 'Dark mode enabled' : 'Light mode enabled' });
  }, [darkMode, setTheme, toast]);

  const handleSave = () => {
    if (updateUser) updateUser({ ...user, name, email });
    localStorage.setItem('pref_dark_mode', JSON.stringify(darkMode));
    toast({ title: 'Profile updated', description: 'Your profile changes have been saved.' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Edit Profile</DialogTitle>
        </DialogHeader>

        <Card>
          <CardContent>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Full Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Dark Mode</Label>
                </div>
                <Switch checked={darkMode} onCheckedChange={(v) => setDarkMode(Boolean(v))} />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleSave}>Save</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
