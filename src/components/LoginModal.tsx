import React, { useState } from 'react';
import { ShieldCheck, UserCheck, KeyRound, Building, Sparkles, ArrowRight, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login, switchUser, users, rooms } = useApp();
  const [activeTab, setActiveTab] = useState<'ADMIN' | 'TENANT'>('ADMIN');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [selectedRoomId, setSelectedRoomId] = useState('VIP-A1');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = login(username);
    if (success) {
      onClose();
    } else {
      setError('Tài khoản hoặc mật khẩu không chính xác!');
    }
  };

  const handleTenantSelect = (roomId: string) => {
    const user = users.find((u) => u.roomId === roomId);
    if (user) {
      switchUser(user.id);
      onClose();
    }
  };

  const vipRooms = rooms.filter((r) => r.type === 'VIP');
  const stdRooms = rooms.filter((r) => r.type === 'STANDARD');

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
            <span>Hệ Thống Nhà Trọ An Cư</span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-100">Đăng Nhập Phân Quyền</h2>
          <p className="text-xs text-slate-400 mt-1">
            Chọn đăng nhập với tư cách Chủ Trọ (Quản lý) hoặc Người Thuê Phòng
          </p>
        </div>

        {/* Tab switch */}
        <div className="p-2 bg-slate-900/60 border-b border-slate-700 flex gap-2">
          <button
            onClick={() => {
              setActiveTab('ADMIN');
              setError('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition ${
              activeTab === 'ADMIN'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Chủ Trọ (Admin)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('TENANT');
              setError('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition ${
              activeTab === 'TENANT'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Người Thuê Phòng</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {activeTab === 'ADMIN' ? (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl font-semibold">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Tên đăng nhập
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl focus:outline-hidden focus:border-indigo-500 font-medium"
                    placeholder="admin"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl focus:outline-hidden focus:border-indigo-500 font-medium"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-md transition flex items-center justify-center space-x-1.5"
              >
                <span>Đăng nhập Quản trị viên</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    login('admin');
                    onClose();
                  }}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition inline-flex items-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>1-Click Đăng nhập nhanh tài khoản Chủ Trọ</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Chọn phòng bạn đang thuê để đăng nhập và xem tiền phòng, điện nước:
              </p>

              <div>
                <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>5 Phòng VIP (2.000.000 đ/tháng)</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-extrabold">VIP</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {vipRooms.map((r) => {
                    const user = users.find((u) => u.roomId === r.id);
                    if (!user) return null;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleTenantSelect(r.id)}
                        className="p-3 text-left border border-amber-500/30 hover:border-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-2xl transition group"
                      >
                        <div className="text-xs font-black text-amber-300 group-hover:text-amber-200">
                          {r.roomNumber}
                        </div>
                        <div className="text-[11px] text-slate-300 truncate mt-0.5">
                          {user.fullName}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>11 Phòng Thường (1.000.000 đ/tháng)</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-extrabold">Thường</span>
                </div>
                <div className="max-h-48 overflow-y-auto grid grid-cols-2 gap-2 pr-1">
                  {stdRooms.map((r) => {
                    const user = users.find((u) => u.roomId === r.id);
                    if (!user) return null;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleTenantSelect(r.id)}
                        className="p-2.5 text-left border border-emerald-500/30 hover:border-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-2xl transition group"
                      >
                        <div className="text-xs font-black text-emerald-300 group-hover:text-emerald-200">
                          {r.roomNumber}
                        </div>
                        <div className="text-[11px] text-slate-300 truncate mt-0.5">
                          {user.fullName}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
