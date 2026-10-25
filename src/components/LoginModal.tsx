import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Building, ArrowRight, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login, propertyName } = useApp();
  const [activeTab, setActiveTab] = useState<'ADMIN' | 'TENANT'>('ADMIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await login(username, password);
      if (result.success) {
        onClose();
      } else {
        setError(result.message || 'Tài khoản hoặc mật khẩu không chính xác!');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-[#1E293B] w-full max-w-md rounded-3xl shadow-2xl border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-slate-900 border-b border-slate-700 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Building className="w-4 h-4" />
            <span>Hệ Thống {propertyName}</span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-100">Đăng Nhập</h2>
          <p className="text-xs text-slate-400 mt-1">
            Đăng nhập với tư cách Chủ Trọ (Quản lý) hoặc Người Thuê Phòng
          </p>
        </div>

        {/* Tab switch */}
        <div className="p-2 bg-slate-900/60 border-b border-slate-700 flex gap-2">
          <button
            onClick={() => { setActiveTab('ADMIN'); setError(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition ${
              activeTab === 'ADMIN' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Chủ Trọ (Admin)</span>
          </button>
          <button
            onClick={() => { setActiveTab('TENANT'); setError(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition ${
              activeTab === 'TENANT' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Người Thuê Phòng</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl font-semibold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Tên đăng nhập</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl focus:outline-hidden focus:border-indigo-500 font-medium"
                placeholder={activeTab === 'ADMIN' ? 'admin' : 'Tên tài khoản phòng (vd: p1, a1)'}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl focus:outline-hidden focus:border-indigo-500 font-medium"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl text-xs font-black shadow-md transition flex items-center justify-center space-x-1.5"
            >
              <span>{submitting ? 'Đang xác thực...' : 'Đăng nhập'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-[11px] text-slate-500 text-center pt-1">
              Tài khoản mặc định từ dữ liệu mẫu: admin / 123456 (hãy đổi mật khẩu sau khi đăng nhập).
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
