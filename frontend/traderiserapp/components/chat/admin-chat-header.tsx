// New component: admin-chat-header.tsx
interface AdminChatHeaderProps {
  userId: number
  onBlock: (action: 'temp' | 'perm' | 'unblock', reason?: string) => void
}

export default function AdminChatHeader({ userId, onBlock }: AdminChatHeaderProps) {
  // Fetch user name or something, assume from thread
  return (
    <div className="border-b border-gray-200 bg-white shadow-sm p-4 flex justify-between items-center">
      <h1 className="font-bold">Chat with User {userId}</h1>
      <div className="space-x-2">
        <button onClick={() => onBlock('temp')} className="bg-yellow-500 text-white px-3 py-1 rounded">Temp Block</button>
        <button onClick={() => onBlock('perm')} className="bg-red-500 text-white px-3 py-1 rounded">Perm Block</button>
        <button onClick={() => onBlock('unblock')} className="bg-green-500 text-white px-3 py-1 rounded">Unblock</button>
      </div>
    </div>
  )
}