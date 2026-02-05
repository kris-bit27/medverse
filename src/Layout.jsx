import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from './utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SearchTopics } from '@/components/SearchTopics';
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
  Shield,
  ClipboardList,
  MessageSquare,
  Package,
  Calendar as CalendarIcon,
  Brain
} from 'lucide-react';
import FloatingCopilot from '@/components/ai/FloatingCopilot';
import { canAccessAdmin, getRoleDisplayName, getRoleBadgeColor } from '@/components/utils/permissions';

const publicPages = ['Landing', 'Pricing', 'Demo'];

const navItems = [
  { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
  { name: 'Studium', page: 'Atestace', icon: GraduationCap },
  { name: 'Opakování', page: 'ReviewToday', icon: RefreshCw },
  { name: 'Studijní balíčky', page: 'StudyPackages', icon: Package },
  { name: 'Články', page: 'Articles', icon: BookOpen },
  { name: 'Nástroje', page: 'Tools', icon: Stethoscope },
  { name: 'Hippo', page: 'AICopilot', icon: Brain },
  { name: 'Plánovač', page: 'StudyPlanner', icon: CalendarIcon },
  { name: 'Logbook', page: 'Logbook', icon: ClipboardList },
  { name: 'Forum', page: 'Forum', icon: MessageSquare },
  { name: 'Vyhledávání', page: 'ScholarSearch', icon: Search },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const isPublicPage = publicPages.includes(currentPageName);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false,
    enabled: !isPublicPage
  });

  useEffect(() => {
    const saved = localStorage.getItem('mn:theme') || localStorage.getItem('medverse-theme');
    const theme = saved === 'light' ? 'light' : 'dark';
    setDarkMode(theme === 'dark');
    document.body.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('mn:theme', theme);
  }, []);

  const toggleDarkMode = () => {
    const nextTheme = darkMode ? 'light' : 'dark';
    setDarkMode(nextTheme === 'dark');
    document.body.dataset.theme = nextTheme;
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    localStorage.setItem('mn:theme', nextTheme);
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  // Public pages - no layout wrapper
  if (isPublicPage) {
    return <>{children}</>;
  }

  const hasAdminAccess = canAccessAdmin(user);

  return (
    <div className={cn("mn-shell min-h-screen transition-colors")}>
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
          <img src="/logo.svg" alt="MedVerse" className="w-8 h-8" />
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-white">MedVerse</span>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400">
              EDU
            </span>
          </div>
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
        "mn-sidebar fixed top-0 left-0 h-full w-72 z-50 transition-transform duration-300",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
            <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3">
              <img src="/logo.svg" alt="MedVerse" className="w-10 h-10" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg text-slate-900 dark:text-white">MedVerse</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400">
                    EDU
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {user?.plan === 'premium' && (
                    <div className="flex items-center gap-1 text-amber-600">
                      <Crown className="w-3 h-3" />
                      <span className="text-xs font-medium">Premium</span>
                    </div>
                  )}
                  {user?.role && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${getRoleBadgeColor(user.role)}`}>
                      {getRoleDisplayName(user.role)}
                    </span>
                  )}
                </div>
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
                (item.page === 'Atestace' && ['Okruhy', 'OkruhDetail', 'QuestionDetail', 'TestGenerator'].includes(currentPageName)) ||
                (item.page === 'Forum' && ['Forum', 'ForumThread'].includes(currentPageName)) ||
                (item.page === 'StudyPackages' && ['StudyPackages', 'StudyPackageCreate', 'StudyPackageDetail'].includes(currentPageName)) ||
                (item.page === 'StudyPlanner' && ['StudyPlanner', 'StudyPlanCreate', 'StudyPlanDetail'].includes(currentPageName)) ||
                (item.page === 'AICopilot' && currentPageName === 'AICopilot');
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "mn-sidebar-link flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    isActive ? "is-active" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive && "text-teal-600 dark:text-teal-400")} />
                  {item.name}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}

            {hasAdminAccess && (
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
                    "mn-sidebar-link flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    currentPageName === 'Admin' || currentPageName?.startsWith('Admin')
                      ? "is-active"
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
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {user?.full_name || 'Uživatel'}
                  </p>
                  {user?.role && (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getRoleBadgeColor(user.role)}`}>
                      {getRoleDisplayName(user.role)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="mn-main lg:pl-72">
        {/* Top bar */}
        <header className="mn-topbar sticky top-0 h-16 z-40 hidden lg:flex items-center justify-between gap-4 px-6">
          <div className="flex-1 max-w-xl">
            <SearchTopics />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="atesto-btn atesto-btn-ghost text-slate-600 dark:text-slate-400"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="atesto-btn atesto-btn-ghost gap-2">
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

      {/* Floating AI Copilot */}
      <FloatingCopilot />
    </div>
  );
}
