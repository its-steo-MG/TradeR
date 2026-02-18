export default function ChatHeader() {
  return (
    <div className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white font-bold text-sm shadow-md">
            C
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-sm">Customer Support</h1>
            <p className="text-xs text-gray-500">Typically replies in minutes</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-2 w-2 rounded-full bg-green-500 shadow-lg animate-pulse"></div>
          <span className="text-xs font-medium text-gray-600">Online</span>
        </div>
      </div>
    </div>
  )
}
