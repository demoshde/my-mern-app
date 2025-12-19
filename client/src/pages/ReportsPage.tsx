import { useEffect, useState } from 'react';
import {
  Download,
  Package,
  Users,
  TrendingUp,
  AlertTriangle,
  ShoppingCart,
} from 'lucide-react';
import { reportsAPI, ordersAPI } from '../lib/api';
import { mn } from '../lib/i18n';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [stockReport, setStockReport] = useState<any[]>([]);
  const [itemsPerDriver, setItemsPerDriver] = useState<any[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [pendingQuantities, setPendingQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stock');
  const [exportDateRange, setExportDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const [stockRes, itemsRes, alertsRes, pendingRes] = await Promise.all([
        reportsAPI.getStock(),
        reportsAPI.getItemsPerDriver(),
        reportsAPI.getLowStockAlerts(),
        ordersAPI.getPendingQuantities(),
      ]);
      setStockReport(stockRes.data);
      setItemsPerDriver(itemsRes.data);
      setLowStockAlerts(alertsRes.data);
      setPendingQuantities(pendingRes.data);
    } catch (error) {
      toast.error('Failed to fetch reports');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (type: string) => {
    try {
      let response;
      let filename;

      switch (type) {
        case 'stock':
          response = await reportsAPI.exportStock();
          filename = 'stock-report.csv';
          break;
        case 'items-per-driver':
          response = await reportsAPI.exportItemsPerDriver();
          filename = 'items-per-driver.csv';
          break;
        case 'transactions':
          response = await reportsAPI.exportTransactions({
            startDate: exportDateRange.startDate,
            endDate: exportDateRange.endDate,
          });
          filename = 'transaction-history.csv';
          break;
        default:
          return;
      }

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success('Report downloaded successfully');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const tabs = [
    { id: 'stock', label: mn.reports.stockSummary, icon: Package },
    { id: 'drivers', label: mn.reports.driverInventory, icon: Users },
    { id: 'alerts', label: mn.dashboard.lowStockAlerts, icon: AlertTriangle },
    { id: 'export', label: mn.reports.exportCSV, icon: Download },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{mn.nav.reports}</h1>
        <p className="text-gray-500">{mn.reports.title}</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Stock Report Tab */}
              {activeTab === 'stock' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">{mn.reports.stockSummary}</h2>
                    <button
                      onClick={() => handleExport('stock')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      {mn.reports.exportCSV}
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            {mn.inventory.itemName}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            {mn.inventory.category}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            {mn.inventory.size}
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            {mn.inventory.quantity}
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            {mn.orders.pendingOrders}
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            {mn.inventory.minStock}
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            {mn.drivers.status}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {stockReport.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {item.name}
                            </td>
                            <td className="px-4 py-3 text-gray-500">{item.type || '-'}</td>
                            <td className="px-4 py-3 text-gray-500">{item.size || '-'}</td>
                            <td
                              className={`px-4 py-3 text-right font-medium ${
                                item.isLowStock ? 'text-red-600' : 'text-gray-900'
                              }`}
                            >
                              {item.quantity}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {pendingQuantities[item.id] > 0 ? (
                                <span className="inline-flex items-center gap-1 text-orange-600 font-medium">
                                  <ShoppingCart className="w-3 h-3" />
                                  {pendingQuantities[item.id]}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-500">
                              {item.lowStockThreshold}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {item.isLowStock ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                  <AlertTriangle className="w-3 h-3" />
                                  {mn.dashboard.lowStock}
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                  {mn.inventory.inStock}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Items per Driver Tab */}
              {activeTab === 'drivers' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">{mn.reports.itemsPerDriver}</h2>
                    <button
                      onClick={() => handleExport('items-per-driver')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      {mn.reports.exportCSV}
                    </button>
                  </div>

                  {itemsPerDriver.filter((d) => d.totalItems > 0).length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>{mn.reports.noItemsIssued}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {itemsPerDriver
                        .filter((d) => d.totalItems > 0)
                        .map((driver) => (
                          <div
                            key={driver.driverId}
                            className="border border-gray-200 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h3 className="font-medium text-gray-900">{driver.name}</h3>
                                <p className="text-sm text-gray-500">
                                {driver.employeeId} • {driver.department || mn.drivers.department}
                                </p>
                              </div>
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                {driver.totalItems} {mn.issue.items}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {driver.items.map((item: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded"
                                >
                                  <span className="text-sm text-gray-700">{item.name}</span>
                                  <span className="text-sm font-medium text-gray-900">
                                    ×{item.quantity}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Low Stock Alerts Tab */}
              {activeTab === 'alerts' && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">{mn.reports.lowStockAlerts}</h2>

                  {lowStockAlerts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>{mn.reports.noAlerts}</p>
                      <p className="text-sm">{mn.reports.allItemsAboveThreshold}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {lowStockAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                              <AlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{alert.name}</p>
                              <p className="text-sm text-gray-500">{alert.type}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-red-600">
                              {alert.currentQuantity}
                            </p>
                            <p className="text-xs text-gray-500">
                              {mn.inventory.minStock}: {alert.threshold}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Export Tab */}
              {activeTab === 'export' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900">{mn.reports.exportReports}</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Package className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{mn.reports.stockSummary}</h3>
                          <p className="text-sm text-gray-500">
                            {mn.reports.currentStockDesc}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleExport('stock')}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        {mn.reports.downloadCSV}
                      </button>
                    </div>

                    <div className="p-6 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Users className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{mn.reports.itemsPerDriver}</h3>
                          <p className="text-sm text-gray-500">
                            {mn.reports.itemsPerDriverDesc}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleExport('items-per-driver')}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        {mn.reports.downloadCSV}
                      </button>
                    </div>

                    <div className="p-6 border border-gray-200 rounded-lg md:col-span-2">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <TrendingUp className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{mn.reports.transactionHistory}</h3>
                          <p className="text-sm text-gray-500">
                            {mn.reports.transactionHistoryDesc}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {mn.reports.startDate}
                          </label>
                          <input
                            type="date"
                            value={exportDateRange.startDate}
                            onChange={(e) =>
                              setExportDateRange({
                                ...exportDateRange,
                                startDate: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {mn.reports.endDate}
                          </label>
                          <input
                            type="date"
                            value={exportDateRange.endDate}
                            onChange={(e) =>
                              setExportDateRange({
                                ...exportDateRange,
                                endDate: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleExport('transactions')}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        {mn.reports.downloadCSV}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
