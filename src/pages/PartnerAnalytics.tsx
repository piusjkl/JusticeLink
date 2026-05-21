import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPartnerAnalytics, verifyRegistry } from '@/lib/api';
import { BarChart3, CheckCircle, Database, RefreshCw, ShieldCheck } from 'lucide-react';

function Breakdown({ title, data }: { title: string; data?: Record<string, number> }) {
  const rows = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map(([, value]) => value));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-serif">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet</p>
        ) : rows.map(([label, value]) => (
          <div key={label} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="capitalize">{label.replaceAll('_', ' ')}</span>
              <span>{value}</span>
            </div>
            <div className="h-2 rounded bg-muted">
              <div className="h-2 rounded bg-primary" style={{ width: `${(value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function PartnerAnalytics() {
  const [district, setDistrict] = React.useState('all');
  const [data, setData] = React.useState<any | null>(null);
  const [registry, setRegistry] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [analytics, registryResult] = await Promise.all([
        getPartnerAnalytics(district === 'all' ? undefined : { district }),
        verifyRegistry().catch(() => null),
      ]);
      setData(analytics);
      setRegistry(registryResult);
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [district]);

  React.useEffect(() => {
    load();
  }, [load]);

  const totals = data?.totals || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Justice Link Demo Analytics</h1>
          <p className="text-muted-foreground">Synthetic justice access metrics for local pilot oversight</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={district} onValueChange={setDistrict}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All districts</SelectItem>
              <SelectItem value="Mbarara">Mbarara</SelectItem>
              <SelectItem value="Gulu">Gulu</SelectItem>
              <SelectItem value="Jinja">Jinja</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-destructive p-3 text-sm text-destructive">{error}</div>}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <BarChart3 className="h-5 w-5 text-primary" />
              <Badge variant="outline">Pilot</Badge>
            </div>
            <p className="mt-3 text-2xl font-semibold">{totals.complaints ?? 0}</p>
            <p className="text-sm text-muted-foreground">Complaints</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <ShieldCheck className="h-5 w-5 text-destructive" />
            <p className="mt-3 text-2xl font-semibold">{totals.emergency ?? 0}</p>
            <p className="text-sm text-muted-foreground">Emergency matters</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <CheckCircle className="h-5 w-5 text-success" />
            <p className="mt-3 text-2xl font-semibold">{data?.sla?.emergencyHandledWithin24h ?? 0}%</p>
            <p className="text-sm text-muted-foreground">Emergency SLA</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Database className="h-5 w-5 text-primary" />
            <p className="mt-3 text-2xl font-semibold">{registry?.checked ?? 0}</p>
            <p className="text-sm text-muted-foreground">
              Registry events {registry?.ok ? 'verified' : 'pending'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Breakdown title="Complaints by Category" data={data?.breakdowns?.byCategory} />
        <Breakdown title="Complaints by District" data={data?.breakdowns?.byDistrict} />
        <Breakdown title="Channel Mix" data={data?.breakdowns?.byChannel} />
        <Breakdown title="Referral Status" data={data?.breakdowns?.byReferralStatus} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Operational Notes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-md bg-accent/40 p-3">
            <p className="font-medium">Pending referrals</p>
            <p className="text-muted-foreground">{totals.pendingReferrals ?? 0} matters require partner action.</p>
          </div>
          <div className="rounded-md bg-accent/40 p-3">
            <p className="font-medium">Payment inclusion</p>
            <p className="text-muted-foreground">{totals.waivedPayments ?? 0} vulnerable or emergency complaints have fee waivers.</p>
          </div>
          <div className="rounded-md bg-accent/40 p-3">
            <p className="font-medium">Backlog</p>
            <p className="text-muted-foreground">Average closure time: {data?.sla?.averageBacklogHours ?? 0} hours.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
