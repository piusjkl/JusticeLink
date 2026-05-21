import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AlertsPage({ onBack }: { onBack?: () => void }) {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">Placeholder for security alerts and notifications.</p>
          {onBack ? (
            <Button variant="outline" onClick={onBack}>Back</Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
