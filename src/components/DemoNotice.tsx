import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';

export function DemoNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-950">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <ShieldCheck className="h-4 w-4" />
        <span className="font-medium">Synthetic local demo</span>
        <Badge variant="outline" className="border-amber-400 text-amber-950">No real public or court data</Badge>
        {!compact && (
          <span className="text-amber-900">
            Payments, USSD, video, evidence, and external callbacks are mocked for localhost presentation only.
          </span>
        )}
      </div>
    </div>
  );
}
