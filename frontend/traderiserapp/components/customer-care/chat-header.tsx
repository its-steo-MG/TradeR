export default function ChatHeader() {
  return (
    <div className="border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold text-sm shadow-md">
            C
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white text-sm">Customer Support</h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Typically replies in minutes</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-medium text-slate-600 dark:text-zinc-300">Online</span>
        </div>
      </div>
    </div>
  )
}
