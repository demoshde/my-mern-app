import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  ClipboardList,
  RotateCcw,
  History,
  BarChart3,
  AlertTriangle,
  Menu,
  X,
  LogOut,
  User,
  Bell,
  UserCog,
  ShoppingCart,
} from 'lucide-react';
import { useAuthStore, useAlertsStore } from '../lib/store';
import { reportsAPI } from '../lib/api';
import { mn } from '../lib/i18n';

const navigation = [
  { name: mn.nav.dashboard, href: '/', icon: LayoutDashboard },
  { name: mn.nav.inventory, href: '/inventory', icon: Package },
  { name: mn.nav.drivers, href: '/drivers', icon: Users },
  { name: mn.nav.issuePPE, href: '/issue', icon: ClipboardList },
  { name: mn.nav.returnPPE, href: '/return', icon: RotateCcw },
  { name: mn.nav.history, href: '/history', icon: History },
  { name: mn.nav.reports, href: '/reports', icon: BarChart3 },
  { name: mn.nav.orders, href: '/orders', icon: ShoppingCart },
  { name: mn.nav.users, href: '/users', icon: UserCog },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { lowStockCount, setLowStockCount } = useAlertsStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Fetch low stock count on mount and periodically
    const fetchAlerts = async () => {
      try {
        const response = await reportsAPI.getLowStockAlerts();
        setLowStockCount(response.data.length);
      } catch (error) {
        console.error('Failed to fetch alerts');
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000); // Every minute
    return () => clearInterval(interval);
  }, [setLowStockCount]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-gray-200 z-50 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">{mn.app.title}</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive =
              item.href === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Low Stock Alert */}
        {lowStockCount > 0 && (
          <div className="mx-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <Link
              to="/inventory?lowStock=true"
              className="flex items-center gap-2 text-red-700"
              onClick={() => setSidebarOpen(false)}
            >
              <AlertTriangle className="w-5 h-5" />
              <div>
                <p className="font-medium">{lowStockCount} {mn.dashboard.lowStock}</p>
                <p className="text-xs text-red-600">{mn.dashboard.viewAll}</p>
              </div>
            </Link>
          </div>
        )}

        {/* User */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 text-sm">{user?.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
              title={mn.nav.logout}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 lg:ml-0" />

          {/* Notifications */}
          <Link
            to="/inventory?lowStock=true"
            className="relative p-2 hover:bg-gray-100 rounded-lg"
          >
            <Bell className="w-5 h-5 text-gray-500" />
            {lowStockCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {lowStockCount}
              </span>
            )}
          </Link>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
