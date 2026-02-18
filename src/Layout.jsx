import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
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
  Flag,
  Package,
  Calendar as CalendarIcon,
  Zap,
  Calculator,
  Pill,
  FileText,
  Users,
  Trophy
} from 'lucide-react';
import { canAccessAdmin, getRoleDisplayName, getRoleBadgeColor } from '@/components/utils/permissions';
import MedVerseLogo from '@/components/MedVerseLogo';

const publicPages = ['Landing', 'Pricing', 'Demo'];

const navItems = [
  { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
  { name: 'Studium', page: 'Studium', icon: GraduationCap },
  { name: 'Opakování', page: 'ReviewToday', icon: RefreshCw },
  { name: 'Testy', page: 'TestGeneratorV2', icon: Zap },
  { name: 'Studijní sady', page: 'StudyPackages', icon: Package },
  { name: 'Komunita', page: 'Community', icon: Users },
  { name: 'Logbook', page: 'Logbook', icon: ClipboardList },
  { name: 'Med Search', page: 'MedSearch', icon: Search },
  { 
    name: 'Nástroje', 
    icon: Stethoscope,
    submenu: [
      { name: 'Kalkulačky', page: 'ClinicalCalculators', icon: Calculator },
      { name: 'Databáze léků', page: 'DrugDatabase', icon: Pill },
      { name: 'Klinické postupy', page: 'ClinicalGuidelines', icon: FileText },
    ]
  },
  { name: 'Plánovač', page: 'StudyPlansV2', icon: CalendarIcon },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const isPublicPage = publicPages.includes(currentPageName);

  // Use Supabase Auth instead of base44
  const { user, isAuthenticated, logout } = useAuth();

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

  const handleLogout = async () => {
    await logout();
  };

  // Public pages - no layout wrapper
  if (isPublicPage) {
    return <>{children}</>;
  }

  const hasAdminAccess = canAccessAdmin(user);

  return (
    <div className={cn("mn-shell min-h-screen transition-colors")}>
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[hsl(var(--mn-surface))] border-b border-[hsl(var(--mn-border))] z-50 flex items-center justify-between px-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="mr-3"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2">
            <MedVerseLogo size={32} />
            <div className="flex items-center gap-2">
              <span className="mn-serif-font font-bold text-[hsl(var(--mn-text))]">MedVerse</span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-[hsl(var(--mn-accent)/0.1)] text-[hsl(var(--mn-accent))]">
                EDU
              </span>
            </div>
          </Link>
        </div>
        <Link to={createPageUrl('Search')} className="p-2 text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))]">
          <Search className="w-5 h-5" />
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
          <div className="h-16 flex items-center justify-between px-6 border-b border-[hsl(var(--mn-border))]">
            <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3">
              <MedVerseLogo size={40} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="mn-serif-font font-bold text-lg text-[hsl(var(--mn-text))]">MedVerse</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[hsl(var(--mn-accent)/0.1)] text-[hsl(var(--mn-accent))]">
                    EDU
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {user?.plan === 'premium' && (
                    <div className="flex items-center gap-1 text-[hsl(var(--mn-warn))]">
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
              // Handle submenu items
              if (item.submenu) {
                const Icon = item.icon;
                const hasActiveSubmenu = item.submenu.some(subItem => 
                  currentPageName === subItem.page
                );
                const [isExpanded, setIsExpanded] = React.useState(hasActiveSubmenu);

                return (
                  <div key={item.name}>
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                        hasActiveSubmenu 
                          ? "is-active" 
                          : "text-[hsl(var(--mn-muted))] hover:bg-[hsl(var(--mn-surface-2))]"
                      )}
                    >
                      <Icon className={cn("w-5 h-5", hasActiveSubmenu && "text-[hsl(var(--mn-accent))]")} />
                      {item.name}
                      <ChevronRight 
                        className={cn(
                          "w-4 h-4 ml-auto transition-transform",
                          isExpanded && "rotate-90"
                        )} 
                      />
                    </button>
                    
                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.submenu.map((subItem) => {
                          const isActive = currentPageName === subItem.page;
                          const SubIcon = subItem.icon;

                          return (
                            <Link
                              key={subItem.page}
                              to={createPageUrl(subItem.page)}
                              onClick={() => setSidebarOpen(false)}
                              className={cn(
                                "flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                                isActive 
                                  ? "bg-[hsl(var(--mn-accent)/0.1)] text-[hsl(var(--mn-accent))]" 
                                  : "text-[hsl(var(--mn-muted))] hover:bg-[hsl(var(--mn-surface-2))]"
                              )}
                            >
                              <SubIcon className="w-4 h-4" />
                              {subItem.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Regular nav items
              const isActive = currentPageName === item.page ||
                (item.page === 'StudiumV2' && ['Okruhy', 'OkruhDetail', 'QuestionDetail', 'TestGenerator', 'TopicDetail', 'TopicDetailV2', 'Studium'].includes(currentPageName)) ||
                (item.page === 'Community' && ['Community', 'Forum', 'ForumThread', 'StudyGroup', 'StudyGroups'].includes(currentPageName)) ||
                (item.page === 'StudyPackages' && ['StudyPackages', 'StudyPackageCreate', 'StudyPackageDetail'].includes(currentPageName)) ||
                (item.page === 'StudyPlanner' && ['StudyPlanner', 'StudyPlanCreate', 'StudyPlanDetail'].includes(currentPageName));
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "mn-sidebar-link mn-ui-font flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    isActive ? "is-active" : "text-[hsl(var(--mn-muted))] hover:bg-[hsl(var(--mn-surface-2))]"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive && "text-[hsl(var(--mn-accent))]")} />
                  {item.name}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}

            {hasAdminAccess && (
              <>
                <div className="pt-4 pb-2">
                  <p className="px-4 mn-caption text-[hsl(var(--mn-muted))] !mb-0">
                    Admin
                  </p>
                </div>
                <Link
                  to={createPageUrl('AdminConsole')}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "mn-sidebar-link mn-ui-font flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    currentPageName === 'AdminConsole'
                      ? "is-active"
                      : "text-[hsl(var(--mn-muted))] hover:bg-[hsl(var(--mn-surface-2))]"
                  )}
                >
                  <Shield className="w-5 h-5" />
                  Správa
                </Link>
                <Link
                  to={createPageUrl('AdminBatchMonitor')}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "mn-sidebar-link mn-ui-font flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    currentPageName === 'AdminBatchMonitor'
                      ? "is-active"
                      : "text-[hsl(var(--mn-muted))] hover:bg-[hsl(var(--mn-surface-2))]"
                  )}
                >
                  <Zap className="w-5 h-5" />
                  Batch Generace
                </Link>
                <Link
                  to={createPageUrl('AdminFeedback')}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "mn-sidebar-link mn-ui-font flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    currentPageName === 'AdminFeedback'
                      ? "is-active"
                      : "text-[hsl(var(--mn-muted))] hover:bg-[hsl(var(--mn-surface-2))]"
                  )}
                >
                  <Flag className="w-5 h-5" />
                  Content Feedback
                </Link>
              </>
            )}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-[hsl(var(--mn-border))]">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--mn-surface-2))]">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-[hsl(var(--mn-accent)/0.12)] text-[hsl(var(--mn-accent))]">
                  {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="mn-ui-font text-sm font-medium text-[hsl(var(--mn-text))] truncate">
                    {user?.full_name || 'Uživatel'}
                  </p>
                  {user?.role && (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getRoleBadgeColor(user.role)}`}>
                      {getRoleDisplayName(user.role)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[hsl(var(--mn-muted))] truncate">
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
              className="atesto-btn atesto-btn-ghost text-[hsl(var(--mn-muted))]"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="atesto-btn atesto-btn-ghost gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-[hsl(var(--mn-accent)/0.12)] text-[hsl(var(--mn-accent))] text-sm">
                      {user?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-[hsl(var(--mn-muted))]">
                    {user?.full_name || 'Uživatel'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('MyProfile')} className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Můj profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('AccountSettings')} className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Nastavení účtu
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('AICredits')} className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    AI Kredity & Billing
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-[hsl(var(--mn-danger))]">
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
