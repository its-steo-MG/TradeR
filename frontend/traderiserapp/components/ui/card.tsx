import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Clean Liquid Glass card — soft rounded glass without heavy top white glow
 * or bottom extension shadow.
 */
function Card({
  className,
  variant = "clear",
  ...props
}: React.ComponentProps<"div"> & { variant?: "clear" | "strong" | "plain" }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col gap-6 py-6 text-card-foreground",
        // Clean glass — no strong top white, no bottom extension
        variant === "clear" &&
          "bg-white/[0.07] backdrop-blur-2xl border border-white/15 rounded-[2.2rem] shadow-[0_8px_30px_rgba(0,0,0,0.25)]",
        variant === "strong" &&
          "bg-white/[0.11] backdrop-blur-3xl border border-white/20 rounded-[2.2rem] shadow-[0_12px_40px_rgba(0,0,0,0.3)]",
        variant === "plain" && "bg-card rounded-[2.2rem] border shadow-sm",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-7 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-lg leading-none font-semibold tracking-[-0.01em]",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-white/70", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn("px-7", className)} {...props} />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-7 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}