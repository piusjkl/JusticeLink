import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCases } from '@/lib/api';
import { Gavel, CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, parseISO } from 'date-fns';

export default function ProsecutionQueue() {
  const navigate = useNavigate();
  const [queue, setQueue] = React.useState<any[]>([]);
  React.useEffect(() => {
    getCases().then((data) => setQueue(data.filter((c: any) => c.type === 'criminal'))).catch(() => setQueue([]));
  }, []);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif font-bold text-foreground">Prosecution Queue</h1>
        <Button variant="outline" onClick={() => navigate('/scheduling')}>
          <CalendarDays className="w-4 h-4 mr-2" /> Court Calendar
        </Button>
      </div>
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-serif">Cases Submitted by Law Enforcement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {queue.map(case_ => (
            <div key={case_.id} className="p-3 border border-border rounded-md flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-medium">{case_.title}</h4>
                  <Badge variant="outline" className="capitalize">{case_.type}</Badge>
                  <Badge variant="outline" className="capitalize">{case_.priority}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{case_.id} • Filed {formatDistanceToNow(parseISO(case_.filingDate))} ago</p>
              </div>
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline" onClick={() => navigate(`/case/${case_.id}`)}>Review</Button>
                <Button size="sm" className="bg-gradient-navy text-primary-foreground" onClick={() => navigate(`/case/${case_.id}`)}>
                  <Gavel className="w-3 h-3 mr-1" /> Prosecute
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}