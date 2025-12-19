import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, User } from 'lucide-react';
import { driversAPI } from '../lib/api';
import { mn } from '../lib/i18n';
import type { DriverFormData } from '../types';
import toast from 'react-hot-toast';

const defaultFormData: DriverFormData = {
  name: '',
  employeeId: '',
  email: '',
  phone: '',
  photo: '',
  department: '',
};

export default function DriverFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<DriverFormData>(defaultFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEdit);
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    fetchDepartments();
    if (isEdit && id) {
      fetchDriver();
    }
  }, [id]);

  const fetchDriver = async () => {
    try {
      const response = await driversAPI.getById(id!);
      const driver = response.data;
      setFormData({
        name: driver.name,
        employeeId: driver.employeeId,
        email: driver.email || '',
        phone: driver.phone || '',
        photo: driver.photo || '',
        department: driver.department || '',
      });
    } catch (error) {
      toast.error('Failed to fetch driver');
      navigate('/drivers');
    } finally {
      setIsFetching(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await driversAPI.getDepartments();
      setDepartments(response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isEdit) {
        await driversAPI.update(id!, formData);
        toast.success(mn.toast.updateSuccess);
      } else {
        await driversAPI.create(formData);
        toast.success(mn.toast.saveSuccess);
      }
      navigate('/drivers');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save driver');
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

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/drivers')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? mn.drivers.editDriver : mn.drivers.addDriver}
          </h1>
          <p className="text-gray-500">
            {isEdit ? 'Update driver details' : 'Add a new driver/employee'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{mn.drivers.photo}</h2>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center">
              {formData.photo ? (
                <img
                  src={formData.photo}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-gray-300" />
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
                {mn.drivers.photo}
              </label>
              <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 5MB</p>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{mn.drivers.name}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {mn.drivers.name} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={mn.drivers.name}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {mn.drivers.employeeId} *
              </label>
              <input
                type="text"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={mn.drivers.employeeId}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {mn.drivers.department}
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                list="departments"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={mn.drivers.department}
              />
              <datalist id="departments">
                {departments.map((dept) => (
                  <option key={dept} value={dept} />
                ))}
              </datalist>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Холбоо барих</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {mn.drivers.email}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={mn.drivers.email}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {mn.drivers.phone}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={mn.drivers.phone}
              />
            </div>
          </div>
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
                {isEdit ? mn.drivers.editDriver : mn.drivers.addDriver}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/drivers')}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {mn.app.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}
