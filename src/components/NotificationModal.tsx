import React from 'react';
import { X, Bell, CheckCircle, Clock, AlertTriangle, CreditCard, CheckCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDateTime } from '../utils/formatters';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPayment?: (paymentId: string) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  onSelectPayment,
}) => {
  const {
    currentUser,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    approvePayment,
  } = useApp();

  if (!isOpen) return null;

  // Filter notifications relevant to current user
  const userNotifications = notifications.filter((n) => {
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN') {
      return n.targetRole === 'ADMIN' || n.targetRole === 'ALL';
    }
    return (
      (n.targetRole === 'TENANT' || n.targetRole === 'ALL') &&
      (!n.targetRoomId || n.targetRoomId === currentUser.roomId)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Thông báo & Lời nhắc</h3>
              <p className="text-xs text-slate-500">
                {userNotifications.filter((n) => !n.isRead).length} thông báo chưa đọc
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {userNotifications.some((n) => !n.isRead) && (
              <button
                onClick={markAllNotificationsAsRead}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center space-x-1 px-2 py-1 rounded hover:bg-indigo-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Đọc tất cả</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 divide-y divide-slate-100">
          {userNotifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Bell className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium">Hiện không có thông báo nào</p>
            </div>
          ) : (
            userNotifications.map((notif) => {
              let Icon = Bell;
              let iconBg = 'bg-blue-100 text-blue-700';
              if (notif.type === 'PAYMENT_REMINDER') {
                Icon = AlertTriangle;
                iconBg = 'bg-amber-100 text-amber-700';
              } else if (notif.type === 'PAYMENT_RECEIVED') {
                Icon = CreditCard;
                iconBg = 'bg-emerald-100 text-emerald-700';
              } else if (notif.type === 'SYSTEM') {
                Icon = CheckCircle;
                iconBg = 'bg-indigo-100 text-indigo-700';
              }

              return (
                <div
                  key={notif.id}
                  onClick={() => markNotificationAsRead(notif.id)}
                  className={`pt-3 first:pt-0 p-3 rounded-xl transition cursor-pointer ${
                    !notif.isRead ? 'bg-indigo-50/40 border border-indigo-100/80' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-xs font-bold ${!notif.isRead ? 'text-indigo-950' : 'text-slate-800'}`}>
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                          {formatDateTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {notif.message}
                      </p>

                      {/* Action for Admin if it's payment confirmation */}
                      {currentUser?.role === 'ADMIN' && notif.relatedPaymentId && (
                        <div className="mt-2.5 flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (notif.relatedPaymentId) {
                                approvePayment(notif.relatedPaymentId);
                                markNotificationAsRead(notif.id);
                              }
                            }}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs flex items-center space-x-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Xác nhận đã nhận tiền</span>
                          </button>
                          {onSelectPayment && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (notif.relatedPaymentId) {
                                  onSelectPayment(notif.relatedPaymentId);
                                  onClose();
                                }
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium"
                            >
                              Xem chi tiết
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Hệ thống tự động nhắc nợ mỗi chu kỳ thanh toán</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-white border border-slate-300 rounded-md text-slate-700 font-medium hover:bg-slate-50"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
