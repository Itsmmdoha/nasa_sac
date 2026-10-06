import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

export function Button({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "w-full rounded-lg bg-emerald-700 px-4 py-3 text-base font-medium text-white hover:bg-emerald-800 disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
