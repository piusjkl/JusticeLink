import React from 'react';
import { useParams } from 'react-router-dom';
import { getPublicSession } from '@/lib/api';

export default function PublicHearing() {
  const { token } = useParams();
  const [data, setData] = React.useState<any | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) return;
    getPublicSession(token).then(setData).catch((e) => setError(e?.response?.data?.error || 'Unable to load session'));
  }, [token]);

  if (error) return <div className="min-h-screen flex items-center justify-center"><div className="text-destructive">{error}</div></div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center"><div>Loading…</div></div>;

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-serif mb-2">Justice Link Demo Hearing</h1>
      <p className="text-sm text-muted-foreground mb-4">Read-only synthetic local view. No live video service is connected.</p>
      <div className="border rounded p-4">
        <div className="text-sm">Case: <span className="font-medium">{data.case.externalId || data.case.id} — {data.case.title}</span></div>
        <div className="text-xs text-muted-foreground">Type: {data.case.type}</div>
      </div>
      <div className="mt-4">
        <h2 className="text-lg font-medium mb-2">Demo Actions</h2>
        <div className="border rounded p-3 max-h-96 overflow-auto text-sm">
          {Array.isArray(data.actions) && data.actions.length ? data.actions.map((a: any) => (
            <div key={a.id} className="border-b py-1">
              <div className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleTimeString()}</div>
              <div>{a.action.replaceAll('_',' ')} {a.details ? `• ${a.details}` : ''}</div>
            </div>
          )) : <div className="text-muted-foreground text-sm">No actions yet…</div>}
        </div>
      </div>
    </div>
  );
}
