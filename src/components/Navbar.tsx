import React, { useState } from 'react';
import {
  Building2,
  Bell,
  LogOut,
  UserCheck,
  CheckCircle2,
  Clock,
  Sparkles,
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
    users,
    switchUser,
    logout,
    unreadNotificationCount,
    rooms,
    resetData,
  } = useApp();

  const [showSwitchMenu, setShowSwitchMenu] = useState(false);

  const vipRooms = rooms.filter((r) => r.type === 'VIP');
  const stdRooms = rooms.filter((r) => r.type === 'STANDARD');

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
                  Nhà Trọ An Cư
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
          </div>

          {/* User Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Fast Role Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSwitchMenu(!showSwitchMenu)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800/80 text-xs font-semibold text-slate-200 transition"
                title="Đổi vai trò xem để kiểm tra chức năng"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline text-slate-400 font-normal">Vai trò:</span>
                <span className="font-bold text-white truncate max-w-[120px]">
                  {currentUser?.role === 'ADMIN' ? 'Chủ trọ (Admin)' : currentUser?.fullName.split(' ').slice(-1)[0]}
                </span>
              </button>

              {showSwitchMenu && (
                <div
                  className="absolute right-0 mt-2 w-72 bg-[#1E293B] rounded-2xl shadow-2xl border border-slate-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-slate-200"
                  onMouseLeave={() => setShowSwitchMenu(false)}
                >
                  <div className="px-3.5 py-1.5 border-b border-slate-700/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Chọn tài khoản trải nghiệm
                  </div>
                  {/* Admin option */}
                  <button
                    onClick={() => {
                      switchUser('admin-1');
                      setShowSwitchMenu(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between hover:bg-slate-800 transition ${
                      currentUser?.role === 'ADMIN' ? 'bg-indigo-600/20 font-bold text-indigo-300 border-l-2 border-indigo-500' : 'text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                        QT
                      </div>
                      <div>
                        <div className="font-bold text-slate-100">Chủ Trọ (Admin)</div>
                        <div className="text-[10px] text-slate-400">Toàn quyền quản lý 16 phòng</div>
                      </div>
                    </div>
                    {currentUser?.role === 'ADMIN' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                  </button>

                  <div className="px-3.5 py-1.5 mt-1 border-t border-b border-slate-700/80 text-[10px] font-bold text-amber-400 bg-amber-500/10 uppercase tracking-wider">
                    Phòng VIP (5 phòng - 2.000.000 đ)
                  </div>
                  <div className="max-h-36 overflow-y-auto">
                    {vipRooms.map((r) => {
                      const user = users.find((u) => u.roomId === r.id);
                      if (!user) return null;
                      const isCurrent = currentUser?.id === user.id;
                      return (
                        <button
                          key={r.id}
                          onClick={() => {
                            switchUser(user.id);
                            setShowSwitchMenu(false);
                          }}
                          className={`w-full text-left px-3.5 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 transition ${
                            isCurrent ? 'bg-amber-500/20 font-bold text-amber-300 border-l-2 border-amber-500' : 'text-slate-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-amber-400">{r.roomNumber}:</span>
                            <span className="truncate max-w-[130px]">{user.fullName}</span>
                          </div>
                          {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="px-3.5 py-1.5 border-t border-b border-slate-700/80 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 uppercase tracking-wider">
                    Phòng Thường (11 phòng - 1.000.000 đ)
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {stdRooms.slice(0, 8).map((r) => {
                      const user = users.find((u) => u.roomId === r.id);
                      if (!user) return null;
                      const isCurrent = currentUser?.id === user.id;
                      return (
                        <button
                          key={r.id}
                          onClick={() => {
                            switchUser(user.id);
                            setShowSwitchMenu(false);
                          }}
                          className={`w-full text-left px-3.5 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 transition ${
                            isCurrent ? 'bg-emerald-500/20 font-bold text-emerald-300 border-l-2 border-emerald-500' : 'text-slate-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-emerald-400">{r.roomNumber}:</span>
                            <span className="truncate max-w-[130px]">{user.fullName}</span>
                          </div>
                          {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

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
