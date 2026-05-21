import React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(function ProgressComponent({ className, value, ...props }, ref) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  let colorClass = 'bg-primary';
  if (v <= 40) colorClass = 'bg-destructive';
  else if (v <= 60) colorClass = 'bg-warning';
  else if (v <= 80) colorClass = 'bg-gold';
  else colorClass = 'bg-success';

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn("h-full w-full flex-1 transition-all", colorClass)}
        style={{ transform: `translateX(-${100 - v}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
