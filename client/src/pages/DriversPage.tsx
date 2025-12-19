import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Users,
  Edit,
  Trash2,
  Package,
  Eye,
} from 'lucide-react';
import { driversAPI } from '../lib/api';
import { mn } from '../lib/i18n';
import type { Driver } from '../types';
import toast from 'react-hot-toast';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    fetchDrivers();
    fetchDepartments();
  }, [selectedDepartment]);

  const fetchDrivers = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (selectedDepartment) params.department = selectedDepartment;

      const response = await driversAPI.getAll(params);
      setDrivers(response.data);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast.error('Failed to fetch drivers');
    } finally {
      setIsLoading(false);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDrivers();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`${mn.drivers.deleteConfirm} "${name}"?`)) return;

    try {
      await driversAPI.delete(id);
      toast.success(mn.toast.deleteSuccess);
      fetchDrivers();
    } catch (error: any) {
      // If driver has issued items, ask for force delete
      if (error.response?.data?.hasIssuedItems) {
        const forceDelete = confirm(
          `${error.response.data.message}\n\nОлгосон бараа: ${error.response.data.issuedItemsCount} ширхэг`
        );
        if (forceDelete) {
          try {
            await driversAPI.delete(id, true);
            toast.success(mn.toast.deleteSuccess);
            fetchDrivers();
          } catch (forceError: any) {
            toast.error(forceError.response?.data?.message || 'Жолооч устгахад алдаа гарлаа');
          }
        }
      } else {
        toast.error(error.response?.data?.message || 'Жолооч устгахад алдаа гарлаа');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{mn.nav.drivers}</h1>
          <p className="text-gray-500">{mn.drivers.title}</p>
        </div>
        <Link
          to="/drivers/new"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {mn.drivers.addDriver}
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
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {mn.app.search}
          </button>
        </form>
      </div>

      {/* Drivers Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : drivers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{mn.app.noData}</h3>
          <p className="text-gray-500 mb-6">
            {search || selectedDepartment
              ? 'Try adjusting your filters'
              : 'Get started by adding your first driver'}
          </p>
          <Link
            to="/drivers/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {mn.drivers.addDriver}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((driver) => (
            <div
              key={driver._id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-16 h-16 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                    {driver.photo ? (
                      <img
                        src={driver.photo}
                        alt={driver.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-400">
                        {driver.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{driver.name}</h3>
                    <p className="text-sm text-gray-500">{driver.employeeId}</p>
                    {driver.department && (
                      <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        {driver.department}
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="mt-4 space-y-1 text-sm text-gray-500">
                  {driver.email && <p>{driver.email}</p>}
                  {driver.phone && <p>{driver.phone}</p>}
                </div>

                {/* Issued Items Badge */}
                {driver.currentlyIssuedItems && driver.currentlyIssuedItems.length > 0 && (
                  <div className="mt-4 flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-600">
                      {driver.currentlyIssuedItems.reduce((sum, i) => sum + i.quantity, 0)} {mn.drivers.issuedItems}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center border-t border-gray-100">
                <Link
                  to={`/drivers/${driver._id}`}
                  className="flex-1 inline-flex items-center justify-center gap-1 text-sm text-blue-600 hover:bg-blue-50 py-3 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  {mn.app.edit}
                </Link>
                <Link
                  to={`/drivers/${driver._id}/history`}
                  className="flex-1 inline-flex items-center justify-center gap-1 text-sm text-gray-600 hover:bg-gray-50 py-3 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  {mn.nav.history}
                </Link>
                <button
                  onClick={() => handleDelete(driver._id, driver.name)}
                  className="flex-1 inline-flex items-center justify-center gap-1 text-sm text-red-600 hover:bg-red-50 py-3 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  {mn.app.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
