import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Shield, Activity, UserPlus, Database, Settings, AlertTriangle } from 'lucide-react';
import { CaseProgressTrigger } from '@/components/CaseProgress';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { getCases, getUsers } from '@/lib/api';

export function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([getUsers().catch(e => { throw e; }), getCases().catch(e => { throw e; })])
      .then(([u, c]) => {
        if (!mounted) return;
        setUsers(Array.isArray(u) ? u : []);
        setCases(Array.isArray(c) ? c : []);
        setLoading(false);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || 'Failed to load admin data');
        setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const totalUsers = users.length;
  const activeUsers = useMemo(() => {
    // Backend may not provide a user.status; if missing, treat all as active
    const hasStatus = users.some((u: any) => typeof u?.status !== 'undefined');
    return hasStatus ? users.filter((u: any) => u.status === 'active').length : users.length;
  }, [users]);

  const recentUsers = useMemo(() => {
    // Prefer createdAt/updatedAt if available; else just take first 4
    const sortable = [...users];
    const key = users.some((u: any) => u?.createdAt) ? 'createdAt' : users.some((u: any) => u?.updatedAt) ? 'updatedAt' : '';
    if (key) sortable.sort((a: any, b: any) => new Date(b[key] || 0).getTime() - new Date(a[key] || 0).getTime());
    return sortable.slice(0, 4);
  }, [users]);

  const recentCases = useMemo(() => {
    const sortable = [...cases];
    const key = cases.some((c: any) => c?.filingDate) ? 'filingDate' : cases.some((c: any) => c?.createdAt) ? 'createdAt' : '';
    if (key) sortable.sort((a: any, b: any) => new Date(b[key] || 0).getTime() - new Date(a[key] || 0).getTime());
    return sortable.slice(0, 4);
  }, [cases]);

  const recentActivity = useMemo(() => {
    // Derive pseudo audit activity from most recent cases as we migrate away from mocks
    const sortable = [...cases];
    const key = cases.some((c: any) => c?.filingDate) ? 'filingDate' : cases.some((c: any) => c?.createdAt) ? 'createdAt' : '';
    if (key) sortable.sort((a: any, b: any) => new Date(b[key] || 0).getTime() - new Date(a[key] || 0).getTime());
    return sortable.slice(0, 6).map((c: any) => ({
      id: c.id,
      user: c.lawyer?.name || c.plaintiff || 'System',
      action: 'CASE_CREATE',
      details: `Case registered: ${c.title}`,
      timestamp: c.filingDate || c.createdAt || new Date().toISOString(),
      ipAddress: '127.0.0.1',
    }));
  }, [cases]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'judge': return 'bg-primary text-primary-foreground';
      case 'lawyer': return 'bg-success text-success-foreground';
      case 'clerk': return 'bg-gold text-gold-foreground';
      case 'admin': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'FILE_UPLOAD': return 'bg-gold text-gold-foreground';
      case 'CASE_REVIEW': return 'bg-primary text-primary-foreground';
      case 'CASE_CREATE': return 'bg-success text-success-foreground';
      case 'LOGIN': return 'bg-muted text-muted-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">System Administration</h1>
          </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => navigate('/settings')}>
            <Settings className="w-4 h-4 mr-2" />
            System Settings
          </Button>
          <Button className="bg-gradient-navy text-primary-foreground hover:opacity-90" onClick={() => navigate('/users')}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Top KPI cards removed per requirement */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Management */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif flex items-center">
              <Users className="w-5 h-5 mr-2 text-primary" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-gradient-subtle rounded-lg">
                <div className="text-2xl font-bold text-primary">{loading ? '…' : totalUsers}</div>
                <div className="text-xs text-muted-foreground">Total Users</div>
              </div>
             
            </div>

            {loading ? (
              <div className="text-sm text-muted-foreground">Loading users…</div>
            ) : error ? (
              <div className="text-sm text-destructive">{error}</div>
            ) : recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{user.name}</p>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className={getRoleColor(user.role || 'user')}>
                        {user.role || 'user'}
                      </Badge>
                      {user.lastLogin || user.updatedAt || user.createdAt ? (
                        <span className="text-xs text-muted-foreground">
                          Updated {formatDistanceToNow(parseISO((user.lastLogin || user.updatedAt || user.createdAt)))} ago
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate(`/users`)}>
                  Manage
                </Button>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={() => navigate('/users')}>
              View All Users
            </Button>
          </CardContent>
        </Card>

        {/* Recent System Activity */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif flex items-center">
              <Activity className="w-5 h-5 mr-2 text-primary" />
              Recent System Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading activity…</div>
            ) : error ? (
              <div className="text-sm text-destructive">{error}</div>
            ) : recentActivity.map((log) => (
              <div key={log.id} className="flex items-start space-x-3 p-3 border border-border rounded-lg">
                <div className="w-2 h-2 bg-success rounded-full mt-2"></div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-foreground">{log.user}</span>
                    <Badge variant="outline" className={getActionColor(log.action)}>
                      {log.action}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{log.details}</p>
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span>{formatDistanceToNow(parseISO(log.timestamp))} ago</span>
                    <span>{log.ipAddress}</span>
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={() => navigate('/reports')}>
              View Full Audit Log
            </Button>
          </CardContent>
        </Card>
      </div>

      

      {/* Cases snapshot for Admin */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-serif flex items-center">
            <Activity className="w-5 h-5 mr-2 text-primary" />
            Recent Cases (Admin view)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading cases…</div>
            ) : error ? (
              <div className="text-sm text-destructive">{error}</div>
            ) : recentCases.map((case_) => (
              <div key={case_.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div>
                  <p className="font-medium text-foreground">{case_.title}</p>
                  <p className="text-xs text-muted-foreground">{case_.externalId || case_.id} • {case_.type}</p>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/case/${case_.externalId || case_.id}`)}>Open</Button>
                  <CaseProgressTrigger caseId={case_.externalId || case_.id} label="Progress" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Health & Security */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif text-lg">System Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">CPU Usage</span>
              <span className="text-sm font-medium text-success">32%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-success h-2 rounded-full" style={{width: '32%'}}></div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Memory Usage</span>
              <span className="text-sm font-medium text-gold">68%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-gold h-2 rounded-full" style={{width: '68%'}}></div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Storage Usage</span>
              <span className="text-sm font-medium text-warning">45%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-warning h-2 rounded-full" style={{width: '45%'}}></div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif text-lg flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              Security Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">SSL Certificate</span>
              <Badge className="bg-success text-success-foreground">Valid</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Firewall Status</span>
              <Badge className="bg-success text-success-foreground">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Failed Logins</span>
              <Badge className="bg-warning text-warning-foreground">2 Today</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Last Security Scan</span>
              <span className="text-xs text-muted-foreground">2 hours ago</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/users')}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add New User
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/backup')}>
              <Database className="w-4 h-4 mr-2" />
              Backup Database
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/scheduling')}>
              <Shield className="w-4 h-4 mr-2" />
              Security Scan
            </Button>
            <Button variant="outline" className="w-full justify-start text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => navigate('/alerts')}>
              <AlertTriangle className="w-4 h-4 mr-2" />
              View Alerts
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}