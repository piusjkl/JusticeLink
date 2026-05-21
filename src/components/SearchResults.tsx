import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { getCases } from '@/lib/api';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function SearchResults() {
  const q = useQuery().get('q') || '';
  const navigate = useNavigate();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getCases()
      .then((data) => {
        if (!mounted) return;
        setCases(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || 'Failed to load cases');
        setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const query = q.trim().toLowerCase();

  const caseResults = useMemo(() => {
    if (!query) return [];
    return cases.filter((c) => {
      const id = (c.externalId || c.id || '').toLowerCase();
      const title = (c.title || '').toLowerCase();
      const type = (c.type || '').toLowerCase();
      return title.includes(query) || id.includes(query) || type.includes(query);
    });
  }, [query, cases]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold">Search Results</h1>
          <p className="text-sm text-muted-foreground">Query: "{q}"</p>
        </div>
        <div>
          <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Cases</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : query ? (
            caseResults.length ? (
              <div className="space-y-3">
                {caseResults.map(c => (
                  <div key={c.id} className="p-3 border border-border rounded-md flex items-center justify-between">
                    <div>
                      <div className="font-medium">{c.title}</div>
                      <div className="text-xs text-muted-foreground">{c.externalId || c.id} • {c.type}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/case/${c.externalId || c.id}`)}>Open</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No cases found matching your query.</div>
            )
          ) : (
            <div className="text-sm text-muted-foreground">Enter a query to search cases.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
