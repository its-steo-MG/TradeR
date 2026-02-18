// New component: admin-thread-list.tsx
interface ActiveThread {
  id: number
  user: {
    id: number
    username: string
  }
  last_message?: string | null
  is_blocked?: boolean
}

interface AdminThreadListProps {
  threads: ActiveThread[]
  selectedUserId: number | null
  onSelectUser: (userId: number) => void
}

export default function AdminThreadList({ threads, selectedUserId, onSelectUser }: AdminThreadListProps) {
  return (
    <div className="w-72 border-r border-gray-200 bg-white overflow-y-auto">
      <div className="p-4 border-b">
        <h2 className="font-bold text-lg">Active Chats</h2>
      </div>
      {threads.map((thread) => (
        <div 
          key={thread.id}
          onClick={() => onSelectUser(thread.user.id)}
          className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${selectedUserId === thread.user.id ? 'bg-gray-100' : ''}`}
        >
          <div className="font-semibold">{thread.user.username}</div>
          <div className="text-sm text-gray-600 truncate">{thread.last_message || 'No messages'}</div>
          {thread.is_blocked && <span className="text-red-500 text-xs">Blocked</span>}
        </div>
      ))}
    </div>
  )
}