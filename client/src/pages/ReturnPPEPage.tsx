import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RotateCcw,
  User,
  Package,
  Plus,
  Minus,
  Trash2,
  QrCode,
} from 'lucide-react';
import { driversAPI, transactionsAPI } from '../lib/api';
import type { Driver, PPEItem } from '../types';
import toast from 'react-hot-toast';
import QRScanner from '../components/QRScanner';
import { mn } from '../lib/i18n';

interface SelectedItem {
  item: PPEItem;
  quantity: number;
  maxQuantity: number;
  condition: string;
}

export default function ReturnPPEPage() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [driverSearch, setDriverSearch] = useState('');

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await driversAPI.getAll({ isActive: true });
      // Filter drivers who have issued items
      const driversWithItems = response.data.filter(
        (d: Driver) => d.currentlyIssuedItems && d.currentlyIssuedItems.length > 0
      );
      setDrivers(driversWithItems);
    } catch (error) {
      toast.error('Failed to fetch drivers');
    }
  };

  const handleSelectDriver = async (driver: Driver) => {
    try {
      const response = await driversAPI.getById(driver._id);
      setSelectedDriver(response.data);
      setSelectedItems([]);
    } catch (error) {
      toast.error('Failed to fetch driver details');
    }
  };

  const handleAddItem = (issuedItem: any) => {
    const item = issuedItem.item as PPEItem;
    const existing = selectedItems.find((s) => s.item._id === item._id);
    
    if (existing) {
      if (existing.quantity >= existing.maxQuantity) {
        toast.error('Cannot return more than issued quantity');
        return;
      }
      setSelectedItems(
        selectedItems.map((s) =>
          s.item._id === item._id ? { ...s, quantity: s.quantity + 1 } : s
        )
      );
    } else {
      setSelectedItems([
        ...selectedItems,
        { item, quantity: 1, maxQuantity: issuedItem.quantity, condition: 'good' },
      ]);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter((s) => s.item._id !== itemId));
  };

  const handleQuantityChange = (itemId: string, delta: number) => {
    setSelectedItems(
      selectedItems.map((s) => {
        if (s.item._id === itemId) {
          const newQty = Math.max(1, Math.min(s.maxQuantity, s.quantity + delta));
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

  const handleScanResult = async (barcode: string) => {
    setShowScanner(false);
    
    if (!selectedDriver) {
      toast.error('Please select a driver first');
      return;
    }

    const issuedItem = selectedDriver.currentlyIssuedItems.find(
      (i) => typeof i.item === 'object' && (i.item as PPEItem).barcode === barcode
    );

    if (issuedItem) {
      handleAddItem(issuedItem);
      toast.success(`Added: ${(issuedItem.item as PPEItem).name}`);
    } else {
      toast.error('This item is not issued to the selected driver');
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

    setIsLoading(true);
    try {
      await transactionsAPI.return({
        driverId: selectedDriver._id,
        items: selectedItems.map((s) => ({
          itemId: s.item._id,
          quantity: s.quantity,
          condition: s.condition,
        })),
        notes,
      });

      toast.success(mn.return.returnSuccess);
      navigate('/history');
    } catch (error: any) {
      toast.error(error.response?.data?.message || mn.return.returnError);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDrivers = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
      d.employeeId.toLowerCase().includes(driverSearch.toLowerCase())
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
          <h1 className="text-2xl font-bold text-gray-900">{mn.return.title}</h1>
          <p className="text-gray-500">{mn.nav.returnPPE}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Driver Selection */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              {mn.return.selectDriver}
            </h2>

            <input
              type="text"
              value={driverSearch}
              onChange={(e) => setDriverSearch(e.target.value)}
              placeholder={`${mn.app.search}...`}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
            />

            {selectedDriver ? (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
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
                    onClick={() => {
                      setSelectedDriver(null);
                      setSelectedItems([]);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : drivers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>{mn.drivers.noIssuedItems}</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredDrivers.map((driver) => (
                  <button
                    key={driver._id}
                    onClick={() => handleSelectDriver(driver)}
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
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{driver.name}</p>
                      <p className="text-xs text-gray-500">{driver.employeeId}</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      {driver.currentlyIssuedItems?.reduce((sum, i) => sum + i.quantity, 0) || 0} {mn.drivers.issuedItems}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Middle Column - Issued Items */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-green-500" />
                {mn.drivers.issuedItems}
              </h2>
              {selectedDriver && (
                <button
                  onClick={() => setShowScanner(true)}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center gap-1"
                >
                  <QrCode className="w-4 h-4" />
                  {mn.issue.scanQR}
                </button>
              )}
            </div>

            {!selectedDriver ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>{mn.return.selectDriver}</p>
              </div>
            ) : selectedDriver.currentlyIssuedItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>{mn.drivers.noIssuedItems}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDriver.currentlyIssuedItems.map((issuedItem, index) => {
                  const item = issuedItem.item as PPEItem;
                  const isSelected = selectedItems.some((s) => s.item._id === item._id);
                  
                  return (
                    <button
                      key={index}
                      onClick={() => !isSelected && handleAddItem(issuedItem)}
                      disabled={isSelected}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                        isSelected
                          ? 'bg-green-50 border border-green-200'
                          : 'hover:bg-gray-50'
                      }`}
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
                          {mn.issue.quantity}: {issuedItem.quantity}
                        </p>
                      </div>
                      {isSelected && (
                        <span className="text-xs text-green-600 font-medium">{mn.app.confirm}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Selected Items & Submit */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {mn.return.returnPPE} ({selectedItems.length})
            </h2>

            {selectedItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>{mn.app.noData}</p>
                <p className="text-sm">{mn.return.selectItem}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedItems.map((selected) => (
                  <div
                    key={selected.item._id}
                    className="p-4 bg-gray-50 rounded-lg"
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
                          {mn.return.issuedQty}: {selected.maxQuantity}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(selected.item._id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

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
                        <option value="good">{mn.issue.conditionGood}</option>
                        <option value="fair">{mn.issue.conditionFair}</option>
                        <option value="poor">{mn.issue.conditionPoor}</option>
                        <option value="damaged">{mn.issue.conditionPoor}</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {mn.return.notes}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`${mn.return.notes}...`}
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={isLoading || !selectedDriver || selectedItems.length === 0}
              className="w-full mt-4 inline-flex items-center justify-center gap-2 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {mn.app.loading}
                </>
              ) : (
                <>
                  <RotateCcw className="w-5 h-5" />
                  {mn.return.returnPPE}
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
