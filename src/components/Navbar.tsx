import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Scale, LogOut, Settings, User, Shield, Bell, BookOpen } from 'lucide-react';
import UserManualModal from './UserManualModal.tsx';
import ProfileSettingsModal from './ProfileSettingsModal';
import { useEffect, useState } from 'react';
import { getMyNotifications, markNotificationRead } from '@/lib/api';
import { Badge as UIBadge } from '@/components/ui/badge';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [isManualOpen, setIsManualOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = () => getMyNotifications().then((items) => { if (mounted) setNotifs(items || []); }).catch(() => { if (mounted) setNotifs([]); });
    load();
    const id = setInterval(load, 15000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const getRoleDisplay = (role: string) => {
    const roles = {
      lawyer: 'Legal Counsel',
      judge: 'Presiding Judge',
      clerk: 'Demo Court Clerk',
      admin: 'System Administrator',
      prosecutor: 'Demo Prosecutor',
      citizen: 'Citizen',
      paralegal: 'Paralegal Officer',
      legal_aid_officer: 'Legal Aid Officer',
      partner_admin: 'Partner Administrator',
      data_analyst: 'Justice Data Analyst'
    };
    return roles[role as keyof typeof roles] || role;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border shadow-card">
      <div className="px-6 h-16 flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center space-x-3">
          <Scale className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-xl font-serif font-bold text-primary">Justice Link</h1>
            <p className="text-xs text-muted-foreground">Local justice access demo</p>
          </div>
        </div>

        {/* User Menu */}
        <div className="flex items-center space-x-4">
          {/* User Manual */}
          <Button variant="outline" onClick={() => setIsManualOpen(true)} className="hidden sm:flex">
            <BookOpen className="h-4 w-4 mr-2" />
            User Manual
          </Button>
          {/* Security Indicator */}
          <div className="flex items-center space-x-2 px-3 py-1 bg-success/10 rounded-full">
            <Shield className="h-3 w-3 text-success" />
            <span className="text-xs text-success font-medium">Local Session</span>
          </div>

          {/* Notifications */}
          <DropdownMenu open={isNotifOpen} onOpenChange={setIsNotifOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 p-0">
                <Bell className="h-5 w-5" />
                {notifs.some(n => !n.readAt) && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] leading-4 text-center">{notifs.filter(n => !n.readAt).length}</span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="max-h-80 overflow-auto">
                {notifs.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">No notifications</div>
                ) : notifs.map((n) => (
                  <div key={n.id} className={`px-3 py-2 border-b border-border ${n.readAt ? 'bg-background' : 'bg-accent/40'}`}>
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{n.title}</p>
                      {!n.readAt && <UIBadge variant="outline" className="text-[10px]">New</UIBadge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    <div className="mt-1 flex gap-2">
                      {n.link && (
                        <Button size="sm" variant="outline" onClick={() => { setIsNotifOpen(false); navigate(n.link); }}>
                          View
                        </Button>
                      )}
                      {!n.readAt && (
                        <Button size="sm" variant="ghost" onClick={async () => { await markNotificationRead(n.id); setNotifs((prev) => prev.map(x => x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)); }}>
                          Mark read
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 h-10">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{getRoleDisplay(user?.role || '')}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                <User className="mr-2 h-4 w-4" />
                Quick Edit Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <User className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Preferences
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ProfileSettingsModal open={isProfileOpen} onOpenChange={setIsProfileOpen} />
          <UserManualModal open={isManualOpen} onOpenChange={setIsManualOpen} />
        </div>
      </div>
    </nav>
  );
}
