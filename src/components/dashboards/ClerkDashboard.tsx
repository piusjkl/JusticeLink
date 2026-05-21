import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FolderPlus, Users, FileText, BarChart, UserPlus, Calendar, AlertCircle, Video, Mic, MicOff, ScreenShare, MonitorDown, MonitorUp } from 'lucide-react';
import { CaseProgressTrigger } from '@/components/CaseProgress';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { getCases, getUsers, getActiveSessionForCase, joinVideo, recordSessionAction, getCase, getSession, startVideo, createVideoShareLinks } from '@/lib/api';
import { connectWS, subscribeCase, unsubscribeCase, subscribeSession, unsubscribeSession } from '@/lib/ws';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button as UIButton } from '@/components/ui/button';

export function ClerkDashboard() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [casesError, setCasesError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [casesRes, usersRes] = await Promise.allSettled([getCases(), getUsers()]);
    if (casesRes.status === 'fulfilled') {
      setCases(Array.isArray(casesRes.value) ? casesRes.value : []);
      setCasesError(null);
    } else {
      setCases([]);
      setCasesError(casesRes.reason?.message || 'Failed to load cases');
    }
    if (usersRes.status === 'fulfilled') {
      setUsers(Array.isArray(usersRes.value) ? usersRes.value : []);
      setUsersError(null);
    } else {
      setUsers([]);
      setUsersError(usersRes.reason?.message || 'Failed to load users');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    loadData();
    return () => { mounted = false; };
  }, [loadData]);

  const recentCases = useMemo(() => {
    const sortable = [...cases];
    const key = cases.some((c: any) => c?.filingDate) ? 'filingDate' : cases.some((c: any) => c?.createdAt) ? 'createdAt' : '';
    if (key) sortable.sort((a: any, b: any) => new Date(b[key] || 0).getTime() - new Date(a[key] || 0).getTime());
    return sortable.slice(0, 5);
  }, [cases]);

  const unassignedCases = useMemo(() => cases.filter((c: any) => !c.judge?.name || !c.lawyer?.name), [cases]);
  const pendingScheduling = useMemo(() => cases.filter((c: any) => !c.nextHearing && c.status === 'active'), [cases]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success text-success-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'closed': return 'bg-muted text-muted-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getCaseTypeColor = (type: string) => {
    switch (type) {
      case 'criminal': return 'bg-destructive text-destructive-foreground';
      case 'civil': return 'bg-primary text-primary-foreground';
      case 'family': return 'bg-gold text-gold-foreground';
      case 'corporate': return 'bg-success text-success-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Registrar Dashboard</h1>
          <p className="text-muted-foreground">Manage case registrations, assignments, and court scheduling</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadData}>
            Refresh
          </Button>
          <Button variant="outline" onClick={() => navigate('/reports')}>
            <BarChart className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
          <Button className="bg-gradient-navy text-primary-foreground hover:opacity-90" onClick={() => navigate('/register-case')}>
            <FolderPlus className="w-4 h-4 mr-2" />
            Register New Case
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Case Registrations */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif flex items-center">
              <FileText className="w-5 h-5 mr-2 text-primary" />
              Recent Case Registrations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading cases…</div>
            ) : casesError ? (
              <div className="text-sm text-destructive">{casesError}</div>
            ) : recentCases.map((case_) => (
              <div key={case_.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium text-foreground">{case_.title}</h4>
                    <Badge variant="outline" className={getCaseTypeColor(case_.type)}>
                      {case_.type}
                    </Badge>
                    <Badge variant="outline" className={getStatusColor(case_.status)}>
                      {case_.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{case_.externalId || case_.id}</p>
                  {(() => {
                    const ts = case_.filingDate || case_.createdAt || case_.updatedAt;
                    return ts ? (
                      <p className="text-sm text-muted-foreground">
                        Filed {formatDistanceToNow(new Date(ts))} ago
                      </p>
                    ) : null;
                  })()}
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/case/${case_.externalId || case_.id}`)}>Edit Case</Button>
                  <CaseProgressTrigger caseId={case_.externalId || case_.id} label="Progress" />
                  <BailRequestTrigger caseId={case_.externalId || case_.id} />
                  <MonitorVideoTrigger caseId={case_.externalId || case_.id} />
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={() => navigate('/cases')}>
              View All Cases
            </Button>
          </CardContent>
        </Card>

        {/* Case Assignments */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif flex items-center">
              <UserPlus className="w-5 h-5 mr-2 text-primary" />
              Pending Case Assignments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading assignments…</div>
            ) : casesError ? (
              <div className="text-sm text-destructive">{casesError}</div>
            ) : cases.slice(0, 3).map((case_) => (
              <div key={case_.id} className="p-4 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-foreground">{case_.title}</h4>
                  <Badge variant="outline" className={getCaseTypeColor(case_.type)}>
                    {case_.type}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{case_.externalId || case_.id}</p>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Judge:</span>
                    <span className="text-foreground">{case_.judge?.name || case_.assignedJudge || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Lawyer:</span>
                    <span className="text-foreground">{case_.lawyer?.name || case_.assignedLawyer || 'Unassigned'}</span>
                  </div>
                  {(case_.prosecutor?.name || case_.assignedProsecutor) && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Prosecutor:</span>
                      <span className="text-foreground">{case_.prosecutor?.name || case_.assignedProsecutor}</span>
                    </div>
                  )}
                </div>
                
                <Button size="sm" className="w-full mt-3 bg-gradient-gold text-gold-foreground hover:opacity-90" onClick={() => navigate('/cases')}>
                  Manage Assignments
                </Button>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={() => navigate('/cases')}>
              View All Assignments
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-card cursor-pointer hover:shadow-gold transition-shadow" onClick={() => navigate('/register-case')}>
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <FolderPlus className="w-12 h-12 text-primary mb-4" />
            <h3 className="font-serif font-semibold text-lg text-foreground mb-2">Register New Case</h3>
            <p className="text-sm text-muted-foreground">Create and register a new court case</p>
          </CardContent>
        </Card>

        <Card className="shadow-card cursor-pointer hover:shadow-gold transition-shadow" onClick={() => navigate('/scheduling')}>
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <Calendar className="w-12 h-12 text-gold mb-4" />
            <h3 className="font-serif font-semibold text-lg text-foreground mb-2">Schedule Hearings</h3>
            <p className="text-sm text-muted-foreground">Manage court calendar and hearing dates</p>
          </CardContent>
        </Card>

        <Card className="shadow-card cursor-pointer hover:shadow-gold transition-shadow" onClick={() => navigate('/reports')}>
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <BarChart className="w-12 h-12 text-success mb-4" />
            <h3 className="font-serif font-semibold text-lg text-foreground mb-2">Generate Reports</h3>
            <p className="text-sm text-muted-foreground">Create case statistics and court reports</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
function BailRequestTrigger({ caseId }: { caseId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Request Bail</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register Bail Request • {caseId}</DialogTitle>
          </DialogHeader>
          <BailRequestForm caseId={caseId} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function BailRequestForm({ caseId, onDone }: { caseId: string; onDone: () => void }) {
  const [amount, setAmount] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs mb-1">Amount</label>
        <input type="number" className="w-full border rounded h-9 px-3 bg-background" value={amount} onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')} />
      </div>
      <div>
        <label className="block text-xs mb-1">Reason (optional)</label>
        <textarea className="w-full border rounded px-3 py-2 bg-background" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      {error && <div className="text-xs text-destructive">{error}</div>}
      <div className="flex justify-end gap-2">
        <UIButton variant="outline" onClick={onDone}>Cancel</UIButton>
        <UIButton className="bg-gradient-gold text-gold-foreground" disabled={!amount || saving} onClick={async () => {
          setSaving(true); setError(null);
          try {
            await (await import('@/lib/api')).createBailRequest({ caseId, amount: Number(amount), reason: reason.trim() || undefined });
            onDone();
          } catch (e: any) { setError(e?.response?.data?.error || 'Failed to create request'); }
          finally { setSaving(false); }
        }}>Submit</UIButton>
      </div>
    </div>
  );
}

function MonitorVideoTrigger({ caseId }: { caseId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Video className="w-3 h-3 mr-1" /> Monitor Video
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Video className="w-4 h-4" /> Court Session Monitor • {caseId}</DialogTitle>
          </DialogHeader>
          <ClerkVideoPanel caseId={caseId} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ClerkVideoPanel({ caseId }: { caseId: string }) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [muted, setMuted] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [displayStream, setDisplayStream] = useState<MediaStream | null>(null);
  const [caseTitle, setCaseTitle] = useState<string>('');
  const [participants, setParticipants] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [shareLinks, setShareLinks] = useState<{ public?: string; prison?: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    getCase(caseId).then(c => { if (mounted) setCaseTitle(c?.title || ''); }).catch(() => {});
    getActiveSessionForCase(caseId).then((s) => { if (!mounted) return; if (s?.id) setSessionId(s.id); }).catch(() => {});
    // WebSocket: subscribe to case-level events (session start)
    const token = localStorage.getItem('token');
    let ws: WebSocket | null = null;
    if (token) {
      ws = connectWS(token);
      ws.addEventListener('open', () => subscribeCase(ws!, caseId));
      ws.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg?.type === 'case_event' && msg.caseId === caseId && msg.event === 'session_started') {
            setSessionId(msg.sessionId);
          }
        } catch {}
      });
    }
    return () => {
      mounted = false;
      try { displayStream?.getTracks().forEach(t => t.stop()); } catch {}
      try { if (ws && ws.readyState === WebSocket.OPEN) unsubscribeCase(ws, caseId); } catch {}
      try { ws?.close(); } catch {}
    };
  }, [caseId]);

  useEffect(() => {
    if (!sessionId) return;
    // Auto-join as clerk when session is active
    setJoining(true);
    joinVideo(sessionId, 'clerk').finally(() => setJoining(false));
  }, [sessionId]);

  // Poll session state
  useEffect(() => {
    if (!sessionId) return;
    let mounted = true;
    const load = () => getSession(sessionId).then((s) => {
      if (!mounted || !s) return;
      setParticipants(Array.isArray(s.participants) ? s.participants : []);
      setActions(Array.isArray(s.actions) ? s.actions.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : []);
    }).catch(() => {});
    load();
    const id = setInterval(load, 5000);
    // WebSocket live updates on the session
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
    if (!videoRef.current) return;
    setMuted(m => !m);
  };

  const toggleShare = async () => {
    if (sharing) {
      setSharing(false);
      displayStream?.getTracks().forEach(t => t.stop());
      setDisplayStream(null);
      return;
    }
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: false });
      setDisplayStream(stream);
      setSharing(true);
      // Notify action
      if (sessionId) await recordSessionAction(sessionId, 'start_presentation', 'Registrar sharing screen');
      const track = stream.getVideoTracks()[0];
      track.addEventListener('ended', async () => {
        setSharing(false);
        setDisplayStream(null);
        if (sessionId) await recordSessionAction(sessionId, 'stop_presentation');
      });
    } catch {}
  };

  const startOrGetSession = async () => {
    if (sessionId) return sessionId;
    try {
      const s = await startVideo(caseId);
      setSessionId(s.id);
      return s.id as string;
    } catch { return null; }
  };

  const generateShareLinks = async () => {
    const sid = await startOrGetSession();
    if (!sid) return;
    const { publicToken, prisonToken } = await createVideoShareLinks(sid);
    const base = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '');
    setShareLinks({
      public: `${base}/public/hearing/${publicToken}`,
      prison: `${base}/prison/join/${prisonToken}`,
    });
  };

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">Case: <span className="text-foreground font-medium">{caseTitle || caseId}</span></div>
      <div ref={stageRef} className="aspect-video bg-muted rounded overflow-hidden relative">
        {/* In a real WebRTC setup this would render the judge's stream; here it serves as a placeholder/monitor area. */}
        <video ref={videoRef} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
        {!sessionId && (
          <div className="p-3 text-center text-sm text-muted-foreground">Waiting for the Judge to start the session…</div>
        )}
        {sessionId && (
          <div className="absolute top-2 right-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded">Live Monitor</div>
        )}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <UIButton variant="outline" size="sm" onClick={() => setMuted(m => !m)}>{muted ? <><MicOff className="w-4 h-4 mr-1" /> Unmute</> : <><Mic className="w-4 h-4 mr-1" /> Mute</>}</UIButton>
        <UIButton variant="outline" size="sm" onClick={toggleShare}>{sharing ? <><MonitorDown className="w-4 h-4 mr-1" /> Stop Presenting</> : <><MonitorUp className="w-4 h-4 mr-1" /> Present Screen</>}</UIButton>
        <UIButton variant="outline" size="sm" disabled={!sessionId || joining} onClick={async () => { if (!sessionId) return; await recordSessionAction(sessionId, 'mark_attendance', 'Registrar present'); }}>Mark Attendance</UIButton>
        <UIButton variant="outline" size="sm" onClick={() => { const el = stageRef.current; if (el && (el as any).requestFullscreen) (el as any).requestFullscreen(); }}>Fullscreen Display</UIButton>
        <UIButton className="bg-gradient-navy text-primary-foreground" size="sm" onClick={generateShareLinks}>Generate Public/Prison Links</UIButton>
      </div>
      {shareLinks && (
        <div className="text-xs border rounded p-2 space-y-1">
          <div>
            <span className="font-medium">Public view: </span>
            <a className="underline" href={shareLinks.public} target="_blank" rel="noreferrer">{shareLinks.public}</a>
          </div>
          <div>
            <span className="font-medium">Prison join: </span>
            <span className="break-all">{shareLinks.prison}</span>
          </div>
        </div>
      )}
      {participants?.length ? (
        <div className="text-sm">
          <div className="text-xs text-muted-foreground mb-1">Participants</div>
          <ul className="list-disc pl-4">
            {participants.map((p: any) => (<li key={p.id}>{p.user?.name || p.userId} — {p.role}</li>))}
          </ul>
        </div>
      ) : null}
      <div className="text-sm">
        <div className="text-xs text-muted-foreground mb-1">Recent Activity</div>
        <div className="max-h-40 overflow-auto space-y-1">
          {actions.length === 0 ? (
            <div className="text-xs text-muted-foreground">No activity yet…</div>
          ) : actions.map((a: any) => (
            <div key={a.id} className="text-xs">
              <span className="text-muted-foreground">{new Date(a.createdAt).toLocaleTimeString()}</span> — {a.action.replaceAll('_',' ')} {a.details ? `• ${a.details}` : ''}
            </div>
          ))}
        </div>
      </div>
      <div className="text-xs text-muted-foreground">Note: The Registrar can present documents and announcements to the court. All actions are audited and notify both the Judge and Registrar.</div>
    </div>
  );
}