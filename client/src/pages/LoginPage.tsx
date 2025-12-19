import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { authAPI } from '../lib/api';
import { useAuthStore } from '../lib/store';
import toast from 'react-hot-toast';
import { mn } from '../lib/i18n';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authAPI.login(formData.username, formData.password);
      const { user, token } = response.data;
      login(user, token);
      toast.success(mn.toast.loginSuccess);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || mn.login.error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 items-center justify-center p-8 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%">
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Decorative circles */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-500 rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-indigo-500 rounded-full opacity-10 blur-3xl"></div>
        
        <div className="relative z-10 w-full max-w-xl text-center">
          {/* Main Icon */}
          <div className="mb-8">
            <svg viewBox="0 0 200 200" className="w-48 h-48 mx-auto">
              {/* Outer ring */}
              <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="1" />
              <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="1" />
              
              {/* Main warehouse/box icon */}
              <g transform="translate(50, 45)">
                {/* Box base */}
                <path d="M50 0 L100 25 L100 85 L50 110 L0 85 L0 25 Z" fill="rgba(59,130,246,0.3)" stroke="rgba(147,197,253,0.8)" strokeWidth="2" />
                
                {/* Box top */}
                <path d="M50 0 L100 25 L50 50 L0 25 Z" fill="rgba(59,130,246,0.5)" stroke="rgba(147,197,253,0.8)" strokeWidth="2" />
                
                {/* Box front face */}
                <path d="M0 25 L50 50 L50 110 L0 85 Z" fill="rgba(30,64,175,0.4)" stroke="rgba(147,197,253,0.6)" strokeWidth="1" />
                
                {/* Box right face */}
                <path d="M50 50 L100 25 L100 85 L50 110 Z" fill="rgba(37,99,235,0.3)" stroke="rgba(147,197,253,0.6)" strokeWidth="1" />
                
                {/* Center line on top */}
                <line x1="50" y1="0" x2="50" y2="50" stroke="rgba(147,197,253,0.5)" strokeWidth="1" />
                <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(147,197,253,0.3)" strokeWidth="1" />
              </g>
              
              {/* Checkmark badge */}
              <g transform="translate(130, 30)">
                <circle cx="20" cy="20" r="20" fill="#22c55e" />
                <path d="M12 20 L18 26 L28 14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </g>
              
              {/* Stats bars */}
              <g transform="translate(25, 160)">
                <rect x="0" y="0" width="30" height="6" rx="3" fill="rgba(34,197,94,0.6)" />
                <rect x="40" y="0" width="50" height="6" rx="3" fill="rgba(59,130,246,0.6)" />
                <rect x="100" y="0" width="40" height="6" rx="3" fill="rgba(168,85,247,0.6)" />
              </g>
            </svg>
          </div>
          
          {/* Title */}
          <h2 className="text-3xl font-bold text-white mb-4">
            Бараа Материалын Удирдлага
          </h2>
          
          {/* Subtitle */}
          <p className="text-slate-400 text-lg mb-8">
            PPE Inventory Management System
          </p>
          
          {/* Feature list */}
          <div className="space-y-4 text-left max-w-sm mx-auto">
            <div className="flex items-center gap-4 text-slate-300">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <span>Бараа материалын бүртгэл</span>
            </div>
            
            <div className="flex items-center gap-4 text-slate-300">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <span>Захиалга & хүлээн авалт</span>
            </div>
            
            <div className="flex items-center gap-4 text-slate-300">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span>Тайлан & статистик</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                {/* Box/Package shape */}
                <rect x="8" y="14" width="32" height="26" rx="3" fill="#4f46e5" />
                <path d="M8 20L24 12L40 20" stroke="#818cf8" strokeWidth="2" fill="none" />
                <rect x="14" y="22" width="8" height="8" rx="1" fill="#c7d2fe" />
                <rect x="26" y="22" width="8" height="8" rx="1" fill="#c7d2fe" />
                <rect x="14" y="32" width="8" height="6" rx="1" fill="#a5b4fc" />
                <rect x="26" y="32" width="8" height="6" rx="1" fill="#a5b4fc" />
                {/* Checkmark */}
                <circle cx="38" cy="12" r="8" fill="#22c55e" />
                <path d="M34 12L37 15L42 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{mn.login.title}</h1>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-3 border-b border-gray-300 focus:border-indigo-500 focus:outline-none transition-colors bg-transparent"
                placeholder={mn.login.username}
                required
              />
            </div>

            <div>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 border-b border-gray-300 focus:border-indigo-500 focus:outline-none transition-colors bg-transparent"
                placeholder={mn.login.password}
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                {mn.login.rememberMe}
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {mn.login.signingIn}
                </span>
              ) : (
                mn.login.signIn
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            {mn.login.defaultCredentials}
          </p>
        </div>
      </div>
    </div>
  );
}
