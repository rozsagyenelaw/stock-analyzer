import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  BookOpen,
  Bell,
  Settings as SettingsIcon,
  Filter,
  Menu,
  X,
  Brain,
  Calendar,
  Activity,
  PieChart,
  BarChart3,
  Sparkles,
  Target,
  User,
  LogOut,
  ChevronDown,
  Star,
  DollarSign,
  Award,
  Shield,
  Lightbulb,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Daily Picks', href: '/daily-picks', icon: Award },
    { name: 'Discover', href: '/discover', icon: Sparkles },
    { name: 'Watchlist', href: '/watchlist', icon: Star },
    { name: 'Screener', href: '/screener', icon: Filter },
    { name: 'Options Ideas', href: '/options-ideas', icon: Target },
    { name: 'Options Flow', href: '/options-flow', icon: Activity },
    { name: 'Trade Ideas', href: '/trade-ideas', icon: DollarSign },
    { name: 'Portfolio', href: '/portfolio', icon: PieChart },
    { name: 'Backtest', href: '/backtest', icon: BarChart3 },
    { name: 'News', href: '/news', icon: TrendingUp },
    { name: 'Economy', href: '/economy', icon: Activity },
    { name: 'Journal', href: '/journal', icon: BookOpen },
    { name: 'Alerts', href: '/alerts', icon: Bell },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  const aiTools = [
    { name: 'Trade Journal AI', href: '/ai/trade-journal', icon: Brain },
    { name: 'Earnings Analyzer', href: '/ai/earnings', icon: Calendar },
    { name: 'Greeks Monitor', href: '/ai/greeks', icon: Activity },
    { name: 'Trade Validator', href: '/trade-validator', icon: Shield },
    { name: 'Trade Comparison', href: '/trade-comparison', icon: BarChart3 },
    { name: 'Smart Alerts', href: '/smart-alerts', icon: Lightbulb },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            {sidebarOpen && (
              <Link to="/" className="flex items-center space-x-2">
                <TrendingUp className="w-8 h-8 text-primary-600" />
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  Stock Analyzer
                </span>
              </Link>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    active
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="font-medium">{item.name}</span>}
                </Link>
              );
            })}

            {/* AI Tools Section */}
            {sidebarOpen && (
              <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="px-3 mb-2">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    AI Tools
                  </h3>
                </div>
              </div>
            )}

            {aiTools.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    active
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="font-medium">{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* User Menu */}
          {isAuthenticated && user && (
            <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700">
              {sidebarOpen ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 font-semibold">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium truncate">{user.username}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                      <Link
                        to="/settings"
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Login Button for non-authenticated users */}
          {!isAuthenticated && sidebarOpen && (
            <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700">
              <Link
                to="/login"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                <User className="w-4 h-4" />
                Sign In
              </Link>
            </div>
          )}

          {/* Disclaimer */}
          {sidebarOpen && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This tool is for informational purposes only and does not constitute financial
                advice.
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
