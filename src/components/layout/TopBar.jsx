import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  Settings, 
  Zap, 
  LogOut,
  ChevronDown 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function TopBar({ user }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
      toast.success('Odhlášen');
    } catch (error) {
      toast.error('Chyba při odhlašování');
      console.error(error);
    }
  };

  return (
    <div className="h-16 border-b bg-[hsl(var(--mn-surface))] flex items-center justify-between px-6">
      {/* Logo / Search */}
      <div className="flex items-center gap-4">
        <Link to="/" className="text-xl font-bold text-teal-600">
          Medverse
        </Link>
        
        <div className="relative">
          <input
            type="search"
            placeholder="Hledat témata..."
            className="w-64 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        {/* Dark Mode Toggle */}
        <button className="p-2 rounded-lg hover:bg-[hsl(var(--mn-surface-2))] dark:hover:bg-[hsl(var(--mn-surface-2))]">
          🌙
        </button>

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-[hsl(var(--mn-surface-2))] dark:hover:bg-[hsl(var(--mn-surface-2))] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-medium">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[hsl(var(--mn-elevated))] rounded-lg shadow-lg border border-[hsl(var(--mn-border))] py-2 z-50">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-[hsl(var(--mn-border))]">
                <p className="font-medium truncate">{user?.email}</p>
                <p className="text-xs text-muted-foreground">Student účet</p>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <UserMenuItem
                  icon={<User className="w-4 h-4" />}
                  label="Můj profil"
                  description="Bio, specializace, zájmy"
                  to="/profile"
                  onClick={() => setUserMenuOpen(false)}
                />
                
                <UserMenuItem
                  icon={<Settings className="w-4 h-4" />}
                  label="Nastavení účtu"
                  description="Zabezpečení, notifikace, GDPR"
                  to="/settings"
                  onClick={() => setUserMenuOpen(false)}
                />
                
                <UserMenuItem
                  icon={<Zap className="w-4 h-4" />}
                  label="AI Kredity & Billing"
                  description="Tokeny, usage, plán"
                  to="/credits"
                  onClick={() => setUserMenuOpen(false)}
                />
              </div>

              {/* Sign Out */}
              <div className="border-t border-[hsl(var(--mn-border))] pt-2">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-[hsl(var(--mn-surface-2))] dark:hover:bg-[hsl(var(--mn-elevated))] transition-colors text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="font-medium">Odhlásit se</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserMenuItem({ icon, label, description, to, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-start gap-3 px-4 py-3 hover:bg-[hsl(var(--mn-surface-2))] dark:hover:bg-[hsl(var(--mn-elevated))] transition-colors"
    >
      <div className="mt-0.5 text-[hsl(var(--mn-muted))]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
    </Link>
  );
}
