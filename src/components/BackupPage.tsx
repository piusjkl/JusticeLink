import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function BackupPage({ onBack }: { onBack?: () => void }) {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Backup & Restore</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">Placeholder for backup and restore operations. Wire to DB/Cloud backup here.</p>
          {onBack ? (
            <Button variant="outline" onClick={onBack}>Back</Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
