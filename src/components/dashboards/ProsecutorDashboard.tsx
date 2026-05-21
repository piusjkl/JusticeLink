import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCases } from '@/lib/api';
import { FolderSearch, CalendarDays, FileText, Building2, Users2, Scale, Upload, FileCheck, ShieldAlert } from 'lucide-react';
import { CaseProgressTrigger } from '@/components/CaseProgress';
import { formatDistanceToNow, parseISO } from 'date-fns';

export function ProsecutorDashboard() {
  const navigate = useNavigate();

  const [assignedCases, setAssignedCases] = React.useState<any[]>([]);
  const [lawEnforcementQueue, setQueue] = React.useState<any[]>([]);
  React.useEffect(() => {
    getCases().then((data) => {
      setQueue(data.filter((c: any) => c.type === 'criminal'));
      setAssignedCases(Array.isArray(data) ? data : []);
    }).catch(() => {
      setQueue([]);
      setAssignedCases([]);
    });
  }, []);
  const upcomingHearings = assignedCases.filter(c => c.nextHearing).sort((a, b) => new Date(a.nextHearing!).getTime() - new Date(b.nextHearing!).getTime());

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Prosecution Dashboard</h1>
          <p className="text-muted-foreground">Government oversight • Case review • Evidence management</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => navigate('/reports')}>
            <Building2 className="w-4 h-4 mr-2" />
            Govt. Reports
          </Button>
          <Button className="bg-gradient-navy text-primary-foreground hover:opacity-90" onClick={() => navigate('/upload')}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Evidence
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assigned Cases</CardTitle>
            <FolderSearch className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{assignedCases.length}</div>
            <p className="text-xs text-success">Under prosecution</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">LEO Submissions</CardTitle>
            <ShieldAlert className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{lawEnforcementQueue.length}</div>
            <p className="text-xs text-warning">Awaiting review</p>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Evidence</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">7</div>
            <p className="text-xs text-muted-foreground">To review</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cases for Prosecution */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif">Cases from Law Enforcement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lawEnforcementQueue.map((case_) => (
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
                    Review Case
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

        {/* Collaboration Tools */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif">Collaboration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border border-border rounded-lg flex items-center justify-between">
              <div>
                <h4 className="font-medium text-foreground">Coordinate with Judges</h4>
                <p className="text-sm text-muted-foreground">Share evidence and request expedited hearings</p>
              </div>
              <Button variant="outline" onClick={() => navigate('/scheduling')}>
                <Scale className="w-4 h-4 mr-2" /> Court Calendar
              </Button>
            </div>
            <div className="p-4 border border-border rounded-lg flex items-center justify-between">
              <div>
                <h4 className="font-medium text-foreground">Work with Registrars</h4>
                <p className="text-sm text-muted-foreground">Manage filings and document certifications</p>
              </div>
              <Button variant="outline" onClick={() => navigate('/documents')}>
                <FileCheck className="w-4 h-4 mr-2" /> Documents
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ProsecutorDashboard;
