import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Room,
  Invoice,
  PaymentRecord,
  AppNotification,
  UserAccount,
  PaymentMethod,
  Tenant,
} from '../types';
import {
  INITIAL_ROOMS,
  INITIAL_INVOICES,
  INITIAL_PAYMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_USERS,
} from '../data/initialData';

export interface AssignTenantData {
  name: string;
  phone: string;
  idCard: string;
  email?: string;
  startDate: string;
  deposit: number;
  occupants?: number;
  startElectricityIndex?: number;
}

interface AppContextType {
  currentUser: UserAccount | null;
  users: UserAccount[];
  rooms: Room[];
  invoices: Invoice[];
  payments: PaymentRecord[];
  notifications: AppNotification[];
  currentMonth: number;
  currentYear: number;
  login: (username: string) => boolean;
  logout: () => void;
  switchUser: (userId: string) => void;
  recordElectricityAndCreateInvoice: (params: {
    roomId: string;
    oldIndex: number;
    newIndex: number;
    month: number;
    year: number;
    waterCount?: number;
    otherFee?: number;
    otherFeeNote?: string;
  }) => { success: boolean; message: string; invoice?: Invoice };
  sendPaymentReminder: (invoiceId: string | 'all') => number; // returns count of reminders sent
  submitPayment: (params: {
    invoiceId: string;
    amount: number;
    method: PaymentMethod;
    transactionRef?: string;
    note?: string;
  }) => boolean;
  approvePayment: (paymentId: string) => void;
  approveInvoicePayment: (invoiceId: string) => void;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  assignTenantToRoom: (roomId: string, data: AssignTenantData) => boolean;
  removeTenantFromRoom: (roomId: string, reason?: string) => boolean;
  updateTenant: (roomId: string, tenantData: Partial<Tenant>, occupants?: number) => void;
  toggleRoomStatus: (roomId: string) => void;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  resetData: () => void;
  unreadNotificationCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ROOMS: 'nhatro_rooms_v2',
  INVOICES: 'nhatro_invoices_v2',
  PAYMENTS: 'nhatro_payments_v2',
  NOTIFICATIONS: 'nhatro_notifications_v2',
  CURRENT_USER: 'nhatro_current_user_v2',
  USERS: 'nhatro_users_v2',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentMonth = 9;
  const currentYear = 2026;

