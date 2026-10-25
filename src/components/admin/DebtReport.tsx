import React, { useMemo, useState } from 'react';
import {
  Wallet,
  Calendar,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  FileText,
  Search,
  X,
  HandCoins,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { exportDebtStatementPdf } from '../../utils/pdf';

const startOfMonth = (year: number, month: number) => new Date(year, month - 1, 1);

export const DebtReport: React.FC = () => {
  const { rooms, invoices, payments, propertyName, ownerName, currentMonth, currentYear } = useApp();

  const [startMonth, setStartMonth] = useState<number>(1);
  const [startYear, setStartYear] = useState<number>(currentYear);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyDebt, setOnlyDebt] = useState(false);
  const [detailRoomId, setDetailRoomId] = useState<string | null>(null);

  const end = new Date(`${endDate}T00:00:00`);
  const endMonth = isNaN(end.getTime()) ? currentMonth : end.getMonth() + 1;
  const endYear = isNaN(end.getTime()) ? currentYear : end.getFullYear();
  const startPeriod = startYear * 12 + startMonth;
  const endPeriod = endYear * 12 + endMonth;

  const rangeFrom = startOfMonth(startYear, startMonth);
  const rangeTo = isNaN(end.getTime()) ? new Date() : new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);

  const inInvoicePeriod = (month: number, year: number) => {
    const key = year * 12 + month;
    return key >= startPeriod && key <= endPeriod;
  };

  const rows = useMemo(() => {
    return rooms.map((room) => {
      const roomInvoices = invoices.filter((inv) => inv.roomId === room.id);
      const rangeInvoices = roomInvoices.filter((inv) => inInvoicePeriod(inv.month, inv.year));

      const billed = rangeInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const paid = rangeInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
      const dueInPeriod = billed - paid;
      // Nợ lũy kế: mọi hóa đơn đến kỳ kết thúc còn thiếu (kể cả các kỳ trước khoảng chọn)
      const cumulativeDebt = roomInvoices
        .filter((inv) => inv.year * 12 + inv.month <= endPeriod)
        .reduce((sum, inv) => sum + Math.max(0, inv.totalAmount - inv.paidAmount), 0);
      // Thực thu theo giao dịch trong khoảng ngày được chọn
      const cashInRange = payments
        .filter((p) => {
          const paidAt = new Date(p.paidAt);
          return p.roomId === room.id && paidAt >= rangeFrom && paidAt <= rangeTo;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        room,
        rangeInvoices,
        billed,
        paid,
        dueInPeriod,
        cumulativeDebt,
        cashInRange,
        hasActivity: billed > 0 || cumulativeDebt > 0 || cashInRange > 0,
      };
    });
  }, [rooms, invoices, payments, startPeriod, endPeriod, rangeFrom.getTime(), rangeTo.getTime()]);

  const visibleRows = rows.filter((row) => {
    if (onlyDebt && row.cumulativeDebt <= 0) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      row.room.roomNumber.toLowerCase().includes(term) ||
      (row.room.tenant?.name || '').toLowerCase().includes(term) ||
      (row.room.tenant?.phone || '').includes(searchTerm) ||
      (row.room.tenant?.idCard || '').includes(searchTerm)
    );
  });

  const totalBilled = rows.reduce((s, r) => s + r.billed, 0);
  const totalPaid = rows.reduce((s, r) => s + r.paid, 0);
  const totalDue = rows.reduce((s, r) => s + r.dueInPeriod, 0);
  const totalCumulativeDebt = rows.reduce((s, r) => s + r.cumulativeDebt, 0);
  const cashCollected = rows.reduce((s, r) => s + r.cashInRange, 0);
  const debtRoomCount = rows.filter((r) => r.cumulativeDebt > 0).length;

  const periodLabel = `Từ 01/${String(startMonth).padStart(2, '0')}/${startYear} đến ${formatDate(endDate)}`;
  const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - i);

  const detailRow = detailRoomId ? rows.find((r) => r.room.id === detailRoomId) : undefined;
  const detailPayments = detailRoomId
    ? payments.filter((p) => {
        const paidAt = new Date(p.paidAt);
        return p.roomId === detailRoomId && paidAt >= rangeFrom && paidAt <= rangeTo;
      })
    : [];

  const handleExportPdf = () => {
    exportDebtStatementPdf({
      propertyName,
      ownerName,
      periodLabel,
      rows: visibleRows.map((r) => ({
        roomNumber: r.room.roomNumber,
        tenantName: r.room.tenant?.name || r.rangeInvoices[0]?.tenantName || '(trống)',
        billed: r.billed,
        paid: r.paid,
        dueInPeriod: r.dueInPeriod,
        cumulativeDebt: r.cumulativeDebt,
      })),
      totalBilled,
      totalPaid,
      totalDue,
      totalCumulativeDebt,
      cashCollected,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header + bộ chọn kỳ */}
      <div className="bg-[#1E293B] p-6 rounded-3xl border border-slate-700 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Wallet className="w-4 h-4" />
            <span>Công Nợ Theo Kỳ Từng Phòng</span>
          </div>
          <h2 className="text-xl font-black text-slate-100 mt-1.5">Bảng Tổng Hợp Thu Tiền & Công Nợ</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Tính theo kỳ hóa đơn trong khoảng chọn • Nợ lũy kế gồm cả các kỳ trước chưa trả
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-slate-400">Từ tháng</span>
            <select
              value={startMonth}
              onChange={(e) => setStartMonth(Number(e.target.value))}
              className="text-xs font-bold bg-transparent py-1 text-slate-200 focus:outline-hidden"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m} className="bg-slate-900 text-slate-100">
                  Tháng {m}
                </option>
              ))}
            </select>
            <select
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
              className="text-xs font-bold bg-transparent py-1 text-slate-200 focus:outline-hidden"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y} className="bg-slate-900 text-slate-100">
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-xs font-bold text-slate-400">Đến ngày</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs font-bold bg-transparent py-1 text-slate-200 focus:outline-hidden"
            />
          </div>

          <button
            onClick={handleExportPdf}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition flex items-center space-x-1.5 shadow-sm"
          >
            <FileText className="w-4 h-4" />
            <span>Xuất PDF bảng kê</span>
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1E293B] p-5 rounded-3xl border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phát sinh trong kỳ</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-100">{formatCurrency(totalBilled)}</div>
          <p className="text-[11px] text-slate-400 mt-1">{periodLabel}</p>
        </div>

        <div className="bg-[#1E293B] p-5 rounded-3xl border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Đã thu (hóa đơn)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-emerald-400">{formatCurrency(totalPaid)}</div>
          <p className="text-[11px] text-slate-400 mt-1">
            Thực thu theo giao dịch: <strong className="text-emerald-300">{formatCurrency(cashCollected)}</strong>
          </p>
        </div>

        <div className="bg-[#1E293B] p-5 rounded-3xl border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Còn nợ trong kỳ</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-amber-400">{formatCurrency(totalDue)}</div>
          <p className="text-[11px] text-slate-400 mt-1">Phát sinh kỳ này chưa nộp đủ</p>
        </div>

        <div className="bg-[#1E293B] p-5 rounded-3xl border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nợ lũy kế</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <HandCoins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-rose-400">{formatCurrency(totalCumulativeDebt)}</div>
          <p className="text-[11px] text-rose-400 font-semibold mt-1">{debtRoomCount} phòng còn nợ</p>
        </div>
      </div>

      {/* Bộ lọc */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="bg-[#1E293B] p-3 rounded-2xl border border-slate-700 shadow-sm flex items-center flex-1">
          <Search className="w-4 h-4 text-slate-400 ml-2" />
          <input
            type="text"
            placeholder="Tìm theo số phòng, tên khách, SĐT, CCCD..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-3 py-1 text-xs text-slate-100 placeholder-slate-500 font-medium focus:outline-hidden bg-transparent"
          />
        </div>
        <button
          onClick={() => setOnlyDebt((v) => !v)}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition ${
            onlyDebt
              ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
              : 'bg-[#1E293B] text-slate-300 border-slate-700 hover:border-slate-500'
          }`}
        >
          Chỉ hiện phòng còn nợ ({debtRoomCount})
        </button>
      </div>

      {/* Bảng tổng hợp */}
      <div className="bg-[#1E293B] rounded-3xl border border-slate-700 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-700/80">
          <h3 className="text-sm font-extrabold text-slate-100">Công Nợ Từng Phòng • {periodLabel}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Bấm vào một dòng để xem chi tiết từng hóa đơn và giao dịch thanh toán
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-700/80 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Phòng</th>
                <th className="py-3.5 px-4">Người thuê</th>
                <th className="py-3.5 px-4">CCCD</th>
                <th className="py-3.5 px-4">Ngày vào ở</th>
                <th className="py-3.5 px-4 text-right">Tiền cọc</th>
                <th className="py-3.5 px-4 text-right">Phát sinh</th>
                <th className="py-3.5 px-4 text-right">Đã nộp</th>
                <th className="py-3.5 px-4 text-right">Nợ trong kỳ</th>
                <th className="py-3.5 px-4 text-right">Nợ lũy kế</th>
                <th className="py-3.5 px-4 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                    Không tìm thấy phòng nào khớp bộ lọc
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const { room } = row;
                  const hasDebt = row.cumulativeDebt > 0;
                  return (
                    <tr
                      key={room.id}
                      onClick={() => setDetailRoomId(room.id)}
                      className="hover:bg-slate-900/50 transition cursor-pointer"
                    >
                      <td className="py-3 px-4 font-extrabold text-slate-100">
                        {room.roomNumber}
                        <span className={`ml-1.5 text-[9px] font-bold ${room.type === 'VIP' ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {room.type === 'VIP' ? 'VIP' : 'TH'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {room.tenant ? (
                          <>
                            <div className="font-bold text-slate-100">{room.tenant.name}</div>
                            <div className="text-[10px] text-indigo-400 font-mono">{room.tenant.phone}</div>
                          </>
                        ) : (
                          <span className="text-slate-500 italic">Đã trả phòng / trống</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{room.tenant?.idCard || '—'}</td>
                      <td className="py-3 px-4 text-slate-300">{room.tenant ? formatDate(room.tenant.startDate) : '—'}</td>
                      <td className="py-3 px-4 text-right text-slate-300">{formatCurrency(room.tenant?.deposit || 0)}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-200">{formatCurrency(row.billed)}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">{formatCurrency(row.paid)}</td>
                      <td className="py-3 px-4 text-right font-bold text-amber-400">{formatCurrency(row.dueInPeriod)}</td>
                      <td className={`py-3 px-4 text-right font-black ${hasDebt ? 'text-rose-400' : 'text-slate-500'}`}>
                        {formatCurrency(row.cumulativeDebt)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            !room.isOccupied
                              ? 'bg-slate-700 text-slate-300 border border-slate-600'
                              : hasDebt
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {!room.isOccupied ? (hasDebt ? 'Đã trả • còn nợ' : 'Đã trả phòng') : hasDebt ? 'Còn nợ' : 'Đã thanh toán'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {visibleRows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-900 border-t-2 border-slate-700 text-slate-100 font-black text-xs">
                  <td className="py-3 px-4" colSpan={5}>
                    TỔNG CỘNG ({visibleRows.length} phòng)
                  </td>
                  <td className="py-3 px-4 text-right text-indigo-300">
                    {formatCurrency(visibleRows.reduce((s, r) => s + r.billed, 0))}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-400">
                    {formatCurrency(visibleRows.reduce((s, r) => s + r.paid, 0))}
                  </td>
                  <td className="py-3 px-4 text-right text-amber-400">
                    {formatCurrency(visibleRows.reduce((s, r) => s + r.dueInPeriod, 0))}
                  </td>
                  <td className="py-3 px-4 text-right text-rose-400" colSpan={2}>
                    {formatCurrency(visibleRows.reduce((s, r) => s + r.cumulativeDebt, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* MODAL chi tiết công nợ 1 phòng */}
      {detailRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#1E293B] w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 border-b border-slate-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-100">Chi tiết công nợ: {detailRow.room.roomNumber}</h3>
                  <p className="text-xs text-slate-400">{periodLabel}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailRoomId(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Thông tin người thuê */}
              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-700 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Họ tên</span>
                  <strong className="text-slate-100">{detailRow.room.tenant?.name || 'Đã trả phòng'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">SĐT</span>
                  <span className="text-indigo-400 font-mono">{detailRow.room.tenant?.phone || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">CCCD</span>
                  <span className="text-slate-200 font-mono">{detailRow.room.tenant?.idCard || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Ngày vào ở</span>
                  <span className="text-slate-200">{detailRow.room.tenant ? formatDate(detailRow.room.tenant.startDate) : '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Tiền cọc</span>
                  <span className="text-amber-400 font-bold">{formatCurrency(detailRow.room.tenant?.deposit || 0)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Tổng nợ lũy kế</span>
                  <span className={`font-black ${detailRow.cumulativeDebt > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {formatCurrency(detailRow.cumulativeDebt)}
                  </span>
                </div>
              </div>

              {/* Hóa đơn trong kỳ */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider mb-2">
                  Hóa đơn trong kỳ ({detailRow.rangeInvoices.length})
                </h4>
                {detailRow.rangeInvoices.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center bg-slate-900/60 rounded-2xl border border-slate-800">
                    Không có hóa đơn nào trong khoảng chọn
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-700">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-slate-400 text-[10px] uppercase tracking-wider">
                          <th className="py-2.5 px-3">Mã HĐ</th>
                          <th className="py-2.5 px-3">Kỳ</th>
                          <th className="py-2.5 px-3 text-right">Tổng</th>
                          <th className="py-2.5 px-3 text-right">Đã trả</th>
                          <th className="py-2.5 px-3 text-right">Còn lại</th>
                          <th className="py-2.5 px-3 text-center">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-200">
                        {detailRow.rangeInvoices.map((inv) => {
                          const remaining = Math.max(0, inv.totalAmount - inv.paidAmount);
                          return (
                            <tr key={inv.id}>
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-300">{inv.invoiceCode}</td>
                              <td className="py-2 px-3">T{inv.month}/{inv.year}</td>
                              <td className="py-2 px-3 text-right font-bold">{formatCurrency(inv.totalAmount)}</td>
                              <td className="py-2 px-3 text-right text-emerald-400">{formatCurrency(inv.paidAmount)}</td>
                              <td className={`py-2 px-3 text-right font-bold ${remaining > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                                {formatCurrency(remaining)}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    inv.status === 'PAID'
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : inv.status === 'PENDING_APPROVAL'
                                      ? 'bg-blue-500/20 text-blue-300'
                                      : 'bg-rose-500/20 text-rose-300'
                                  }`}
                                >
                                  {inv.status === 'PAID' ? 'Đã nộp' : inv.status === 'PENDING_APPROVAL' ? 'Chờ duyệt' : inv.status === 'PARTIAL' ? 'Nộp một phần' : inv.status === 'OVERDUE' ? 'Quá hạn' : 'Chưa nộp'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Giao dịch trong khoảng */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider mb-2">
                  Giao dịch thanh toán trong khoảng ({detailPayments.length})
                </h4>
                {detailPayments.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center bg-slate-900/60 rounded-2xl border border-slate-800">
                    Không phát sinh giao dịch trong khoảng ngày này
                  </p>
                ) : (
                  <div className="space-y-2">
                    {detailPayments.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="text-slate-300 font-bold">{formatDateTime(p.paidAt)}</div>
                          <div className="text-[11px] text-slate-400">
                            Kỳ T{p.month}/{p.year} • {p.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt'}
                            {p.transactionRef ? ` • Ref: ${p.transactionRef}` : ''}{' '}
                            {p.approvedByAdmin ? '• Đã duyệt' : '• Chờ duyệt'}
                          </div>
                        </div>
                        <span className="font-black text-emerald-400 text-sm">{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
