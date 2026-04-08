import { AlertCircle } from 'lucide-react'

export function BlockedMessage() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Your account is blocked
        </h2>
        <p className="text-muted-foreground max-w-sm">
          You cannot access customer support at this time. Please contact our team
          directly if you believe this is an error.
        </p>
      </div>
    </div>
  )
}
