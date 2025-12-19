import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  User,
  Package,
  Plus,
  Minus,
  Trash2,
  QrCode,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { driversAPI, itemsAPI, transactionsAPI } from '../lib/api';
import { mn } from '../lib/i18n';
import type { Driver, PPEItem } from '../types';
import toast from 'react-hot-toast';
import QRScanner from '../components/QRScanner';

interface SelectedItem {
  item: PPEItem;
  quantity: number;
  condition: string;
  // Early issue fields
  isEarlyIssue?: boolean;
  daysRemaining?: number;
  lastIssuedDate?: string;
  earlyIssueReason?: string | null;
  earlyIssueNote?: string;
}

export default function IssuePPEPage() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [items, setItems] = useState<PPEItem[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [driverSearch, setDriverSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [driversRes, itemsRes] = await Promise.all([
        driversAPI.getAll({ isActive: true }),
        itemsAPI.getAll(),
      ]);
      setDrivers(driversRes.data);
      setItems(itemsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    }
  };

  const handleAddItem = (item: PPEItem) => {
    if (item.quantity === 0) {
      toast.error('This item is out of stock');
      return;
    }

    const existing = selectedItems.find((s) => s.item._id === item._id);
    if (existing) {
      if (existing.quantity >= item.quantity) {
        toast.error('Cannot add more than available stock');
        return;
      }
      setSelectedItems(
        selectedItems.map((s) =>
          s.item._id === item._id ? { ...s, quantity: s.quantity + 1 } : s
        )
      );
    } else {
      // Check if this item has usage period restriction
      let isEarlyIssue = false;
      let daysRemaining = 0;
      let lastIssuedDate = '';

      if (selectedDriver && item.usageDays && item.usageDays > 0) {
        // Find if driver was issued this item before
        const driverIssuedItem = selectedDriver.currentlyIssuedItems?.find(
          (i) => typeof i.item === 'object' && (i.item as PPEItem)._id === item._id
        );

        if (driverIssuedItem && driverIssuedItem.issuedDate) {
          const issuedDate = new Date(driverIssuedItem.issuedDate);
          const now = new Date();
          const daysPassed = Math.floor((now.getTime() - issuedDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysPassed < item.usageDays) {
            isEarlyIssue = true;
            daysRemaining = item.usageDays - daysPassed;
            lastIssuedDate = issuedDate.toLocaleDateString('mn-MN');
          }
        }
      }

      setSelectedItems([
        ...selectedItems, 
        { 
          item, 
          quantity: 1, 
          condition: 'new',
          isEarlyIssue,
          daysRemaining,
          lastIssuedDate,
          earlyIssueReason: isEarlyIssue ? null : undefined,
          earlyIssueNote: '',
        }
      ]);

      if (isEarlyIssue) {
        toast(`${mn.issue.earlyIssueWarning} ${daysRemaining} ${mn.issue.daysRemaining}`, { icon: '⚠️' });
      }
    }
    setItemSearch('');
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter((s) => s.item._id !== itemId));
  };

  const handleQuantityChange = (itemId: string, delta: number) => {
    setSelectedItems(
      selectedItems.map((s) => {
        if (s.item._id === itemId) {
          const newQty = Math.max(1, Math.min(s.item.quantity, s.quantity + delta));
          return { ...s, quantity: newQty };
        }
        return s;
      })
    );
  };

  const handleConditionChange = (itemId: string, condition: string) => {
    setSelectedItems(
      selectedItems.map((s) => (s.item._id === itemId ? { ...s, condition } : s))
    );
  };

  const handleEarlyIssueReasonChange = (itemId: string, reason: string) => {
    setSelectedItems(
      selectedItems.map((s) => (s.item._id === itemId ? { ...s, earlyIssueReason: reason } : s))
    );
  };

  const handleEarlyIssueNoteChange = (itemId: string, note: string) => {
    setSelectedItems(
      selectedItems.map((s) => (s.item._id === itemId ? { ...s, earlyIssueNote: note } : s))
    );
  };

  const handleScanResult = async (barcode: string) => {
    setShowScanner(false);
    try {
      const response = await itemsAPI.getByBarcode(barcode);
      handleAddItem(response.data);
      toast.success(`Added: ${response.data.name}`);
    } catch (error) {
      toast.error('Item not found with this barcode');
    }
  };

  const handleSubmit = async () => {
    if (!selectedDriver) {
      toast.error('Please select a driver');
      return;
    }
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item');
      return;
    }

    // Check if all early issue items have a reason selected
    const earlyIssueWithoutReason = selectedItems.find(
      (s) => s.isEarlyIssue && !s.earlyIssueReason
    );
    if (earlyIssueWithoutReason) {
      toast.error(`${earlyIssueWithoutReason.item.name}: ${mn.issue.selectReason}`);
      return;
    }

    setIsLoading(true);
    try {
      const response = await transactionsAPI.issue({
        driverId: selectedDriver._id,
        items: selectedItems.map((s) => ({
          itemId: s.item._id,
          quantity: s.quantity,
          condition: s.condition,
          earlyIssueReason: s.isEarlyIssue ? s.earlyIssueReason : null,
          earlyIssueNote: s.isEarlyIssue ? s.earlyIssueNote : '',
        })),
        notes,
      });

      toast.success(mn.issue.issueSuccess);

      // Show low stock alerts if any
      if (response.data.lowStockAlerts?.length > 0) {
        response.data.lowStockAlerts.forEach((alert: any) => {
          toast(
            `${mn.dashboard.lowStock}: ${alert.name} (${alert.currentQuantity} ${mn.dashboard.lowStockAlerts})`,
            { icon: '⚠️', duration: 5000 }
          );
        });
      }

      navigate('/history');
    } catch (error: any) {
      toast.error(error.response?.data?.message || mn.issue.issueError);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDrivers = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
      d.employeeId.toLowerCase().includes(driverSearch.toLowerCase())
  );

  const filteredItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      i.barcode?.toLowerCase().includes(itemSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{mn.issue.title}</h1>
          <p className="text-gray-500">{mn.nav.issuePPE}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Driver Selection */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              {mn.issue.selectDriver}
            </h2>

            <input
              type="text"
              value={driverSearch}
              onChange={(e) => setDriverSearch(e.target.value)}
              placeholder={`${mn.app.search}...`}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
            />

            {selectedDriver ? (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-full overflow-hidden flex items-center justify-center">
                    {selectedDriver.photo ? (
                      <img
                        src={selectedDriver.photo}
                        alt={selectedDriver.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-bold text-gray-400">
                        {selectedDriver.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{selectedDriver.name}</p>
                    <p className="text-sm text-gray-500">{selectedDriver.employeeId}</p>
                  </div>
                  <button
                    onClick={() => setSelectedDriver(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredDrivers.map((driver) => (
                  <button
                    key={driver._id}
                    onClick={() => setSelectedDriver(driver)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center">
                      {driver.photo ? (
                        <img
                          src={driver.photo}
                          alt={driver.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-bold text-gray-400">
                          {driver.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{driver.name}</p>
                      <p className="text-xs text-gray-500">{driver.employeeId}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Middle Column - Item Selection */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-green-500" />
              {mn.issue.selectItem}
            </h2>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder={`${mn.app.search}...`}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={() => setShowScanner(true)}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                title={mn.issue.scanQR}
              >
                <QrCode className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredItems.map((item) => (
                <button
                  key={item._id}
                  onClick={() => handleAddItem(item)}
                  disabled={item.quantity === 0}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    {item.photo ? (
                      <img
                        src={item.photo}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.type} {item.size && `• ${item.size}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-medium ${
                        item.isLowStock ? 'text-red-600' : 'text-gray-900'
                      }`}
                    >
                      {item.quantity}
                    </p>
                    <p className="text-xs text-gray-500">{mn.inventory.inStock}</p>
                  </div>
                  {item.isLowStock && (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Selected Items & Submit */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {mn.issue.issuePPE} ({selectedItems.length})
            </h2>

            {selectedItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>{mn.app.noData}</p>
                <p className="text-sm">{mn.issue.scanQR}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedItems.map((selected) => (
                  <div
                    key={selected.item._id}
                    className={`p-4 rounded-lg ${
                      selected.isEarlyIssue ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-white rounded-lg overflow-hidden flex items-center justify-center">
                        {selected.item.photo ? (
                          <img
                            src={selected.item.photo}
                            alt={selected.item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">
                          {selected.item.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {mn.issue.availableQty}: {selected.item.quantity}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(selected.item._id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Early Issue Warning */}
                    {selected.isEarlyIssue && (
                      <div className="mb-3 p-2 bg-amber-100 rounded-lg">
                        <div className="flex items-center gap-2 text-amber-700 text-sm font-medium mb-2">
                          <Clock className="w-4 h-4" />
                          {mn.issue.earlyIssueWarning}
                        </div>
                        <p className="text-xs text-amber-600 mb-2">
                          {mn.issue.lastIssuedDate}: {selected.lastIssuedDate} • {selected.daysRemaining} {mn.issue.daysRemaining}
                        </p>
                        <select
                          value={selected.earlyIssueReason || ''}
                          onChange={(e) => handleEarlyIssueReasonChange(selected.item._id, e.target.value)}
                          className={`w-full text-sm px-2 py-1 border rounded mb-2 ${
                            !selected.earlyIssueReason ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          required
                        >
                          <option value="">{mn.issue.selectReason}</option>
                          <option value="lost">{mn.issue.reasonLost}</option>
                          <option value="damaged">{mn.issue.reasonDamaged}</option>
                          <option value="not_suitable">{mn.issue.reasonNotSuitable}</option>
                          <option value="other">{mn.issue.reasonOther}</option>
                        </select>
                        <input
                          type="text"
                          value={selected.earlyIssueNote || ''}
                          onChange={(e) => handleEarlyIssueNoteChange(selected.item._id, e.target.value)}
                          placeholder={mn.issue.earlyIssueNote}
                          className="w-full text-sm px-2 py-1 border border-gray-300 rounded"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuantityChange(selected.item._id, -1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-medium">
                          {selected.quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(selected.item._id, 1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <select
                        value={selected.condition}
                        onChange={(e) =>
                          handleConditionChange(selected.item._id, e.target.value)
                        }
                        className="text-sm px-2 py-1 border border-gray-300 rounded"
                      >
                        <option value="new">{mn.issue.conditionNew}</option>
                        <option value="good">{mn.issue.conditionGood}</option>
                        <option value="fair">{mn.issue.conditionFair}</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {mn.issue.notes}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`${mn.issue.notes}...`}
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={isLoading || !selectedDriver || selectedItems.length === 0}
              className="w-full mt-4 inline-flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {mn.app.loading}
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  {mn.issue.issuePPE}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          onScan={handleScanResult}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
