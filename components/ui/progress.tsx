
"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { indicatorClassName?: string }
>(({ className, value, indicatorClassName, ...otherProps }, ref) => {
  // Value for Radix Root: if it's a number (incl. 0) and not NaN, pass it. Otherwise, pass 0 to force determinate state.
  const rootValue = (typeof value === 'number' && !isNaN(value)) ? value : 0;
  // Value for transform calculation: ensure it's 0 if not a valid positive number, or if it's NaN.
  // This keeps the bar visually empty for 0% progress.
  const transformValue = (typeof value === 'number' && value > 0 && !isNaN(value)) ? value : 0;

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      value={rootValue} // Pass the sanitized numeric value to avoid indeterminate state
      {...otherProps}
    >
      <ProgressPrimitive.Indicator
        className={cn("h-full w-full flex-1 bg-primary transition-all", indicatorClassName)}
        // Calculate transform based on transformValue, ensuring (value || 0) logic handles potential 0 correctly
        style={{ transform: `translateX(-${100 - transformValue}%)` }}
      />
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
