import React, { useState } from 'react';
import {
  FileText,
  Send,
  BellRing,
  CheckCircle,
  AlertCircle,
  Clock,
  Printer,
  Search,
  Filter,
  Eye,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Invoice } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface InvoiceListProps {
  onViewInvoiceDetail: (invoice: Invoice) => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({ onViewInvoiceDetail }) => {
  const { invoices, sendPaymentReminder, approveInvoicePayment, currentMonth, currentYear } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionAlert, setActionAlert] = useState<string | null>(null);

  const monthInvoices = invoices.filter(
    (inv) => inv.month === selectedMonth && inv.year === currentYear
  );

  const filteredInvoices = monthInvoices.filter((inv) => {
    const matchSearch =
      inv.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoiceCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus =
      selectedStatus === 'ALL' ||
      (selectedStatus === 'PAID' && inv.status === 'PAID') ||
      (selectedStatus === 'UNPAID' && inv.status === 'UNPAID') ||
      (selectedStatus === 'PENDING' && inv.status === 'PENDING_APPROVAL');

    return matchSearch && matchStatus;
  });

  const unpaidInvoices = monthInvoices.filter((inv) => inv.status === 'UNPAID');

  const handleSendAllReminders = () => {
    const count = sendPaymentReminder('all');
    if (count > 0) {
      setActionAlert(`Đã tự động gửi thông báo nhắc tiền đến ${count} phòng chưa thanh toán thành công!`);
    } else {
      setActionAlert('Tất cả các phòng trong tháng này đã thanh toán xong!');
    }
    setTimeout(() => setActionAlert(null), 4000);
  };

  const handleSendSingleReminder = (invId: string, roomNumber: string) => {
    sendPaymentReminder(invId);
    setActionAlert(`Đã gửi thông báo nhắc tiền thành công đến ${roomNumber}!`);
    setTimeout(() => setActionAlert(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Automated Reminder Trigger */}
      <div className="bg-[#1E293B] p-6 rounded-3xl border border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <FileText className="w-4 h-4" />
            <span>Quản Lý Hóa Đơn & Nhắc Đóng Tiền</span>
          </div>
          <h2 className="text-xl font-black text-slate-100 mt-1.5">
            Hóa Đơn Tháng {selectedMonth}/{currentYear}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Có <strong className="text-rose-400">{unpaidInvoices.length}</strong> phòng chưa đóng tiền trong tổng số {monthInvoices.length} phòng
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Automated reminders button */}
          <button
            onClick={handleSendAllReminders}
            disabled={unpaidInvoices.length === 0}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center space-x-2 transition shadow-sm ${
              unpaidInvoices.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
            }`}
            title="Tự động gửi thông báo nhắc tiền cho tất cả phòng chưa nộp"
          >
            <BellRing className="w-4 h-4 animate-bounce" />
            <span>Gửi nhắc đóng tiền tự động ({unpaidInvoices.length})</span>
          </button>
        </div>
      </div>

      {actionAlert && (
        <div className="p-4 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{actionAlert}</span>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-[#1E293B] p-4 sm:p-5 rounded-3xl border border-slate-700 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo phòng, tên khách, mã hóa đơn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 text-xs border border-slate-700 rounded-xl bg-slate-900 text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-medium"
          />
        </div>

        <div className="flex items-center space-x-2.5 w-full sm:w-auto">
          {/* Month selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="text-xs font-bold border border-slate-700 rounded-xl px-3 py-2 bg-slate-900 text-slate-200"
          >
            {[7, 8, 9, 10, 11, 12].map((m) => (
              <option key={m} value={m}>
                Tháng {m}/{currentYear}
              </option>
            ))}
          </select>

          {/* Status selector */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs font-bold border border-slate-700 rounded-xl px-3 py-2 bg-slate-900 text-slate-200"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="UNPAID">Chưa nộp ({unpaidInvoices.length})</option>
            <option value="PENDING">Chờ xác nhận</option>
            <option value="PAID">Đã thanh toán</option>
          </select>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-[#1E293B] rounded-3xl border border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-700/80 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Mã HĐ</th>
                <th className="py-3.5 px-4">Phòng</th>
                <th className="py-3.5 px-4">Người thuê</th>
                <th className="py-3.5 px-4 text-center">Điện (4k/số)</th>
                <th className="py-3.5 px-4 text-right">Tổng tiền</th>
                <th className="py-3.5 px-4 text-center">Hạn nộp</th>
                <th className="py-3.5 px-4 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 text-center">Nhắc nợ</th>
                <th className="py-3.5 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    Không tìm thấy hóa đơn nào phù hợp
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isVIP = inv.roomType === 'VIP';
                  const isPaid = inv.status === 'PAID';
                  const isPending = inv.status === 'PENDING_APPROVAL';

                  return (
                    <tr key={inv.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-400">
                        {inv.invoiceCode}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-slate-100">{inv.roomNumber}</span>
                        <span
                          className={`ml-1.5 text-[9px] px-1.5 py-0.2 rounded-md font-extrabold ${
                            isVIP ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {isVIP ? 'VIP 2tr' : 'Thường 1tr'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-200 font-medium">
                        {inv.tenantName}
                        <div className="text-[10px] text-slate-400">{inv.tenantPhone}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="font-bold text-amber-400">
                          {inv.electricityUsage} kWh
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ({inv.oldElectricityIndex} &rarr; {inv.newElectricityIndex})
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-100 text-sm">
                        {formatCurrency(inv.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400 font-medium">
                        {formatDate(inv.dueDate)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isPaid
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : isPending
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {isPaid ? 'Đã thu' : isPending ? 'Chờ duyệt' : 'Chưa thu'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {inv.remindedCount > 0 ? (
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-md">
                            Đã nhắc {inv.remindedCount} lần
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">Chưa gửi</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => onViewInvoiceDetail(inv)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition"
                            title="Xem chi tiết hóa đơn"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {!isPaid && (
                            <>
                              <button
                                onClick={() => {
                                  approveInvoicePayment(inv.id);
                                  setActionAlert(`Đã xác nhận thanh toán thành công cho ${inv.roomNumber}!`);
                                  setTimeout(() => setActionAlert(null), 3500);
                                }}
                                className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] transition flex items-center space-x-1 shadow-sm"
                                title="Chủ trọ xác nhận tiền đã về tài khoản"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>{isPending ? 'Xác nhận tiền về' : 'Thu tiền'}</span>
                              </button>

                              <button
                                onClick={() => handleSendSingleReminder(inv.id, inv.roomNumber)}
                                className="p-1.5 rounded-xl text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 transition"
                                title="Gửi thông báo nhắc đóng tiền"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
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
