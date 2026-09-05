import React, { useState } from 'react';
import {
  AppProvider,
  useApp,
} from './context/AppContext';
import { Navbar } from './components/Navbar';
import { DashboardOverview } from './components/admin/DashboardOverview';
import { ElectricityManager } from './components/admin/ElectricityManager';
import { InvoiceList } from './components/admin/InvoiceList';
import { RevenueReport } from './components/admin/RevenueReport';
import { PaymentHistoryLog } from './components/admin/PaymentHistoryLog';
import { RoomManagement } from './components/admin/RoomManagement';
import { TenantDashboard } from './components/tenant/TenantDashboard';
import { NotificationModal } from './components/NotificationModal';
import { LoginModal } from './components/LoginModal';
import { InvoiceDetailModal } from './components/InvoiceDetailModal';
import { Invoice } from './types';
import {
  LayoutDashboard,
  Zap,
  FileText,
  BarChart3,
  CreditCard,
  Building2,
  BellRing,
} from 'lucide-react';

type AdminTab = 'dashboard' | 'electricity' | 'invoices' | 'revenue' | 'payments' | 'rooms';

const MainAppContent: React.FC = () => {
  const { currentUser, payments } = useApp();
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<Invoice | null>(null);
  const [filterPaymentIdInLog, setFilterPaymentIdInLog] = useState<string | undefined>(undefined);

  const pendingApprovalsCount = payments.filter((p) => !p.approvedByAdmin).length;

  const handleSelectRoomForElectricity = (roomId: string) => {
    setAdminTab('electricity');
  };

  const handleSelectPaymentFromNotif = (paymentId: string) => {
    setFilterPaymentIdInLog(paymentId);
    setAdminTab('payments');
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        onOpenNotifications={() => setIsNotificationOpen(true)}
        onOpenQuickLogin={() => setIsLoginModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* If Tenant is logged in */}
        {currentUser?.role === 'TENANT' ? (
          <TenantDashboard />
        ) : currentUser?.role === 'ADMIN' ? (
          /* If Admin is logged in */
          <div className="space-y-6">
            {/* Admin navigation tabs styled as Bento segmented bar */}
            <div className="bg-[#1E293B] border border-slate-700/80 rounded-2xl p-1.5 flex overflow-x-auto no-scrollbar gap-1.5 shadow-sm">
              <button
                onClick={() => setAdminTab('dashboard')}
                className={`py-2 px-3.5 sm:px-4 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center space-x-2 ${
                  adminTab === 'dashboard'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Tổng quan</span>
              </button>

              <button
                onClick={() => setAdminTab('electricity')}
                className={`py-2 px-3.5 sm:px-4 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center space-x-2 ${
                  adminTab === 'electricity'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Ghi số điện (4k/số)</span>
              </button>

              <button
                onClick={() => setAdminTab('invoices')}
                className={`py-2 px-3.5 sm:px-4 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center space-x-2 ${
                  adminTab === 'invoices'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Hóa đơn & Nhắc tiền</span>
              </button>

              <button
                onClick={() => setAdminTab('revenue')}
                className={`py-2 px-3.5 sm:px-4 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center space-x-2 ${
                  adminTab === 'revenue'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Báo cáo doanh thu</span>
              </button>

              <button
                onClick={() => setAdminTab('payments')}
                className={`py-2 px-3.5 sm:px-4 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center space-x-2 relative ${
                  adminTab === 'payments'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Lịch sử thanh toán</span>
                {pendingApprovalsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded-full text-[10px] font-black">
                    {pendingApprovalsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setAdminTab('rooms')}
                className={`py-2 px-3.5 sm:px-4 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center space-x-2 ${
                  adminTab === 'rooms'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>16 Phòng trọ</span>
              </button>
            </div>

            {/* Tab content view */}
            {adminTab === 'dashboard' && (
              <DashboardOverview
                onNavigateTab={(tab) => setAdminTab(tab)}
                onSelectRoomForElectricity={handleSelectRoomForElectricity}
              />
            )}

            {adminTab === 'electricity' && <ElectricityManager />}

            {adminTab === 'invoices' && (
              <InvoiceList onViewInvoiceDetail={(inv) => setSelectedInvoiceForModal(inv)} />
            )}

            {adminTab === 'revenue' && <RevenueReport />}

            {adminTab === 'payments' && (
              <PaymentHistoryLog initialFilterPaymentId={filterPaymentIdInLog} />
            )}

            {adminTab === 'rooms' && (
              <RoomManagement onRecordElectricity={handleSelectRoomForElectricity} />
            )}
          </div>
        ) : (
          /* Not logged in fallback */
          <div className="py-16 text-center space-y-4 bg-[#1E293B] border border-slate-700 rounded-3xl p-12 max-w-xl mx-auto shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
              <Building2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              Chào mừng bạn đến với Hệ Thống Quản Lý Nhà Trọ An Cư
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Vui lòng đăng nhập với tài khoản Chủ Trọ hoặc chọn phòng thuê để xem hóa đơn, tiền điện nước và thanh toán.
            </p>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition"
            >
              Đăng nhập ngay
            </button>
          </div>
        )}
      </main>

      {/* Global Modals */}
      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onSelectPayment={handleSelectPaymentFromNotif}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      <InvoiceDetailModal
        invoice={selectedInvoiceForModal}
        onClose={() => setSelectedInvoiceForModal(null)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
