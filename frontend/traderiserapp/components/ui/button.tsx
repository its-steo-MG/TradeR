"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Liquid-drop buttons.
 *
 * IMPORTANT: every variant keeps its ORIGINAL colour as the background.
 * The liquid look is only an overlay — a clear drop of water sitting on
 * top of the coloured surface (`.drop-on-top` in globals.css).
 *
 * `selected` triggers the Apple-like "a drop just landed here" animation
 * (`.drop-selected` + an expanding ripple ring).
 */
const buttonVariants = cva(
  "drop-on-top inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-white/40",
  {
    variants: {
      variant: {
        // original colours preserved — drop overlay only
        default: "bg-primary text-primary-foreground",
        primary:
          "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white",
        success:
          "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white",
        destructive:
          "bg-gradient-to-b from-rose-500 to-rose-600 text-white",
        warning:
          "bg-gradient-to-b from-amber-500 to-amber-600 text-white",
        secondary: "bg-secondary text-secondary-foreground",
        outline:
          "border border-white/25 bg-white/5 text-foreground",
        // truly clear glass (no colour of its own)
        glass: "bg-white/10 text-white backdrop-blur-2xl border border-white/25",
        ghost:
          "!shadow-none text-foreground/80 hover:text-foreground hover:bg-white/10",
        link: "!shadow-none !overflow-visible text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-2 rounded-full",
        sm: "h-9 gap-1.5 px-4 rounded-full text-[13px]",
        lg: "h-14 px-8 rounded-full text-base",
        pill: "h-12 px-7 rounded-full",
        block: "h-14 w-full px-6 rounded-[1.6rem] text-base",
        icon: "size-11 rounded-full",
        "icon-sm": "size-9 rounded-full",
        "icon-lg": "size-14 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/** Emits one ripple ring each time `selected` flips to true. */
export function useDropRipple(selected?: boolean) {
  const [key, setKey] = React.useState(0)
  const first = React.useRef(true)

  React.useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (selected) setKey((k) => k + 1)
  }, [selected])

  return key
}

export function DropRipple({ trigger }: { trigger: number }) {
  if (!trigger) return null
  return (
    <span className="drop-ripple" aria-hidden>
      <span key={trigger} />
    </span>
  )
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  selected = false,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** shows the water-drop-landing animation and wet selected surface */
    selected?: boolean
  }) {
  const Comp = asChild ? Slot : "button"
  const ripple = useDropRipple(selected)

  return (
    <Comp
      data-slot="button"
      data-selected={selected || undefined}
      aria-pressed={selected || undefined}
      className={cn(
        buttonVariants({ variant, size }),
        selected && "drop-selected",
        className
      )}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          <span className="relative z-[1] inline-flex items-center gap-2">
            {children}
          </span>
          {selected ? <DropRipple trigger={ripple} /> : null}
        </>
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
