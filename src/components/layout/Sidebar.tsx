import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  Home, 
  FolderOpen, 
  FileText, 
  Search, 
  Users, 
  Settings 
} from 'lucide-react'

interface SidebarProps {
  currentPage: string
  onPageChange: (page: string) => void
}

const navigation = [
  { name: 'Dashboard', icon: Home, id: 'dashboard' },
  { name: 'Projects', icon: FolderOpen, id: 'projects' },
  { name: 'Documents', icon: FileText, id: 'documents' },
  { name: 'AI Search', icon: Search, id: 'search' },
  { name: 'Team', icon: Users, id: 'team' },
  { name: 'Settings', icon: Settings, id: 'settings' },
]

export function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = currentPage === item.id
            return (
              <Button
                key={item.name}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isActive 
                    ? "bg-gray-100 text-black" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-black"
                )}
                onClick={() => onPageChange(item.id)}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}