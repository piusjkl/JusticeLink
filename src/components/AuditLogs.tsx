import React, { useEffect, useMemo, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { getCases, getTimeline } from '@/lib/api';

function toCSV(rows: any[]) {
  const keys = ['id','timestamp','user','action','resource','details','ipAddress','status'];
  const lines = [keys.join(',')];
  for (const r of rows) {
    const vals = keys.map(k => "\"" + String((r as any)[k] ?? '').replace(/\"/g, '\\"') + "\"");
    lines.push(vals.join(','));
  }
  return lines.join('\n');
}

export default function AuditLogs({ onBack }: { onBack?: () => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const cases = await getCases();
        const list = Array.isArray(cases) ? cases : [];

        // Base logs from cases (creation)
        const base = list.map((c: any) => ({
          id: `case-${c.id}`,
          timestamp: c.filingDate || c.createdAt || new Date().toISOString(),
          user: c.lawyer?.name || c.plaintiff || 'System',
          action: 'CASE_CREATE',
          resource: c.title,
          details: `Case registered: ${c.externalId || c.id}`,
          ipAddress: '127.0.0.1',
          status: c.status || 'info',
          resourceType: c.type || 'case',
          eventType: 'create'
        }));

        // Pull limited timelines to avoid heavy requests
        const subset = list.slice(0, 10);
        const timelines: any[] = [];
        for (const c of subset) {
          try {
            const t = await getTimeline(c.externalId || c.id);
            if (Array.isArray(t)) {
              timelines.push(...t.map((e: any) => ({
                id: `ev-${e.id}`,
                timestamp: e.timestamp,
                user: e.actor || 'System',
                action: String(e.type || 'EVENT').toUpperCase(),
                resource: c.title,
                details: e.title || e.description || '',
                ipAddress: '127.0.0.1',
                status: 'ok',
                resourceType: 'timeline',
                eventType: e.type || 'event',
                changedFields: e.metadata || undefined,
              })));
            }
          } catch {
            // ignore per-case timeline failures
          }
        }

        if (!mounted) return;
        setLogs([...base, ...timelines].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        setLoading(false);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load audit logs');
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const actions = useMemo(() => Array.from(new Set(logs.map(a => a.action))), [logs]);
  const statuses = useMemo(() => Array.from(new Set(logs.map(a => a.status))), [logs]);
  const resourceTypes = useMemo(() => Array.from(new Set(logs.map(a => (a as any).resourceType || 'other'))), [logs]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (actionFilter !== 'all' && l.action !== actionFilter) return false;
      if ((l as any).resourceType && resourceTypeFilter !== 'all' && (l as any).resourceType !== resourceTypeFilter) return false;
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (query && !(`${l.user} ${l.action} ${l.resource} ${l.details}`.toLowerCase().includes(query.toLowerCase()))) return false;
      if (start) {
        const s = new Date(start).getTime();
        if (new Date(l.timestamp).getTime() < s) return false;
      }
      if (end) {
        const e = new Date(end).getTime();
        if (new Date(l.timestamp).getTime() > e) return false;
      }
      return true;
    });
  }, [logs, query, actionFilter, statusFilter, start, end, resourceTypeFilter]);


  function exportCSV() {
    const csv = toCSV(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Audit Logs</h1>
        <div className="space-x-2">
          {onBack && (
            <Button variant="ghost" onClick={onBack}>
              Back
            </Button>
          )}
          <Button onClick={exportCSV}>Export CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
        <Input placeholder="Search user, action, resource..." value={query} onChange={(e: any) => setQuery(e.target.value)} />
        <select className="input w-full" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="all">All Actions</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="input w-full" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input w-full" value={resourceTypeFilter} onChange={(e) => setResourceTypeFilter(e.target.value)}>
          <option value="all">All Resource Types</option>
          {resourceTypes.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <div className="flex space-x-2">
          <Input type="date" value={start} onChange={(e: any) => setStart(e.target.value)} />
          <Input type="date" value={end} onChange={(e: any) => setEnd(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading logs…</div>
      ) : error ? (
        <div className="text-sm text-destructive">{error}</div>
      ) : (
      <div className="grid gap-3">
        {filtered.map((log) => {
          const rt = (log as any).resourceType;
          const et = (log as any).eventType;
          const changed = (log as any).changedFields;
          const isOpen = expandedId === log.id;
          return (
            <Card key={log.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</div>
                      <div className="font-medium">{log.user} — {log.action} <span className="text-xs ml-2 px-2 py-1 rounded bg-accent/30 text-accent-foreground">{rt}</span> <span className="text-xs ml-2 px-2 py-1 rounded bg-primary/10 text-primary-foreground">{et}</span></div>
                      <div className="text-sm text-muted-foreground">{log.resource}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{log.status}</div>
                      <div className="text-xs text-muted-foreground">{log.ipAddress}</div>
                    </div>
                  </div>
                  {log.details && <p className="mt-2 text-sm text-muted-foreground">{log.details}</p>}
                  {changed && (
                    <div className="mt-2 text-sm">
                      <button className="text-primary underline" onClick={() => setExpandedId(isOpen ? null : log.id)}>
                        {isOpen ? 'Hide changed fields' : 'View changed fields'}
                      </button>
                      {isOpen && (
                        <pre className="whitespace-pre-wrap mt-2 bg-background/50 p-3 rounded text-xs">{JSON.stringify(changed, null, 2)}</pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      )}
    </div>
  );
}