  // Load state from localStorage or fallback to initial data
  const [users, setUsers] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    // Default to Admin so landlord immediately sees the dashboard
    return INITIAL_USERS[0];
  });

  const [rooms, setRooms] = useState<Room[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ROOMS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_ROOMS;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.INVOICES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_INVOICES;
  });

  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_PAYMENTS;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_NOTIFICATIONS;
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }, [currentUser]);

  // Login handler
  const login = (username: string): boolean => {
    const user = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const switchUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setCurrentUser(user);
    }
  };

  // 1. Record Electricity & Auto-Calculate Bill
  const recordElectricityAndCreateInvoice = ({
    roomId,
    oldIndex,
    newIndex,
    month,
    year,
    waterCount,
    otherFee = 0,
    otherFeeNote,
  }: {
    roomId: string;
    oldIndex: number;
    newIndex: number;
    month: number;
    year: number;
    waterCount?: number;
    otherFee?: number;
    otherFeeNote?: string;
  }) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) {
      return { success: false, message: 'Không tìm thấy phòng!' };
    }

    if (newIndex < oldIndex) {
      return {
        success: false,
        message: `Số điện mới (${newIndex}) không được nhỏ hơn số điện cũ (${oldIndex})!`,
      };
    }

    const electricityUsage = newIndex - oldIndex;
    const electricityRate = 4000; // 4.000 VNĐ / số điện theo đúng yêu cầu
    const electricityAmount = electricityUsage * electricityRate;

    // Room pricing
    const roomPrice = room.basePrice; // 2.000.000 cho VIP, 1.000.000 cho Thường

    // Water pricing: Water per person
    const occupants = waterCount !== undefined ? waterCount : room.currentOccupants || 1;
    const waterAmount = occupants * room.waterRate;

    const wifiFee = room.wifiFee;
    const garbageFee = room.garbageFee;

    const totalAmount = roomPrice + electricityAmount + waterAmount + wifiFee + garbageFee + otherFee;

    const invoiceCode = `HD-${year}${String(month).padStart(2, '0')}-${room.id.replace('-', '')}`;

    // Check if invoice already exists for this room, month, year
    const existingIndex = invoices.findIndex(
      (inv) => inv.roomId === roomId && inv.month === month && inv.year === year
    );

    let updatedInvoice: Invoice;

    if (existingIndex >= 0) {
      const prev = invoices[existingIndex];
      updatedInvoice = {
        ...prev,
        oldElectricityIndex: oldIndex,
        newElectricityIndex: newIndex,
        electricityUsage,
        electricityRate,
        electricityAmount,
        waterUsage: occupants,
        waterAmount,
        wifiFee,
        garbageFee,
        otherFee,
        otherFeeNote,
        totalAmount,
        paidAmount: prev.status === 'PAID' ? totalAmount : prev.paidAmount,
      };

      const updatedList = [...invoices];
      updatedList[existingIndex] = updatedInvoice;
      setInvoices(updatedList);
    } else {
      updatedInvoice = {
        id: `INV-${Date.now()}-${roomId}`,
        invoiceCode,
        roomId: room.id,
        roomNumber: room.roomNumber,
        roomType: room.type,
        month,
        year,
        dueDate: `${year}-${String(month).padStart(2, '0')}-10`,
        tenantName: room.tenant?.name || 'Khách thuê',
        tenantPhone: room.tenant?.phone || '',
        roomPrice,
        oldElectricityIndex: oldIndex,
        newElectricityIndex: newIndex,
        electricityUsage,
        electricityRate,
        electricityAmount,
        waterBillingType: room.waterBillingType,
        waterUsage: occupants,
        waterRate: room.waterRate,
        waterAmount,
        wifiFee,
        garbageFee,
        otherFee,
        otherFeeNote,
        totalAmount,
        paidAmount: 0,
        status: 'UNPAID',
        createdAt: new Date().toISOString(),
        remindedCount: 0,
      };

      setInvoices((prev) => [updatedInvoice, ...prev]);
    }

    // UPDATE ROOM's lastElectricityIndex to the newIndex so next month automatically uses it!
    setRooms((prevRooms) =>
      prevRooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              lastElectricityIndex: newIndex,
            }
          : r
      )
    );

    // Create a notification for the tenant that a bill has been prepared
    const notif: AppNotification = {
      id: `NOTIF-${Date.now()}`,
      targetRole: 'TENANT',
      targetRoomId: room.id,
      title: `Hóa đơn tiền phòng Tháng ${month}/${year}`,
      message: `Hóa đơn mới của ${room.roomNumber} đã được lập. Điện tiêu thụ: ${electricityUsage} số (đơn giá 4.000đ/số = ${electricityAmount.toLocaleString('vi-VN')} đ). Tổng tiền: ${totalAmount.toLocaleString('vi-VN')} đ.`,
      type: 'INVOICE_CREATED',
      isRead: false,
      createdAt: new Date().toISOString(),
      relatedInvoiceId: updatedInvoice.id,
    };
    setNotifications((prev) => [notif, ...prev]);

    return {
      success: true,
      message: `Đã chốt số điện ${newIndex} kWh và tính hóa đơn ${totalAmount.toLocaleString('vi-VN')} đ thành công! Số điện mới đã được lưu cho kỳ sau.`,
      invoice: updatedInvoice,
    };
  };

  // 2. Automatic Monthly Payment Reminder
  const sendPaymentReminder = (invoiceId: string | 'all'): number => {
    const targetInvoices =
      invoiceId === 'all'
        ? invoices.filter((inv) => inv.month === currentMonth && inv.year === currentYear && inv.status === 'UNPAID')
        : invoices.filter((inv) => inv.id === invoiceId);

    if (targetInvoices.length === 0) return 0;

    const nowStr = new Date().toISOString();
    const newNotifs: AppNotification[] = [];

    const updatedInvoices = invoices.map((inv) => {
      const isTarget = targetInvoices.some((t) => t.id === inv.id);
      if (isTarget) {
        newNotifs.push({
          id: `NOTIF-REMIND-${Date.now()}-${inv.id}`,
          targetRole: 'TENANT',
          targetRoomId: inv.roomId,
          title: `Nhắc đóng tiền phòng Tháng ${inv.month}/${inv.year}`,
          message: `Kính gửi anh/chị ${inv.tenantName} (${inv.roomNumber}), tiền phòng & điện nước tháng ${inv.month} là ${inv.totalAmount.toLocaleString('vi-VN')} đ. Hạn nộp là ${inv.dueDate}. Vui lòng quét mã VietQR để thanh toán sớm.`,
          type: 'PAYMENT_REMINDER',
          isRead: false,
          createdAt: nowStr,
          relatedInvoiceId: inv.id,
        });

        return {
          ...inv,
          remindedCount: inv.remindedCount + 1,
          lastRemindedAt: nowStr,
        };
      }
      return inv;
    });

    setInvoices(updatedInvoices);
    if (newNotifs.length > 0) {
      setNotifications((prev) => [...newNotifs, ...prev]);
    }

    return targetInvoices.length;
  };

  // 3. Tenant submits payment -> Notifies landlord, records payment
  const submitPayment = ({
    invoiceId,
    amount,
    method,
    transactionRef,
    note,
  }: {
    invoiceId: string;
    amount: number;
    method: PaymentMethod;
    transactionRef?: string;
    note?: string;
  }): boolean => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return false;

    const nowStr = new Date().toISOString();
    const paymentId = `PAY-${Date.now()}`;

    // Create payment record
    const newPayment: PaymentRecord = {
      id: paymentId,
      invoiceId: invoice.id,
      invoiceCode: invoice.invoiceCode,
      roomId: invoice.roomId,
      roomNumber: invoice.roomNumber,
      roomType: invoice.roomType,
      tenantName: invoice.tenantName,
      amount,
      paymentMethod: method,
      transactionRef,
      note,
      paidAt: nowStr,
      approvedByAdmin: false, // Tenant submits payment -> Wait for landlord to see bank transfer and approve!
      month: invoice.month,
      year: invoice.year,
    };

    setPayments((prev) => [newPayment, ...prev]);

    // Update invoice status to PENDING_APPROVAL
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              paidAmount: amount,
              status: 'PENDING_APPROVAL',
              paidAt: nowStr,
            }
          : inv
      )
    );

    // Send instant notification to landlord account!
    const landlordNotif: AppNotification = {
      id: `NOTIF-PAY-${Date.now()}`,
      targetRole: 'ADMIN',
      title: `Báo có thanh toán: ${invoice.roomNumber}`,
      message: `${invoice.roomNumber} (${invoice.tenantName}) vừa gửi xác nhận thanh toán số tiền ${amount.toLocaleString('vi-VN')} đ qua ${
        method === 'BANK_TRANSFER' ? 'VietQR / Chuyển khoản' : 'Tiền mặt'
      }${transactionRef ? ` (Mã GD: ${transactionRef})` : ''}. Vui lòng kiểm tra tài khoản và bấm xác nhận tiền về.`,
      type: 'PAYMENT_RECEIVED',
      isRead: false,
      createdAt: nowStr,
      relatedInvoiceId: invoice.id,
      relatedPaymentId: paymentId,
    };

    setNotifications((prev) => [landlordNotif, ...prev]);

    return true;
  };

  // 4. Landlord approves payment when money arrives in bank account
  const approvePayment = (paymentId: string) => {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return;

    const nowStr = new Date().toISOString();

    // Mark payment approved
    setPayments((prev) =>
      prev.map((p) =>
        p.id === paymentId
          ? { ...p, approvedByAdmin: true, approvedAt: nowStr }
          : p
      )
    );

    // Update invoice status to PAID
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === payment.invoiceId
          ? { ...inv, status: 'PAID', paidAmount: payment.amount, paidAt: payment.paidAt }
          : inv
      )
    );

    // Send confirmation back to tenant
    const tenantNotif: AppNotification = {
      id: `NOTIF-APP-${Date.now()}`,
      targetRole: 'TENANT',
      targetRoomId: payment.roomId,
      title: 'Chủ trọ đã xác nhận nhận tiền!',
      message: `Chủ trọ đã kiểm tra tài khoản và xác nhận nhận đủ số tiền ${payment.amount.toLocaleString('vi-VN')} đ cho ${payment.roomNumber} (${payment.invoiceCode}). Hóa đơn của bạn đã hoàn tất!`,
      type: 'SYSTEM',
      isRead: false,
      createdAt: nowStr,
      relatedInvoiceId: payment.invoiceId,
    };

    setNotifications((prev) => [tenantNotif, ...prev]);
  };

  // Approve payment directly by invoice ID (convenience helper)
  const approveInvoicePayment = (invoiceId: string) => {
    const pendingPayment = payments.find(
      (p) => p.invoiceId === invoiceId && !p.approvedByAdmin
    );
    if (pendingPayment) {
      approvePayment(pendingPayment.id);
    } else {
      // If no pending payment object exists yet, create an approved payment record
      const invoice = invoices.find((inv) => inv.id === invoiceId);
      if (!invoice) return;

      const nowStr = new Date().toISOString();
      const paymentId = `PAY-${Date.now()}`;

      const newPayment: PaymentRecord = {
        id: paymentId,
        invoiceId: invoice.id,
        invoiceCode: invoice.invoiceCode,
        roomId: invoice.roomId,
        roomNumber: invoice.roomNumber,
        roomType: invoice.roomType,
        tenantName: invoice.tenantName,
        amount: invoice.totalAmount,
        paymentMethod: 'BANK_TRANSFER',
        note: 'Chủ trọ trực tiếp xác nhận đã nhận đủ tiền',
        paidAt: nowStr,
        approvedByAdmin: true,
        approvedAt: nowStr,
        month: invoice.month,
        year: invoice.year,
      };

      setPayments((prev) => [newPayment, ...prev]);

      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId
            ? { ...inv, status: 'PAID', paidAmount: invoice.totalAmount, paidAt: nowStr }
            : inv
        )
      );

      const tenantNotif: AppNotification = {
        id: `NOTIF-APP-${Date.now()}`,
        targetRole: 'TENANT',
        targetRoomId: invoice.roomId,
        title: 'Chủ trọ đã xác nhận nhận tiền!',
        message: `Chủ trọ đã xác nhận đã nhận đủ tiền phòng & dịch vụ tháng ${invoice.month}/${invoice.year} cho ${invoice.roomNumber}. Cảm ơn bạn!`,
        type: 'SYSTEM',
        isRead: false,
        createdAt: nowStr,
        relatedInvoiceId: invoice.id,
      };

      setNotifications((prev) => [tenantNotif, ...prev]);
    }
  };

  // 5. Room & Tenant Management
  const updateRoom = (roomId: string, updates: Partial<Room>) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, ...updates } : r))
    );
  };

  // Assign tenant to vacant room (Cho thuê phòng trống)
  const assignTenantToRoom = (roomId: string, data: AssignTenantData): boolean => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return false;

    const tenantId = `T-${roomId.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;
    const newTenant: Tenant = {
      id: tenantId,
      name: data.name.trim(),
      phone: data.phone.trim(),
      idCard: data.idCard.trim(),
      email: data.email?.trim(),
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      deposit: data.deposit,
    };

    const occupants = data.occupants || 1;
    const lastElec = data.startElectricityIndex !== undefined ? data.startElectricityIndex : room.lastElectricityIndex;

    // Update room
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? {
              ...r,
              isOccupied: true,
              currentOccupants: occupants,
              tenant: newTenant,
              lastElectricityIndex: lastElec,
            }
          : r
      )
    );

    // Create or update user account for this room so tenant can log in
    const roomClean = room.roomNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
    const username = roomClean.replace('phong', 'p'); // e.g. "pa1" or "p1"
    const userId = `user-${room.id.toLowerCase()}`;

    setUsers((prev) => {
      const existing = prev.findIndex((u) => u.roomId === roomId);
      const newAcc: UserAccount = {
        id: userId,
        username: username,
        role: 'TENANT',
        fullName: newTenant.name,
        phone: newTenant.phone,
        roomId: room.id,
      };

      if (existing >= 0) {
        const next = [...prev];
        next[existing] = newAcc;
        return next;
      }
      return [...prev, newAcc];
    });

    // Send admin notification
    const nowStr = new Date().toISOString();
    setNotifications((prev) => [
      {
        id: `NOTIF-ASSIGN-${Date.now()}`,
        targetRole: 'ADMIN',
        title: `Đã cho thuê: ${room.roomNumber}`,
        message: `${room.roomNumber} (${room.type === 'VIP' ? 'VIP' : 'Thường'}) đã được bàn giao cho khách ${newTenant.name} (${newTenant.phone}). Tiền cọc: ${data.deposit.toLocaleString('vi-VN')} đ.`,
        type: 'SYSTEM',
        isRead: false,
        createdAt: nowStr,
      },
      ...prev,
    ]);

    return true;
  };

  // Remove tenant from room (Khách không thuê nữa / Trả phòng)
  const removeTenantFromRoom = (roomId: string, reason?: string): boolean => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return false;

    const formerTenantName = room.tenant?.name || 'Khách thuê';
    const formerTenantPhone = room.tenant?.phone || '';

    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? {
              ...r,
              isOccupied: false,
              currentOccupants: 0,
              tenant: undefined,
            }
          : r
      )
    );

    // Remove or reset tenant user account
    setUsers((prev) => prev.filter((u) => u.roomId !== roomId));

    // Send notification
    const nowStr = new Date().toISOString();
    setNotifications((prev) => [
      {
        id: `NOTIF-LEAVE-${Date.now()}`,
        targetRole: 'ADMIN',
        title: `Trả phòng: ${room.roomNumber}`,
        message: `${room.roomNumber} đã hoàn tất thủ tục trả phòng cho khách ${formerTenantName} (${formerTenantPhone}). Trạng thái phòng chuyển sang Còn trống.${
          reason ? ` Lý do: ${reason}` : ''
        }`,
        type: 'SYSTEM',
        isRead: false,
        createdAt: nowStr,
      },
      ...prev,
    ]);

    return true;
  };

  // Update existing tenant info
  const updateTenant = (roomId: string, tenantData: Partial<Tenant>, occupants?: number) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId && r.tenant) {
          const updatedTenant: Tenant = {
            ...r.tenant,
            ...tenantData,
          };
          return {
            ...r,
            tenant: updatedTenant,
            currentOccupants: occupants !== undefined ? occupants : r.currentOccupants,
          };
        }
        return r;
      })
    );

    // Sync user account fullName & phone
    if (tenantData.name || tenantData.phone) {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.roomId === roomId) {
            return {
              ...u,
              fullName: tenantData.name || u.fullName,
              phone: tenantData.phone || u.phone,
            };
          }
          return u;
        })
      );
    }
  };

  // Toggle room status between Occupied and Vacant
  const toggleRoomStatus = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    if (room.isOccupied) {
      removeTenantFromRoom(roomId, 'Chủ trọ chuyển trạng thái phòng sang trống');
    } else {
      // Default placeholder tenant when toggling to occupied
      assignTenantToRoom(roomId, {
        name: 'Khách thuê mới',
        phone: '0901 000 111',
        idCard: '079000000000',
        startDate: new Date().toISOString().split('T')[0],
        deposit: room.type === 'VIP' ? 2000000 : 1000000,
        occupants: 1,
      });
    }
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    if (!currentUser) return;
    setNotifications((prev) =>
      prev.map((n) => {
        if (
          currentUser.role === 'ADMIN' &&
          (n.targetRole === 'ADMIN' || n.targetRole === 'ALL')
        ) {
          return { ...n, isRead: true };
        }
        if (
          currentUser.role === 'TENANT' &&
          (n.targetRole === 'TENANT' || n.targetRole === 'ALL') &&
          (!n.targetRoomId || n.targetRoomId === currentUser.roomId)
        ) {
          return { ...n, isRead: true };
        }
        return n;
      })
    );
  };

  const resetData = () => {
    localStorage.removeItem(STORAGE_KEYS.ROOMS);
    localStorage.removeItem(STORAGE_KEYS.INVOICES);
    localStorage.removeItem(STORAGE_KEYS.PAYMENTS);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    setRooms(INITIAL_ROOMS);
    setInvoices(INITIAL_INVOICES);
    setPayments(INITIAL_PAYMENTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[0]);
  };

  // Unread notifications for current user
  const unreadNotificationCount = notifications.filter((n) => {
    if (n.isRead) return false;
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN') {
      return n.targetRole === 'ADMIN' || n.targetRole === 'ALL';
    }
    if (currentUser.role === 'TENANT') {
      return (
        (n.targetRole === 'TENANT' || n.targetRole === 'ALL') &&
        (!n.targetRoomId || n.targetRoomId === currentUser.roomId)
      );
    }
    return false;
  }).length;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        rooms,
        invoices,
        payments,
        notifications,
        currentMonth,
        currentYear,
        login,
        logout,
        switchUser,
        recordElectricityAndCreateInvoice,
        sendPaymentReminder,
        submitPayment,
        approvePayment,
        approveInvoicePayment,
        updateRoom,
        assignTenantToRoom,
        removeTenantFromRoom,
        updateTenant,
        toggleRoomStatus,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        resetData,
        unreadNotificationCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
