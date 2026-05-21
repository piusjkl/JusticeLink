import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getCase, getTimeline } from '@/lib/api';
import http from '@/lib/http';
import { CaseTimelineProgress } from '@/components/ui/CaseTimelineProgress';

type CaseAction = { id: string; timestamp: string; actor: string; note: string };

function loadCaseProgress(caseId: string): CaseAction[] {
  try {
    const raw = localStorage.getItem(`case_progress_${caseId}`);
    if (!raw) return [];
    return JSON.parse(raw) as CaseAction[];
  } catch {
    return [];
  }
}

function saveCaseProgress(caseId: string, actions: CaseAction[]) {
  localStorage.setItem(`case_progress_${caseId}`, JSON.stringify(actions));
}

export function CaseProgress({ caseId }: { caseId: string }) {
  const [actions, setActions] = useState<CaseAction[]>(() => loadCaseProgress(caseId));
  const [note, setNote] = useState('');
  const [actor, setActor] = useState('');
  const [caseMeta, setCaseMeta] = useState<any | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setActions(loadCaseProgress(caseId));
    Promise.all([
      getCase(caseId).catch(e => { throw e; }),
      getTimeline(caseId).catch(e => { throw e; })
    ])
      .then(([c, t]) => {
        if (!mounted) return;
        setCaseMeta(c || null);
        setTimeline(Array.isArray(t) ? t : []);
        setLoading(false);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || 'Failed to load case progress');
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [caseId]);

  const addAction = async () => {
    if (!note.trim() || !actor.trim()) return;
    // Infer a simple type from note to help progress calculation
    const text = `${actor} ${note}`.toLowerCase();
    const type = /hearing|court\s*date/.test(text) ? 'hearing'
      : /document|file|evidence|upload|submit/.test(text) ? 'document'
      : /assign(ed)?|appointment|judge/.test(text) ? 'assignment'
      : /close|disposed/.test(text) ? 'status'
      : 'action';
    try {
      await http.post(`/cases/${caseId}/timeline`, {
        title: actor,
        description: note,
        type
      });
      // Optimistic local add
      const newAction: CaseAction = { id: Date.now().toString(), timestamp: new Date().toISOString(), actor, note };
      const next = [newAction, ...actions];
      setActions(next);
      saveCaseProgress(caseId, next);
      // Refresh backend timeline for consistency
      getTimeline(caseId).then(setTimeline).catch(() => {});
      setNote('');
      setActor('');
    } catch {
      // Fallback: local only if backend rejected (e.g., permission)
      const newAction: CaseAction = { id: Date.now().toString(), timestamp: new Date().toISOString(), actor, note };
      const next = [newAction, ...actions];
      setActions(next);
      saveCaseProgress(caseId, next);
      setNote('');
      setActor('');
    }
  };

  // combine timeline events from backend with local actions
  const caseEvents = timeline.map((e: any) => ({
    id: e.id,
    type: e.type,
    timestamp: e.timestamp,
    title: e.title,
    actor: e.actor,
    note: e.description,
    source: 'system'
  }));

  const actionEvents = actions.map(a => ({
    id: a.id,
    type: 'action',
    timestamp: a.timestamp,
    title: a.actor,
    actor: a.actor,
    note: a.note,
    source: 'user'
  }));

  const combined = [...caseEvents, ...actionEvents].sort((x, y) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime());

  // compute progress based on milestones
  const computeProgress = () => {
    const milestones: { id: string; label: string; done: boolean }[] = [];
    const textOf = (ev: any) => `${(ev.title || '').toString()} ${(ev.note || '').toString()}`.toLowerCase();
    const hasText = (patterns: RegExp[]) => combined.some(ev => patterns.some(p => p.test(textOf(ev))));

    // 1. Case filed: if the case exists, consider it filed.
    const filed = true;
    milestones.push({ id: 'filed', label: 'Case Filed', done: filed });

    // 2. Judge assigned: explicit assignment event, case relation, or user action like "judge assigned"
    const assigned = caseEvents.some(e => e.type === 'assignment')
      || Boolean(caseMeta?.judge?.name || caseMeta?.assignedJudge)
      || hasText([/judge\s+assigned/i, /assigned\s+judge/i, /appointment\s+of\s+judge/i]);
    milestones.push({ id: 'assigned', label: 'Judge Assigned', done: assigned });

    // 3. Documents submitted: case has files, evidence events, or user action mentions document/file/upload
    const docs = Boolean(caseMeta?.files && caseMeta.files.length > 0)
      || caseEvents.some(e => e.type === 'document')
      || hasText([/document/i, /file/i, /evidence/i, /upload/i, /submitted/i]);
    milestones.push({ id: 'documents', label: 'Documents Submitted', done: docs });

    // 4. Hearing scheduled: nextHearing set, hearing event, or user action mentions hearing scheduled
    const hearingScheduled = Boolean(caseMeta?.nextHearing || caseEvents.some(e => e.type === 'hearing')
      || hasText([/hearing\s+scheduled/i, /schedule\s+hearing/i, /court\s+date/i]));
    milestones.push({ id: 'hearing', label: 'Hearing Scheduled', done: hearingScheduled });

    // 5. Case closed: explicit status, event text, or user action mentions closed
    const closed = caseMeta?.status === 'closed' || hasText([/case\s+closed/i, /closed\b/i, /disposed/i]);
    milestones.push({ id: 'closed', label: 'Case Closed', done: closed });

    const completed = milestones.filter(m => m.done).length;
    const total = milestones.length;
    const percent = Math.round((completed / total) * 100);
    return { percent, milestones };
  };

  const { percent: computedPercent, milestones } = computeProgress();
  const progressPercent = Math.min(100, computedPercent);

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Case Progress</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
  ) : (
  <>
  {/* Case header */}
        <div className="p-3 border border-border rounded-md">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-foreground">{caseMeta?.title || caseId}</div>
              <div className="text-xs text-muted-foreground">{caseMeta?.externalId || caseMeta?.id || caseId} • {caseMeta?.type}</div>
            </div>
            <div className="text-sm text-muted-foreground">
              {caseMeta?.nextHearing ? (
                <div>Next hearing: {new Date(caseMeta.nextHearing!).toLocaleString()}</div>
              ) : (
                <div>No hearing scheduled</div>
              )}
            </div>
          </div>
  </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">Overall Progress</h4>
            <div className="text-sm font-medium">{progressPercent}%</div>
          </div>

          <CaseTimelineProgress
            points={milestones.map((m, i) => {
              // Find related events for this milestone
              const events = combined.filter(ev => {
                const text = `${ev.title} ${ev.note}`.toLowerCase();
                switch (m.id) {
                  case 'filed': return text.includes('filed') || text.includes('filing');
                  case 'assigned': return text.includes('judge') || text.includes('assigned');
                  case 'documents': return text.includes('document') || text.includes('evidence');
                  case 'hearing': return text.includes('hearing') || text.includes('court date');
                  case 'closed': return text.includes('closed') || text.includes('disposed');
                  default: return false;
                }
              });

              // Determine milestone color based on type
              const getColor = (id: string) => {
                switch (id) {
                  case 'filed': return 'bg-red-500';
                  case 'assigned': return 'bg-yellow-500';
                  case 'documents': return 'bg-orange-500';
                  case 'hearing': return 'bg-green-500';
                  case 'closed': return 'bg-blue-500';
                  default: return 'bg-gray-500';
                }
              };

              // Find the first matching event timestamp
              const timestamp = events[0]?.timestamp;

              return {
                id: m.id,
                label: m.label,
                timestamp,
                actor: events[0]?.actor,
                status: m.done ? 'completed' : i === milestones.findIndex(x => !x.done) ? 'current' : 'upcoming',
                color: getColor(m.id),
                details: m.done ? `Completed ${timestamp ? `on ${new Date(timestamp).toLocaleString()}` : ''}` : 'Not yet reached',
                actions: events.map(ev => ({
                  timestamp: ev.timestamp,
                  actor: ev.actor,
                  action: ev.title,
                  details: ev.note
                }))
              };
            })}
            className="mt-4 mb-8"
          />
  </div>

        {/* Always allow adding an action so progress can start on any case */}
        <div className="space-y-2">
          {(!caseMeta?.nextHearing && actions.length === 0) && (
            <div className="text-xs text-muted-foreground">Tip: add an action to start tracking progress for this case.</div>
          )}
          <div className="grid grid-cols-1 gap-2">
            <Input placeholder="Actor (e.g. Lawyer, Clerk)" value={actor} onChange={(e) => setActor(e.target.value)} />
            <Textarea placeholder="Action note" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex justify-end">
              <Button onClick={addAction} className="bg-gradient-navy text-primary-foreground">Add Action</Button>
            </div>
          </div>
        </div>

        <div>
          <h5 className="font-medium mb-2">Timeline</h5>
          <div className="space-y-3">
            {/* Next hearing at top */}
            {caseMeta?.nextHearing && (
              <div className="p-3 border border-border rounded-md bg-muted/30">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium">Next Hearing</div>
                  <div className="text-xs text-muted-foreground">{new Date(caseMeta.nextHearing).toLocaleString()}</div>
                </div>
                <div className="text-sm text-muted-foreground">Location: {caseMeta?.hearingLocation || 'TBD'}</div>
              </div>
            )}

            {combined.length === 0 && <div className="text-sm text-muted-foreground">No recorded events yet.</div>}
            {combined.map((ev) => (
              <div key={ev.id} className={`p-3 border border-border rounded-md ${ev.type === 'hearing' ? 'bg-muted/10' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium">{ev.title}{ev.source === 'user' ? ` — ${ev.actor}` : ''}</div>
                  <div className="text-xs text-muted-foreground">{new Date(ev.timestamp).toLocaleString()}</div>
                </div>
                <div className="text-sm text-muted-foreground">{ev.note}</div>
              </div>
            ))}
          </div>
        </div>
        </>
        )}
      </div>
    </DialogContent>
  );
}

export function CaseProgressTrigger({ caseId, label = 'Case Progress' }: { caseId: string; label?: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">{label}</Button>
      </DialogTrigger>
      <CaseProgress caseId={caseId} />
    </Dialog>
  );
}
