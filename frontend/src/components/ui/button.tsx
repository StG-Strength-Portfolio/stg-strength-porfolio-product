import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/25 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed shadow-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-[#7C3AED] bg-[#7C3AED] text-white shadow-none hover:border-[#6D28D9] hover:bg-[#6D28D9] hover:text-white",
        destructive:
          "border border-red-600 bg-red-600 text-white shadow-none hover:border-red-700 hover:bg-red-700 hover:text-white",
        outline:
          "border border-[#D1D5DB] bg-white text-[#374151] shadow-none hover:border-[#C4B5FD] hover:bg-[#F9FAFB] hover:text-[#6D28D9]",
        secondary:
          "border border-[#E5E7EB] bg-[#F9FAFB] text-[#374151] shadow-none hover:bg-[#F3F4F6] hover:text-[#1F2937]",
        ghost:
          "border border-transparent bg-transparent text-[#374151] shadow-none hover:bg-[#F9FAFB] hover:text-[#6D28D9]",
        link: "bg-transparent text-[#6D28D9] shadow-none underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-lg px-8",
        icon: "h-9 w-9 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
