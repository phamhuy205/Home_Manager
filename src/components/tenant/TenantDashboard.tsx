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
  FileSignature,
  ShieldAlert,
  Download,
  ExternalLink,
  Wallet,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate, formatDateTime, getVietQRUrl } from '../../utils/formatters';
import { VIOLATION_TYPES } from '../../constants';
import { exportContractPdf } from '../../utils/pdf';
import { PaymentModal } from './PaymentModal';

type TenantTab = 'current_bill' | 'payment_qr' | 'history' | 'notifications' | 'contract_rules';

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
    setInvoiceBillingMode,
    contracts,
    warnings,
    warningLimit,
    warningCountForRoom,
    propertyName,
    ownerName,
  } = useApp();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [activeTab, setActiveTab] = useState<TenantTab>('current_bill');

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

  // Hợp đồng của phòng này (ưu tiên hợp đồng còn hiệu lực)
  const myContract = (() => {
    const list = contracts.filter((c) => c.roomId === tenantRoom?.id);
    return list.find((c) => c.status === 'ACTIVE') || list[0];
  })();

  // Cảnh cáo của người thuê hiện tại (bản lưu trữ của người cũ không hiển thị)
  const myWarnings = warnings.filter(
    (w) =>
      w.roomId === tenantRoom?.id &&
      w.status !== 'ARCHIVED' &&
      w.tenantName === (tenantRoom?.tenant?.name || currentUser?.fullName || '')
  );
  const myWarningCount = tenantRoom ? warningCountForRoom(tenantRoom.id) : 0;
  const isOverWarningLimit = myWarningCount >= warningLimit;

  // Tổng hợp cho tab Lịch sử đóng tiền
  const totalPaidAll = roomPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalConfirmed = roomPayments
    .filter((p) => p.approvedByAdmin)
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPending = totalPaidAll - totalConfirmed;
  const totalBilled = roomInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPaidOfBilled = roomInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);

  const isVIP = tenantRoom?.type === 'VIP';
  const isPaid = currentInvoice?.status === 'PAID';
  const isPending = currentInvoice?.status === 'PENDING_APPROVAL';
  const isUnpaid = currentInvoice?.status === 'UNPAID';

  const bankAccount = '103874953538';
  const bankName = 'VietinBank (Ngân hàng TMCP Công Thương)';
  const accountHolder = 'PHẠM XUÂN HUY';
  const transferMemo = currentInvoice
    ? `${currentInvoice.roomNumber.replace(/\s+/g, '')} T${currentInvoice.month} ${currentInvoice.year}`
    : `PHONG T${currentMonth}`;

  const mySplitIndexEarly = (() => {
    const username = currentUser?.username || '';
    const match = username.match(/-(\d+)$/);
    return match ? parseInt(match[1], 10) - 1 : 0;
  })();
  const myRemainingEarly = (() => {
    if (!currentInvoice) return 0;
    if (currentInvoice.splits && currentInvoice.splits.length > 0) {
      const s = currentInvoice.splits[mySplitIndexEarly];
      if (s) return Math.max(0, s.amount - s.paidAmount);
    }
    return currentInvoice.totalAmount;
  })();

  const qrUrl = currentInvoice
    ? getVietQRUrl({
        bank: 'ICB',
        accountNo: bankAccount,
        accountName: accountHolder,
        amount: myRemainingEarly,
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

  // Xác định phần share bill của tài khoản đang đăng nhập (username 'p1' -> người ở 1, 'p1-2' -> người ở 2)
  const mySplitIndex = (() => {
    const username = currentUser?.username || '';
    const match = username.match(/-(\d+)$/);
    return match ? parseInt(match[1], 10) - 1 : 0;
  })();
  const mySplit = currentInvoice?.splits && currentInvoice.splits.length > 0 ? currentInvoice.splits[mySplitIndex] || null : null;
  const myRemaining = mySplit ? Math.max(0, mySplit.amount - mySplit.paidAmount) : (currentInvoice?.totalAmount || 0);

  const handleConfirmPaymentInline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInvoice) return;

    const ok = submitPayment({
      invoiceId: currentInvoice.id,
      amount: myRemaining,
      method: 'BANK_TRANSFER',
      transactionRef: transactionRef.trim() || undefined,
      note: paymentNote.trim() || `Khách ${currentUser?.fullName} chuyển khoản phần tiền phòng ${currentInvoice.roomNumber}`,
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
      {tenantRoom && tenantRoom.currentOccupants > 1 && currentInvoice && (
        <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-3 flex items-center justify-between">
          <span className="text-xs text-slate-300 font-semibold">Chế độ chia tiền phòng:</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setInvoiceBillingMode(currentInvoice.id, 'COMBINED')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition ${currentInvoice.billingMode !== 'SPLIT' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
            >
              Tính chung (1 người trả hết)
            </button>
            <button
              onClick={() => setInvoiceBillingMode(currentInvoice.id, 'SPLIT')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition ${currentInvoice.billingMode === 'SPLIT' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}
            >
              Tính riêng (chia đều 2)
            </button>
          </div>
        </div>
      )}

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
                <strong className="text-amber-400 text-sm font-black">{formatCurrency(myRemainingEarly)}</strong>. Quý khách vui lòng chuyển khoản theo mã QR và ấn xác nhận đã chuyển để gửi thông báo cho chủ trọ.
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

        <button
          onClick={() => setActiveTab('contract_rules')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'contract_rules'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileSignature className="w-4 h-4" />
          <span>Hợp Đồng & Nội Quy</span>
          {myWarningCount > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                isOverWarningLimit ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-950'
              }`}
            >
              {myWarningCount}/{warningLimit}
            </span>
          )}
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
                      <span className="text-xs font-bold text-slate-400">
                        {currentInvoice.billingMode === 'SPLIT' ? 'Phần của bạn cần thanh toán:' : 'Số tiền cần thanh toán:'}
                      </span>
                      <span className="text-2xl font-black text-amber-400">
                        {formatCurrency(currentInvoice.billingMode === 'SPLIT' ? myRemainingEarly : currentInvoice.totalAmount)}
                      </span>
                    </div>

                    {currentInvoice.billingMode === 'SPLIT' && currentInvoice.splits && currentInvoice.splits.length > 0 && (
                      <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs space-y-1.5">
                        <div className="font-bold text-slate-300 uppercase text-[10px] tracking-wider">
                          Chia đều cho 2 người trong phòng:
                        </div>
                        {currentInvoice.splits.map((s) => (
                          <div key={s.id} className="flex justify-between items-center text-slate-300">
                            <span>{s.label}:</span>
                            <span className="flex items-center space-x-2">
                              <strong className="text-slate-100">{formatCurrency(s.amount)}</strong>
                              {s.status === 'PAID' ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">Đã thanh toán</span>
                              ) : s.status === 'PENDING_APPROVAL' ? (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">Chờ duyệt</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 text-[9px] font-bold">Chưa thanh toán</span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {currentInvoice.billingMode === 'SPLIT' && mySplit && mySplit.status !== 'UNPAID' && (
                      <div className={`p-3 rounded-xl text-xs font-bold border ${mySplit.status === 'PAID' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'}`}>
                        {mySplit.status === 'PAID'
                          ? `Phần của bạn (${mySplit.label}) đã thanh toán. Cảm ơn bạn!`
                          : `Phần của bạn (${mySplit.label}) đã được gửi, đang chờ chủ trọ xác nhận.`}
                      </div>
                    )}

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
                  {currentInvoice.billingMode === 'SPLIT' && mySplit && mySplit.status !== 'UNPAID' ? (
                    <div className={`p-6 rounded-3xl border text-center space-y-2 ${mySplit.status === 'PAID' ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-blue-500/15 border-blue-500/30'}`}>
                      <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto ${mySplit.status === 'PAID' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-blue-500/20 border-blue-500/40 text-blue-300'}`}>
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h4 className={`text-base font-black ${mySplit.status === 'PAID' ? 'text-emerald-300' : 'text-blue-300'}`}>
                        {mySplit.status === 'PAID' ? 'Chủ Trọ Đã Xác Nhận Phần Của Bạn' : 'Đã Gửi Xác Nhận Phần Của Bạn'}
                      </h4>
                      <p className="text-xs text-slate-300 max-w-sm mx-auto">
                        {mySplit.status === 'PAID'
                          ? `Phần ${mySplit.label} của bạn đã được xác nhận. Không cần thanh toán thêm.`
                          : `Phần ${mySplit.label} (${formatCurrency(mySplit.amount)}) đã gửi cho chủ trọ. Khi tiền vào tài khoản chủ trọ sẽ xác nhận.`}
                      </p>
                      <div className="mt-3 text-left text-[11px] text-slate-300 bg-slate-950/50 border border-slate-800 rounded-xl p-3 space-y-1">
                        <div className="font-bold text-slate-400 uppercase text-[10px]">Tổng chi phí phòng cả 2 đã dùng:</div>
                        <div className="flex justify-between"><span>Tiền phòng:</span><span>{formatCurrency(currentInvoice.roomPrice)}</span></div>
                        <div className="flex justify-between"><span>Tiền điện:</span><span>{formatCurrency(currentInvoice.electricityAmount)}</span></div>
                        <div className="flex justify-between"><span>Tiền nước:</span><span>{formatCurrency(currentInvoice.waterAmount)}</span></div>
                        <div className="flex justify-between"><span>Dịch vụ (Wifi+Rác):</span><span>{formatCurrency(currentInvoice.wifiFee + currentInvoice.garbageFee)}</span></div>
                        <div className="flex justify-between font-bold text-amber-300 border-t border-slate-800 pt-1"><span>Tổng:</span><span>{formatCurrency(currentInvoice.totalAmount)}</span></div>
                      </div>
                    </div>
                  ) : isPaid ? (
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
                            amount: currentInvoice.billingMode === 'SPLIT' ? myRemainingEarly : currentInvoice.totalAmount,
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
        <div className="space-y-4">
          {/* Tổng hợp số tiền đã đóng */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#1E293B] p-5 rounded-3xl border border-emerald-500/40 shadow-sm sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Tổng số tiền đã đóng
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-black text-emerald-400">{formatCurrency(totalPaidAll)}</div>
              <p className="text-[11px] text-slate-400 mt-1">
                Từ khi vào ở • {roomPayments.length} lần đóng tiền
              </p>
            </div>

            <div className="bg-[#1E293B] p-5 rounded-3xl border border-slate-700 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Chủ trọ đã xác nhận
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-black text-emerald-400">{formatCurrency(totalConfirmed)}</div>
              <p className="text-[11px] text-slate-400 mt-1">
                {roomPayments.filter((p) => p.approvedByAdmin).length} giao dịch đã duyệt
              </p>
            </div>

            <div className="bg-[#1E293B] p-5 rounded-3xl border border-slate-700 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Đang chờ duyệt
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-black text-amber-400">{formatCurrency(totalPending)}</div>
              <p className="text-[11px] text-slate-400 mt-1">
                {roomPayments.filter((p) => !p.approvedByAdmin).length} giao dịch chờ chủ trọ xác nhận
              </p>
            </div>

            <div className="bg-[#1E293B] p-5 rounded-3xl border border-slate-700 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Đã nộp / Kỳ phát sinh
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-black text-slate-100">
                {formatCurrency(totalPaidOfBilled)}{' '}
                <span className="text-sm font-bold text-slate-400">/ {formatCurrency(totalBilled)}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Tổng hóa đơn của phòng • còn nợ{' '}
                <strong className={totalBilled - totalPaidOfBilled > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                  {formatCurrency(Math.max(0, totalBilled - totalPaidOfBilled))}
                </strong>
              </p>
            </div>
          </div>

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
              {roomPayments.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-900 border-t-2 border-slate-700 text-slate-100 font-black text-xs">
                    <td className="py-3 px-4" colSpan={2}>
                      TỔNG CỘNG {roomPayments.length} LẦN ĐÓNG TIỀN
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-400 text-sm">
                      {formatCurrency(totalPaidAll)}
                    </td>
                    <td className="py-3 px-4 text-[10px] font-bold text-slate-400" colSpan={3}>
                      Đã xác nhận: {formatCurrency(totalConfirmed)} • Chờ duyệt:{' '}
                      {formatCurrency(totalPending)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
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

      {/* TAB 5: Hợp đồng thuê + Nội quy & Cảnh cáo */}
      {activeTab === 'contract_rules' && (
        <div className="space-y-6">
          {/* Banner vượt giới hạn cảnh cáo */}
          {isOverWarningLimit && (
            <div className="bg-rose-500/10 p-5 rounded-3xl border-2 border-rose-500/50 shadow-sm animate-in fade-in">
              <div className="flex items-start space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-rose-300">
                    BẠN ĐÃ ĐẠT GIỚI HẠN {myWarningCount}/{warningLimit} LẦN CẢNH BÁO
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Theo hợp đồng thuê và nội quy nhà trọ, khi đạt {warningLimit} lần cảnh cáo bạn phải làm thủ tục rời
                    khỏi nhà trọ. Vui lòng liên hệ chủ trọ ({ownerName}) để được hỗ trợ trong thời gian thỏa thuận.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Hợp đồng thuê nhà */}
          <div className="bg-[#1E293B] rounded-3xl border border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-500/20 text-violet-300 border border-violet-500/40 flex items-center justify-center">
                  <FileSignature className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-100">Hợp Đồng Thuê Nhà Điện Tử</h3>
                  <p className="text-xs text-slate-400">
                    {myContract ? `Mã HĐ: ${myContract.contractCode}` : 'Chưa có hợp đồng điện tử cho phòng này'}
                  </p>
                </div>
              </div>
              {myContract && (
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-black border self-start ${
                    myContract.status === 'TERMINATED'
                      ? 'bg-slate-700 text-slate-300 border-slate-600'
                      : myContract.status === 'EXPIRED' ||
                        (myContract.status === 'ACTIVE' &&
                          new Date(myContract.endDate).getTime() < Date.now())
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {myContract.status === 'TERMINATED'
                    ? 'Đã chấm dứt'
                    : myContract.status === 'EXPIRED' ||
                      new Date(myContract.endDate).getTime() < Date.now()
                    ? 'Đã hết hạn'
                    : 'Còn hiệu lực'}
                </span>
              )}
            </div>

            {myContract ? (
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-700">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Thời hạn
                    </span>
                    <span className="text-slate-100 font-bold">
                      {formatDate(myContract.startDate)} &rarr; {formatDate(myContract.endDate)}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-700">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Giá thuê
                    </span>
                    <span className="text-amber-400 font-black">
                      {formatCurrency(myContract.monthlyRent)}/tháng
                    </span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-700">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Tiền đặt cọc
                    </span>
                    <span className="text-slate-100 font-bold">{formatCurrency(myContract.deposit)}</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-700">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Hết hạn sau
                    </span>
                    <span className="text-slate-100 font-bold">
                      {Math.max(
                        0,
                        Math.ceil((new Date(myContract.endDate).getTime() - Date.now()) / 86_400_000)
                      )}{' '}
                      ngày
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => exportContractPdf(myContract, propertyName, ownerName)}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition flex items-center space-x-1.5 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải hợp đồng (PDF)</span>
                  </button>
                  {myContract.scanFilePath && (
                    <a
                      href={myContract.scanFilePath}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 transition flex items-center space-x-1.5"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Xem bản scan giấy</span>
                    </a>
                  )}
                  <button
                    onClick={() => setShowTerms((v) => !v)}
                    className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-black transition flex items-center space-x-1.5 shadow-sm"
                  >
                    <FileSignature className="w-4 h-4" />
                    <span>{showTerms ? 'Ẩn điều khoản' : 'Xem điều khoản & nội quy'}</span>
                  </button>
                </div>

                {showTerms && (
                  <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {myContract.terms || 'Chưa có điều khoản.'}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs">
                Phòng chưa được lập hợp đồng điện tử. Vui lòng liên hệ chủ trọ để ký hợp đồng.
              </div>
            )}
          </div>

          {/* Nội quy nhà trọ */}
          <div className="bg-[#1E293B] rounded-3xl border border-slate-700 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-extrabold text-slate-100">
                  Nội Quy Nhà Trọ — 6 Hành Vi Bị Cấm (mỗi lần bị lập biên bản)
                </h3>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-black border ${
                  isOverWarningLimit
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                Bạn: {myWarningCount}/{warningLimit} lần
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {VIOLATION_TYPES.map((v, idx) => {
                const count = myWarnings.filter(
                  (w) => w.violationType === v.type && w.status === 'ACTIVE'
                ).length;
                return (
                  <div
                    key={v.type}
                    className={`p-3.5 rounded-2xl border flex items-start justify-between gap-2 ${
                      count > 0
                        ? 'bg-rose-500/10 border-rose-500/40'
                        : 'bg-slate-900/70 border-slate-700'
                    }`}
                  >
                    <div>
                      <div className={`text-xs font-black ${count > 0 ? 'text-rose-300' : 'text-slate-200'}`}>
                        {idx + 1}. {v.label}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{v.hint}</div>
                    </div>
                    {count > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0">
                        {count} lần
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lịch sử cảnh cáo */}
          <div className="bg-[#1E293B] rounded-3xl border border-slate-700 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-100 pb-3 border-b border-slate-700/80">
              Lịch Sử Biên Bản Cảnh Cáo ({myWarnings.length})
            </h3>
            {myWarnings.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                🎉 Bạn chưa từng bị lập biên bản cảnh cáo. Hãy tiếp tục chấp hành nội quy nhà trọ!
              </div>
            ) : (
              <div className="space-y-2.5">
                {myWarnings.map((w) => (
                  <div
                    key={w.id}
                    className="p-4 rounded-2xl border border-slate-700/80 bg-slate-900/60 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <ShieldAlert
                          className={`w-4 h-4 ${w.status === 'ACTIVE' ? 'text-rose-400' : 'text-slate-500'}`}
                        />
                        <span className="text-xs font-black text-slate-100">
                          {VIOLATION_TYPES.find((v) => v.type === w.violationType)?.label || w.violationType}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            w.status === 'ACTIVE'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}
                        >
                          {w.status === 'ACTIVE' ? 'Còn hiệu lực' : 'Đã thu hồi'}
                        </span>
                      </div>
                      {w.description && (
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{w.description}</p>
                      )}
                      <p className="text-[10px] text-slate-500 mt-1">
                        {formatDateTime(w.issuedAt)} • Người lập: {w.issuedBy || 'Chủ trọ'}
                        {w.revokedReason ? ` • Lý do thu hồi: ${w.revokedReason}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
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
