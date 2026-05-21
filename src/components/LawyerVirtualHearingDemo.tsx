import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createVideoShareLinks, getActiveSessionForCase, getSession, joinVideo, recordSessionAction } from '@/lib/api';
import { CalendarDays, ExternalLink, Link as LinkIcon, RefreshCw, ShieldCheck, Users, Video } from 'lucide-react';

type DemoCase = {
  id: string;
  externalId?: string | null;
  title: string;
  type?: string | null;
  nextHearing?: string | null;
  hearingLocation?: string | null;
};

type ActiveSession = {
  id: string;
  startedAt?: string;
  mocked?: boolean;
  localOnly?: boolean;
  participants?: Array<{ id: string; role: string; user?: { name?: string } | null; userId?: string | null }>;
  actions?: Array<{ id: string; action: string; details?: string | null; createdAt: string }>;
};

interface LawyerVirtualHearingDemoProps {
  cases: DemoCase[];
  loading?: boolean;
}

type ApiError = {
  response?: {
    data?: {
      error?: string;
    };
  };
};

function caseIdentifier(caseItem: DemoCase) {
  return caseItem.externalId || caseItem.id;
}

function apiErrorMessage(error: unknown, fallback: string) {
  const message = (error as ApiError)?.response?.data?.error;
  return typeof message === 'string' && message.length > 0 ? message : fallback;
}

export function LawyerVirtualHearingDemo({ cases, loading = false }: LawyerVirtualHearingDemoProps) {
  const [selectedCaseId, setSelectedCaseId] = React.useState('');
  const [session, setSession] = React.useState<ActiveSession | null>(null);
  const [citizenLink, setCitizenLink] = React.useState('');
  const [statusMessage, setStatusMessage] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const selectedCase = React.useMemo(
    () => cases.find((caseItem) => caseIdentifier(caseItem) === selectedCaseId) || cases[0] || null,
    [cases, selectedCaseId]
  );

  React.useEffect(() => {
    if (!selectedCaseId && cases.length > 0) {
      setSelectedCaseId(caseIdentifier(cases[0]));
    }
  }, [cases, selectedCaseId]);

  const refreshSession = React.useCallback(async () => {
    if (!selectedCase) return;
    setBusy(true);
    setStatusMessage('');
    setCitizenLink('');
    try {
      const active = await getActiveSessionForCase(caseIdentifier(selectedCase));
      if (!active) {
        setSession(null);
        setStatusMessage('Judge or clerk has not started the demo hearing yet.');
        return;
      }
      const details = await getSession(active.id);
      setSession(details);
      setStatusMessage('Live demo hearing is available for this assigned case.');
    } catch (error) {
      setSession(null);
      setStatusMessage(apiErrorMessage(error, 'Unable to load hearing access for this case.'));
    } finally {
      setBusy(false);
    }
  }, [selectedCase]);

  React.useEffect(() => {
    if (!selectedCase) return;
    void refreshSession();
  }, [refreshSession, selectedCase]);

  const joinAsLawyer = async () => {
    if (!session) return;
    setBusy(true);
    setStatusMessage('');
    try {
      await joinVideo(session.id, 'lawyer');
      await recordSessionAction(session.id, 'mark_attendance', 'Lawyer joined the synthetic demo hearing.');
      const details = await getSession(session.id);
      setSession(details);
      setStatusMessage('Attendance recorded for the lawyer demo account.');
    } catch (error) {
      setStatusMessage(apiErrorMessage(error, 'Unable to join the demo hearing.'));
    } finally {
      setBusy(false);
    }
  };

  const generateCitizenLink = async () => {
    if (!session) return;
    setBusy(true);
    setStatusMessage('');
    try {
      const links = await createVideoShareLinks(session.id);
      const publicUrl = `${window.location.origin}/public/hearing/${links.publicToken}`;
      setCitizenLink(publicUrl);
      setStatusMessage('Citizen read-only hearing link generated locally for this demo session.');
    } catch (error) {
      setStatusMessage(apiErrorMessage(error, 'Unable to generate the citizen hearing link.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 font-serif">
            <Video className="h-5 w-5 text-primary" />
            Lawyer Virtual Hearing Demo
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Assigned-case access with local-only citizen hearing links.</p>
        </div>
        <Badge variant="outline" className="w-fit">
          <ShieldCheck className="mr-1 h-3.5 w-3.5" />
          role based
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Assigned case</label>
            <Select value={selectedCase ? caseIdentifier(selectedCase) : selectedCaseId} onValueChange={setSelectedCaseId} disabled={loading || cases.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={loading ? 'Loading assigned cases...' : 'Select assigned case'} />
              </SelectTrigger>
              <SelectContent>
                {cases.map((caseItem) => (
                  <SelectItem key={caseItem.id} value={caseIdentifier(caseItem)}>
                    {caseIdentifier(caseItem)} - {caseItem.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={refreshSession} disabled={!selectedCase || busy}>
            <RefreshCw className={`mr-2 h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
            Refresh Hearing
          </Button>
        </div>

        {selectedCase ? (
          <div className="grid gap-3 rounded-md border p-3 text-sm md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Case</p>
              <p className="font-medium">{caseIdentifier(selectedCase)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hearing</p>
              <p className="font-medium">
                {selectedCase.nextHearing ? new Date(selectedCase.nextHearing).toLocaleString() : 'Not scheduled'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="font-medium">{selectedCase.hearingLocation || 'Not set'}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-md border p-3 text-sm text-muted-foreground">No assigned demo cases are available for this lawyer account.</div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={joinAsLawyer} disabled={!session || busy}>
            <Users className="mr-2 h-4 w-4" />
            Join as Lawyer
          </Button>
          <Button variant="outline" onClick={generateCitizenLink} disabled={!session || busy}>
            <LinkIcon className="mr-2 h-4 w-4" />
            Generate Citizen Link
          </Button>
          {citizenLink && (
            <Button asChild variant="outline">
              <a href={citizenLink} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Citizen View
              </a>
            </Button>
          )}
        </div>

        {statusMessage && (
          <div className="rounded-md bg-accent/40 p-3 text-sm text-muted-foreground">{statusMessage}</div>
        )}

        {citizenLink && (
          <div className="rounded-md border p-3">
            <p className="mb-1 text-xs text-muted-foreground">Citizen read-only link</p>
            <p className="break-all font-mono text-xs">{citizenLink}</p>
          </div>
        )}

        {session && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <CalendarDays className="h-4 w-4 text-primary" />
                Active Session
              </p>
              <p className="font-mono text-xs text-muted-foreground">{session.id}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Started {session.startedAt ? new Date(session.startedAt).toLocaleString() : 'in this demo'}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-medium">Recent activity</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                {Array.isArray(session.actions) && session.actions.length > 0 ? (
                  session.actions.slice(0, 4).map((action) => (
                    <p key={action.id}>{action.action.replaceAll('_', ' ')}{action.details ? ` - ${action.details}` : ''}</p>
                  ))
                ) : (
                  <p>No activity recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
