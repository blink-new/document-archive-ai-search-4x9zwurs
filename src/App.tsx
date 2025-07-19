import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Dashboard } from '@/pages/Dashboard'
import { Projects } from '@/pages/Projects'
import { Documents } from '@/pages/Documents'
import { AISearch } from '@/pages/AISearch'
import { blink } from '@/blink/client'
import type { User } from '@/types'

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <h1 className="text-3xl font-bold text-black mb-4">DocArchive</h1>
          <p className="text-gray-600 mb-8">
            A collaborative document management platform with AI-powered search. 
            Sign in to start organizing and searching your documents.
          </p>
          <button
            onClick={() => blink.auth.login()}
            className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Sign In to Continue
          </button>
        </div>
      </div>
    )
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onPageChange={setCurrentPage} />
      case 'projects':
        return <Projects />
      case 'documents':
        return <Documents />
      case 'search':
        return <AISearch />
      case 'team':
        return (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-4">Team Management</h2>
            <p className="text-gray-600">Coming soon - Invite and manage team members</p>
          </div>
        )
      case 'settings':
        return (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-4">Settings</h2>
            <p className="text-gray-600">Coming soon - Manage your account settings</p>
          </div>
        )
      default:
        return <Dashboard onPageChange={setCurrentPage} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App