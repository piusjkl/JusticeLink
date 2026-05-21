import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, FileText, Clock, AlertCircle, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CaseProgressTrigger } from '@/components/CaseProgress';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { getCases } from '@/lib/api';
import { LawyerVirtualHearingDemo } from '@/components/LawyerVirtualHearingDemo';

export function LawyerDashboard() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getCases()
      .then((data) => { if (mounted) { setCases(Array.isArray(data) ? data : []); setLoading(false); } })
      .catch((e) => { if (mounted) { setError(e?.message || 'Failed to load'); setLoading(false); } });
    return () => { mounted = false; };
  }, []);

  const assignedCases = useMemo(() => cases, [cases]);
  const upcomingHearings = useMemo(() => assignedCases
    .filter((c: any) => c.nextHearing)
    .sort((a: any, b: any) => new Date(a.nextHearing!).getTime() - new Date(b.nextHearing!).getTime()), [assignedCases]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success text-success-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'closed': return 'bg-muted text-muted-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-gold text-gold-foreground';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const [searchInput, setSearchInput] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Legal Dashboard</h1>
          <p className="text-muted-foreground">Manage your cases and upcoming hearings</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input className="pl-10 w-64" placeholder="Search cases..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/search?q=${encodeURIComponent(searchInput)}`); }} />
          </div>
          <Button variant="outline" onClick={() => navigate(`/search?q=${encodeURIComponent(searchInput)}`)}>Search</Button>
          <Button className="bg-gradient-navy text-primary-foreground hover:opacity-90" onClick={() => navigate('/upload')}>
            <Plus className="w-4 h-4 mr-2" />
            Upload Files
          </Button>
          {/* <Button className="bg-gradient-navy text-primary-foreground hover:opacity-90" onClick={() => navigate('/register-case')}>
            <Plus className="w-4 h-4 mr-2" />
            New Case Request
          </Button> */}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assigned Cases</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{assignedCases.length}</div>
            <p className="text-xs text-success">Active workload</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Cases</CardTitle>
            <AlertCircle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{assignedCases.filter((c: any) => c.status === 'active').length}</div>
            <p className="text-xs text-warning">Requiring attention</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Hearings</CardTitle>
            <CalendarDays className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{upcomingHearings.length}</div>
            <p className="text-xs text-gold">Next 30 days</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Documents</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">7</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
      </div>

      <LawyerVirtualHearingDemo cases={assignedCases} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Cases */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif">Your Assigned Cases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : error ? (
              <div className="text-sm text-destructive">{error}</div>
            ) : assignedCases.map((case_: any) => (
              <div key={case_.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium text-foreground">{case_.title}</h4>
                    <Badge variant="outline" className={getStatusColor(case_.status)}>
                      {case_.status}
                    </Badge>
                    <Badge variant="outline" className={getPriorityColor(case_.priority)}>
                      {case_.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{case_.externalId || case_.id}</p>
                  <p className="text-sm text-muted-foreground">{case_.type} • Filed {formatDistanceToNow(parseISO(case_.filingDate))} ago</p>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate(`/case/${case_.externalId || case_.id}`)}>
                    View Details
                  </Button>
                  <CaseProgressTrigger caseId={case_.externalId || case_.id} label="Progress" />
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={() => navigate('/cases')}>
              View All Cases
            </Button>
          </CardContent>
        </Card>

        {/* Upcoming Hearings */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif">Upcoming Court Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingHearings.map((case_) => (
              <div key={case_.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-foreground mb-1">{case_.title}</h4>
                  <p className="text-sm text-muted-foreground mb-1">{case_.externalId || case_.id}</p>
                  <div className="flex items-center text-sm text-gold">
                    <CalendarDays className="w-4 h-4 mr-1" />
                    {case_.nextHearing && new Intl.DateTimeFormat('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    }).format(new Date(case_.nextHearing))}
                  </div>
                </div>
                <Button size="sm" className="bg-gradient-gold text-gold-foreground hover:opacity-90" onClick={() => navigate(`/case/${case_.externalId || case_.id}`)}>
                  Prepare
                </Button>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={() => navigate('/scheduling')}>
              View Full Calendar
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
