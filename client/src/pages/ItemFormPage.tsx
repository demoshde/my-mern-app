import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Package, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { itemsAPI, ordersAPI } from '../lib/api';
import { mn } from '../lib/i18n';
import type { PPEItemFormData } from '../types';
import toast from 'react-hot-toast';

const defaultFormData: PPEItemFormData = {
  name: '',
  description: '',
  photo: '',
  quantity: 0,
  lowStockThreshold: 10,
  size: '',
  type: '',
  expiryDate: '',
  usageDays: 0,
  customFields: [],
  barcode: '',
};

export default function ItemFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<PPEItemFormData>(defaultFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEdit);
  const [pendingQuantity, setPendingQuantity] = useState(0);

  useEffect(() => {
    if (isEdit && id) {
      fetchItem();
      fetchPendingQuantity();
    }
  }, [id]);

  const fetchItem = async () => {
    try {
      const response = await itemsAPI.getById(id!);
      const item = response.data;
      setFormData({
        name: item.name,
        description: item.description || '',
        photo: item.photo || '',
        quantity: item.quantity,
        lowStockThreshold: item.lowStockThreshold,
        size: item.size || '',
        type: item.type || '',
        expiryDate: item.expiryDate ? item.expiryDate.split('T')[0] : '',
        usageDays: item.usageDays || 0,
        customFields: item.customFields || [],
        barcode: item.barcode || '',
      });
    } catch (error) {
      toast.error('Failed to fetch item');
      navigate('/inventory');
    } finally {
      setIsFetching(false);
    }
  };

  const fetchPendingQuantity = async () => {
    try {
      const response = await ordersAPI.getPendingForItem(id!);
      setPendingQuantity(response.data.pendingQuantity || 0);
    } catch (error) {
      console.error('Error fetching pending quantity:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isEdit) {
        await itemsAPI.update(id!, formData);
        toast.success(mn.toast.updateSuccess);
      } else {
        await itemsAPI.create(formData);
        toast.success(mn.toast.saveSuccess);
      }
      navigate('/inventory');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save item');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const addCustomField = () => {
    setFormData({
      ...formData,
      customFields: [...(formData.customFields || []), { fieldName: '', fieldValue: '' }],
    });
  };

  const updateCustomField = (index: number, field: 'fieldName' | 'fieldValue', value: string) => {
    const updated = [...(formData.customFields || [])];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, customFields: updated });
  };

  const removeCustomField = (index: number) => {
    const updated = (formData.customFields || []).filter((_, i) => i !== index);
    setFormData({ ...formData, customFields: updated });
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/inventory')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? mn.inventory.editItem : mn.inventory.addItem}
          </h1>
          <p className="text-gray-500">
            {isEdit ? 'Update item details' : 'Add a new item to your inventory'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{mn.inventory.photo}</h2>
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
              {formData.photo ? (
                <img
                  src={formData.photo}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-12 h-12 text-gray-300" />
              )}
            </div>
            <div>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                {mn.inventory.photo}
              </label>
              <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 5MB</p>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{mn.inventory.itemName}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {mn.inventory.itemName} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={mn.inventory.itemName}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {mn.inventory.description}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={mn.inventory.description}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {mn.inventory.category}
              </label>
              <input
                type="text"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={mn.inventory.category}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {mn.inventory.size}
              </label>
              <input
                type="text"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={mn.inventory.size}
              />
            </div>
          </div>
        </div>

        {/* Stock Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{mn.reports.stockSummary}</h2>
          
          {/* Pending Orders Info */}
          {isEdit && pendingQuantity > 0 && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-3">
              <ShoppingCart className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-orange-800">
                  {mn.orders.pendingOrders}: <span className="font-bold">{pendingQuantity}</span> {mn.orders.pendingOrdersHint}
                </p>
                <p className="text-xs text-orange-600">
                  Давхар захиалга үүсгэхээс өмнө анхаарна уу
                </p>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {mn.inventory.quantity} *
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {mn.inventory.minStock}
              </label>
              <input
                type="number"
                value={formData.lowStockThreshold}
                onChange={(e) =>
                  setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) || 0 })
                }
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {mn.inventory.usageDays}
              </label>
              <input
                type="number"
                value={formData.usageDays || 0}
                onChange={(e) =>
                  setFormData({ ...formData, usageDays: parseInt(e.target.value) || 0 })
                }
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">{mn.inventory.usageDaysHint}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дуусах огноо
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Barcode */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{mn.inventory.barcode} / {mn.inventory.qrCode}</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {mn.inventory.barcode}
            </label>
            <input
              type="text"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Автоматаар үүсгэхийн тулд хоосон орхино уу"
            />
          </div>
        </div>

        {/* Custom Fields */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{mn.inventory.customFields}</h2>
            <button
              type="button"
              onClick={addCustomField}
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4" />
              {mn.inventory.addField}
            </button>
          </div>
          {formData.customFields && formData.customFields.length > 0 ? (
            <div className="space-y-3">
              {formData.customFields.map((field, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={field.fieldName}
                    onChange={(e) => updateCustomField(index, 'fieldName', e.target.value)}
                    placeholder={mn.inventory.fieldName}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={field.fieldValue}
                    onChange={(e) => updateCustomField(index, 'fieldValue', e.target.value)}
                    placeholder={mn.inventory.fieldValue}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeCustomField(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">{mn.app.noData}</p>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                {mn.app.loading}
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {isEdit ? mn.inventory.editItem : mn.inventory.addItem}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/inventory')}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {mn.app.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}
