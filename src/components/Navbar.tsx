import React, { useState } from 'react';
import {
  Building2,
  Bell,
  LogOut,
  UserCheck,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDateTime } from '../utils/formatters';

interface NavbarProps {
  onOpenNotifications: () => void;
  onOpenQuickLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenNotifications, onOpenQuickLogin }) => {
  const {
    currentUser,
    logout,
    unreadNotificationCount,
    resetData,
    propertyName,
    ownerName,
    updatePropertySettings,
  } = useApp();

  const [showSettings, setShowSettings] = useState(false);
  const [draftPropertyName, setDraftPropertyName] = useState(propertyName);
  const [draftOwnerName, setDraftOwnerName] = useState(ownerName);

  return (
    <header className="sticky top-0 z-30 bg-[#1E293B] border-b border-slate-700/80 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & House Info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg text-slate-100 tracking-tight">
                  {propertyName}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  16 Phòng
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-400 font-medium">
                <span className="text-amber-400 font-semibold">5 VIP (2tr/tháng)</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">11 Thường (1tr/tháng)</span>
                <span>•</span>
                <span className="text-blue-400 font-semibold">Điện 4k/số</span>
              </div>
            </div>

            {currentUser?.role === 'ADMIN' && (
              <div className="relative">
                <button
                  onClick={() => {
                    setDraftPropertyName(propertyName);
                    setDraftOwnerName(ownerName);
                    setShowSettings(!showSettings);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition border border-slate-700/60"
                  title="Cài đặt nhà trọ"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
                {showSettings && (
                  <form
                    className="absolute right-0 mt-2 w-72 bg-[#1E293B] rounded-2xl shadow-2xl border border-slate-700 p-4 z-50 space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      updatePropertySettings(draftPropertyName, draftOwnerName);
                      setShowSettings(false);
                    }}
                  >
                    <div className="text-xs font-bold text-slate-200">Cài đặt nhà trọ</div>
                    <input
                      value={draftPropertyName}
                      onChange={(event) => setDraftPropertyName(event.target.value)}
                      placeholder="Tên nhà trọ"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100"
                      required
                    />
                    <input
                      value={draftOwnerName}
                      onChange={(event) => setDraftOwnerName(event.target.value)}
                      placeholder="Tên chủ trọ"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100"
                      required
                    />
                    <button type="submit" className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white">
                      Lưu cài đặt
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* User Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Role label badge */}
            {currentUser && (
              <span className="hidden sm:inline-flex items-center px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 text-xs font-semibold text-slate-300">
                {currentUser.role === 'ADMIN' ? 'Chủ trọ (Admin)' : 'Khách thuê'}
              </span>
            )}

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition border border-slate-700/60"
              title="Thông báo & Lời nhắc"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white animate-pulse">
                  {unreadNotificationCount}
                </span>
              )}
            </button>

            {/* Current user badge & Logout / Login */}
            {currentUser ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-700">
                <div className="hidden md:block text-right">
                  <div className="text-xs font-bold text-slate-200 leading-tight">
                    {currentUser.fullName}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {currentUser.role === 'ADMIN' ? (
                      <span className="text-indigo-400 font-semibold">Chủ trọ / Quản trị viên</span>
                    ) : (
                      <span className="text-emerald-400 font-semibold">
                        Khách thuê ({currentUser.roomId?.replace('-', ' ')})
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition border border-slate-700/60"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenQuickLogin}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-indigo-600/30"
              >
                <UserCheck className="w-4 h-4" />
                <span>Đăng nhập</span>
              </button>
            )}

            {/* Reset sample data */}
            <button
              onClick={() => {
                if (confirm('Khôi phục dữ liệu ban đầu (16 phòng, đầy đủ hóa đơn T8-T9)?')) {
                  resetData();
                }
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition hidden sm:inline-flex border border-slate-700/60"
              title="Khôi phục dữ liệu mẫu ban đầu"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
