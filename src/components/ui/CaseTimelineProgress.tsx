import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type TimelineAction = {
  timestamp: string;
  actor: string;
  action: string;
  details: string;
};

type TimelinePoint = {
  id: string;
  label: string;
  timestamp?: string;
  actor?: string;
  status: 'completed' | 'current' | 'upcoming';
  color: string;
  details: string;
  actions: TimelineAction[];
};

interface CaseTimelineProgressProps {
  points: TimelinePoint[];
  className?: string;
}

export function CaseTimelineProgress({ points, className }: CaseTimelineProgressProps) {
  const totalPoints = points.length;
  const completedPoints = points.filter(p => p.status === 'completed').length;
  const progressPercent = Math.round((completedPoints / totalPoints) * 100);

  return (
    <div className={cn("relative", className)}>
      {/* Progress Bar */}
      <div className="relative h-2 rounded-full overflow-hidden bg-gray-200">
        {/* Segmented progress sections */}
        {points.map((point, index) => {
          const segmentWidth = 100 / totalPoints;
          const isCompleted = point.status === 'completed';
          const isCurrent = point.status === 'current';

          return (
            <div
              key={point.id}
              className={cn(
                "absolute h-full transition-all duration-500",
                isCompleted ? point.color : 'bg-gray-300',
                isCurrent ? 'animate-pulse' : ''
              )}
              style={{
                left: `${index * segmentWidth}%`,
                width: `${segmentWidth}%`,
                opacity: isCompleted ? 1 : isCurrent ? 0.5 : 0.2
              }}
            />
          );
        })}
      </div>

      {/* Timeline Points */}
      <div className="relative mt-2">
        <div className="flex justify-between">
          {points.map((point, index) => {
            const isCompleted = point.status === 'completed';
            const isCurrent = point.status === 'current';

            return (
              <Dialog key={point.id}>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <button
                        className={cn(
                          "flex flex-col items-center focus:outline-none group",
                          "transform transition-transform hover:-translate-y-0.5"
                        )}
                        aria-label={point.label}
                      >
                        <div
                          className={cn(
                            "w-4 h-4 rounded-full border-2",
                            isCompleted ? `${point.color} border-transparent` : 
                            isCurrent ? 'bg-white border-current animate-pulse' : 
                            'bg-white border-gray-300',
                            "group-hover:border-current transition-colors"
                          )}
                        >
                          {isCompleted && (
                            <svg
                              className="w-full h-full text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <div className={cn(
                          "mt-2 text-xs whitespace-nowrap max-w-[8rem] text-center",
                          isCompleted ? "text-foreground" : 
                          isCurrent ? "text-foreground" : 
                          "text-muted-foreground"
                        )}>
                          {point.label}
                        </div>
                      </button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="p-2">
                    <p className="font-medium">{point.label}</p>
                    <p className="text-xs text-muted-foreground">{point.details}</p>
                  </TooltipContent>
                </Tooltip>

                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {point.label} - {point.status === 'completed' ? 'Completed' : point.status === 'current' ? 'In Progress' : 'Upcoming'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-medium">Status</div>
                      <div className="text-sm text-muted-foreground">{point.details}</div>
                    </div>

                    {point.actions.length > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-2">Related Actions</div>
                        <div className="space-y-2">
                          {point.actions.map((action, i) => (
                            <div key={i} className="p-3 border border-border rounded-md">
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-sm font-medium">{action.action} — {action.actor}</div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(action.timestamp).toLocaleString()}
                                </div>
                              </div>
                              <div className="text-sm text-muted-foreground">{action.details}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            );
          })}
        </div>
      </div>

      {/* Progress percentage */}
      <div className="text-right text-sm text-muted-foreground mt-2">
        {progressPercent}% Complete
      </div>
    </div>
  );
}