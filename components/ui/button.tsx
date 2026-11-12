import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

export function Button({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn("action", className)} {...props} />;
}
