
"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => {
  const railImageUrl = "/slider.png";
  const thumbImageUrl = "/slider-button.png";

  return (
    <div className="relative w-full h-16 flex items-center">
      {/* Visual Rail Background */}
      <div 
        className="absolute w-full h-full bg-contain bg-no-repeat bg-center"
        style={{ backgroundImage: `url('${railImageUrl}')` }}
      />
      
      {/* Functional Slider */}
      <SliderPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex w-full h-full items-center select-none touch-none",
          className
        )}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-full w-full grow overflow-hidden rounded-full bg-transparent">
          {/* We don't need a visible range, the thumb position is enough */}
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb 
          className="block h-16 w-16 rounded-full ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-contain bg-no-repeat bg-center"
          style={{ backgroundImage: `url('${thumbImageUrl}')` }}
        />
      </SliderPrimitive.Root>
    </div>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
