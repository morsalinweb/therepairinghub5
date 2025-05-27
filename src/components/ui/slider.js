"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-200">
      <SliderPrimitive.Range className="absolute h-full bg-blue-500" />
    </SliderPrimitive.Track>

    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-blue-700 bg-blue-600 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />

    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-emerald-700 bg-emerald-500 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />

  </SliderPrimitive.Root>
));

Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
