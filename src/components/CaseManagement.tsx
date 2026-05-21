import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getCases, deleteCase as apiDeleteCase, updateCase as apiUpdateCase, getUsers } from '@/lib/api';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// Removed backend API import; using mockCases directly
import { Search, Filter, Eye, Edit, Calendar, RotateCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CaseManagementProps {
  onViewCase?: (caseId: string) => void;
  onBack?: () => void;
}

export function CaseManagement({ onViewCase, onBack }: CaseManagementProps = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ title: string; status: string; priority: string; nextHearing: string; hearingLocation: string; judgeId?: string; lawyerId?: string; prosecutorId?: string } | null>(null);
  const [judges, setJudges] = useState<any[]>([]);
  const [lawyers, setLawyers] = useState<any[]>([]);
  const [prosecutors, setProsecutors] = useState<any[]>([]);

  const fetchCases = () => {
    let canceled = false;
    setLoading(true);
    getCases()
      .then((data) => {
        if (canceled) return;
        const normalized = data.map((c: any) => ({
          id: c.externalId || c.id,
          title: c.title,
          type: c.type,
          status: c.status,
          filingDate: c.filingDate,
          nextHearing: c.nextHearing,
          files: c.files || [],
          assignedJudge: c.judge?.name,
          assignedLawyer: c.lawyer?.name,
          assignedProsecutor: c.prosecutor?.name,
          judgeId: c.judge?.id,
          lawyerId: c.lawyer?.id,
          prosecutorId: c.prosecutor?.id,
          priority: c.priority,
          description: c.description,
          hearingLocation: c.hearingLocation,
        }));
        setCases(normalized);
        setError(null);
      })
      .catch((e) => {
        if (canceled) return;
        setError(e?.response?.data?.error || e.message);
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });
    return () => { canceled = true; };
  };

  useEffect(() => {
    const cancel = fetchCases();
    // load users for assignment options (admin/clerk permitted; judge may fail silently)
    getUsers().then((data) => {
      setJudges(data.filter((u: any) => u.role === 'judge'));
      setLawyers(data.filter((u: any) => u.role === 'lawyer'));
      setProsecutors(data.filter((u: any) => u.role === 'prosecutor'));
    }).catch(() => { /* If forbidden (e.g., judge), hide assignment selectors */ });
    return cancel;
  }, []);
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

  // Safe date helpers to avoid runtime crashes if API returns unexpected formats
  const safeDistanceToNow = (value: any): string => {
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return 'unknown';
      return formatDistanceToNow(d);
    } catch {
      return 'unknown';
    }
  };

  const safeDateString = (value: any): string | null => {
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString();
    } catch {
      return null;
    }
  };

  const visibleCases = React.useMemo(() => {
    if (!user) return cases;
    if (user.role === 'prosecutor') {
      // Prosecutors can only see criminal cases (oversight) in this demo
      return cases.filter(c => c.type === 'criminal');
    }
    return cases;
  }, [cases, user]);

  const openEdit = (case_: any) => {
    if (!user || !['admin', 'clerk', 'judge'].includes(user.role)) return;
    setEditId(case_.id);
    // Convert nextHearing ISO to input-compatible "YYYY-MM-DDTHH:mm"
    const nh = case_.nextHearing ? new Date(case_.nextHearing) : null;
    const toLocalInput = (d: Date | null) => d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16) : '';
    setEditDraft({
      title: case_.title || '',
      status: case_.status || 'pending',
      priority: case_.priority || 'medium',
      nextHearing: toLocalInput(nh),
      hearingLocation: case_.hearingLocation || '',
      judgeId: case_.judgeId,
      lawyerId: case_.lawyerId,
      prosecutorId: case_.prosecutorId,
    });
    setIsEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editId || !editDraft) return;
    try {
      const payload: any = {
        title: editDraft.title || undefined,
        status: editDraft.status,
        priority: editDraft.priority,
        hearingLocation: editDraft.hearingLocation || undefined,
      };
      if (editDraft.nextHearing) {
        const dt = new Date(editDraft.nextHearing);
        payload.nextHearing = dt.toISOString();
      }
      if (typeof editDraft.judgeId !== 'undefined') payload.judgeId = editDraft.judgeId || null;
      if (typeof editDraft.lawyerId !== 'undefined') payload.lawyerId = editDraft.lawyerId || null;
      if (typeof editDraft.prosecutorId !== 'undefined') payload.prosecutorId = editDraft.prosecutorId || null;
      const updated = await apiUpdateCase(editId, payload);
      // Refresh to reflect assignment names/relations accurately
      fetchCases();
      setIsEditOpen(false);
      setEditId(null);
      setEditDraft(null);
      toast({ title: 'Case updated', description: `${editId} has been updated.` });
    } catch (e: any) {
      toast({ title: 'Update failed', description: e?.response?.data?.error || e.message, variant: 'destructive' });
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    if (!user || user.role !== 'admin') return;
    const confirmed = window.confirm(`Delete case ${caseId}? This action cannot be undone.`);
    if (!confirmed) return;
    try {
      await apiDeleteCase(caseId);
      setCases(prev => prev.filter(c => c.id !== caseId));
      toast({ title: 'Case deleted', description: `${caseId} has been removed.` });
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e?.response?.data?.error || e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Case Management</h1>
          <p className="text-muted-foreground">Browse, search, and manage court cases</p>
        </div>
        <div className="flex items-center gap-2">
        <Button variant="outline" onClick={fetchCases} disabled={loading}>
          <RotateCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button className="bg-gradient-navy text-primary-foreground hover:opacity-90" onClick={() => navigate('/search')}>
          <Eye className="w-4 h-4 mr-2" />
          Advanced Search
        </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-serif text-lg">Search Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Search by case ID, title, or party names..."
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={() => navigate('/reports')}>
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cases List */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-serif">All Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="p-6 text-center text-muted-foreground">Loading cases...</div>
            ) : error ? (
              <div className="p-6 text-center text-destructive">{error}</div>
            ) : (
              visibleCases.map((case_: any) => (
              <div key={case_.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-medium text-foreground">{case_.title}</h3>
                    <Badge variant="outline" className={getCaseTypeColor(case_.type)}>
                      {case_.type}
                    </Badge>
                    <Badge variant="outline" className={getStatusColor(case_.status)}>
                      {case_.status}
                    </Badge>
                  </div>
                    <p className="text-sm text-muted-foreground mb-1">{case_.id}</p>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>Filed: {safeDistanceToNow(case_.filingDate)} ago</span>
                    {case_.nextHearing && (
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        Next hearing: {safeDateString(case_.nextHearing) || 'TBD'}
                      </span>
                    )}
                    <span>{(case_.files || []).length} documents</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                    <span>Judge: {case_.assignedJudge || 'Unassigned'}</span>
                    <span>Lawyer: {case_.assignedLawyer || 'Unassigned'}</span>
                    <span>Prosecutor: {case_.assignedProsecutor || 'Govt. Unassigned'}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" onClick={() => onViewCase?.(case_.id)}>
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  {['admin','clerk','judge'].includes(user?.role || '') && (
                    <Button size="sm" variant="outline" onClick={() => openEdit(case_)}>
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  )}
                  {user?.role === 'admin' && (
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteCase(case_.id)}>
                      Delete
                    </Button>
                  )}
                </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Case Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { if (!open) { setIsEditOpen(false); setEditId(null); setEditDraft(null); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit Case</DialogTitle>
          </DialogHeader>
          {editDraft && (
            <div className="space-y-4">
              <div>
                <Label>Case Title</Label>
                <Input value={editDraft.title} onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editDraft.status} onValueChange={(v) => setEditDraft({ ...editDraft, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={editDraft.priority} onValueChange={(v) => setEditDraft({ ...editDraft, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(judges.length + lawyers.length + prosecutors.length) > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Assign Judge</Label>
                    <Select value={editDraft.judgeId || ''} onValueChange={(v) => setEditDraft({ ...editDraft, judgeId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select judge" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {judges.map((j) => (
                          <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Assign Lawyer</Label>
                    <Select value={editDraft.lawyerId || ''} onValueChange={(v) => setEditDraft({ ...editDraft, lawyerId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select lawyer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {lawyers.map((l) => (
                          <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Assign Prosecutor</Label>
                    <Select value={editDraft.prosecutorId || ''} onValueChange={(v) => setEditDraft({ ...editDraft, prosecutorId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select prosecutor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {prosecutors.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <div>
                <Label>Next Hearing</Label>
                <Input type="datetime-local" value={editDraft.nextHearing} onChange={(e) => setEditDraft({ ...editDraft, nextHearing: e.target.value })} />
              </div>
              <div>
                <Label>Hearing Location</Label>
                <Input value={editDraft.hearingLocation} onChange={(e) => setEditDraft({ ...editDraft, hearingLocation: e.target.value })} />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => { setIsEditOpen(false); setEditId(null); setEditDraft(null); }}>Cancel</Button>
                <Button onClick={saveEdit}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}