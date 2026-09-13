import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500",
  {
    variants: {
      variant: {
        default: "border-transparent bg-slate-900 text-white",
        secondary: "border-transparent bg-slate-100 text-slate-700",
        outline: "border-slate-300 text-slate-700",
        green: "border-transparent bg-green-100 text-green-700",
        red: "border-transparent bg-red-100 text-red-700",
        amber: "border-transparent bg-amber-100 text-amber-700",
        blue: "border-transparent bg-blue-100 text-blue-700",
        purple: "border-transparent bg-blue-100 text-blue-700",
        teal: "border-transparent bg-green-100 text-green-700",
        indigo: "border-transparent bg-blue-100 text-blue-700",
        slate: "border-transparent bg-slate-100 text-slate-600",
        ghost: "border-transparent bg-transparent text-slate-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };