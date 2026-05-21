import React from 'react';
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface TimelinePoint {
  id: string;
  label: string;
  timestamp?: string;
  actor?: string;
  status: 'completed' | 'current' | 'upcoming';
  details?: string;
  color: string; // Tailwind color class
  actions?: Array<{
    timestamp: string;
    actor: string;
    action: string;
    details?: string;
  }>;
}

interface CaseTimelineProgressProps {
  points: TimelinePoint[];
  className?: string;
}

export function CaseTimelineProgress({ points, className }: CaseTimelineProgressProps) {
  const [selectedPoint, setSelectedPoint] = React.useState<TimelinePoint | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // Calculate segment widths - each segment gets equal width
  const segmentWidth = 100 / Math.max(1, points.length - 1);

  // Find the current point index for progress calculation
  const currentIndex = points.findIndex(p => p.status === 'current');
  const completedIndex = points.reduce((max, p, i) => p.status === 'completed' ? i : max, -1);
  
  // Progress percentage based on completed segments
  const progressPercent = ((completedIndex + 1) / (points.length - 1)) * 100;

  return (
    <div className={cn("relative w-full py-6", className)}>
      {/* Background bar */}
      <div className="absolute h-2 w-full bg-muted rounded-full" />

      {/* Colored segments */}
      <div className="absolute h-2 flex w-full">
        {points.slice(0, -1).map((point, i) => (
          <div
            key={point.id}
            style={{ width: `${segmentWidth}%` }}
            className={cn(
              "h-full transition-all duration-500",
              point.color,
              i <= completedIndex ? "opacity-100" : "opacity-30"
            )}
          />
        ))}
      </div>

      {/* Timeline points with tooltips */}
      <div className="absolute w-full flex justify-between">
        {points.map((point, index) => (
          <TooltipProvider key={point.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    setSelectedPoint(point);
                    setDialogOpen(true);
                  }}
                  className={cn(
                    "w-4 h-4 rounded-full border-2 transition-all duration-300 -mt-1 hover:scale-125",
                    point.status === 'completed' ? `${point.color} border-background` :
                    point.status === 'current' ? `bg-background border-${point.color}` :
                    "bg-background border-muted-foreground"
                  )}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                <div className="font-semibold">{point.label}</div>
                {point.timestamp && (
                  <div className="text-xs text-muted-foreground">
                    {new Date(point.timestamp).toLocaleString()}
                  </div>
                )}
                {point.actor && (
                  <div className="text-xs">{point.actor}</div>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      {/* Detailed info dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedPoint?.label}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedPoint?.details && (
              <div className="text-sm text-muted-foreground">
                {selectedPoint.details}
              </div>
            )}

            {selectedPoint?.actions && selectedPoint.actions.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Actions</h4>
                {selectedPoint.actions.map((action, i) => (
                  <div key={i} className="text-sm space-y-1 p-3 border rounded-lg">
                    <div className="font-medium">{action.action}</div>
                    <div className="text-xs text-muted-foreground">
                      {action.actor} • {new Date(action.timestamp).toLocaleString()}
                    </div>
                    {action.details && (
                      <div className="text-sm text-muted-foreground mt-2">
                        {action.details}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}