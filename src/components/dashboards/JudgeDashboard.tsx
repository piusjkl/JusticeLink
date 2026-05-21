import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gavel, CalendarDays, FileCheck, Scale, CheckCircle, AlertTriangle, Video, Mic, MicOff, Camera, CameraOff, ScreenShare, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { startVideo, recordSessionAction, endVideo, getCase, joinVideo, getSession } from '@/lib/api';
import { connectWS, subscribeSession, unsubscribeSession } from '@/lib/ws';
import { CaseProgressTrigger } from '@/components/CaseProgress';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { getCases, updateCase } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

export function JudgeDashboard() {
  const navigate = useNavigate();
  const [cases, setCases] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [videoCaseId, setVideoCaseId] = React.useState<string | null>(null);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [videoOpen, setVideoOpen] = React.useState(false);
  const [vcOpen, setVcOpen] = React.useState(false);
  const [selectedCaseId, setSelectedCaseId] = React.useState<string>('');
  const [scheduleAt, setScheduleAt] = React.useState<string>('');
  const [savingSchedule, setSavingSchedule] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    getCases()
      .then((data) => { if (mounted) { setCases(Array.isArray(data) ? data : []); setLoading(false); } })
      .catch((e) => { if (mounted) { setError(e?.message || 'Failed to load'); setLoading(false); } });
    return () => { mounted = false; };
  }, []);

  const assignedCases = React.useMemo(() => cases.filter((c: any) => c.judge?.name === 'Hon. Justice Robert Kato'), [cases]);
  const caseOptions = React.useMemo(() => assignedCases.map((c: any) => ({ id: c.externalId || c.id, title: c.title })), [assignedCases]);
  const pendingApprovals = React.useMemo(() => assignedCases.flatMap((c: any) => (c.files || []).filter((f: any) => f.status === 'pending')), [assignedCases]);
  const upcomingHearings = React.useMemo(() => assignedCases
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

  const getCaseTypeIcon = (type: string) => {
    switch (type) {
      case 'criminal': return <AlertTriangle className="w-4 h-4" />;
      case 'civil': return <Scale className="w-4 h-4" />;
      case 'family': return <FileCheck className="w-4 h-4" />;
      default: return <Gavel className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Judicial Dashboard</h1>
          <p className="text-muted-foreground">Review cases, approve documents, and manage hearings</p>
        </div>
        <div className="flex space-x-2">
          <Button className="bg-primary text-primary-foreground hover:opacity-90" onClick={() => { setVcOpen(true); if (!selectedCaseId && caseOptions[0]) setSelectedCaseId(caseOptions[0].id); }}>
            <Video className="w-4 h-4 mr-2" />
            Video Conference
          </Button>
          <Button variant="outline" onClick={() => navigate('/scheduling')}>
            <CalendarDays className="w-4 h-4 mr-2" />
            View Calendar
          </Button>
          <Button className="bg-gradient-navy text-primary-foreground hover:opacity-90" onClick={() => navigate('/reports')}>
            <Gavel className="w-4 h-4 mr-2" />
            Court Orders
          </Button>
        </div>
      </div>

      {/* KPI cards removed per requirement */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cases Under Review */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif flex items-center">
              <Scale className="w-5 h-5 mr-2 text-primary" />
              Cases Under Your Jurisdiction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignedCases.map((case_: any) => (
              <div key={case_.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {getCaseTypeIcon(case_.type)}
                    <h4 className="font-medium text-foreground">{case_.title}</h4>
                    <Badge variant="outline" className={getStatusColor(case_.status)}>
                      {case_.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{case_.externalId || case_.id}</p>
                  <p className="text-sm text-muted-foreground">
                    {case_.type} case • {(case_.files || []).filter((f: any) => f.status === 'pending').length} pending documents
                  </p>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/case/${case_.externalId || case_.id}`)}>Review</Button>
                  <Button size="sm" className="bg-gradient-gold text-gold-foreground hover:opacity-90" onClick={() => navigate(`/case/${case_.externalId || case_.id}`)}> 
                    <Gavel className="w-3 h-3 mr-1" />
                    Approve
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

        {/* Upcoming Court Sessions */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif flex items-center">
              <CalendarDays className="w-5 h-5 mr-2 text-primary" />
              Upcoming Court Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : error ? (
              <div className="text-sm text-destructive">{error}</div>
            ) : upcomingHearings.map((case_: any) => (
              <div key={case_.id} className="p-4 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-foreground">{case_.title}</h4>
                  <Badge variant="outline" className="bg-primary/10 text-primary">
                    {case_.type}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{case_.externalId || case_.id}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gold">
                    <CalendarDays className="w-4 h-4 mr-1" />
                    {case_.nextHearing && new Intl.DateTimeFormat('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    }).format(new Date(case_.nextHearing))}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/case/${case_.externalId || case_.id}`)}>
                    Case Details
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={() => navigate('/scheduling')}>
              View Full Calendar
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Document Approvals */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-serif flex items-center">
            <FileCheck className="w-5 h-5 mr-2 text-primary" />
            Documents Awaiting Judicial Approval
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingApprovals.map((file: any) => (
              <div key={file.id} className="flex items-center justify-between p-3 border border-border rounded-md">
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">{file.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    Uploaded by {file.uploadedBy} • {formatDistanceToNow(parseISO(file.uploadedAt))} ago
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" onClick={() => navigate('/documents')}>
                    Preview
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => alert('Reject action recorded (demo)')}>
                    Reject
                  </Button>
                  <Button size="sm" className="bg-success text-success-foreground hover:opacity-90" onClick={() => alert('Approved (demo)')}>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Start/Join Video Hearing Modal */}
      <Dialog open={videoOpen} onOpenChange={(v) => { setVideoOpen(v); if (!v && sessionId) { endVideo(sessionId).catch(() => {}); setSessionId(null); } }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Video className="w-4 h-4" /> Video Hearing {videoCaseId ? `• ${videoCaseId}` : ''}</DialogTitle>
          </DialogHeader>
          <JudgeVideoPanel caseId={videoCaseId} sessionId={sessionId} setSessionId={setSessionId} />
        </DialogContent>
      </Dialog>

      {/* Video Conference Launcher / Scheduler */}
      <Dialog open={vcOpen} onOpenChange={setVcOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Video className="w-4 h-4" /> Video Conference</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-xs mb-1">Select Case</label>
              <Select value={selectedCaseId} onValueChange={(v) => setSelectedCaseId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a case" />
                </SelectTrigger>
                <SelectContent>
                  {caseOptions.map(opt => (
                    <SelectItem key={opt.id} value={opt.id}>{opt.id} — {opt.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button className="bg-gradient-navy text-primary-foreground" disabled={!selectedCaseId} onClick={() => { setVideoCaseId(selectedCaseId || null); setVcOpen(false); setVideoOpen(true); }}>
                <Video className="w-4 h-4 mr-2" /> Start Now
              </Button>
            </div>
            <div className="pt-2 border-t">
              <label className="block text-xs mb-1">Schedule Hearing (optional)</label>
              <div className="flex items-center gap-2">
                <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
                <Button variant="outline" disabled={!selectedCaseId || !scheduleAt || savingSchedule} onClick={async () => {
                  if (!selectedCaseId || !scheduleAt) return; setSavingSchedule(true);
                  try {
                    await updateCase(selectedCaseId, { nextHearing: new Date(scheduleAt).toISOString(), hearingLocation: 'Video Conference' });
                  } finally { setSavingSchedule(false); }
                }}>Save Schedule</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function JudgeVideoPanel({ caseId, sessionId, setSessionId }: { caseId: string | null; sessionId: string | null; setSessionId: (id: string | null) => void }) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = React.useState(false);
  const [camOff, setCamOff] = React.useState(false);
  const [sharing, setSharing] = React.useState(false);
  const [localStream, setLocalStream] = React.useState<MediaStream | null>(null);
  const [displayStream, setDisplayStream] = React.useState<MediaStream | null>(null);
  const [starting, setStarting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'notes' | 'case'>('notes');
  const [activeSideTab, setActiveSideTab] = React.useState<'notes' | 'case' | 'activity'>('notes');
  const [notes, setNotes] = React.useState<string>('');
  const [notesFeed, setNotesFeed] = React.useState<Array<{ text: string; ts: number }>>([]);
  const [caseDetails, setCaseDetails] = React.useState<any | null>(null);
  const [caseLoading, setCaseLoading] = React.useState(false);
  const [participants, setParticipants] = React.useState<any[]>([]);
  const [actions, setActions] = React.useState<any[]>([]);

  React.useEffect(() => {
    let mounted = true;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
      setLocalStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    }).catch(() => {});
    return () => {
      mounted = false;
      // Cleanup streams on unmount
      try { localStream?.getTracks().forEach(t => t.stop()); } catch {}
      try { displayStream?.getTracks().forEach(t => t.stop()); } catch {}
    };
  }, []);

  React.useEffect(() => {
    if (!caseId) { setCaseDetails(null); return; }
    setCaseLoading(true);
    getCase(caseId).then((c) => setCaseDetails(c)).catch(() => setCaseDetails(null)).finally(() => setCaseLoading(false));
  }, [caseId]);

  const ensureSession = async () => {
    if (sessionId || !caseId) return sessionId;
    setStarting(true);
    try { const s = await startVideo(caseId); setSessionId(s.id); try { await joinVideo(s.id, 'judge'); } catch {}; return s.id as string; }
    finally { setStarting(false); }
  };

  const doAction = async (action: string, details?: string) => {
    const id = await ensureSession(); if (!id) return;
    await recordSessionAction(id, action, details);
  };

  // Poll session state for participants and activity
  React.useEffect(() => {
    if (!sessionId) return;
    let mounted = true;
    const load = () => getSession(sessionId).then((s) => {
      if (!mounted || !s) return;
      setParticipants(Array.isArray(s.participants) ? s.participants : []);
      setActions(Array.isArray(s.actions) ? s.actions.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : []);
    }).catch(() => {});
    load();
    const id = setInterval(load, 5000);
    // WebSocket live updates
    const token = localStorage.getItem('token');
    let ws: WebSocket | null = null;
    if (token) {
      ws = connectWS(token);
      ws.addEventListener('open', () => subscribeSession(ws!, sessionId));
      ws.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg?.type === 'session_event' && msg.sessionId === sessionId) {
            load();
          }
        } catch {}
      });
    }
    return () => {
      mounted = false;
      clearInterval(id);
      try { if (ws && ws.readyState === WebSocket.OPEN) unsubscribeSession(ws, sessionId); } catch {}
      try { ws?.close(); } catch {}
    };
  }, [sessionId]);

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      localStream?.getAudioTracks().forEach(t => t.enabled = !next);
      return next;
    });
  };

  const toggleCam = () => {
    setCamOff((off) => {
      const next = !off;
      localStream?.getVideoTracks().forEach(t => t.enabled = !next);
      return next;
    });
  };

  const toggleShare = async () => {
    if (sharing) {
      setSharing(false);
      displayStream?.getTracks().forEach(t => t.stop());
      setDisplayStream(null);
      if (videoRef.current && localStream) videoRef.current.srcObject = localStream;
      return;
    }
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
      setDisplayStream(stream);
      setSharing(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        setSharing(false);
        setDisplayStream(null);
        if (videoRef.current && localStream) videoRef.current.srcObject = localStream;
      });
    } catch {}
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Video area */}
      <div className="lg:col-span-2 space-y-3">
        <div className="aspect-video bg-muted rounded overflow-hidden">
          <video ref={videoRef} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
        <Button variant="outline" size="sm" onClick={toggleMute}>{muted ? <><MicOff className="w-4 h-4 mr-1" /> Unmute</> : <><Mic className="w-4 h-4 mr-1" /> Mute</>}</Button>
        <Button variant="outline" size="sm" onClick={toggleCam}>{camOff ? <><CameraOff className="w-4 h-4 mr-1" /> Turn Camera On</> : <><Camera className="w-4 h-4 mr-1" /> Turn Camera Off</>}</Button>
        <Button variant="outline" size="sm" onClick={toggleShare}><ScreenShare className="w-4 h-4 mr-1" /> {sharing ? 'Stop Sharing' : 'Share Screen'}</Button>
        <Button variant="outline" size="sm" onClick={() => doAction('mark_attendance')}>Mark Attendance</Button>
        <Button variant="outline" size="sm" onClick={() => doAction('request_evidence', 'Please upload the document now')}>Request Evidence</Button>
        <Button variant="outline" size="sm" onClick={() => setActiveTab('notes')}>Record Ruling</Button>
        <Button variant="outline" size="sm" onClick={() => doAction('adjourn')}>Adjourn</Button>
        <Button variant="outline" size="sm" onClick={() => doAction('proceed_in_absence')}>Proceed In Absence</Button>
        <Button size="sm" className="bg-destructive text-destructive-foreground" onClick={async () => { const id = await ensureSession(); if (id) await endVideo(id); setSessionId(null); try { localStream?.getTracks().forEach(t => t.stop()); } catch {}; try { displayStream?.getTracks().forEach(t => t.stop()); } catch {}; }}>End Session</Button>
        </div>
      </div>

      {/* Side panel: Notes / Case / Activity */}
      <div className="lg:col-span-1">
        <Tabs value={activeSideTab} onValueChange={(v) => setActiveSideTab(v as any)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="case">Case</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          <TabsContent value="notes" className="mt-3">
            <div className="space-y-2">
              <Textarea rows={6} placeholder="Enter ruling/notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              <div className="flex justify-end">
                <Button size="sm" onClick={async () => {
                  const text = notes.trim(); if (!text) return;
                  await doAction('record_ruling', text);
                  setNotes('');
                  setNotesFeed((prev) => [{ text, ts: Date.now() }, ...prev].slice(0, 50));
                }}>Save Note</Button>
              </div>
              {notesFeed.length > 0 && (
                <div className="mt-3 border rounded p-2 max-h-56 overflow-auto space-y-2">
                  {notesFeed.map((n, idx) => (
                    <div key={idx} className="text-sm">
                      <div className="text-xs text-muted-foreground">{new Date(n.ts).toLocaleString()}</div>
                      <div>{n.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="case" className="mt-3">
            {caseLoading ? (
              <div className="text-sm text-muted-foreground">Loading case…</div>
            ) : !caseDetails ? (
              <div className="text-sm text-muted-foreground">No case selected</div>
            ) : (
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Case</div>
                  <div className="font-medium">{caseDetails.externalId || caseDetails.id} — {caseDetails.title}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Type</div>
                    <div>{caseDetails.type}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Status</div>
                    <div>{caseDetails.status}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Plaintiff</div>
                    <div>{caseDetails.plaintiff}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Defendant</div>
                    <div>{caseDetails.defendant}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Next Hearing</div>
                  <div>{caseDetails.nextHearing ? new Date(caseDetails.nextHearing).toLocaleString() : 'Not set'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Location</div>
                  <div>{caseDetails.hearingLocation || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Description</div>
                  <div>{caseDetails.description || '—'}</div>
                </div>
                {participants?.length ? (
                  <div className="pt-2 border-t">
                    <div className="text-xs text-muted-foreground mb-1">Participants</div>
                    <ul className="text-sm list-disc pl-4">
                      {participants.map((p: any) => (
                        <li key={p.id}>{p.user?.name || p.userId} — {p.role}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </TabsContent>
          <TabsContent value="activity" className="mt-3">
            <div className="space-y-2 max-h-80 overflow-auto">
              {actions.length === 0 ? (
                <div className="text-sm text-muted-foreground">No activity yet…</div>
              ) : actions.map((a: any) => (
                <div key={a.id} className="text-sm border-b pb-1">
                  <div className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleTimeString()} • {a.action.replaceAll('_',' ')}</div>
                  {a.details ? <div>{a.details}</div> : null}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}