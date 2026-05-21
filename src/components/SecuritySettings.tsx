import React, { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { useToast } from '@/hooks/use-toast';

const STORAGE_KEY = 'security_settings_v1';

type SettingsState = {
  mfa: boolean;
  ipRestrict: boolean;
  sessionTimeoutMinutes: number;
  passwordMinLength: number;
};

export default function SecuritySettings({ onBack }: { onBack?: () => void }) {
  const [mfa, setMfa] = useState(true);
  const [ipRestrict, setIpRestrict] = useState(false);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(60);
  const [passwordMinLength, setPasswordMinLength] = useState(8);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: SettingsState = JSON.parse(raw);
        setMfa(parsed.mfa);
        setIpRestrict(parsed.ipRestrict);
        setSessionTimeoutMinutes(parsed.sessionTimeoutMinutes || 60);
        setPasswordMinLength(parsed.passwordMinLength || 8);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  function save() {
    const payload: SettingsState = { mfa, ipRestrict, sessionTimeoutMinutes, passwordMinLength };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    toast({ title: 'Security settings saved', description: 'Changes to security settings were saved (demo).' });
    if (onBack) onBack();
  }

  function reset() {
    setMfa(true);
    setIpRestrict(false);
    setSessionTimeoutMinutes(60);
    setPasswordMinLength(8);
    localStorage.removeItem(STORAGE_KEY);
    toast({ title: 'Reset', description: 'Reverted demo settings.' });
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Security Settings</h1>
        <div>
          {onBack && <Button variant="ghost" onClick={onBack}>Back</Button>}
        </div>
      </div>

      <div className="space-y-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="font-medium">Multi-factor Authentication</div>
            <div className="text-sm text-muted-foreground">Require MFA for all admin accounts</div>
          </div>
          <Switch checked={mfa} onCheckedChange={() => setMfa(!mfa)} />
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="font-medium">IP Restriction</div>
            <div className="text-sm text-muted-foreground">Only allow admin access from whitelisted IPs (demo).</div>
          </div>
          <Switch checked={ipRestrict} onCheckedChange={() => setIpRestrict(!ipRestrict)} />
        </Card>

        <Card className="p-4">
          <div className="mb-2 font-medium">Session Timeout (minutes)</div>
          <div className="flex items-center space-x-2">
            <Input type="number" value={String(sessionTimeoutMinutes)} onChange={(e: any) => setSessionTimeoutMinutes(Number(e.target.value))} className="w-36" />
            <div className="text-sm text-muted-foreground">Automatic logout after inactivity</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-2 font-medium">Password Policy</div>
          <div className="flex items-center space-x-2">
            <div className="w-40">
              <div className="text-sm text-muted-foreground">Minimum Length</div>
              <Input type="number" value={String(passwordMinLength)} onChange={(e: any) => setPasswordMinLength(Number(e.target.value))} />
            </div>
            <div className="text-sm text-muted-foreground">Enforce complexity and reuse rules in production (demo does not enforce).</div>
          </div>
        </Card>

        <div className="flex items-center space-x-2">
          <Button onClick={save}>Save Changes</Button>
          <Button variant="ghost" onClick={reset}>Reset</Button>
        </div>
      </div>
    </div>
  );
}
