import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/http';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function UserManualModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const myRole = (user?.role || 'user').toLowerCase();
  const manualRoles = ['admin','judge','lawyer','clerk','prosecutor','paralegal','legal_aid_officer','partner_admin','data_analyst','citizen'];
  const [activeRole, setActiveRole] = useState<string>(
    (localStorage.getItem('manual_role') as any) || (manualRoles.includes(myRole) ? myRole : 'clerk')
  );
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'view'|'edit'>('view');

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    api.get(`/manuals/${activeRole}`).then((res) => setContent(res.data?.content || ''))
      .catch(() => setContent(`# ${capitalize(activeRole)} User Manual\n`))
      .finally(() => setLoading(false));
  }, [open, activeRole, user]);

  useEffect(() => {
    try { localStorage.setItem('manual_role', activeRole); } catch {}
  }, [activeRole]);

  const canEdit = user?.role === 'admin';

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      await api.post(`/manuals/${activeRole}`, { content });
      setMode('view');
    } finally { setSaving(false); }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${activeRole}-manual.md`; a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const html = renderManualToHTML(content, activeRole);
    const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
    if (!w) return;
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset=\"utf-8\" />
      <title>${capitalize(activeRole)} User Manual</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;line-height:1.6;padding:24px;color:#111}
        h1{font-size:20px;margin:16px 0 8px}
        h2{font-size:18px;margin:14px 0 6px}
        h3{font-size:16px;margin:12px 0 6px}
        p{margin:8px 0}
        ul,ol{margin:8px 0 8px 22px}
      </style></head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const rendered = useMemo(() => renderManual(content), [content]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>Role User Manual</DialogTitle>
            {myRole === 'admin' && (
              <div className="ml-auto">
                <Select value={activeRole} onValueChange={(v) => setActiveRole(v as any)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="clerk">Clerk</SelectItem>
                    <SelectItem value="judge">Judge</SelectItem>
                    <SelectItem value="lawyer">Lawyer</SelectItem>
                    <SelectItem value="prosecutor">Prosecutor</SelectItem>
                    <SelectItem value="paralegal">Paralegal</SelectItem>
                    <SelectItem value="legal_aid_officer">Legal Aid Officer</SelectItem>
                    <SelectItem value="partner_admin">Partner Admin</SelectItem>
                    <SelectItem value="data_analyst">Data Analyst</SelectItem>
                    <SelectItem value="citizen">Citizen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </DialogHeader>
        <div className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading manual…</div>
          ) : mode === 'edit' && canEdit ? (
            <Textarea rows={16} value={content} onChange={(e) => setContent(e.target.value)} />
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {rendered}
            </div>
          )}
          <div className="flex justify-between items-center gap-2">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownload}>Download</Button>
              <Button variant="outline" onClick={handlePrint}>Print</Button>
            </div>
            {canEdit && (
              <div className="flex gap-2">
                {mode === 'edit' ? (
                  <>
                    <Button variant="ghost" onClick={() => setMode('view')}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                  </>
                ) : (
                  <Button onClick={() => setMode('edit')}>Edit</Button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function renderManual(text: string) {
  const lines = text.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.length === 0) { elements.push(<div key={i} className="h-2" />); i++; continue; }
    // Headings
    const h3 = /^###\s+(.+)$/.exec(trimmed);
    const h2 = /^##\s+(.+)$/.exec(trimmed);
    const h1 = /^#\s+(.+)$/.exec(trimmed);
    if (h1) { elements.push(<h1 key={i} className="text-xl font-semibold mt-4">{h1[1]}</h1>); i++; continue; }
    if (h2) { elements.push(<h2 key={i} className="text-lg font-semibold mt-3">{h2[1]}</h2>); i++; continue; }
    if (h3) { elements.push(<h3 key={i} className="text-base font-semibold mt-2">{h3[1]}</h3>); i++; continue; }

    // Ordered list
    if (/^\d+\)\s+/.test(trimmed)) {
      const items: React.ReactNode[] = [];
      let j = i;
      while (j < lines.length && /^\d+\)\s+/.test(lines[j].trim())) {
        items.push(<li key={`ol-${j}`}>{lines[j].trim().replace(/^\d+\)\s+/, '')}</li>);
        j++;
      }
      elements.push(<ol key={`ol-${i}`} className="list-decimal pl-6 space-y-1">{items}</ol>);
      i = j; continue;
    }

    // Unordered list
    if (/^[-\u2022]\s+/.test(trimmed)) {
      const items: React.ReactNode[] = [];
      let j = i;
      while (j < lines.length && /^[-\u2022]\s+/.test(lines[j].trim())) {
        items.push(<li key={`ul-${j}`}>{lines[j].trim().replace(/^[-\u2022]\s+/, '')}</li>);
        j++;
      }
      elements.push(<ul key={`ul-${i}`} className="list-disc pl-6 space-y-1">{items}</ul>);
      i = j; continue;
    }

    // Paragraph
    elements.push(<p key={i} className="text-sm leading-6">{line}</p>);
    i++;
  }
  return <>{elements}</>;
}

function renderManualToHTML(text: string, role: string) {
  const lines = text.split(/\r?\n/);
  let html = '';
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) { html += '<div style="height:8px"></div>'; i++; continue; }
    const h3 = /^###\s+(.+)$/.exec(trimmed);
    const h2 = /^##\s+(.+)$/.exec(trimmed);
    const h1 = /^#\s+(.+)$/.exec(trimmed);
    if (h1) { html += `<h1>${escapeHtml(h1[1])}</h1>`; i++; continue; }
    if (h2) { html += `<h2>${escapeHtml(h2[1])}</h2>`; i++; continue; }
    if (h3) { html += `<h3>${escapeHtml(h3[1])}</h3>`; i++; continue; }
    if (/^\d+\)\s+/.test(trimmed)) {
      html += '<ol>';
      let j = i;
      while (j < lines.length && /^\d+\)\s+/.test(lines[j].trim())) {
        html += `<li>${escapeHtml(lines[j].trim().replace(/^\d+\)\s+/, ''))}</li>`;
        j++;
      }
      html += '</ol>';
      i = j; continue;
    }
    if (/^[-\u2022]\s+/.test(trimmed)) {
      html += '<ul>';
      let j = i;
      while (j < lines.length && /^[-\u2022]\s+/.test(lines[j].trim())) {
        html += `<li>${escapeHtml(lines[j].trim().replace(/^[-\u2022]\s+/, ''))}</li>`;
        j++;
      }
      html += '</ul>';
      i = j; continue;
    }
    html += `<p>${escapeHtml(line)}</p>`;
    i++;
  }
  return html;
}

function escapeHtml(s: string) {
  return s
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}
