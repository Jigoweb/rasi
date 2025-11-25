'use client'

import { useAuth } from '@/shared/contexts/auth-context'
import { Button } from '@/shared/components/ui/button'
import { Separator } from '@/shared/components/ui/separator'
import { 
  Users, 
  FileText, 
  Calendar, 
  Search, 
  Settings, 
  LogOut,
  Music,
  BarChart3,
  Database,
  Menu,
  X
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'



export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { user, loading, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Music className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">RASI</h1>
                <p className="text-sm text-gray-500">Collecting Society</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {[
              { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
              { name: 'Artisti', href: '/dashboard/artisti', icon: Users },
              { name: 'Opere', href: '/dashboard/opere', icon: FileText },
              { name: 'Programmazioni', href: '/dashboard/programmazioni', icon: Calendar },
              { name: 'Campagne', href: '/dashboard/campagne', icon: Search },
              { name: 'Query', href: '/dashboard/query', icon: Database },
              { name: 'Report', href: '/dashboard/report', icon: FileText },
            ].map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-gray-200 rounded-full h-8 w-8 flex items-center justify-center">
                <span className="text-sm font-medium">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.email}
                </p>
                <p className="text-xs text-gray-500">Online</p>
              </div>
            </div>
            
            <Separator className="my-3" />
            
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start text-sm"
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Impostazioni
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                size="sm"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Esci
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <div className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Music className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg">RASI</span>
          </div>
          <div className="w-8" /> {/* Spacer for centering */}
        </div>
        
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}