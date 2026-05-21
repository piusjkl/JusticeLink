import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/FileUpload';
import { Badge } from '@/components/ui/badge';
import { getCases } from '@/lib/api';

export default function EvidenceCenter() {
  const [pendingEvidence, setPendingEvidence] = React.useState<any[]>([]);
  React.useEffect(() => {
    getCases().then((data) => {
      const items = data.flatMap((c: any) => (c.files || []).map((f: any) => ({...f, caseId: c.externalId || c.id})));
      setPendingEvidence(items);
    }).catch(() => setPendingEvidence([]));
  }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-serif font-bold text-foreground">Evidence Center</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif">Upload Evidence</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload />
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif">Recent Evidence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingEvidence.map(file => (
              <div key={file.id} className="p-3 border border-border rounded-md flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{file.name}</h4>
                  <p className="text-xs text-muted-foreground">Case {file.caseId} • {file.type}</p>
                </div>
                <Badge variant="outline" className="capitalize">{file.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}