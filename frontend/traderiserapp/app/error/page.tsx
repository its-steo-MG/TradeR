// app/error/page.tsx
"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"


export default function ErrorPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="p-6 max-w-md w-full bg-card/50 border-border">
        <h1 className="text-2xl font-bold text-foreground mb-4">Error</h1>
        <p className="text-muted-foreground mb-6">
          An error occurred. You may need a Pro-FX account to access trading features. Go to dashboard to create one.
        </p>
        <div className="flex gap-4">
          <Button
            onClick={() => router.push("/dashboard")}
            className="bg-primary text-primary-foreground"
          >
            Go to Dashboard
          </Button>
          <Button
            onClick={() => router.push("/")}
            variant="outline"
            className="text-foreground border-border"
          >
            Back to Home
          </Button>
        </div>
      </Card>
    </div>
  )
}