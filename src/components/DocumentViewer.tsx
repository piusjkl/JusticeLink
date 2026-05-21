import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getCases } from '@/lib/api';
import { FileText, Download, Eye, Search, Filter, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { downloadEvidenceFile } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function DocumentViewer() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getCases()
      .then((data) => {
        if (!mounted) return;
        setCases(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || 'Failed to load documents');
        setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const allFiles = useMemo(() => {
    return cases.flatMap((case_: any) =>
      (case_.files || []).map((file: any) => ({
        ...file,
        caseId: case_.externalId || case_.id,
        caseTitle: case_.title,
      }))
    );
  }, [cases]);

  // Local UI state: search and status filter
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');

  const filteredFiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allFiles.filter(file => {
      if (statusFilter !== 'all' && file.status !== statusFilter) return false;
      if (!q) return true;
      return (
        file.name.toLowerCase().includes(q) ||
        file.caseTitle.toLowerCase().includes(q) ||
        file.uploadedBy.toLowerCase().includes(q)
      );
    });
  }, [allFiles, searchQuery, statusFilter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'pending': return <Clock className="w-4 h-4 text-warning" />;
      case 'rejected': return <AlertCircle className="w-4 h-4 text-destructive" />;
      default: return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success text-success-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'rejected': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Document Library</h1>
          <p className="text-muted-foreground">View, manage, and download case documents</p>
        </div>
        <div className="flex space-x-2 items-center">
          <Button
            variant="outline"
            onClick={() => setStatusFilter(prev => (prev === 'all' ? 'pending' : prev === 'pending' ? 'approved' : prev === 'approved' ? 'rejected' : 'all'))}
            title="Cycle status filter: All → Pending → Approved → Rejected"
          >
            <Filter className="w-4 h-4 mr-2" />
            {statusFilter === 'all' ? 'Filter: All' : `Filter: ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`}
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Search documents by name, case, or uploader..."
                className="pl-10"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') setSearchQuery(searchInput); }}
              />
            </div>
            <Button onClick={() => setSearchQuery(searchInput)}>Search</Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold text-foreground">{allFiles.length}</p>
              </div>
              <FileText className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-success">{allFiles.filter(f => f.status === 'approved').length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-warning">{allFiles.filter(f => f.status === 'pending').length}</p>
              </div>
              <Clock className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Size</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatFileSize(allFiles.reduce((sum, file) => sum + file.size, 0))}
                </p>
              </div>
              <FileText className="w-8 h-8 text-gold" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-serif">All Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : (
          <div className="space-y-3">
            {filteredFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <FileText className="w-8 h-8 text-primary" />
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground mb-1">{file.name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="text-primary underline">{file.caseTitle}</span>
                      <span>Uploaded by {file.uploadedBy}</span>
                      <span>{(() => { const d = new Date(file.uploadedAt); return isNaN(d.getTime()) ? 'unknown' : `${formatDistanceToNow(d)} ago`; })()}</span>
                      <span>{formatFileSize(file.size)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(file.status)}
                    <Badge variant="outline" className={getStatusColor(file.status)}>
                      {file.status}
                    </Badge>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/case/${file.caseId}`)}>
                      <Eye className="w-3 h-3 mr-1" />
                      Preview
                    </Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      const url = await downloadEvidenceFile(file.id);
                      window.open(url, '_blank');
                    }}>
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}