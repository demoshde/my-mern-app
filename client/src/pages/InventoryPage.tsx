import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Package,
  AlertTriangle,
  Edit,
  QrCode,
  Trash2,
  ShoppingCart,
} from 'lucide-react';
import { itemsAPI, ordersAPI } from '../lib/api';
import { mn } from '../lib/i18n';
import type { PPEItem } from '../types';
import toast from 'react-hot-toast';

export default function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<PPEItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [showLowStock, setShowLowStock] = useState(searchParams.get('lowStock') === 'true');
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || '');
  const [types, setTypes] = useState<string[]>([]);
  const [pendingQuantities, setPendingQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchItems();
    fetchPendingQuantities();
  }, [showLowStock, selectedType]);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (showLowStock) params.lowStock = 'true';
      if (selectedType) params.type = selectedType;

      const response = await itemsAPI.getAll(params);
      setItems(response.data);

      // Extract unique types
      const uniqueTypes = [...new Set(response.data.map((item: PPEItem) => item.type).filter(Boolean))];
      setTypes(uniqueTypes as string[]);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to fetch items');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingQuantities = async () => {
    try {
      const response = await ordersAPI.getPendingQuantities();
      setPendingQuantities(response.data);
    } catch (error) {
      console.error('Error fetching pending quantities:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`${mn.inventory.deleteConfirm} "${name}"?`)) return;

    try {
      await itemsAPI.delete(id);
      toast.success(mn.toast.deleteSuccess);
      fetchItems();
    } catch (error) {
      toast.error(mn.toast.deleteError);
    }
  };

  const toggleLowStock = () => {
    const newValue = !showLowStock;
    setShowLowStock(newValue);
    if (newValue) {
      setSearchParams({ lowStock: 'true' });
    } else {
      searchParams.delete('lowStock');
      setSearchParams(searchParams);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{mn.nav.inventory}</h1>
          <p className="text-gray-500">{mn.inventory.title}</p>
        </div>
        <Link
          to="/inventory/new"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {mn.inventory.addItem}
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`${mn.app.search}...`}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Types</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={toggleLowStock}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showLowStock
                ? 'bg-red-100 border-red-300 text-red-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
            {mn.dashboard.lowStock}
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Filter className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Items Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{mn.app.noData}</h3>
          <p className="text-gray-500 mb-6">
            {search || showLowStock || selectedType
              ? 'Шүүлтүүрээ тохируулна уу'
              : 'Эхний PPE барааг нэмж эхлээрэй'}
          </p>
          <Link
            to="/inventory/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {mn.inventory.addItem}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item._id}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${
                item.isLowStock ? 'border-red-300' : 'border-gray-200'
              }`}
            >
              {/* Image */}
              <div className="aspect-square bg-gray-100 relative">
                {item.photo ? (
                  <img
                    src={item.photo}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-16 h-16 text-gray-300" />
                  </div>
                )}
                {item.isLowStock && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {mn.dashboard.lowStock}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1 truncate">{item.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{item.type || 'Uncategorized'}</p>

                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-500">{mn.inventory.quantity}</p>
                    <p
                      className={`text-lg font-bold ${
                        item.isLowStock ? 'text-red-600' : 'text-gray-900'
                      }`}
                    >
                      {item.quantity}
                    </p>
                  </div>
                  {pendingQuantities[item._id] > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{mn.orders.pendingOrders}</p>
                      <p className="text-sm font-medium text-orange-600 flex items-center gap-1">
                        <ShoppingCart className="w-3 h-3" />
                        {pendingQuantities[item._id]} {mn.orders.pendingOrdersHint}
                      </p>
                    </div>
                  )}
                  {!pendingQuantities[item._id] && item.size && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Size</p>
                      <p className="text-sm font-medium text-gray-700">{item.size}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <Link
                    to={`/inventory/${item._id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1 text-sm text-blue-600 hover:text-blue-700 py-2"
                  >
                    <Edit className="w-4 h-4" />
                    {mn.app.edit}
                  </Link>
                  <Link
                    to={`/inventory/${item._id}/qr`}
                    className="flex-1 inline-flex items-center justify-center gap-1 text-sm text-gray-600 hover:text-gray-700 py-2"
                  >
                    <QrCode className="w-4 h-4" />
                    QR
                  </Link>
                  <button
                    onClick={() => handleDelete(item._id, item.name)}
                    className="flex-1 inline-flex items-center justify-center gap-1 text-sm text-red-600 hover:text-red-700 py-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    {mn.app.delete}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
