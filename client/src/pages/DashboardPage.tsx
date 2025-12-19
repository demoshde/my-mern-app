import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Users,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  ClipboardList,
  RotateCcw,
  ShoppingCart,
} from 'lucide-react';
import { reportsAPI, ordersAPI } from '../lib/api';
import { useAlertsStore } from '../lib/store';
import { mn } from '../lib/i18n';
import type { DashboardStats, LowStockAlert } from '../types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [pendingQuantities, setPendingQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const setLowStockCount = useAlertsStore((state) => state.setLowStockCount);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, alertsRes, pendingRes] = await Promise.all([
          reportsAPI.getDashboard(),
          reportsAPI.getLowStockAlerts(),
          ordersAPI.getPendingQuantities(),
        ]);
        setStats(statsRes.data);
        setAlerts(alertsRes.data);
        setPendingQuantities(pendingRes.data);
        setLowStockCount(alertsRes.data.length);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [setLowStockCount]);

  // Calculate total pending orders
  const totalPendingItems = Object.values(pendingQuantities).reduce((sum, qty) => sum + qty, 0);
  const itemsWithPendingOrders = Object.keys(pendingQuantities).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: mn.dashboard.totalItems,
      value: stats?.totalItems || 0,
      icon: Package,
      color: 'bg-blue-500',
      link: '/inventory',
    },
    {
      title: mn.dashboard.totalDrivers,
      value: stats?.totalDrivers || 0,
      icon: Users,
      color: 'bg-green-500',
      link: '/drivers',
    },
    {
      title: mn.dashboard.lowStockAlerts,
      value: stats?.lowStockItems || 0,
      icon: AlertTriangle,
      color: stats?.lowStockItems ? 'bg-red-500' : 'bg-gray-500',
      link: '/inventory?lowStock=true',
    },
    {
      title: mn.orders.pendingOrders,
      value: totalPendingItems,
      subtitle: `${itemsWithPendingOrders} ${mn.issue.items}`,
      icon: ShoppingCart,
      color: totalPendingItems > 0 ? 'bg-orange-500' : 'bg-gray-500',
      link: '/orders',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{mn.nav.dashboard}</h1>
          <p className="text-gray-500">{mn.dashboard.welcome}, {mn.app.title}</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/issue"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ClipboardList className="w-5 h-5" />
            {mn.nav.issuePPE}
          </Link>
          <Link
            to="/return"
            className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            {mn.nav.returnPPE}
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link
            key={card.title}
            to={card.link}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
                {card.subtitle && (
                  <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
                )}
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{mn.dashboard.lowStockAlerts}</h2>
              <Link
                to="/inventory?lowStock=true"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
              >
                {mn.dashboard.viewAll}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="p-6">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>{mn.app.noData}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{alert.name}</p>
                      <p className="text-sm text-gray-500">{alert.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-red-600 font-semibold">{alert.currentQuantity} үлдсэн</p>
                      <p className="text-xs text-gray-500">
                        {mn.inventory.minStock}: {alert.threshold}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{mn.dashboard.quickActions}</h2>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            <Link
              to="/inventory/new"
              className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <Package className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm font-medium text-gray-700">{mn.inventory.addItem}</span>
            </Link>
            <Link
              to="/drivers/new"
              className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
            >
              <Users className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm font-medium text-gray-700">{mn.drivers.addDriver}</span>
            </Link>
            <Link
              to="/issue"
              className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
            >
              <ClipboardList className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm font-medium text-gray-700">{mn.nav.issuePPE}</span>
            </Link>
            <Link
              to="/reports"
              className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors"
            >
              <TrendingUp className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm font-medium text-gray-700">{mn.nav.reports}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{mn.reports.stockSummary}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{stats?.totalStock || 0}</p>
            <p className="text-sm text-gray-500">{mn.reports.totalQuantity}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">
              {stats?.itemsCurrentlyIssued || 0}
            </p>
            <p className="text-sm text-gray-500">{mn.dashboard.issued}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">
              {stats?.driversWithIssuedItems || 0}
            </p>
            <p className="text-sm text-gray-500">{mn.nav.drivers}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-600">
              {stats?.todayTransactions || 0}
            </p>
            <p className="text-sm text-gray-500">{mn.dashboard.todayTransactions}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
