import React, { useState } from 'react';
import {
  X,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Send,
  Building,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Invoice, PaymentMethod } from '../../types';
import { formatCurrency, getVietQRUrl } from '../../utils/formatters';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
}) => {
  const { submitPayment } = useApp();
  const [method, setMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [transactionRef, setTransactionRef] = useState('');
  const [note, setNote] = useState('');
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const bankAccount = '0909999888';
  const bankName = 'MB Bank (Ngân hàng Quân Đội)';
  const accountHolder = 'NGUYEN VAN QUAN (CHỦ TRỌ)';
  const transferMemo = `${invoice.roomNumber.replace(/\s+/g, '')} T${invoice.month} ${invoice.year}`;

  const qrUrl = getVietQRUrl({
    bank: 'MB',
    accountNo: bankAccount,
    accountName: accountHolder,
    amount: invoice.totalAmount,
    description: transferMemo,
  });

  const handleCopy = (text: string, type: 'account' | 'memo') => {
    navigator.clipboard.writeText(text);
    if (type === 'account') {
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    } else {
      setCopiedMemo(true);
      setTimeout(() => setCopiedMemo(false), 2000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = submitPayment({
      invoiceId: invoice.id,
      amount: invoice.totalAmount,
      method,
      transactionRef: transactionRef.trim() || undefined,
      note: note.trim() || `Thanh toán tiền phòng ${invoice.roomNumber} T${invoice.month}`,
    });

    if (ok) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-[#1E293B] w-full max-w-lg rounded-3xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-100">Thanh Toán Tiền Phòng & Điện Nước</h3>
              <p className="text-xs text-slate-400">
                {invoice.roomNumber} • Hóa đơn Tháng {invoice.month}/{invoice.year}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {isSuccess ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-black text-slate-100">
                Đã Gửi Báo Cáo Thanh Toán Đến Chủ Trọ!
              </h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Giao dịch của bạn đã được ghi nhận vào hệ thống và thông báo ngay đến tài khoản chủ trọ để đối soát, xác nhận.
              </p>
            </div>
          ) : (
            <>
              {/* Total amount banner */}
              <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">Số tiền cần thanh toán</span>
                  <div className="text-2xl font-black text-amber-400 mt-0.5">
                    {formatCurrency(invoice.totalAmount)}
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                  {invoice.roomType === 'VIP' ? 'Phòng VIP (2tr)' : 'Phòng Thường (1tr)'}
                </span>
              </div>

              {/* Payment Method Switch */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Hình thức thanh toán</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMethod('BANK_TRANSFER')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition ${
                      method === 'BANK_TRANSFER'
                        ? 'border-indigo-500 bg-indigo-600/30 text-indigo-200 ring-2 ring-indigo-500/30'
                        : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-indigo-400" />
                    <span>Quét mã VietQR / CK</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod('CASH')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition ${
                      method === 'CASH'
                        ? 'border-indigo-500 bg-indigo-600/30 text-indigo-200 ring-2 ring-indigo-500/30'
                        : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Building className="w-4 h-4 text-emerald-400" />
                    <span>Nộp tiền mặt</span>
                  </button>
                </div>
              </div>

              {/* Bank details & QR */}
              {method === 'BANK_TRANSFER' ? (
                <div className="space-y-4">
                  {/* QR Box */}
                  <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-700 flex flex-col sm:flex-row items-center gap-4">
                    <div className="bg-white p-2 rounded-xl shadow-xs shrink-0">
                      <img
                        src={qrUrl}
                        alt="VietQR Chuyển Khoản"
                        className="w-36 h-36 object-contain rounded-lg"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="space-y-2 text-xs w-full">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Ngân hàng</span>
                        <strong className="text-slate-100 font-bold">{bankName}</strong>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[11px]">Số tài khoản</span>
                        <div className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 mt-0.5">
                          <strong className="text-indigo-400 font-mono text-sm tracking-wider font-bold">
                            {bankAccount}
                          </strong>
                          <button
                            type="button"
                            onClick={() => handleCopy(bankAccount, 'account')}
                            className="text-slate-400 hover:text-indigo-400 p-1 transition"
                            title="Sao chép số tài khoản"
                          >
                            {copiedAccount ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[11px]">Chủ tài khoản</span>
                        <strong className="text-slate-100 font-bold">{accountHolder}</strong>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[11px]">Nội dung chuyển khoản</span>
                        <div className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 mt-0.5">
                          <strong className="text-amber-400 font-mono text-xs font-bold">
                            {transferMemo}
                          </strong>
                          <button
                            type="button"
                            onClick={() => handleCopy(transferMemo, 'memo')}
                            className="text-slate-400 hover:text-amber-400 p-1 transition"
                            title="Sao chép nội dung"
                          >
                            {copiedMemo ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transaction confirmation input */}
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Mã tham chiếu / Mã giao dịch ngân hàng (Tùy chọn)
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: MBB-12345678, VCB-8899..."
                        value={transactionRef}
                        onChange={(e) => setTransactionRef(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl font-mono focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Ghi chú gửi chủ trọ
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Em vừa chuyển khoản xong lúc 10h..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs shadow-md transition flex items-center justify-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Xác Nhận Đã Chuyển Khoản & Báo Chủ Trọ</span>
                    </button>
                  </form>
                </div>
              ) : (
                /* Cash payment submission */
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 text-xs text-slate-300 space-y-1">
                    <div className="font-bold flex items-center space-x-1 text-emerald-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Thanh toán tiền mặt trực tiếp:</span>
                    </div>
                    <p>
                      Vui lòng gặp chủ trọ Nguyễn Văn Quản tại văn phòng tầng trệt để nộp <strong className="text-amber-400">{formatCurrency(invoice.totalAmount)}</strong> và nhận phiếu thu.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Ghi chú nộp tiền mặt
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Đã gửi tiền cho cô Quản lúc chiều..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs shadow-md transition flex items-center justify-center space-x-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Xác Nhận Đã Nộp Tiền Mặt</span>
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
