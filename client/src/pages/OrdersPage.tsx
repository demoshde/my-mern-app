import { useEffect, useState, useRef } from 'react';
import {
  ShoppingCart,
  Plus,
  Minus,
  FileText,
  Trash2,
  Package,
  Search,
  CheckCircle,
  Clock,
  X,
  AlertTriangle,
  Upload,
  PackageCheck,
  File,
  Eye,
  XCircle,
} from 'lucide-react';
import { itemsAPI, ordersAPI } from '../lib/api';
import { mn } from '../lib/i18n';
import type { PPEItem, Order } from '../types';
import toast from 'react-hot-toast';

export default function OrdersPage() {
  const [items, setItems] = useState<PPEItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [search, setSearch] = useState('');
  const [orderItems, setOrderItems] = useState<{ itemId: string; orderQuantity: number }[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Receive modal
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [receiveItems, setReceiveItems] = useState<{ itemId: string; receivedQuantity: number }[]>([]);
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isReceiving, setIsReceiving] = useState(false);
  
  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [itemsRes, ordersRes] = await Promise.all([
        itemsAPI.getAll(),
        ordersAPI.getAll(),
      ]);
      setItems(itemsRes.data);
      setOrders(ordersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Өгөгдөл татахад алдаа гарлаа');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.type?.toLowerCase().includes(search.toLowerCase())
  );

  const addToOrder = (itemId: string) => {
    const existing = orderItems.find((oi) => oi.itemId === itemId);
    if (existing) {
      setOrderItems(
        orderItems.map((oi) =>
          oi.itemId === itemId ? { ...oi, orderQuantity: oi.orderQuantity + 1 } : oi
        )
      );
    } else {
      setOrderItems([...orderItems, { itemId, orderQuantity: 1 }]);
    }
  };

  const removeFromOrder = (itemId: string) => {
    const existing = orderItems.find((oi) => oi.itemId === itemId);
    if (existing && existing.orderQuantity > 1) {
      setOrderItems(
        orderItems.map((oi) =>
          oi.itemId === itemId ? { ...oi, orderQuantity: oi.orderQuantity - 1 } : oi
        )
      );
    } else {
      setOrderItems(orderItems.filter((oi) => oi.itemId !== itemId));
    }
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setOrderItems(orderItems.filter((oi) => oi.itemId !== itemId));
    } else {
      setOrderItems(
        orderItems.map((oi) =>
          oi.itemId === itemId ? { ...oi, orderQuantity: quantity } : oi
        )
      );
    }
  };

  const getOrderQuantity = (itemId: string) => {
    return orderItems.find((oi) => oi.itemId === itemId)?.orderQuantity || 0;
  };

  const handleCreateOrder = async () => {
    if (orderItems.length === 0) {
      toast.error('Захиалах бараа сонгоно уу');
      return;
    }

    setIsSubmitting(true);
    try {
      await ordersAPI.create({ items: orderItems, notes });
      toast.success(mn.orders.createSuccess);
      setOrderItems([]);
      setNotes('');
      fetchData();
      setActiveTab('list');
    } catch (error) {
      toast.error(mn.orders.createError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReceiveModal = (order: Order) => {
    setSelectedOrder(order);
    // Initialize receive items with remaining quantities
    setReceiveItems(
      order.items.map((item) => ({
        itemId: typeof item.item === 'string' ? item.item : item.item._id,
        receivedQuantity: 0,
      }))
    );
    setReceiveDate(new Date().toISOString().split('T')[0]);
    setShowReceiveModal(true);
  };

  const handleReceive = async () => {
    if (!selectedOrder) return;
    
    const itemsToReceive = receiveItems.filter((ri) => ri.receivedQuantity > 0);
    if (itemsToReceive.length === 0) {
      toast.error('Хүлээн авах тоо оруулна уу');
      return;
    }

    setIsReceiving(true);
    try {
      const formData = new FormData();
      formData.append('items', JSON.stringify(itemsToReceive));
      formData.append('receivedAt', receiveDate);
      
      // Add files
      selectedFiles.forEach((file) => {
        formData.append('documents', file);
      });
      
      await ordersAPI.receive(selectedOrder._id, formData);
      toast.success(mn.orders.receiveSuccess);
      setShowReceiveModal(false);
      setSelectedOrder(null);
      setSelectedFiles([]);
      setReceiveItems([]);
      fetchData();
    } catch (error) {
      toast.error(mn.orders.receiveError);
    } finally {
      setIsReceiving(false);
    }
  };

  const updateReceivedQty = (itemId: string, qty: number) => {
    setReceiveItems(
      receiveItems.map((ri) =>
        ri.itemId === itemId ? { ...ri, receivedQuantity: qty } : ri
      )
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles([...selectedFiles, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm(mn.orders.deleteConfirm)) return;

    try {
      await ordersAPI.delete(orderId);
      toast.success(mn.toast.deleteSuccess);
      fetchData();
    } catch (error) {
      toast.error(mn.toast.deleteError);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      await ordersAPI.updateStatus(orderId, status);
      toast.success('Төлөв шинэчлэгдлээ');
      fetchData();
    } catch (error) {
      toast.error('Төлөв шинэчлэхэд алдаа гарлаа');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'partial':
        return 'bg-orange-100 text-orange-800';
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'sent':
        return <Package className="w-4 h-4" />;
      case 'partial':
        return <PackageCheck className="w-4 h-4" />;
      case 'received':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <X className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{mn.orders.title}</h1>
          <p className="text-gray-500">{mn.orders.subtitle}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('create')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'create'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ShoppingCart className="w-5 h-5 inline-block mr-2" />
            {mn.orders.newOrder}
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'list'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="w-5 h-5 inline-block mr-2" />
            {mn.orders.orderHistory} ({orders.length})
          </button>
        </nav>
      </div>

      {activeTab === 'create' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`${mn.app.search}...`}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Low stock items first */}
            {items.filter((i) => i.isLowStock).length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-700 font-medium mb-3">
                  <AlertTriangle className="w-5 h-5" />
                  {mn.orders.lowStockItems}
                </div>
                <div className="space-y-2">
                  {items
                    .filter((i) => i.isLowStock)
                    .map((item) => (
                      <div
                        key={item._id}
                        className="flex items-center justify-between bg-white rounded-lg p-3 border border-red-200"
                      >
                        <div className="flex items-center gap-3">
                          {item.photo ? (
                            <img
                              src={item.photo}
                              alt={item.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <p className="text-sm text-red-600">
                              {mn.orders.currentStock}: {item.quantity} ({mn.inventory.minStock}: {item.lowStockThreshold})
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeFromOrder(item._id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                          >
                            <Minus className="w-5 h-5" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={getOrderQuantity(item._id)}
                            onChange={(e) =>
                              updateQuantity(item._id, parseInt(e.target.value) || 0)
                            }
                            className="w-16 text-center border border-gray-300 rounded py-1"
                          />
                          <button
                            onClick={() => addToOrder(item._id)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* All items */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">{mn.orders.allItems}</h3>
              </div>
              <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                {filteredItems.map((item) => (
                  <div
                    key={item._id}
                    className={`flex items-center justify-between p-4 hover:bg-gray-50 ${
                      item.isLowStock ? 'bg-red-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.photo ? (
                        <img
                          src={item.photo}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>{item.type || '-'}</span>
                          {item.size && (
                            <>
                              <span>•</span>
                              <span>{item.size}</span>
                            </>
                          )}
                        </div>
                        <p
                          className={`text-sm ${
                            item.isLowStock ? 'text-red-600 font-medium' : 'text-gray-500'
                          }`}
                        >
                          {mn.orders.currentStock}: {item.quantity}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removeFromOrder(item._id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={getOrderQuantity(item._id)}
                        onChange={(e) =>
                          updateQuantity(item._id, parseInt(e.target.value) || 0)
                        }
                        className="w-16 text-center border border-gray-300 rounded py-1"
                      />
                      <button
                        onClick={() => addToOrder(item._id)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sticky top-4">
              <h3 className="font-semibold text-gray-900 mb-4">{mn.orders.orderSummary}</h3>

              {orderItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>{mn.orders.emptyOrder}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                    {orderItems.map((oi) => {
                      const item = items.find((i) => i._id === oi.itemId);
                      return (
                        <div
                          key={oi.itemId}
                          className="flex items-center justify-between text-sm"
                        >
                          <div>
                            <p className="font-medium">{item?.name}</p>
                            <p className="text-gray-500">
                              {mn.orders.currentStock}: {item?.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-blue-600">
                              ×{oi.orderQuantity}
                            </span>
                            <button
                              onClick={() =>
                                setOrderItems(orderItems.filter((o) => o.itemId !== oi.itemId))
                              }
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-gray-200 pt-4 mb-4">
                    <p className="text-sm text-gray-600 mb-1">
                      {mn.orders.totalItems}: {orderItems.length}
                    </p>
                    <p className="text-sm text-gray-600">
                      {mn.orders.totalQuantity}:{' '}
                      {orderItems.reduce((sum, oi) => sum + oi.orderQuantity, 0)}
                    </p>
                  </div>
                </>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {mn.orders.notes}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={mn.orders.notesPlaceholder}
                />
              </div>

              <button
                onClick={handleCreateOrder}
                disabled={orderItems.length === 0 || isSubmitting}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                {isSubmitting ? mn.app.loading : mn.orders.createOrder}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Orders List */
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{mn.orders.noOrders}</h3>
              <button
                onClick={() => setActiveTab('create')}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                {mn.orders.newOrder}
              </button>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order._id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{order.orderNumber}</h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {getStatusIcon(order.status)}
                        {mn.orders.status[order.status as keyof typeof mn.orders.status]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(order.createdAt).toLocaleString('mn-MN')} •{' '}
                      {order.createdBy?.fullName || order.createdBy?.username}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(order.status === 'pending' || order.status === 'sent' || order.status === 'partial') && (
                      <button
                        onClick={() => openReceiveModal(order)}
                        className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1"
                      >
                        <PackageCheck className="w-4 h-4" />
                        {mn.orders.receive}
                      </button>
                    )}
                    {order.attachments && order.attachments.length > 0 && (
                      <button
                        onClick={() => {
                          // Toggle attachments view
                          const el = document.getElementById(`attachments-${order._id}`);
                          if (el) el.classList.toggle('hidden');
                        }}
                        className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-1"
                      >
                        <File className="w-4 h-4" />
                        {mn.orders.attachedDocs} ({order.attachments.length})
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteOrder(order._id)}
                      className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Order items */}
                <div className="p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-2">{mn.orders.itemName}</th>
                        <th className="pb-2">{mn.orders.size}</th>
                        <th className="pb-2 text-right">{mn.orders.orderQuantity}</th>
                        <th className="pb-2 text-right">{mn.orders.receivedQuantity}</th>
                        <th className="pb-2 text-right">{mn.orders.remaining}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, idx) => {
                        const remaining = item.orderQuantity - (item.receivedQuantity || 0);
                        return (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="py-2">{item.itemName}</td>
                            <td className="py-2">{item.size || '-'}</td>
                            <td className="py-2 text-right font-semibold text-blue-600">
                              {item.orderQuantity}
                            </td>
                            <td className="py-2 text-right font-semibold text-green-600">
                              {item.receivedQuantity || 0}
                            </td>
                            <td className={`py-2 text-right font-semibold ${remaining > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                              {remaining}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Attachments section */}
                {order.attachments && order.attachments.length > 0 && (
                  <div id={`attachments-${order._id}`} className="hidden p-4 bg-blue-50 border-t border-blue-100">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">{mn.orders.attachedDocs}</h4>
                    <div className="flex flex-wrap gap-2">
                      {order.attachments.map((att, idx) => (
                        <a
                          key={idx}
                          href={att.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                        >
                          <File className="w-4 h-4 text-blue-500" />
                          <span className="max-w-[150px] truncate">{att.originalName}</span>
                          <Eye className="w-4 h-4 text-gray-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status update */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{mn.orders.changeStatus}:</span>
                    <select
                      value={order.status}
                      onChange={(e) => handleUpdateStatus(order._id, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="pending">{mn.orders.status.pending}</option>
                      <option value="sent">{mn.orders.status.sent}</option>
                      <option value="partial">{mn.orders.status.partial}</option>
                      <option value="received">{mn.orders.status.received}</option>
                      <option value="cancelled">{mn.orders.status.cancelled}</option>
                    </select>
                  </div>
                  {order.status === 'received' && order.items.some(i => i.receivedDate) && (
                    <p className="text-sm text-gray-500">
                      <PackageCheck className="w-4 h-4 inline mr-1 text-green-500" />
                      {mn.orders.receivedDate}: {new Date(order.items.find(i => i.receivedDate)?.receivedDate || '').toLocaleString('mn-MN')}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Receive Modal */}
      {showReceiveModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {mn.orders.receiveItems} - {selectedOrder.orderNumber}
              </h3>
              <button
                onClick={() => {
                  setShowReceiveModal(false);
                  setSelectedOrder(null);
                  setReceiveItems([]);
                  setSelectedFiles([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Items to receive */}
            <div className="space-y-3 mb-6">
              <h4 className="text-sm font-medium text-gray-700">{mn.orders.itemsToReceive}</h4>
              {selectedOrder.items.map((item, idx) => {
                const remaining = item.orderQuantity - (item.receivedQuantity || 0);
                const itemId = item.itemId || (typeof item.item === 'string' ? item.item : item.item._id);
                const currentReceive = receiveItems.find(ri => ri.itemId === itemId)?.receivedQuantity || 0;
                if (remaining <= 0) return null;
                return (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.itemName}</p>
                      <p className="text-sm text-gray-500">
                        {mn.orders.orderQuantity}: {item.orderQuantity} | 
                        {mn.orders.receivedQuantity}: {item.receivedQuantity || 0} | 
                        {mn.orders.remaining}: <span className="text-orange-600 font-semibold">{remaining}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">{mn.orders.receiveNow}:</label>
                      <input
                        type="number"
                        min="0"
                        max={remaining}
                        value={currentReceive || ''}
                        onChange={(e) => updateReceivedQty(itemId, parseInt(e.target.value) || 0)}
                        className="w-20 border border-gray-300 rounded px-2 py-1 text-center"
                        placeholder="0"
                      />
                      <button
                        onClick={() => updateReceivedQty(itemId, remaining)}
                        className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        {mn.app.all}
                      </button>
                    </div>
                  </div>
                );
              })}
              {selectedOrder.items.every(item => (item.orderQuantity - (item.receivedQuantity || 0)) <= 0) && (
                <p className="text-center text-green-600 py-4">
                  <PackageCheck className="w-8 h-8 mx-auto mb-2" />
                  {mn.orders.allItemsReceived}
                </p>
              )}
            </div>

            {/* File upload */}
            <div className="border-t border-gray-200 pt-4 mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">{mn.orders.attachDocuments}</h4>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {mn.orders.selectFiles}
                </button>
                <span className="text-sm text-gray-500">
                  PDF, Word, Excel, Images
                </span>
              </div>
              {selectedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <div className="flex items-center gap-2">
                        <File className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button
                        onClick={() => removeFile(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowReceiveModal(false);
                  setSelectedOrder(null);
                  setReceiveItems([]);
                  setSelectedFiles([]);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                {mn.app.cancel}
              </button>
              <button
                onClick={handleReceive}
                disabled={isReceiving || receiveItems.every(ri => !ri.receivedQuantity || ri.receivedQuantity <= 0)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <PackageCheck className="w-4 h-4" />
                {isReceiving ? mn.app.loading : mn.orders.confirmReceive}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
