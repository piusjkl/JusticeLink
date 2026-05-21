import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { getCase, getTimeline, downloadEvidenceFile, getCaseFiles, getUsers, updateCase, listBailRequests, decideBail } from '@/lib/api';
// ...existing code...
// Using backend API
import { 
  ArrowLeft, 
  Calendar, 
  FileText, 
  Clock, 
  User, 
  Download,
  Stamp,
  Upload,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
// ...existing code...
import { DocumentViewer } from './DocumentViewer';
import { FileUpload } from './FileUpload';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface CaseDetailViewProps {
  caseId: string;
  onBack: () => void;
}

export function CaseDetailView({ caseId, onBack }: CaseDetailViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const noteRef = useRef<HTMLTextAreaElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');

  const [case_, setCase] = useState<any | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<{ title: string; status: string; priority: string; nextHearing: string; hearingLocation: string; judgeId?: string; lawyerId?: string; prosecutorId?: string } | null>(null);
  const [judges, setJudges] = useState<any[]>([]);
  const [lawyers, setLawyers] = useState<any[]>([]);
  const [prosecutors, setProsecutors] = useState<any[]>([]);
  // Bail requests state
  const [bailLoading, setBailLoading] = useState(false);
  const [bailError, setBailError] = useState<string | null>(null);
  const [bailRequests, setBailRequests] = useState<any[]>([]);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionTarget, setDecisionTarget] = useState<{ id: string; status: 'approved' | 'declined' } | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');

  // Safe date helpers
  const safeFormatDistance = (value: any): string => {
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return 'unknown';
      return formatDistanceToNow(d);
    } catch {
      return 'unknown';
    }
  };
  const safeDateTimeStrings = (value: any): { date: string; time: string } | null => {
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return null;
      return { date: d.toLocaleDateString(), time: d.toLocaleTimeString() };
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getCase(caseId)
      .then((c) => {
        if (!mounted) return;
        const normalized = {
          id: c.externalId || c.id,
          title: c.title,
          type: c.type,
          status: c.status,
          filingDate: c.filingDate,
          nextHearing: c.nextHearing,
          hearingLocation: c.hearingLocation,
          assignedJudge: c.judge?.name,
          assignedLawyer: c.lawyer?.name,
          assignedProsecutor: c.prosecutor?.name,
          plaintiff: c.plaintiff,
          defendant: c.defendant,
          description: c.description,
          files: c.files || [],
          priority: c.priority,
        } as any;
        setCase(normalized);
        setFiles(normalized.files || []);
        setLoading(false);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.response?.data?.error || 'Case not found');
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [caseId]);

  useEffect(() => {
    let mounted = true;
    getTimeline(caseId)
      .then((events) => { if (mounted) setTimeline(events); })
      .catch(() => { if (mounted) setTimeline([]); });
    getCaseFiles(caseId)
      .then((ev) => { if (mounted) setFiles(ev); })
      .catch(() => { /* keep initial files */ });
    // Load assignable users
    getUsers().then((data) => {
      if (!mounted) return;
      setJudges(data.filter((u: any) => u.role === 'judge'));
      setLawyers(data.filter((u: any) => u.role === 'lawyer'));
      setProsecutors(data.filter((u: any) => u.role === 'prosecutor'));
    }).catch(() => {
      if (!mounted) return;
      setJudges([]); setLawyers([]); setProsecutors([]);
    });
    return () => { mounted = false; };
  }, [caseId]);

  // Load bail requests for this case
  useEffect(() => {
    let mounted = true;
    setBailLoading(true);
    listBailRequests(caseId)
      .then((items) => { if (!mounted) return; setBailRequests(Array.isArray(items) ? items : []); setBailError(null); })
      .catch((e) => { if (!mounted) return; setBailRequests([]); setBailError(e?.response?.data?.error || 'Failed to load bail requests'); })
      .finally(() => { if (mounted) setBailLoading(false); });
    return () => { mounted = false; };
  }, [caseId]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading case...</div>;
  if (error) return <div className="p-8 text-center text-destructive">{error}</div>;
  if (!case_) return (
    <div className="text-center py-8">
      <h2 className="text-xl font-serif">Case not found</h2>
      <Button onClick={onBack} className="mt-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Cases
      </Button>
    </div>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success text-success-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'approved': return 'bg-success text-success-foreground';
      case 'rejected': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const handleApproveFile = (fileId: string) => {
    toast({
      title: "File Approved",
      description: "The synthetic demo file has been marked approved.",
    });
  };

  const handleRejectFile = (fileId: string) => {
    toast({
      title: "File Rejected",
      description: "The file has been rejected. Reason will be communicated to the uploader.",
      variant: "destructive",
    });
  };

  const addComment = () => {
    if (newComment.trim()) {
      toast({
        title: "Comment Added",
        description: "Your comment has been added to the case timeline.",
      });
      setNewComment('');
    }
  };

  const openEdit = () => {
    if (!user || !['admin','clerk','judge'].includes(user.role) || !case_) return;
    const nh = case_.nextHearing ? new Date(case_.nextHearing) : null;
    const toLocalInput = (d: Date | null) => d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16) : '';
    setEditDraft({
      title: case_.title || '',
      status: case_.status || 'pending',
      priority: case_.priority || 'medium',
      nextHearing: toLocalInput(nh),
      hearingLocation: case_.hearingLocation || '',
      judgeId: (case_ as any)?.judge?.id,
      lawyerId: (case_ as any)?.lawyer?.id,
      prosecutorId: (case_ as any)?.prosecutor?.id,
    });
    setIsEditOpen(true);
  };

  const saveEdit = async () => {
    if (!case_ || !editDraft) return;
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
      if (editDraft.judgeId !== undefined) payload.judgeId = editDraft.judgeId || null;
      if (editDraft.lawyerId !== undefined) payload.lawyerId = editDraft.lawyerId || null;
      if (editDraft.prosecutorId !== undefined) payload.prosecutorId = editDraft.prosecutorId || null;
      const updated = await updateCase(case_.id, payload);
      setCase({ ...case_,
        title: updated.title,
        status: updated.status,
        priority: updated.priority,
        nextHearing: updated.nextHearing,
        hearingLocation: updated.hearingLocation,
        assignedJudge: (updated as any)?.judge?.name || case_.assignedJudge,
        assignedLawyer: (updated as any)?.lawyer?.name || case_.assignedLawyer,
        assignedProsecutor: (updated as any)?.prosecutor?.name || case_.assignedProsecutor,
      });
      setIsEditOpen(false);
      setEditDraft(null);
      toast({ title: 'Case updated', description: `${case_.id} has been updated.` });
    } catch (e: any) {
      toast({ title: 'Update failed', description: e?.response?.data?.error || e.message, variant: 'destructive' });
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">{case_.title}</h1>
            <p className="text-muted-foreground">{case_.id} • Filed {safeFormatDistance(case_.filingDate)} ago</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(case_.status)}>{case_.status}</Badge>
          <Badge variant="outline" className="capitalize">{case_.type}</Badge>
          <Badge variant="outline" className={`${case_.priority === 'high' ? 'bg-destructive text-destructive-foreground' : case_.priority === 'medium' ? 'bg-warning text-warning-foreground' : 'bg-muted text-muted-foreground'}`}>
            {case_.priority} priority
          </Badge>
          {['admin','clerk','judge'].includes(user?.role || '') && (
            <Button variant="outline" onClick={openEdit}>
              <Edit className="w-3 h-3 mr-1" /> Edit
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column - Case Info */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="details" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="bail">Bail</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="font-serif">Case Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Plaintiff</label>
                      <p className="font-medium">{case_.plaintiff}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Defendant</label>
                      <p className="font-medium">{case_.defendant}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Assigned Judge</label>
                      <p className="font-medium">{case_.assignedJudge || 'Unassigned'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Assigned Lawyer</label>
                      <p className="font-medium">{case_.assignedLawyer || 'Unassigned'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Assigned Prosecutor</label>
                      <p className="font-medium">{case_.assignedProsecutor || 'Unassigned'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="mt-1 text-sm">{case_.description}</p>
                  </div>
                  {case_.nextHearing && (
                    <div className="p-3 bg-accent/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="font-medium">Next Hearing</span>
                      </div>
                      {(() => { const dt = safeDateTimeStrings(case_.nextHearing); return (
                        <p className="text-sm text-muted-foreground mt-1">
                          {dt ? `${dt.date} at ${dt.time}` : 'TBD'}
                        </p>
                      ); })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="font-serif">Case Documents</CardTitle>
                  {(user?.role === 'lawyer' || user?.role === 'admin' || user?.role === 'clerk' || user?.role === 'prosecutor') && (
                    <FileUpload caseId={case_.id} />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(files || case_.files || []).map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/50">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Uploaded by {file.uploadedBy} • {safeFormatDistance(file.uploadedAt)} ago • {formatFileSize(file.size)} • {file.type}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(file.status)}>{file.status}</Badge>
                          {user?.role === 'judge' && file.status === 'pending' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleApproveFile(file.id)}>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleRejectFile(file.id)}>
                                <XCircle className="w-3 h-3 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setSelectedFile(file.id)}>
                            <FileText className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <a
                            className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm"
                            href="#"
                            onClick={async (e) => {
                              e.preventDefault();
                              const url = await downloadEvidenceFile(file.id);
                              window.open(url, '_blank');
                            }}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="font-serif">Case Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {timeline.map((event, index) => (
                      <div key={event.id} className="flex space-x-3">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 bg-primary rounded-full" />
                          {index < timeline.length - 1 && <div className="w-0.5 h-8 bg-border mt-1" />}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{event.title}</h4>
                            <span className="text-sm text-muted-foreground">
                              {safeFormatDistance(event.timestamp)} ago
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">by {event.actor}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Add Comment */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="font-serif">Add Timeline Entry</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea 
                    ref={noteRef}
                    placeholder="Add a comment or note to the case timeline..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <Button onClick={addComment} disabled={!newComment.trim()}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Add Entry
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="font-serif">Court Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  {case_.nextHearing ? (
                    <div className="p-4 border border-border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Upcoming Hearing</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(case_.nextHearing).toLocaleDateString()} at {new Date(case_.nextHearing).toLocaleTimeString()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Courtroom 3A</p>
                        </div>
                          <Button variant="outline" onClick={() => navigate('/scheduling')}>
                          <Calendar className="w-4 h-4 mr-2" />
                          Reschedule
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-medium mb-2">No Scheduled Hearings</h3>
                      <p className="text-sm text-muted-foreground mb-4">This case does not have any scheduled court sessions.</p>
                      <Button onClick={() => navigate('/scheduling')}>
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule Hearing
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bail Requests */}
            <TabsContent value="bail" className="space-y-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="font-serif">Bail Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  {bailLoading ? (
                    <div className="text-sm text-muted-foreground">Loading bail requests…</div>
                  ) : bailError ? (
                    <div className="text-sm text-destructive">{bailError}</div>
                  ) : bailRequests.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No bail requests for this case.</div>
                  ) : (
                    <div className="space-y-3">
                      {bailRequests.map((br) => (
                        <div key={br.id} className="p-3 border border-border rounded-md">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="font-medium">UGX {Number(br.amount || 0).toLocaleString()}</div>
                              {br.reason && <div className="text-sm text-muted-foreground">Reason: {br.reason}</div>}
                              <div className="text-xs text-muted-foreground">
                                Requested {br.createdAt ? new Date(br.createdAt).toLocaleString() : ''}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`${br.status === 'pending' ? 'bg-warning text-warning-foreground' : br.status === 'approved' ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}`}>{br.status || 'pending'}</Badge>
                              {user?.role === 'judge' && (br.status === 'pending' || !br.status) && (
                                <div className="flex items-center gap-2">
                                  <Button size="sm" variant="outline" onClick={() => { setDecisionTarget({ id: br.id, status: 'approved' }); setDecisionNotes(''); setDecisionOpen(true); }}>Approve</Button>
                                  <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => { setDecisionTarget({ id: br.id, status: 'declined' }); setDecisionNotes(''); setDecisionOpen(true); }}>Decline</Button>
                                </div>
                              )}
                            </div>
                          </div>
                          {br.decidedAt && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              Decision: {br.status} • {br.decidedAt ? new Date(br.decidedAt).toLocaleString() : ''}{br.decidedNotes ? ` • ${br.decidedNotes}` : ''}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Quick Actions */}
        <div className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-serif text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {user?.role === 'judge' && (
                <>
                  <Button className="w-full justify-start" variant="outline" onClick={() => toast({ title: 'Demo Stamp', description: 'Synthetic document stamp recorded locally.' })}>
                  <Stamp className="w-4 h-4 mr-2" />
                  Demo Stamp
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => toast({ title: 'Case Approved', description: 'Case marked as approved.' })}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Case
                  </Button>
                </>
              )}
              {(user?.role === 'lawyer' || user?.role === 'admin') && (
                <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/documents')}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              )}
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/scheduling')}>
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Meeting
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => {
                // focus the timeline add comment textarea
                if (noteRef.current) noteRef.current.focus();
              }}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Add Note
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-serif text-base">Case Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Documents</span>
                <span className="font-medium">{case_.files.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Timeline Events</span>
                <span className="font-medium">{timeline.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Days Active</span>
                <span className="font-medium">{Math.ceil((new Date().getTime() - new Date(case_.filingDate).getTime()) / (1000 * 3600 * 24))}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {selectedFile && (
        <DocumentViewer />
      )}

      {/* Edit Case Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { if (!open) { setIsEditOpen(false); setEditDraft(null); } }}>
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
              <div>
                <Label>Next Hearing</Label>
                <Input type="datetime-local" value={editDraft.nextHearing} onChange={(e) => setEditDraft({ ...editDraft, nextHearing: e.target.value })} />
              </div>
              <div>
                <Label>Hearing Location</Label>
                <Input value={editDraft.hearingLocation} onChange={(e) => setEditDraft({ ...editDraft, hearingLocation: e.target.value })} />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => { setIsEditOpen(false); setEditDraft(null); }}>Cancel</Button>
                <Button onClick={saveEdit}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Decide Bail Dialog */}
      <Dialog open={decisionOpen} onOpenChange={(v) => { if (!v) { setDecisionOpen(false); setDecisionTarget(null); setDecisionNotes(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">{decisionTarget?.status === 'approved' ? 'Approve Bail' : 'Decline Bail'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-xs mb-1">Notes (optional)</label>
              <Textarea rows={4} value={decisionNotes} onChange={(e) => setDecisionNotes(e.target.value)} placeholder="Add any notes to accompany your decision" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setDecisionOpen(false); setDecisionTarget(null); setDecisionNotes(''); }}>Cancel</Button>
              <Button onClick={async () => {
                if (!decisionTarget) return;
                try {
                  await decideBail(decisionTarget.id, decisionTarget.status, decisionNotes.trim() || undefined);
                  // refresh list
                  const items = await listBailRequests(caseId);
                  setBailRequests(Array.isArray(items) ? items : []);
                  setDecisionOpen(false);
                  setDecisionTarget(null);
                  setDecisionNotes('');
                  toast({ title: 'Bail updated', description: `Bail ${decisionTarget.status}` });
                } catch (e: any) {
                  toast({ title: 'Action failed', description: e?.response?.data?.error || e.message, variant: 'destructive' });
                }
              }}>{decisionTarget?.status === 'approved' ? 'Approve' : 'Decline'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
