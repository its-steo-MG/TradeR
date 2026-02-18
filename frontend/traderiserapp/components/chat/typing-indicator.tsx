export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-gray-100 w-fit px-3 py-2 text-gray-700 rounded-bl-none shadow-sm">
      <div className="flex gap-1.5">
        <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }}></div>
        <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }}></div>
        <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }}></div>
      </div>
    </div>
  )
}
