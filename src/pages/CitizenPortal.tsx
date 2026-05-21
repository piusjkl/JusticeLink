import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DemoNotice } from '@/components/DemoNotice';
import { initiateMobileMoneyPayment, submitCitizenComplaint, trackCitizenComplaint, type CitizenComplaintPayload } from '@/lib/api';
import { AlertTriangle, CheckCircle, FileText, Phone, RefreshCw, Scale, Shield } from 'lucide-react';

const queueKey = 'justicelink_offline_complaints';

type QueuedComplaint = CitizenComplaintPayload & { queuedAt: string };

function readQueue(): QueuedComplaint[] {
  try {
    return JSON.parse(localStorage.getItem(queueKey) || '[]');
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedComplaint[]) {
  localStorage.setItem(queueKey, JSON.stringify(items));
}

const emptyForm: CitizenComplaintPayload = {
  phone: '',
  fullName: '',
  district: 'Mbarara',
  language: 'en',
  description: '',
  incidentLocation: '',
  consentToShare: true,
  lowLiteracy: false,
  disabilityNeeds: '',
};

export default function CitizenPortal() {
  const [form, setForm] = React.useState<CitizenComplaintPayload>(emptyForm);
  const [result, setResult] = React.useState<any | null>(null);
  const [trackPhone, setTrackPhone] = React.useState('');
  const [trackCode, setTrackCode] = React.useState('');
  const [tracked, setTracked] = React.useState<any | null>(null);
  const [queued, setQueued] = React.useState<QueuedComplaint[]>(() => readQueue());
  const [loading, setLoading] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [error, setError] = React.useState('');

  const update = (field: keyof CitizenComplaintPayload, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const syncQueue = React.useCallback(async () => {
    const items = readQueue();
    if (!items.length || !navigator.onLine) return;
    setSyncing(true);
    const remaining: QueuedComplaint[] = [];
    for (const item of items) {
      try {
        const submitted = await submitCitizenComplaint(item);
        setResult(submitted);
      } catch {
        remaining.push(item);
      }
    }
    writeQueue(remaining);
    setQueued(remaining);
    setSyncing(false);
  }, []);

  React.useEffect(() => {
    window.addEventListener('online', syncQueue);
    syncQueue();
    return () => window.removeEventListener('online', syncQueue);
  }, [syncQueue]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    const payload: CitizenComplaintPayload = {
      ...form,
      offlineClientId: form.offlineClientId || (crypto.randomUUID?.() || `${Date.now()}`),
    };

    if (!navigator.onLine) {
      const next = [...readQueue(), { ...payload, queuedAt: new Date().toISOString() }];
      writeQueue(next);
      setQueued(next);
      setLoading(false);
      setResult({ queued: true, message: 'Complaint saved offline. It will sync when internet returns.' });
      return;
    }

    try {
      const submitted = await submitCitizenComplaint(payload);
      setResult(submitted);
      setTrackCode(submitted.trackingCode);
      setTrackPhone(payload.phone);
      setForm(emptyForm);
    } catch (e: any) {
      const next = [...readQueue(), { ...payload, queuedAt: new Date().toISOString() }];
      writeQueue(next);
      setQueued(next);
      setError(e?.response?.data?.error ? 'Saved offline after submission failed.' : 'Saved offline after network failure.');
    } finally {
      setLoading(false);
    }
  };

  const onTrack = async (event: React.FormEvent) => {
    event.preventDefault();
    setTracked(null);
    setError('');
    try {
      const data = await trackCitizenComplaint(trackCode, trackPhone);
      setTracked(data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Could not find a complaint for those details.');
    }
  };

  const pay = async (provider: 'mtn' | 'airtel') => {
    if (!result?.trackingCode || !trackPhone) return;
    const payment = await initiateMobileMoneyPayment(provider, { trackingCode: result.trackingCode, phone: trackPhone, amount: 500 });
    setResult((prev: any) => ({ ...prev, payment }));
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Scale className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-serif font-bold text-primary">Justice Link</h1>
              <p className="text-xs text-muted-foreground">Synthetic citizen legal access demo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:inline-flex">
              {navigator.onLine ? 'Online' : 'Offline mode'}
            </Badge>
            <Button asChild variant="outline">
              <Link to="/login">Staff Login</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-6">
        <DemoNotice />
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1.25fr_0.75fr]">
        <form onSubmit={onSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif">
                <FileText className="h-5 w-5" />
                File a Legal Complaint
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Phone number *</Label>
                  <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+256..." required />
                </div>
                <div>
                  <Label>Demo name</Label>
                  <Input value={form.fullName} onChange={(e) => update('fullName', e.target.value)} placeholder="Optional synthetic name" />
                </div>
                <div>
                  <Label>District</Label>
                  <Select value={form.district} onValueChange={(value) => update('district', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mbarara">Mbarara</SelectItem>
                      <SelectItem value="Gulu">Gulu</SelectItem>
                      <SelectItem value="Jinja">Jinja</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Language</Label>
                  <Select value={form.language} onValueChange={(value) => update('language', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="lg">Luganda</SelectItem>
                      <SelectItem value="nyn">Runyankole/Rukiga</SelectItem>
                      <SelectItem value="ach">Acholi</SelectItem>
                      <SelectItem value="xog">Lusoga</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Location of incident</Label>
                <Input value={form.incidentLocation} onChange={(e) => update('incidentLocation', e.target.value)} placeholder="Village, parish, or town" />
              </div>
              <div>
                <Label>Describe the issue *</Label>
                <Textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={6} required placeholder="Example: land boundary dispute, domestic violence, unpaid salary, custody, or police matter..." />
              </div>
              <div>
                <Label>Disability or access needs</Label>
                <Input value={form.disabilityNeeds} onChange={(e) => update('disabilityNeeds', e.target.value)} placeholder="Optional support needs" />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={!!form.lowLiteracy} onCheckedChange={(checked) => update('lowLiteracy', checked === true)} />
                <span className="text-sm">I may need phone/paralegal assistance to complete the process.</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={form.consentToShare !== false} onCheckedChange={(checked) => update('consentToShare', checked === true)} />
                <span className="text-sm">I consent to sharing this complaint with authorized legal-aid or justice actors.</span>
              </div>
              <Button type="submit" disabled={loading || !form.phone || form.description.length < 10}>
                {loading ? 'Submitting...' : 'Submit Complaint'}
              </Button>
            </CardContent>
          </Card>
        </form>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif">
                <Phone className="h-5 w-5" />
                Track by Phone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onTrack} className="space-y-3">
                <Input value={trackCode} onChange={(e) => setTrackCode(e.target.value)} placeholder="Tracking code e.g. JL-DEMO-2026-123456" />
                <Input value={trackPhone} onChange={(e) => setTrackPhone(e.target.value)} placeholder="Phone used to submit" />
                <Button type="submit" variant="outline" className="w-full">Check Status</Button>
              </form>
            </CardContent>
          </Card>

          {queued.length > 0 && (
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{queued.length} offline complaint(s)</p>
                  <p className="text-sm text-muted-foreground">Saved locally until connectivity returns.</p>
                </div>
                <Button variant="outline" disabled={syncing || !navigator.onLine} onClick={syncQueue}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  Sync
                </Button>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className="border-destructive">
              <CardContent className="flex gap-2 p-4 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </CardContent>
            </Card>
          )}

          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-serif">
                  <CheckCircle className="h-5 w-5 text-success" />
                  Submission Result
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {result.queued ? (
                  <p>{result.message}</p>
                ) : (
                  <>
                    <div className="rounded-md bg-accent/40 p-3">
                      <p className="text-xs text-muted-foreground">Tracking code</p>
                      <p className="font-mono text-lg">{result.trackingCode}</p>
                    </div>
                    <p>Status: <strong>{result.status}</strong></p>
                    <p>Category: <strong>{result.category}</strong></p>
                    <p>Urgency: <strong>{result.urgency}</strong></p>
                    {result.payment?.status === 'pending' ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => pay('mtn')}>Mock MTN</Button>
                        <Button size="sm" variant="outline" onClick={() => pay('airtel')}>Mock Airtel</Button>
                      </div>
                    ) : (
                      <p>Mock payment: <strong>{result.payment?.status || 'not required'}</strong></p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {tracked && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-serif">
                  <Shield className="h-5 w-5" />
                  Case Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p><strong>{tracked.trackingCode}</strong> is {tracked.status}</p>
                {tracked.openedCase && (
                  <p>Demo court case: <strong>{tracked.openedCase.externalId}</strong></p>
                )}
                <p>Category: {tracked.category} • Urgency: {tracked.urgency}</p>
                <div className="space-y-2">
                  {tracked.referrals?.map((referral: any) => (
                    <div key={referral.id} className="rounded-md border p-3">
                      <p className="font-medium">{referral.target}</p>
                      <p className="text-muted-foreground">{referral.status}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  {tracked.events?.map((event: any, index: number) => (
                    <p key={`${event.createdAt}-${index}`} className="text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString()} - {event.message || event.status}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </main>
  );
}
