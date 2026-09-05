import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  PieChart as PieIcon,
  Calendar,
  Layers,
  ArrowUpRight,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatNumber } from '../../utils/formatters';

export const RevenueReport: React.FC = () => {
  const { invoices, rooms, currentMonth, currentYear } = useApp();

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Invoices for selected month
  const monthInvoices = invoices.filter(
    (inv) => inv.month === selectedMonth && inv.year === selectedYear
  );

  // Financial calculations
  const totalExpected = monthInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
  const totalCollected = monthInvoices
    .filter((inv) => inv.status === 'PAID')
    .reduce((acc, inv) => acc + inv.paidAmount, 0);
  const totalDebt = totalExpected - totalCollected;
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  // Breakdown by revenue source
  const vipRoomRent = monthInvoices
    .filter((inv) => inv.roomType === 'VIP')
    .reduce((acc, inv) => acc + inv.roomPrice, 0);

  const stdRoomRent = monthInvoices
    .filter((inv) => inv.roomType === 'STANDARD')
    .reduce((acc, inv) => acc + inv.roomPrice, 0);

  const totalElectricity = monthInvoices.reduce((acc, inv) => acc + inv.electricityAmount, 0);
  const totalElectricityKwh = monthInvoices.reduce((acc, inv) => acc + inv.electricityUsage, 0);
  const totalWater = monthInvoices.reduce((acc, inv) => acc + inv.waterAmount, 0);
  const totalServices = monthInvoices.reduce(
    (acc, inv) => acc + inv.wifiFee + inv.garbageFee + (inv.otherFee || 0),
    0
  );

  // Multi-month comparison for BarChart
  const monthsComparisonData = [
    {
      month: 'Tháng 7/2026',
      doanhThu: 24500000,
      thucThu: 24500000,
      dien: 3800000,
    },
    {
      month: 'Tháng 8/2026',
      doanhThu: invoices
        .filter((inv) => inv.month === 8 && inv.year === 2026)
        .reduce((acc, inv) => acc + inv.totalAmount, 0) || 25200000,
      thucThu: invoices
        .filter((inv) => inv.month === 8 && inv.year === 2026 && inv.status === 'PAID')
        .reduce((acc, inv) => acc + inv.paidAmount, 0) || 25200000,
      dien: invoices
        .filter((inv) => inv.month === 8 && inv.year === 2026)
        .reduce((acc, inv) => acc + inv.electricityAmount, 0) || 4100000,
    },
    {
      month: 'Tháng 9/2026',
      doanhThu: totalExpected || 26800000,
      thucThu: totalCollected,
      dien: totalElectricity,
    },
  ];

  // Pie chart data for breakdown
  const pieData = [
    { name: 'Phòng VIP (5 phòng)', value: vipRoomRent, color: '#f59e0b' },
    { name: 'Phòng Thường (11 phòng)', value: stdRoomRent, color: '#10b981' },
    { name: 'Tiền điện (4k/số)', value: totalElectricity, color: '#3b82f6' },
    { name: 'Tiền nước & DV', value: totalWater + totalServices, color: '#8b5cf6' },
  ];

  const paidCount = monthInvoices.filter((inv) => inv.status === 'PAID').length;
  const unpaidCount = monthInvoices.filter((inv) => inv.status !== 'PAID').length;

  return (
    <div className="space-y-6">
      {/* Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1E293B] p-6 rounded-3xl border border-slate-700 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <BarChart3 className="w-4 h-4" />
            <span>Phân Tích & Báo Cáo Doanh Thu</span>
          </div>
          <h2 className="text-xl font-black text-slate-100 mt-1.5">
            Báo Cáo Tài Chính Tháng {selectedMonth}/{selectedYear}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Tổng hợp tiền phòng VIP (2tr), phòng thường (1tr), điện (4k/số), nước và công nợ
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 bg-slate-900 px-3 py-1 rounded-xl border border-slate-700">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs font-bold bg-transparent py-1.5 px-2 text-slate-200 focus:outline-hidden"
            >
              {[7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m} className="bg-slate-900 text-slate-100">
                  Tháng {m}/{selectedYear}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Top 4 KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Expected */}
        <div className="bg-[#1E293B] p-5 rounded-3xl border border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Doanh thu dự kiến</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-slate-100">
              {formatCurrency(totalExpected)}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-700/60">
            Gồm 16 phòng (5 VIP + 11 Thường) & DV
          </p>
        </div>

        {/* Collected */}
        <div className="bg-[#1E293B] p-5 rounded-3xl border border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Thực thu (Đã nộp)</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-emerald-400">
              {formatCurrency(totalCollected)}
            </div>
          </div>
          <p className="text-[11px] text-emerald-400 font-bold mt-2 pt-2 border-t border-slate-700/60">
            Đã thu {paidCount} / {monthInvoices.length} phòng ({collectionRate}%)
          </p>
        </div>

        {/* Debt */}
        <div className="bg-[#1E293B] p-5 rounded-3xl border border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Còn nợ (Chưa nộp)</span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-rose-400">
              {formatCurrency(totalDebt)}
            </div>
          </div>
          <p className="text-[11px] text-rose-400 font-bold mt-2 pt-2 border-t border-slate-700/60">
            Còn {unpaidCount} phòng chưa hoàn tất
          </p>
        </div>

        {/* Electricity stats */}
        <div className="bg-[#1E293B] p-5 rounded-3xl border border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tiền điện tiêu thụ</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-amber-400">
              {formatCurrency(totalElectricity)}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-700/60">
            Tổng {formatNumber(totalElectricityKwh)} số điện (x 4.000 đ)
          </p>
        </div>
      </div>

      {/* Visual Charts: Multi-month comparison & Revenue breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Bar chart */}
        <div className="lg:col-span-7 bg-[#1E293B] p-6 rounded-3xl border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-100">
                Biểu đồ Doanh thu & Thực thu qua các tháng
              </h3>
              <p className="text-xs text-slate-400">So sánh tiến độ thu tiền giữa các kỳ</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthsComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(val) => `${val / 1000000}tr`}
                />
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val))}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '16px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    border: '1px solid #334155',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="doanhThu" name="Doanh thu dự kiến" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="thucThu" name="Thực thu" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="dien" name="Tiền điện (4k/số)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Pie chart breakdown */}
        <div className="lg:col-span-5 bg-[#1E293B] p-6 rounded-3xl border border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-100">
              Cơ cấu nguồn thu Tháng {selectedMonth}/{selectedYear}
            </h3>
            <p className="text-xs text-slate-400">Tỷ trọng đóng góp từ phòng VIP, Thường & Điện nước</p>

            <div className="h-56 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => formatCurrency(Number(val))}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '12px',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-700/80 pt-3">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <span className="font-extrabold text-slate-100">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Breakdown Details Table */}
      <div className="bg-[#1E293B] rounded-3xl border border-slate-700 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-700/80 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-100">
              Bảng Kê Chi Tiết Từng Phòng Tháng {selectedMonth}/{selectedYear}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Chi tiết tiền phòng, số điện cũ/mới, tiền điện (4k), nước và trạng thái nộp
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-700/80 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Phòng</th>
                <th className="py-3.5 px-4">Loại</th>
                <th className="py-3.5 px-4">Người thuê</th>
                <th className="py-3.5 px-4 text-right">Tiền phòng</th>
                <th className="py-3.5 px-4 text-center">Số điện (Cũ &rarr; Mới)</th>
                <th className="py-3.5 px-4 text-right">Tiền điện (4k/số)</th>
                <th className="py-3.5 px-4 text-right">Nước & DV</th>
                <th className="py-3.5 px-4 text-right">Tổng cộng</th>
                <th className="py-3.5 px-4 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {monthInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    Chưa có hóa đơn nào cho Tháng {selectedMonth}/{selectedYear}
                  </td>
                </tr>
              ) : (
                monthInvoices.map((inv) => {
                  const isVIP = inv.roomType === 'VIP';
                  const isPaid = inv.status === 'PAID';

                  return (
                    <tr key={inv.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-3 px-4 font-extrabold text-slate-100">{inv.roomNumber}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                            isVIP ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {isVIP ? 'VIP (2tr)' : 'Thường (1tr)'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-200 font-medium">{inv.tenantName}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-300">
                        {formatCurrency(inv.roomPrice)}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-300">
                        {inv.oldElectricityIndex} &rarr; <strong className="text-amber-400">{inv.newElectricityIndex}</strong> ({inv.electricityUsage} số)
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-amber-400">
                        {formatCurrency(inv.electricityAmount)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        {formatCurrency(inv.waterAmount + inv.wifiFee + inv.garbageFee + (inv.otherFee || 0))}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-100 text-sm">
                        {formatCurrency(inv.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center space-x-1 ${
                            isPaid
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : inv.status === 'PENDING_APPROVAL'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          <span>
                            {isPaid
                              ? 'Đã thanh toán'
                              : inv.status === 'PENDING_APPROVAL'
                              ? 'Chờ duyệt'
                              : 'Chưa nộp'}
                          </span>
                        </span>
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
