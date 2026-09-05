import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ArrowDownLeft,
  Building,
  User,
  Calendar,
  Check,
  FileText,
  BadgeCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

interface PaymentHistoryLogProps {
  initialFilterPaymentId?: string;
}

export const PaymentHistoryLog: React.FC<PaymentHistoryLogProps> = ({
  initialFilterPaymentId,
}) => {
  const { payments, approvePayment, rooms } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL'); // ALL, APPROVED, PENDING

  const filteredPayments = payments.filter((p) => {
    const matchSearch =
      p.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.invoiceCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.transactionRef && p.transactionRef.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchRoom = selectedRoom === 'ALL' || p.roomId === selectedRoom;
    const matchStatus =
      selectedStatus === 'ALL' ||
      (selectedStatus === 'APPROVED' && p.approvedByAdmin) ||
      (selectedStatus === 'PENDING' && !p.approvedByAdmin);

    return matchSearch && matchRoom && matchStatus;
  });

  const totalCollectedInLog = payments
    .filter((p) => p.approvedByAdmin)
    .reduce((acc, p) => acc + p.amount, 0);

  const pendingCount = payments.filter((p) => !p.approvedByAdmin).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#1E293B] p-6 rounded-3xl border border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-md shadow-emerald-500/10">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-100">Lịch Sử Thanh Toán Báo Về Chủ Trọ</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Mọi giao dịch thanh toán từ người thuê sẽ gửi thông báo và ghi nhận chi tiết tại đây
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-slate-900/90 px-3.5 py-2 rounded-2xl border border-slate-700 text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Tổng đã báo về</span>
            <span className="font-black text-base text-emerald-400">{formatCurrency(totalCollectedInLog)}</span>
          </div>
          {pendingCount > 0 && (
            <div className="bg-amber-500/20 px-3.5 py-2 rounded-2xl border border-amber-500/40 text-xs text-amber-300 animate-pulse">
              <span className="block text-[10px] text-amber-400 uppercase font-bold tracking-wider">Cần duyệt</span>
              <span className="font-black text-base">{pendingCount} giao dịch</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-[#1E293B] p-4 sm:p-5 rounded-3xl border border-slate-700 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo phòng, tên khách, mã GD..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 text-xs border border-slate-700 rounded-xl bg-slate-900 text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-medium"
          />
        </div>

        <div className="flex items-center space-x-2.5 w-full sm:w-auto">
          {/* Room Filter */}
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="text-xs font-bold border border-slate-700 rounded-xl px-3 py-2 bg-slate-900 text-slate-200"
          >
            <option value="ALL">Tất cả phòng (16 phòng)</option>
            <optgroup label="5 Phòng VIP (2tr)" className="bg-slate-900 text-amber-400">
              {rooms
                .filter((r) => r.type === 'VIP')
                .map((r) => (
                  <option key={r.id} value={r.id} className="text-slate-200">
                    {r.roomNumber}
                  </option>
                ))}
            </optgroup>
            <optgroup label="11 Phòng Thường (1tr)" className="bg-slate-900 text-emerald-400">
              {rooms
                .filter((r) => r.type === 'STANDARD')
                .map((r) => (
                  <option key={r.id} value={r.id} className="text-slate-200">
                    {r.roomNumber}
                  </option>
                ))}
            </optgroup>
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs font-bold border border-slate-700 rounded-xl px-3 py-2 bg-slate-900 text-slate-200"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="PENDING">Chờ chủ trọ duyệt</option>
            <option value="APPROVED">Đã xác nhận</option>
          </select>
        </div>
      </div>

      {/* Payment table */}
      <div className="bg-[#1E293B] rounded-3xl border border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-700/80 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Thời gian báo</th>
                <th className="py-3.5 px-4">Phòng & Khách</th>
                <th className="py-3.5 px-4">Kỳ hóa đơn</th>
                <th className="py-3.5 px-4 text-right">Số tiền</th>
                <th className="py-3.5 px-4">Hình thức thanh toán</th>
                <th className="py-3.5 px-4">Mã GD / Ghi chú</th>
                <th className="py-3.5 px-4 text-center">Trạng thái duyệt</th>
                <th className="py-3.5 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    Không tìm thấy bản ghi thanh toán nào phù hợp
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => {
                  const isVIP = payment.roomType === 'VIP';
                  const isApproved = payment.approvedByAdmin;

                  return (
                    <tr
                      key={payment.id}
                      className={`hover:bg-slate-900/40 transition ${
                        !isApproved ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-400 font-medium whitespace-nowrap">
                        {formatDateTime(payment.paidAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-extrabold text-slate-100">{payment.roomNumber}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-md font-extrabold ${
                              isVIP ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {isVIP ? 'VIP' : 'Thường'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{payment.tenantName}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-200">
                        <span className="font-bold">Tháng {payment.month}/{payment.year}</span>
                        <div className="text-[10px] text-slate-500 font-mono">{payment.invoiceCode}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-400 text-sm">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center space-x-1 ${
                            payment.paymentMethod === 'BANK_TRANSFER'
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          <span>
                            {payment.paymentMethod === 'BANK_TRANSFER'
                              ? 'Chuyển khoản'
                              : 'Tiền mặt'}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs text-slate-300">
                        {payment.transactionRef && (
                          <div className="font-mono text-[11px] text-indigo-400 font-bold">
                            Ref: {payment.transactionRef}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-400 italic truncate">
                          {payment.note || 'Không có ghi chú'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isApproved ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <BadgeCheck className="w-3.5 h-3.5" />
                            <span>Đã duyệt</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Chờ chủ trọ duyệt</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {!isApproved ? (
                          <button
                            onClick={() => approvePayment(payment.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-extrabold shadow-sm transition flex items-center space-x-1 mx-auto"
                            title="Xác nhận bạn đã nhận được tiền"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Duyệt nhận tiền</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-semibold">Xong</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
