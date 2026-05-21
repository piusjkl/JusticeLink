import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createCaseFromComplaint, getReferrals, getTriageQueue, reviewTriage, updateReferral } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle, Gavel, RefreshCw, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function ReferralWorkbench() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [referrals, setReferrals] = React.useState<any[]>([]);
  const [triage, setTriage] = React.useState<any[]>([]);
  const [status, setStatus] = React.useState('all');
  const [loading, setLoading] = React.useState(false);
  const [notes, setNotes] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [referralData, triageData] = await Promise.all([
        getReferrals(status === 'all' ? undefined : { status }),
        getTriageQueue(),
      ]);
      setReferrals(referralData);
      setTriage(triageData.filter((item: any) => !item.confidence || item.confidence < 0.6 || item.safetyFlag));
    } catch (e: any) {
      toast({ title: 'Failed to load workbench', description: e?.response?.data?.error || e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [status, toast]);

  React.useEffect(() => {
    load();
  }, [load]);

  const setReferralStatus = async (id: string, nextStatus: string) => {
    await updateReferral(id, { status: nextStatus, notes: notes[id] });
    toast({ title: 'Referral updated', description: `Referral marked ${nextStatus}.` });
    load();
  };

  const markReviewed = async (complaintId: string, urgency: 'normal' | 'high' | 'emergency') => {
    await reviewTriage(complaintId, { urgency, notes: 'Reviewed in referral workbench' });
    toast({ title: 'Triage reviewed' });
    load();
  };

  const openDemoCase = async (complaintId: string) => {
    try {
      const result = await createCaseFromComplaint(complaintId);
      const externalId = result?.case?.externalId || result?.case?.id;
      toast({ title: 'Demo case opened', description: `${externalId} was created from the synthetic complaint.` });
      await load();
      if (externalId) navigate(`/case/${externalId}`);
    } catch (e: any) {
      toast({ title: 'Failed to open demo case', description: e?.response?.data?.error || e.message, variant: 'destructive' });
    }
  };

  const canOpenCase = user?.role === 'clerk' || user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Referral Workbench</h1>
          <p className="text-muted-foreground">Review synthetic triage, accept referrals, and open demo court cases</p>
        </div>
        <div className="flex gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All referrals</SelectItem>
              <SelectItem value="recommended">Recommended</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold">{referrals.length}</p>
            <p className="text-sm text-muted-foreground">Visible referrals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold">{triage.length}</p>
            <p className="text-sm text-muted-foreground">Needs triage review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold">{referrals.filter((r) => r.complaint?.urgency === 'emergency').length}</p>
            <p className="text-sm text-muted-foreground">Emergency matters</p>
          </CardContent>
        </Card>
      </div>

      {triage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Triage Review Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {triage.map((item) => (
              <div key={item.id} className="rounded-md border p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium">{item.trackingCode}</p>
                    <p className="text-sm text-muted-foreground">{item.summary}</p>
                    <div className="mt-2 flex gap-2">
                      <Badge variant="outline">{item.category}</Badge>
                      <Badge variant={item.urgency === 'emergency' ? 'destructive' : 'secondary'}>{item.urgency}</Badge>
                      <Badge variant="outline">confidence {Math.round((item.confidence || 0) * 100)}%</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => markReviewed(item.id, 'high')}>Mark High</Button>
                    <Button size="sm" onClick={() => markReviewed(item.id, 'emergency')}>Escalate</Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {referrals.map((referral) => (
          <Card key={referral.id}>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{referral.complaint.trackingCode}</h3>
                    <Badge variant="outline">{referral.complaint.category}</Badge>
                    <Badge variant={referral.complaint.urgency === 'emergency' ? 'destructive' : 'secondary'}>{referral.complaint.urgency}</Badge>
                    <Badge>{referral.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{referral.complaint.summary}</p>
                  <div className="grid gap-1 text-sm md:grid-cols-2">
                    <p>Target: <strong>{referral.target}</strong></p>
                    <p>District: <strong>{referral.complaint.district || 'Unknown'}</strong></p>
                    <p>Channel: <strong>{referral.complaint.channel}</strong></p>
                    <p>Citizen phone: <strong>{referral.complaint.citizenPhone || 'Hidden'}</strong></p>
                  </div>
                </div>
                <div className="min-w-72 space-y-2">
                  <Textarea value={notes[referral.id] || ''} onChange={(e) => setNotes((prev) => ({ ...prev, [referral.id]: e.target.value }))} placeholder="Referral note" rows={2} />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setReferralStatus(referral.id, 'accepted')}>
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Accept
                    </Button>
                    {canOpenCase && (
                      <Button
                        size="sm"
                        onClick={() => openDemoCase(referral.complaint.id)}
                        disabled={referral.complaint.status === 'case_opened'}
                      >
                        <Gavel className="mr-1 h-3 w-3" />
                        {referral.complaint.status === 'case_opened' ? 'Case Opened' : 'Open Demo Case'}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setReferralStatus(referral.id, 'assigned')}>Assign</Button>
                    <Button size="sm" onClick={() => setReferralStatus(referral.id, 'escalated')}>
                      <Shield className="mr-1 h-3 w-3" />
                      Escalate
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setReferralStatus(referral.id, 'closed')}>Close</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!loading && referrals.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">No referrals match this filter.</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
