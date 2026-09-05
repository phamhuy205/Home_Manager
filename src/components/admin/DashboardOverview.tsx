import React from 'react';
import {
  Building,
  Users,
  Zap,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  BellRing,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Room } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface DashboardOverviewProps {
  onNavigateTab: (tab: 'rooms' | 'electricity' | 'invoices' | 'revenue' | 'payments') => void;
  onSelectRoomForElectricity: (roomId: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigateTab,
  onSelectRoomForElectricity,
}) => {
  const { rooms, invoices, payments, approvePayment, sendPaymentReminder, currentMonth, currentYear } = useApp();

  const vipRooms = rooms.filter((r) => r.type === 'VIP');
  const stdRooms = rooms.filter((r) => r.type === 'STANDARD');
  const occupiedCount = rooms.filter((r) => r.isOccupied).length;

  const currentInvoices = invoices.filter(
    (inv) => inv.month === currentMonth && inv.year === currentYear
  );

  const totalExpected = currentInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPaid = currentInvoices
    .filter((inv) => inv.status === 'PAID')
    .reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalDebt = totalExpected - totalPaid;
  const unpaidList = currentInvoices.filter((inv) => inv.status === 'UNPAID');

  const pendingApprovals = payments.filter((p) => !p.approvedByAdmin);

  return (
    <div className="space-y-6">
      {/* Top Bento Row: Welcome & Highlight Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Welcome Bento Card (Span 2) */}
        <div className="lg:col-span-2 bg-[#1E293B] rounded-3xl p-6 border border-slate-700 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Bảng Điều Khiển Bento • Chủ Trọ</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              Nhà Trọ An Cư • Tháng {currentMonth}/{currentYear}
            </h1>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-lg">
              Hệ thống quản lý 16 phòng trọ (5 phòng VIP giá 2.000.000 đ/tháng, 11 phòng thường giá 1.000.000 đ/tháng). Giá điện chốt chính xác 4.000 đ/số.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-700/80 flex flex-wrap items-center gap-2 relative z-10">
            <button
              onClick={() => {
                const count = sendPaymentReminder('all');
                alert(
                  count > 0
                    ? `Đã tự động gửi thông báo nhắc tiền đến ${count} phòng chưa nộp!`
                    : 'Tất cả các phòng đã hoàn tất nộp tiền!'
                );
              }}
              className="px-4 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition"
            >
              <BellRing className="w-4 h-4" />
              <span>Nhắc nợ tự động ({unpaidList.length} phòng)</span>
            </button>
            <button
              onClick={() => onNavigateTab('rooms')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs flex items-center space-x-1 transition"
            >
              <span>Xem 16 phòng</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </div>

        {/* Electricity & Quick Billing Card (Span 2) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-3xl p-6 flex flex-col justify-between shadow-xl shadow-indigo-500/10 text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-200 bg-white/10 px-2.5 py-1 rounded-lg">
                Đơn giá điện chuẩn
              </span>
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
                <Zap className="w-5 h-5 text-amber-300" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-xs text-indigo-100 font-medium">Quy chuẩn tính toán</span>
              <div className="text-3xl font-black tracking-tight text-white mt-0.5">
                4.000 đ / 1 số (kWh)
              </div>
            </div>
            <p className="text-xs text-indigo-100 mt-2 leading-relaxed">
              Nhập số điện cũ và mới, hệ thống tính hóa đơn chính xác ngay lập tức và tự động lưu số mới làm số cũ cho kỳ tiếp theo.
            </p>
          </div>

          <div className="mt-5 relative z-10">
            <button
              onClick={() => onNavigateTab('electricity')}
              className="w-full sm:w-auto px-5 py-2.5 bg-white text-indigo-900 hover:bg-indigo-50 rounded-xl font-extrabold text-xs flex items-center justify-center space-x-2 transition shadow-lg"
            >
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Mở giao diện ghi số điện ngay</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pending Approvals Card (Chủ thấy tiền về thì bấm xác nhận) */}
      {pendingApprovals.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-sm">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-300">
                  {pendingApprovals.length} Khoản Tiền Khách Báo Đã Chuyển Khoản • Cần Chủ Trọ Xác Nhận
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Khách thuê đã thực hiện chuyển tiền và bấm xác nhận trên app. Khi bạn thấy tiền về tài khoản ngân hàng, hãy bấm xác nhận bên dưới:
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('payments')}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center space-x-1 shrink-0"
            >
              <span>Xem nhật ký đầy đủ</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {pendingApprovals.map((p) => (
              <div
                key={p.id}
                className="bg-slate-900/90 rounded-2xl p-4 border border-slate-700/90 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-100 text-sm">{p.roomNumber}</span>
                    <span className="text-sm font-black text-amber-400 font-mono">
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    Người gửi: <strong className="text-slate-100">{p.tenantName}</strong>
                  </div>
                  {p.transactionRef && (
                    <div className="text-[11px] text-indigo-400 font-mono mt-0.5 font-bold">
                      Mã giao dịch: {p.transactionRef}
                    </div>
                  )}
                  {p.note && (
                    <div className="text-[11px] text-slate-400 italic truncate mt-0.5">
                      "{p.note}"
                    </div>
                  )}
                </div>

                <button
                  onClick={() => approvePayment(p.id)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 shadow-sm"
                  title="Xác nhận tiền đã về tài khoản ngân hàng của bạn"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác Nhận Đã Nhận Tiền</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bento Grid 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Rooms Card */}
        <div className="bg-[#1E293B] p-5 rounded-3xl border border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quy mô nhà trọ</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                <Building className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-slate-100">
              16 Phòng
            </div>
            <div className="mt-1 flex items-center space-x-2 text-xs">
              <span className="text-amber-400 font-bold">5 VIP (2tr)</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-bold">11 Thường (1tr)</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Đang thuê:</span>
            <strong className="text-slate-200 font-bold">{occupiedCount}/16 ({Math.round((occupiedCount / 16) * 100)}%)</strong>
          </div>
        </div>

        {/* Expected Revenue */}
        <div className="bg-[#1E293B] p-5 rounded-3xl border border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Doanh thu T{currentMonth}</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-slate-100">
              {formatCurrency(totalExpected)}
            </div>
            <div className="mt-1 flex items-center space-x-1.5 text-xs text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Đã thu: {formatCurrency(totalPaid)}</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Tỷ lệ hoàn thành:</span>
            <strong className="text-emerald-400 font-bold">
              {totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0}%
            </strong>
          </div>
        </div>

        {/* Debt / Unpaid */}
        <div className="bg-[#1E293B] p-5 rounded-3xl border border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Công nợ chưa nộp</span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-rose-400">
              {formatCurrency(totalDebt)}
            </div>
            <p className="text-xs text-rose-400 font-semibold mt-1">
              {unpaidList.length} phòng chưa đóng tiền
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Kỳ hạn chốt:</span>
            <span className="text-slate-300 font-medium">05/{currentMonth}/{currentYear}</span>
          </div>
        </div>

        {/* Pending approvals */}
        <div className="bg-[#1E293B] p-5 rounded-3xl border border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Báo có từ người thuê</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-amber-400">
              {pendingApprovals.length} Giao dịch
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Khách chuyển khoản VietQR / tiền mặt
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-700/60">
            <button
              onClick={() => onNavigateTab('payments')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center space-x-1"
            >
              <span>Xem lịch sử & duyệt ngay &rarr;</span>
            </button>
          </div>
        </div>
      </div>

      {/* 16 Room Bento Visual Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-100">
              Sơ Đồ Bento Trạng Thái 16 Phòng Trọ
            </h3>
            <p className="text-xs text-slate-400">
              Theo dõi tình trạng phòng, số điện kỳ trước và trạng thái thanh toán hóa đơn
            </p>
          </div>
        </div>

        {/* 5 VIP Rooms Section */}
        <div className="bg-[#1E293B] p-5 rounded-3xl border border-slate-700 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-4 ring-amber-400/20"></span>
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                5 Phòng VIP • 2.000.000 đ / tháng
              </h4>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Diện tích ~28-32m², full nội thất, máy lạnh
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {vipRooms.map((room) => {
              const currentInv = currentInvoices.find((inv) => inv.roomId === room.id);
              const isPaid = currentInv?.status === 'PAID';
              const isPending = currentInv?.status === 'PENDING_APPROVAL';

              return (
                <div
                  key={room.id}
                  className="bg-slate-900/60 rounded-2xl p-4 border border-slate-700/80 hover:border-amber-500/60 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-slate-100">
                        {room.roomNumber}
                      </span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-extrabold">
                        VIP
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-300 mt-1.5 truncate">
                      {room.tenant ? room.tenant.name : 'Trống'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>Số điện cũ: <strong className="text-slate-200">{room.lastElectricityIndex}</strong></span>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-slate-800 flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isPaid
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : isPending
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {isPaid ? 'Đã nộp' : isPending ? 'Chờ duyệt' : 'Chưa nộp'}
                    </span>

                    <button
                      onClick={() => onSelectRoomForElectricity(room.id)}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold transition"
                    >
                      Ghi điện
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 11 Standard Rooms Section */}
        <div className="bg-[#1E293B] p-5 rounded-3xl border border-slate-700 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20"></span>
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                11 Phòng Thường • 1.000.000 đ / tháng
              </h4>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Diện tích ~18m², gác lửng, WC riêng biệt
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {stdRooms.map((room) => {
              const currentInv = currentInvoices.find((inv) => inv.roomId === room.id);
              const isPaid = currentInv?.status === 'PAID';
              const isPending = currentInv?.status === 'PENDING_APPROVAL';

              return (
                <div
                  key={room.id}
                  className="bg-slate-900/60 rounded-2xl p-3.5 border border-slate-700/80 hover:border-emerald-500/60 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-100">
                        {room.roomNumber}
                      </span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-extrabold">
                        1tr
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-300 mt-1 truncate">
                      {room.tenant ? room.tenant.name : 'Trống'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center space-x-1">
                      <Zap className="w-2.5 h-2.5 text-amber-400" />
                      <span>{room.lastElectricityIndex} kWh</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        isPaid
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : isPending
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {isPaid ? 'Đã nộp' : isPending ? 'Chờ duyệt' : 'Chưa nộp'}
                    </span>

                    <button
                      onClick={() => onSelectRoomForElectricity(room.id)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold transition"
                    >
                      Ghi điện
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
