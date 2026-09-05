import React from 'react';
import { X, Printer, CheckCircle, Zap, Droplets, Building2 } from 'lucide-react';
import { Invoice } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({ invoice, onClose }) => {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const isVIP = invoice.roomType === 'VIP';
  const isPaid = invoice.status === 'PAID';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top bar */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <span className="text-xs font-bold text-slate-700">Chi Tiết Hóa Đơn & Phiếu Thu</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 text-xs flex items-center space-x-1"
              title="In phiếu thu"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">In phiếu</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-800 text-xs">
          {/* Header */}
          <div className="text-center pb-4 border-b border-slate-200">
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
              PHIẾU THU TIỀN PHÒNG & ĐIỆN NƯỚC
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              HỆ THỐNG NHÀ TRỌ AN CƯ
            </p>
            <div className="mt-2 inline-block font-mono text-[11px] bg-slate-100 px-3 py-1 rounded-full text-slate-700 font-bold">
              Mã số: {invoice.invoiceCode} • Kỳ: Tháng {invoice.month}/{invoice.year}
            </div>
          </div>

          {/* Tenant & Room details */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-400 block text-[10px]">Phòng thuê:</span>
              <strong className="text-slate-900 text-sm font-bold">
                {invoice.roomNumber} ({isVIP ? 'Phòng VIP' : 'Phòng Thường'})
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Người thuê:</span>
              <strong className="text-slate-900 font-semibold">{invoice.tenantName}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Hạn nộp tiền:</span>
              <strong className="text-slate-700">{formatDate(invoice.dueDate)}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Trạng thái:</span>
              <strong className={isPaid ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                {isPaid ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN'}
              </strong>
            </div>
          </div>

          {/* Calculation breakdown table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-700">
                  <th className="py-2 px-3">Khoản thu</th>
                  <th className="py-2 px-3 text-center">Chỉ số / SL</th>
                  <th className="py-2 px-3 text-right">Đơn giá</th>
                  <th className="py-2 px-3 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* 1. Tiền phòng */}
                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-800">1. Tiền thuê phòng</td>
                  <td className="py-2 px-3 text-center text-slate-500">1 tháng</td>
                  <td className="py-2 px-3 text-right text-slate-600">
                    {formatCurrency(invoice.roomPrice)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900">
                    {formatCurrency(invoice.roomPrice)}
                  </td>
                </tr>

                {/* 2. Tiền điện */}
                <tr>
                  <td className="py-2 px-3">
                    <span className="font-semibold text-amber-900">2. Tiền điện</span>
                    <div className="text-[10px] text-slate-400">
                      Cũ: {invoice.oldElectricityIndex} &rarr; Mới: {invoice.newElectricityIndex}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center font-bold text-amber-800">
                    {invoice.electricityUsage} số
                  </td>
                  <td className="py-2 px-3 text-right text-slate-600">4.000 đ</td>
                  <td className="py-2 px-3 text-right font-bold text-amber-900">
                    {formatCurrency(invoice.electricityAmount)}
                  </td>
                </tr>

                {/* 3. Tiền nước */}
                <tr>
                  <td className="py-2 px-3 font-semibold text-blue-900">3. Tiền nước sinh hoạt</td>
                  <td className="py-2 px-3 text-center text-slate-600">{invoice.waterUsage} người</td>
                  <td className="py-2 px-3 text-right text-slate-600">
                    {formatCurrency(invoice.waterRate)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-blue-900">
                    {formatCurrency(invoice.waterAmount)}
                  </td>
                </tr>

                {/* 4. Dịch vụ */}
                <tr>
                  <td className="py-2 px-3 text-slate-700">4. Wifi & Internet</td>
                  <td className="py-2 px-3 text-center text-slate-500">1 phòng</td>
                  <td className="py-2 px-3 text-right text-slate-600">{formatCurrency(invoice.wifiFee)}</td>
                  <td className="py-2 px-3 text-right font-semibold text-slate-800">
                    {formatCurrency(invoice.wifiFee)}
                  </td>
                </tr>

                <tr>
                  <td className="py-2 px-3 text-slate-700">5. Rác & Vệ sinh</td>
                  <td className="py-2 px-3 text-center text-slate-500">1 phòng</td>
                  <td className="py-2 px-3 text-right text-slate-600">{formatCurrency(invoice.garbageFee)}</td>
                  <td className="py-2 px-3 text-right font-semibold text-slate-800">
                    {formatCurrency(invoice.garbageFee)}
                  </td>
                </tr>

                {invoice.otherFee ? (
                  <tr>
                    <td className="py-2 px-3 text-slate-700">
                      6. Phụ phí: {invoice.otherFeeNote || 'Khác'}
                    </td>
                    <td className="py-2 px-3 text-center text-slate-500">---</td>
                    <td className="py-2 px-3 text-right text-slate-600">---</td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-800">
                      {formatCurrency(invoice.otherFee)}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* Grand total */}
          <div className="bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-300">
              Tổng tiền cần thanh toán:
            </span>
            <span className="text-base font-black text-amber-400">
              {formatCurrency(invoice.totalAmount)}
            </span>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 text-center pt-4 text-xs">
            <div>
              <span className="font-bold text-slate-700 block">Người nộp tiền</span>
              <span className="text-[10px] text-slate-400 italic">(Ký và ghi rõ họ tên)</span>
              <div className="h-12"></div>
              <span className="font-medium text-slate-600">{invoice.tenantName}</span>
            </div>
            <div>
              <span className="font-bold text-slate-700 block">Chủ nhà trọ</span>
              <span className="text-[10px] text-slate-400 italic">(Xác nhận đã nhận tiền)</span>
              <div className="h-12"></div>
              <span className="font-medium text-slate-600">Nguyễn Văn Quản</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
