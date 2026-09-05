import React, { useState } from 'react';
import {
  Building,
  Zap,
  Droplets,
  Wifi,
  Trash2,
  Calendar,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  History,
  Bell,
  Sparkles,
  Info,
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  Send,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate, formatDateTime, getVietQRUrl } from '../../utils/formatters';
import { PaymentModal } from './PaymentModal';

export const TenantDashboard: React.FC = () => {
  const {
    currentUser,
    rooms,
    invoices,
    payments,
    notifications,
    submitPayment,
    currentMonth,
    currentYear,
  } = useApp();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'current_bill' | 'payment_qr' | 'history' | 'notifications'>('current_bill');

  // Inline payment form states
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [inlineAlert, setInlineAlert] = useState<string | null>(null);

  const tenantRoom = rooms.find((r) => r.id === currentUser?.roomId);

  // Invoices for this room
  const roomInvoices = invoices.filter((inv) => inv.roomId === tenantRoom?.id);
  const currentInvoice =
    roomInvoices.find((inv) => inv.month === currentMonth && inv.year === currentYear) ||
    roomInvoices[0];

  // Payments for this room
  const roomPayments = payments.filter((p) => p.roomId === tenantRoom?.id);

  // Notifications for this tenant
  const tenantNotifications = notifications.filter(
    (n) =>
      (n.targetRole === 'TENANT' || n.targetRole === 'ALL') &&
      (!n.targetRoomId || n.targetRoomId === tenantRoom?.id)
  );

  const isVIP = tenantRoom?.type === 'VIP';
  const isPaid = currentInvoice?.status === 'PAID';
  const isPending = currentInvoice?.status === 'PENDING_APPROVAL';
  const isUnpaid = currentInvoice?.status === 'UNPAID';

  const bankAccount = '0909999888';
  const bankName = 'MB Bank (Ngân hàng Quân Đội)';
  const accountHolder = 'NGUYEN VAN QUAN (CHỦ TRỌ)';
  const transferMemo = currentInvoice
    ? `${currentInvoice.roomNumber.replace(/\s+/g, '')} T${currentInvoice.month} ${currentInvoice.year}`
    : `PHONG T${currentMonth}`;

  const qrUrl = currentInvoice
    ? getVietQRUrl({
        bank: 'MB',
        accountNo: bankAccount,
        accountName: accountHolder,
        amount: currentInvoice.totalAmount,
        description: transferMemo,
      })
    : '';

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

  const handleConfirmPaymentInline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInvoice) return;

    const ok = submitPayment({
      invoiceId: currentInvoice.id,
      amount: currentInvoice.totalAmount,
      method: 'BANK_TRANSFER',
      transactionRef: transactionRef.trim() || undefined,
      note: paymentNote.trim() || `Khách ${currentUser?.fullName} chuyển khoản tiền phòng ${currentInvoice.roomNumber}`,
    });

    if (ok) {
      setInlineAlert(
        'Đã gửi thông báo cho chủ trọ thành công! Khi chủ trọ kiểm tra thấy tiền về tài khoản sẽ bấm xác nhận.'
      );
      setTransactionRef('');
      setPaymentNote('');
    }
  };

  if (!tenantRoom) {
    return (
      <div className="bg-[#1E293B] p-8 rounded-3xl border border-slate-700 text-center text-slate-400">
        Không tìm thấy thông tin phòng cho tài khoản này. Vui lòng liên hệ chủ trọ.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Automated Reminder Banner if unpaid */}
      {isUnpaid && currentInvoice && (
        <div className="bg-amber-500/10 p-5 sm:p-6 rounded-3xl border border-amber-500/30 shadow-sm animate-in fade-in">
          <div className="flex items-start space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-sm">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-amber-300">
                  Thông Báo Nhắc Nhở Đóng Tiền Tự Động • Tháng {currentInvoice.month}/{currentInvoice.year}
                </h3>
                <span className="text-xs font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-3 py-0.5 rounded-full self-start">
                  Hạn nộp: {formatDate(currentInvoice.dueDate)}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Kính gửi quý khách <strong className="text-slate-100">{currentUser?.fullName}</strong> ({tenantRoom.roomNumber}), hóa đơn tiền phòng và điện nước tháng này của bạn là{' '}
                <strong className="text-amber-400 text-sm font-black">{formatCurrency(currentInvoice.totalAmount)}</strong>. Quý khách vui lòng chuyển khoản theo mã QR và ấn xác nhận đã chuyển để gửi thông báo cho chủ trọ.
              </p>

              <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setActiveTab('payment_qr')}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-sm transition flex items-center space-x-1.5"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Mở Mục Đóng Tiền & Mã QR VietQR</span>
                </button>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Mở hộp thoại nhanh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Approval Notice */}
      {isPending && (
        <div className="bg-blue-500/10 p-5 rounded-3xl border border-blue-500/30 shadow-sm animate-in fade-in flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-black text-blue-300">
              Đã Gửi Báo Cáo Chuyển Tiền • Đang Chờ Chủ Trọ Xác Nhận
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Bạn đã bấm xác nhận chuyển khoản cho hóa đơn Tháng {currentInvoice?.month}. Chủ trọ đã nhận được thông báo và sẽ bấm xác nhận ngay khi tiền vào tài khoản ngân hàng.
            </p>
          </div>
        </div>
      )}

      {/* Paid Notice */}
      {isPaid && (
        <div className="bg-emerald-500/10 p-5 rounded-3xl border border-emerald-500/30 shadow-sm animate-in fade-in flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-emerald-300">
              Hóa Đơn Tháng Này Đã Được Chủ Trọ Xác Nhận Thanh Toán
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Cảm ơn quý khách đã thanh toán đúng hạn! Lịch sử đóng tiền chi tiết đã được lưu trữ an toàn trong tài khoản của bạn và tài khoản chủ trọ.
            </p>
          </div>
        </div>
      )}

      {/* Room Overview Card */}
      <div className="bg-[#1E293B] p-6 rounded-3xl border border-slate-700 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                isVIP
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              }`}
            >
              {isVIP ? 'VIP' : 'TH'}
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl font-black text-slate-100">{tenantRoom.roomNumber}</h1>
                <span
                  className={`text-xs font-extrabold px-2.5 py-0.5 rounded-md ${
                    isVIP
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {isVIP ? 'Phòng VIP: 2.000.000 đ/tháng' : 'Phòng Thường: 1.000.000 đ/tháng'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Khách thuê: <strong className="text-slate-200">{currentUser?.fullName}</strong> • SĐT: {currentUser?.phone} • {tenantRoom.area}m²
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 text-xs">
            <div className="bg-slate-900/90 px-3.5 py-2 rounded-2xl border border-slate-700">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Chỉ số điện kỳ trước
              </span>
              <strong className="text-slate-100 font-extrabold">{tenantRoom.lastElectricityIndex} kWh</strong>
            </div>
            <div className="bg-slate-900/90 px-3.5 py-2 rounded-2xl border border-slate-700">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Đơn giá điện
              </span>
              <strong className="text-amber-400 font-extrabold">4.000 đ / số</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-[#1E293B] p-1.5 rounded-2xl border border-slate-700 flex flex-wrap gap-1.5 shadow-sm">
        <button
          onClick={() => setActiveTab('current_bill')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'current_bill'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Hóa Đơn Tháng Này</span>
        </button>

        {/* Dedicated "Đóng Tiền" Tab as explicitly requested */}
        <button
          onClick={() => setActiveTab('payment_qr')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'payment_qr'
              ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
              : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Đóng Tiền & Mã QR</span>
          {isUnpaid && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Lịch Sử Đóng Tiền ({roomPayments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'notifications'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Hộp Thư Nhắc Nhở ({tenantNotifications.length})</span>
        </button>
      </div>

      {/* TAB 1: Current Bill Details */}
      {activeTab === 'current_bill' && (
        <div className="space-y-6">
          {currentInvoice ? (
            <div className="bg-[#1E293B] rounded-3xl border border-slate-700 shadow-sm overflow-hidden">
              {/* Bill Status Header */}
              <div className="p-6 border-b border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      Mã: {currentInvoice.invoiceCode}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs font-bold text-slate-200">
                      Kỳ thu: Tháng {currentInvoice.month}/{currentInvoice.year}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Hạn chót thanh toán: <strong className="text-slate-200">{formatDate(currentInvoice.dueDate)}</strong>
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center space-x-1.5 ${
                      isPaid
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : isPending
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {isPaid ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Đã thanh toán</span>
                      </>
                    ) : isPending ? (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        <span>Chờ chủ trọ xác nhận</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Chưa thanh toán</span>
                      </>
                    )}
                  </span>

                  {!isPaid && (
                    <button
                      onClick={() => setActiveTab('payment_qr')}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-sm transition flex items-center space-x-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{isPending ? 'Xem lại thông tin CK' : 'Đóng tiền bằng VietQR'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Breakdown lines */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Room Fee */}
                  <div className="p-4 rounded-2xl border border-slate-700 bg-slate-900/60 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">1. Tiền thuê phòng</span>
                      <strong className="text-slate-100 font-extrabold text-sm">
                        {formatCurrency(currentInvoice.roomPrice)}
                      </strong>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {isVIP ? 'Phòng VIP tiêu chuẩn (2.000.000 đ/tháng)' : 'Phòng thường (1.000.000 đ/tháng)'}
                    </p>
                  </div>

                  {/* Electricity Fee (Key requirement 4k/số) */}
                  <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5 text-amber-300 font-bold">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>2. Tiền điện (4.000 đ/số)</span>
                      </div>
                      <strong className="text-amber-400 font-black text-sm">
                        {formatCurrency(currentInvoice.electricityAmount)}
                      </strong>
                    </div>
                    <div className="text-[11px] text-slate-300 flex items-center justify-between">
                      <span>
                        Số cũ: <strong className="text-slate-100">{currentInvoice.oldElectricityIndex}</strong> &rarr; Số mới:{' '}
                        <strong className="text-amber-400">{currentInvoice.newElectricityIndex}</strong>
                      </span>
                      <span className="font-bold text-amber-300">
                        {currentInvoice.electricityUsage} số x 4.000đ
                      </span>
                    </div>
                  </div>

                  {/* Water Fee */}
                  <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5 text-blue-300 font-bold">
                        <Droplets className="w-3.5 h-3.5 text-blue-400" />
                        <span>3. Tiền nước sinh hoạt</span>
                      </div>
                      <strong className="text-blue-300 font-black text-sm">
                        {formatCurrency(currentInvoice.waterAmount)}
                      </strong>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {currentInvoice.waterUsage} người x {formatCurrency(currentInvoice.waterRate)}/người
                    </p>
                  </div>

                  {/* Wifi & Garbage */}
                  <div className="p-4 rounded-2xl border border-slate-700 bg-slate-900/60 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5 text-slate-300 font-bold">
                        <Wifi className="w-3.5 h-3.5 text-indigo-400" />
                        <span>4. Dịch vụ (Wifi + Rác)</span>
                      </div>
                      <strong className="text-slate-100 font-extrabold text-sm">
                        {formatCurrency(currentInvoice.wifiFee + currentInvoice.garbageFee)}
                      </strong>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Wifi: {formatCurrency(currentInvoice.wifiFee)} • Rác: {formatCurrency(currentInvoice.garbageFee)}
                    </p>
                  </div>
                </div>

                {/* Total Line */}
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                      Tổng cộng hóa đơn cần đóng:
                    </span>
                    <div className="text-2xl font-black text-amber-400 mt-1">
                      {formatCurrency(currentInvoice.totalAmount)}
                    </div>
                  </div>

                  {!isPaid && (
                    <button
                      onClick={() => setActiveTab('payment_qr')}
                      className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-md transition flex items-center justify-center space-x-2"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Chuyển Sang Phần Đóng Tiền & Mã QR</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#1E293B] p-8 rounded-3xl border border-slate-700 text-center text-slate-400">
              Chưa có hóa đơn nào cho phòng này trong tháng hiện tại.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DEDICATED PAYMENT & QR CODE SECTION */}
      {activeTab === 'payment_qr' && (
        <div className="space-y-6">
          {inlineAlert && (
            <div className="bg-emerald-500/20 border border-emerald-500/40 p-4 rounded-2xl text-emerald-200 text-xs font-bold flex items-center justify-between shadow-lg animate-in fade-in">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{inlineAlert}</span>
              </div>
              <button onClick={() => setInlineAlert(null)} className="text-emerald-400 hover:text-white">
                ✕
              </button>
            </div>
          )}

          {currentInvoice ? (
            <div className="bg-[#1E293B] rounded-3xl border border-slate-700 shadow-sm p-6 sm:p-8 space-y-6">
              <div>
                <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                  <QrCode className="w-4 h-4" />
                  <span>Cổng Đóng Tiền Trực Tuyến & Mã QR VietQR</span>
                </div>
                <h2 className="text-xl font-black text-slate-100 mt-1">
                  Đóng Tiền Phòng {tenantRoom.roomNumber} • Tháng {currentInvoice.month}/{currentInvoice.year}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Quét mã QR hoặc sao chép thông tin tài khoản ngân hàng của chủ trọ bên dưới. Sau khi chuyển xong, ấn <strong>Xác nhận đã chuyển</strong> để hệ thống gửi thông báo cho chủ trọ kiểm tra.
                </p>
              </div>

              {/* Bento Grid: Left = VietQR & Bank Info, Right = Payment Amount & Confirm Form */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Col (VietQR & Bank Info) */}
                <div className="lg:col-span-6 bg-slate-900/90 rounded-3xl p-6 border border-slate-700/80 flex flex-col items-center justify-between space-y-5">
                  <div className="w-full text-center">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Mã VietQR Tự Động Điền Số Tiền & Nội Dung
                    </span>
                    <div className="bg-white p-4 rounded-2xl inline-block shadow-lg border-2 border-indigo-500/30">
                      <img
                        src={qrUrl}
                        alt="VietQR MBBank"
                        className="w-52 h-52 sm:w-60 sm:h-60 object-contain mx-auto"
                      />
                      <div className="mt-2 text-[10px] text-slate-600 font-semibold text-center flex items-center justify-center space-x-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Napas 24/7 • MB Bank Chuẩn Quốc Gia</span>
                      </div>
                    </div>
                  </div>

                  {/* Bank Details with 1-click copy */}
                  <div className="w-full space-y-2.5 pt-2 border-t border-slate-800 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Ngân hàng:</span>
                        <span className="font-bold text-slate-200">{bankName}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Số tài khoản:</span>
                        <span className="font-mono font-black text-amber-400 text-sm">{bankAccount}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(bankAccount, 'account')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center space-x-1 transition"
                      >
                        {copiedAccount ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Sao chép STK</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Chủ tài khoản:</span>
                        <span className="font-bold text-slate-200 uppercase">{accountHolder}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Nội dung chuyển khoản:</span>
                        <span className="font-mono font-bold text-indigo-300">{transferMemo}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(transferMemo, 'memo')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center space-x-1 transition"
                      >
                        {copiedMemo ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Col (Bill Breakdown & Confirm Form) */}
                <div className="lg:col-span-6 flex flex-col justify-between space-y-5">
                  {/* Bill Summary */}
                  <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-700/80 space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <span className="text-xs font-bold text-slate-400">Số tiền cần thanh toán:</span>
                      <span className="text-2xl font-black text-amber-400">
                        {formatCurrency(currentInvoice.totalAmount)}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tiền phòng ({isVIP ? 'VIP' : 'Thường'}):</span>
                        <span>{formatCurrency(currentInvoice.roomPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          Tiền điện ({currentInvoice.electricityUsage} số x 4k):
                        </span>
                        <span className="text-amber-400 font-bold">
                          {formatCurrency(currentInvoice.electricityAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tiền nước ({currentInvoice.waterUsage} người):</span>
                        <span>{formatCurrency(currentInvoice.waterAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Dịch vụ (Wifi + Rác):</span>
                        <span>{formatCurrency(currentInvoice.wifiFee + currentInvoice.garbageFee)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Flow Status & Confirmation Form */}
                  {isPaid ? (
                    <div className="p-6 bg-emerald-500/15 rounded-3xl border border-emerald-500/30 text-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-black text-emerald-300">
                        Chủ Trọ Đã Xác Nhận Đã Nhận Tiền
                      </h4>
                      <p className="text-xs text-slate-300 max-w-sm mx-auto">
                        Hóa đơn này đã hoàn tất. Bạn không cần làm thêm thao tác nào.
                      </p>
                    </div>
                  ) : isPending ? (
                    <div className="p-6 bg-blue-500/15 rounded-3xl border border-blue-500/30 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center justify-center mx-auto">
                        <Clock className="w-6 h-6 animate-pulse" />
                      </div>
                      <h4 className="text-base font-black text-blue-300">
                        Đã Gửi Báo Cáo Chuyển Tiền • Chờ Chủ Trọ Xác Nhận
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Bạn đã gửi thông báo đến tài khoản chủ trọ. Khi chủ trọ kiểm tra tài khoản ngân hàng thấy tiền về sẽ bấm <strong>"Xác nhận đã nhận tiền"</strong>.
                      </p>
                      <button
                        onClick={() => {
                          // Allow re-submitting if needed
                          const ok = submitPayment({
                            invoiceId: currentInvoice.id,
                            amount: currentInvoice.totalAmount,
                            method: 'BANK_TRANSFER',
                            note: 'Gửi lại nhắc nhở xác nhận',
                          });
                          if (ok) setInlineAlert('Đã gửi lại thông báo nhắc chủ trọ kiểm tra tài khoản!');
                        }}
                        className="text-xs text-indigo-400 hover:underline font-bold"
                      >
                        Bấm vào đây để gửi lại thông báo nhắc nếu chờ lâu
                      </button>
                    </div>
                  ) : (
                    <form
                      onSubmit={handleConfirmPaymentInline}
                      className="p-5 sm:p-6 bg-slate-900/90 rounded-3xl border border-slate-700/80 space-y-4"
                    >
                      <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                        <Send className="w-4 h-4" />
                        <span>Bước 2: Xác Nhận Đã Chuyển Tiền</span>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed">
                        Sau khi bạn chuyển tiền thành công trên ứng dụng ngân hàng, vui lòng ấn nút xác nhận bên dưới để gửi thông báo cho chủ trọ:
                      </p>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Mã giao dịch ngân hàng / Ref Code (Tùy chọn)
                        </label>
                        <input
                          type="text"
                          placeholder="Ví dụ: MB-982312, VCB-0912..."
                          value={transactionRef}
                          onChange={(e) => setTransactionRef(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 text-slate-100 font-mono rounded-xl focus:outline-hidden focus:border-indigo-500 placeholder-slate-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Lời nhắn gửi chủ trọ (Tùy chọn)
                        </label>
                        <input
                          type="text"
                          placeholder="Ví dụ: Em vừa chuyển khoản tiền phòng tháng này ạ"
                          value={paymentNote}
                          onChange={(e) => setPaymentNote(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 text-slate-100 rounded-xl focus:outline-hidden focus:border-indigo-500 placeholder-slate-600"
                        />
                      </div>

                      {/* Prominent Confirmation Button */}
                      <button
                        type="submit"
                        className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs sm:text-sm rounded-2xl transition shadow-lg flex items-center justify-center space-x-2"
                      >
                        <Send className="w-4 h-4" />
                        <span>XÁC NHẬN ĐÃ CHUYỂN TIỀN (GỬI BÁO CHỦ TRỌ)</span>
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#1E293B] p-8 rounded-3xl border border-slate-700 text-center text-slate-400">
              Chưa có hóa đơn nào cần đóng trong tháng này.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Payment History */}
      {activeTab === 'history' && (
        <div className="bg-[#1E293B] rounded-3xl border border-slate-700 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-700/80 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-100">
              Lịch Sử Thanh Toán Của {tenantRoom.roomNumber}
            </h3>
            <span className="text-xs text-slate-400">Báo về cho tài khoản chủ trọ</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/90 border-b border-slate-700/80 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Thời gian</th>
                  <th className="py-3.5 px-4">Kỳ hóa đơn</th>
                  <th className="py-3.5 px-4 text-right">Số tiền</th>
                  <th className="py-3.5 px-4">Hình thức</th>
                  <th className="py-3.5 px-4">Mã GD / Ghi chú</th>
                  <th className="py-3.5 px-4 text-center">Xác nhận của chủ trọ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {roomPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                      Chưa có lịch sử thanh toán nào
                    </td>
                  </tr>
                ) : (
                  roomPayments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-3 px-4 text-slate-400">{formatDateTime(pay.paidAt)}</td>
                      <td className="py-3 px-4 font-bold text-slate-200">
                        Tháng {pay.month}/{pay.year}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-400 text-sm">
                        {formatCurrency(pay.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {pay.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {pay.transactionRef && (
                          <div className="font-mono text-[10px] text-indigo-400 font-bold">Ref: {pay.transactionRef}</div>
                        )}
                        <div className="text-[11px] text-slate-400 italic truncate">{pay.note || '---'}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {pay.approvedByAdmin ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Chủ trọ đã xác nhận</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                            <Clock className="w-3 h-3" />
                            <span>Đang chờ chủ trọ xác nhận</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Notifications & Reminders */}
      {activeTab === 'notifications' && (
        <div className="bg-[#1E293B] rounded-3xl border border-slate-700 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-slate-100 pb-3 border-b border-slate-700/80">
            Hộp Thư Thông Báo Tự Động Từ Chủ Trọ
          </h3>

          <div className="space-y-3">
            {tenantNotifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-medium">
                Không có thông báo nào
              </div>
            ) : (
              tenantNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-4 rounded-2xl border border-slate-700/80 bg-slate-900/60 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                    <div className="flex items-center space-x-2">
                      <Bell className="w-4 h-4 text-indigo-400" />
                      <span className="font-extrabold text-slate-100">{notif.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {formatDateTime(notif.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed pl-6">
                    {notif.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VietQR Payment Modal */}
      {currentInvoice && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          invoice={currentInvoice}
        />
      )}
    </div>
  );
};
