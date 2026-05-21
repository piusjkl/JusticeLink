import React from 'react';
import { useParams } from 'react-router-dom';
import { prisonJoin } from '@/lib/api';

export default function PrisonJoin() {
  const { token } = useParams();
  const [status, setStatus] = React.useState<'loading'|'ok'|'error'>('loading');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) return;
    prisonJoin(token).then(() => setStatus('ok')).catch((e) => { setError(e?.response?.data?.error || 'Unable to join'); setStatus('error'); });
  }, [token]);

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center">Joining…</div>;
  if (status === 'error') return <div className="min-h-screen flex items-center justify-center text-destructive">{error}</div>;
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-xl font-medium mb-2">Demo participant recorded</div>
        <div className="text-sm text-muted-foreground">This local demo does not connect to a live hearing service.</div>
      </div>
    </div>
  );
}
