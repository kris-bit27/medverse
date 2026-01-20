import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from './utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Stethoscope,
  RefreshCw,
  Search,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Crown,
  Moon,
  Sun,
  ChevronRight,
  Shield
} from 'lucide-react';

const publicPages = ['Landing', 'Pricing', 'Demo'];

const navItems = [
  { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
  { name: 'Atestace', page: 'Atestace', icon: GraduationCap },
  { name: 'Články', page: 'Articles', icon: BookOpen },
  { name: 'Nástroje', page: 'Tools', icon: Stethoscope },
  { name: 'Opakování', page: 'ReviewToday', icon: RefreshCw },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isPublicPage = publicPages.includes(currentPageName);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false,
    enabled: !isPublicPage
  });

  useEffect(() => {
    const saved = localStorage.getItem('mednexus-theme');
    if (saved === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('mednexus-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('mednexus-theme', 'light');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = createPageUrl('Search') + `?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  // Public pages - no layout wrapper
  if (isPublicPage) {
    return <>{children}</>;
  }

  const canAccessAdmin = user?.role === 'admin' || user?.role === 'editor';

  return (
    <div className={cn("min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors")}>
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-50 flex items-center px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
          className="mr-3"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white">MedNexus</span>
        </Link>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 transition-transform duration-300",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
            <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg text-slate-900 dark:text-white">MedNexus</span>
                {user?.plan === 'premium' && (
                  <div className="flex items-center gap-1 text-amber-600">
                    <Crown className="w-3 h-3" />
                    <span className="text-xs font-medium">Premium</span>
                  </div>
                )}
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = currentPageName === item.page || 
                (item.page === 'Atestace' && ['Okruhy', 'OkruhDetail', 'QuestionDetail', 'TestGenerator'].includes(currentPageName));
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    isActive 
                      ? "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400" 
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive && "text-teal-600 dark:text-teal-400")} />
                  {item.name}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}

            {canAccessAdmin && (
              <>
                <div className="pt-4 pb-2">
                  <p className="px-4 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Admin
                  </p>
                </div>
                <Link
                  to={createPageUrl('Admin')}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    currentPageName === 'Admin' || currentPageName?.startsWith('Admin')
                      ? "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <Shield className="w-5 h-5" />
                  Správa
                </Link>
              </>
            )}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300">
                  {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {user?.full_name || 'Uživatel'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 z-40 hidden lg:flex items-center justify-between px-6">
          <form onSubmit={handleSearch} className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Hledat otázky, články, nástroje..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-100 dark:bg-slate-800 border-0 focus-visible:ring-teal-500"
              />
            </div>
          </form>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="text-slate-600 dark:text-slate-400"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 text-sm">
                      {user?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {user?.full_name || 'Uživatel'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('Profile')} className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('Profile')} className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Nastavení
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                  <LogOut className="w-4 h-4 mr-2" />
                  Odhlásit se
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-[calc(100vh-4rem)] pt-16 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}