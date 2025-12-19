import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, UserCog, Eye, EyeOff } from 'lucide-react';
import { usersAPI } from '../lib/api';
import { mn } from '../lib/i18n';
import type { UserFormData } from '../types';
import toast from 'react-hot-toast';

const defaultFormData: UserFormData = {
  username: '',
  password: '',
  fullName: '',
  position: '',
  role: 'user',
};

export default function UserFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<UserFormData>(defaultFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEdit);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      fetchUser();
    }
  }, [id]);

  const fetchUser = async () => {
    try {
      const response = await usersAPI.getById(id!);
      const user = response.data;
      setFormData({
        username: user.username,
        password: '', // Don't show password
        fullName: user.fullName || '',
        position: user.position || '',
        role: user.role,
      });
    } catch (error) {
      toast.error('Failed to fetch user');
      navigate('/users');
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const dataToSend: any = {
        username: formData.username,
        fullName: formData.fullName,
        position: formData.position,
        role: formData.role,
      };

      // Only include password if it's provided
      if (formData.password) {
        dataToSend.password = formData.password;
      }

      if (isEdit) {
        await usersAPI.update(id!, dataToSend);
        toast.success(mn.toast.updateSuccess);
      } else {
        if (!formData.password) {
          toast.error('Нууц үг оруулна уу');
          setIsLoading(false);
          return;
        }
        dataToSend.password = formData.password;
        await usersAPI.create(dataToSend);
        toast.success(mn.toast.saveSuccess);
      }
      navigate('/users');
    } catch (error: any) {
      toast.error(error.response?.data?.message || mn.toast.saveError);
    } finally {
      setIsLoading(false);
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
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/users')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? mn.users.editUser : mn.users.addUser}
          </h1>
          <p className="text-gray-500">{mn.nav.users}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 rounded-lg">
              <UserCog className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{mn.users.addUser}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {mn.users.fullName}
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={mn.users.fullName}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {mn.users.position}
              </label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={mn.users.position}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {mn.users.username} *
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={mn.users.username}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isEdit ? mn.users.newPassword : mn.users.password} {!isEdit && '*'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={isEdit ? mn.users.passwordHint : mn.users.password}
                  required={!isEdit}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {isEdit && (
                <p className="text-xs text-gray-500 mt-1">{mn.users.passwordHint}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {mn.users.role}
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="user">{mn.users.roleUser}</option>
                <option value="admin">{mn.users.roleAdmin}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                {mn.app.loading}
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {mn.app.save}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/users')}
            className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {mn.app.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}
