import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Room,
  Invoice,
  PaymentRecord,
  AppNotification,
  UserAccount,
  PaymentMethod,
  Tenant,
  Contract,
  RoomWarning,
  ViolationType,
} from '../types';
import { buildDefaultContractTerms, VIOLATION_LABELS } from '../constants';

export interface AssignTenantData {
  name: string;
  phone: string;
  idCard: string;
  email?: string;
  startDate: string;
  deposit: number;
  occupants?: number;
  startElectricityIndex?: number;
  createContract?: boolean; // Tự tạo hợp đồng điện tử khi cho thuê
}

export interface ContractDraft {
  roomId: string;
  tenantId?: string;
  tenantName: string;
  tenantPhone: string;
  tenantIdCard: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  deposit: number;
  terms: string;
  notes?: string;
}

interface AppContextType {
  propertyName: string;
  ownerName: string;
  currentUser: UserAccount | null;
  users: UserAccount[];
  rooms: Room[];
  invoices: Invoice[];
  payments: PaymentRecord[];
  notifications: AppNotification[];
  contracts: Contract[];
  warnings: RoomWarning[];
  warningLimit: number;
  currentMonth: number;
  currentYear: number;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
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
  setInvoiceBillingMode: (invoiceId: string, mode: 'COMBINED' | 'SPLIT') => void;
  createTenantAccounts: (roomId: string, occupantCount: number) => { success: boolean; message: string };
  updateUserAccount: (userId: string, updates: Partial<UserAccount>) => void;
  deleteUserAccount: (userId: string) => void;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  resetData: () => void;
  updatePropertySettings: (propertyName: string, ownerName: string) => void;
  unreadNotificationCount: number;
  // Hợp đồng điện tử
  createContract: (draft: ContractDraft) => { success: boolean; message: string; contract?: Contract };
  updateContract: (contractId: string, updates: Partial<Contract>) => void;
  terminateContract: (contractId: string, reason: string) => void;
  uploadContractScan: (contractId: string, file: File) => Promise<{ success: boolean; message: string }>;
  // Cảnh cáo phòng trọ
  issueWarning: (roomId: string, violationType: ViolationType, description: string) => { success: boolean; message: string };
  revokeWarning: (warningId: string, reason: string) => void;
  setWarningLimit: (limit: number) => void;
  warningCountForRoom: (roomId: string) => number;
}

const normalizeRoomUsername = (roomNumber: string) =>
  roomNumber
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');

const AppContext = createContext<AppContextType | undefined>(undefined);

// Distribute a payment amount across splits in order and set their status
const applyAmountToSplits = (
  splits: Invoice['splits'],
  amount: number,
  status: 'PENDING_APPROVAL' | 'PAID'
): Invoice['splits'] => {
  if (!splits || splits.length === 0) return splits;
  let remaining = amount;
  return splits.map((split) => {
    if (remaining <= 0 || split.status === 'PAID') return split;
    const capacity = Math.max(0, split.amount - split.paidAmount);
    const applied = Math.min(capacity, remaining);
    if (applied <= 0) return split;
    remaining -= applied;
    const paidAmount = split.paidAmount + applied;
    return {
      ...split,
      paidAmount,
      status: paidAmount >= split.amount ? status : 'PENDING_APPROVAL',
    };
  });
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [systemDate, setSystemDate] = useState(() => new Date());
  const currentMonth = systemDate.getMonth() + 1;
  const currentYear = systemDate.getFullYear();

  useEffect(() => {
    const timer = window.setInterval(() => setSystemDate(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const [propertyName, setPropertyName] = useState<string>('');
  const [ownerName, setOwnerName] = useState<string>('');
  const [isHydrated, setIsHydrated] = useState(false);

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [warnings, setWarnings] = useState<RoomWarning[]>([]);
  const [warningLimit, setWarningLimitState] = useState<number>(5);

  useEffect(() => {
    const loadFromServer = async () => {
      try {
        const token = localStorage.getItem('hm_token');
        if (!token) {
          setIsHydrated(true);
          return;
        }
        try {
          const me = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
          if (me.ok) {
            const mePayload = await me.json();
            if (mePayload?.user) setCurrentUser(mePayload.user);
          } else {
            localStorage.removeItem('hm_token');
            setIsHydrated(true);
            return;
          }
        } catch {
          // fall through and still try loading state
        }
        const response = await fetch('/api/state', { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }
        const payload = await response.json();
        if (payload?.propertyName) setPropertyName(payload.propertyName);
        if (payload?.ownerName) setOwnerName(payload.ownerName);
        if (payload?.users?.length) setUsers(payload.users);
        if (payload?.rooms?.length) setRooms(payload.rooms);
        if (payload?.invoices) {
          const roomsById = new Map((payload.rooms || []).map((r: any) => [r.id, r]));
          setInvoices(payload.invoices.map((inv: any) => {
            if (inv.splits && inv.splits.length > 0) return inv;
            if (inv.billingMode === 'COMBINED') return inv;
            const room = roomsById.get(inv.roomId) as any;
            if (room && room.currentOccupants > 1) {
              const n = room.currentOccupants;
              const base = Math.round(inv.totalAmount / n);
              return {
                ...inv,
                splits: Array.from({ length: n }, (_, i) => ({
                  id: `SPLIT-${inv.roomId}-${inv.month}-${inv.year}-${i + 1}`,
                  label: `Người ở ${i + 1}`,
                  amount: i === 0 ? inv.totalAmount - base * (n - 1) : base,
                  paidAmount: 0,
                  status: 'UNPAID' as const,
                })),
              };
            }
            return inv;
          }));
        }
        if (payload?.payments) setPayments(payload.payments);
        if (payload?.notifications) setNotifications(payload.notifications);
        if (payload?.contracts) setContracts(payload.contracts);
        if (payload?.warnings) setWarnings(payload.warnings);
        if (payload?.warningLimit) setWarningLimitState(Number(payload.warningLimit));
      } catch (error) {
        console.error('Server state unavailable:', error);
      } finally {
        setIsHydrated(true);
      }
    };

    loadFromServer();
  }, []);

  // Auto-mark invoices past due date as OVERDUE
  useEffect(() => {
    if (!isHydrated) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setInvoices((prev) => {
      let changed = false;
      const next = prev.map((inv) => {
        if ((inv.status === 'UNPAID' || inv.status === 'PENDING_APPROVAL') && new Date(inv.dueDate).getTime() < today.getTime()) {
          changed = true;
          apiPut(`/api/invoices/${inv.id}`, { ...inv, status: 'OVERDUE' });
          return { ...inv, status: 'OVERDUE' as const };
        }
        return inv;
      });
      return changed ? next : prev;
    });
  }, [isHydrated, invoices.length]);

  useEffect(() => {
    // State is persisted through fine-grained CRUD calls in each mutation.
  }, [isHydrated]);

  // Tự chuyển hợp đồng đã quá hạn sang EXPIRED
  useEffect(() => {
    if (!isHydrated || contracts.length === 0) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setContracts((prev) => {
      let changed = false;
      const next = prev.map((c) => {
        if (c.status === 'ACTIVE' && new Date(c.endDate).getTime() < today.getTime()) {
          changed = true;
          const expired: Contract = { ...c, status: 'EXPIRED' };
          apiPut(`/api/contracts/${c.id}`, expired);
          return expired;
        }
        return c;
      });
      return changed ? next : prev;
    });
  }, [isHydrated, contracts.length]);

  // Nhắc trước khi hợp đồng hết hạn (≤ 30 ngày) — chỉ tạo thông báo 1 lần cho mỗi hợp đồng
  useEffect(() => {
    if (!isHydrated) return;
    const now = new Date();
    contracts.forEach((c) => {
      if (c.status !== 'ACTIVE') return;
      const days = Math.ceil((new Date(c.endDate).getTime() - now.getTime()) / 86_400_000);
      if (days < 0 || days > 30) return;
      const notifId = `NOTIF-CTREXP-${c.id}`;
      if (notifications.some((n) => n.id === notifId)) return;
      const notif: AppNotification = {
        id: notifId,
        targetRole: 'ADMIN',
        title: `Hợp đồng sắp hết hạn: ${c.roomNumber}`,
        message: `Hợp đồng ${c.contractCode} của ${c.tenantName} (${c.roomNumber}) hết hạn ngày ${new Date(
          c.endDate
        ).toLocaleDateString('vi-VN')} (còn ${days} ngày). Vui lòng liên hệ gia hạn hoặc chấm dứt hợp đồng.`,
        type: 'SYSTEM',
        isRead: false,
        createdAt: now.toISOString(),
      };
      setNotifications((prev) => (prev.some((n) => n.id === notifId) ? prev : [notif, ...prev]));
      apiPost('/api/notifications', notif);
    });
  }, [isHydrated, contracts.length, notifications.length]);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('hm_token') || ''}`,
  });
  const apiPut = (path: string, body: any) =>
    fetch(path, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) }).catch((e) => console.error(e));
  const apiPost = (path: string, body: any) =>
    fetch(path, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).catch((e) => console.error(e));
  const apiPatch = (path: string, body: any) =>
    fetch(path, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body) }).catch((e) => console.error(e));
  const apiDelete = (path: string) =>
    fetch(path, { method: 'DELETE', headers: authHeaders() }).catch((e) => console.error(e));

  // Login handler
  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.token) {
        return { success: false, message: payload?.message || 'Đăng nhập thất bại.' };
      }
      localStorage.setItem('hm_token', payload.token);
      setCurrentUser(payload.user);
      // Reload server state now that we are authenticated
      try {
        const stateRes = await fetch('/api/state', { headers: { Authorization: `Bearer ${payload.token}` } });
        if (stateRes.ok) {
          const state = await stateRes.json();
          if (state?.propertyName) setPropertyName(state.propertyName);
          if (state?.ownerName) setOwnerName(state.ownerName);
          if (state?.users?.length) setUsers(state.users);
          if (state?.rooms?.length) setRooms(state.rooms);
          if (state?.invoices) {
            const roomsById = new Map((state.rooms || []).map((r: any) => [r.id, r]));
            setInvoices(state.invoices.map((inv: any) => {
              if (inv.splits && inv.splits.length > 0) return inv;
            if (inv.billingMode === 'COMBINED') return inv;
              const room = roomsById.get(inv.roomId) as any;
              if (room && room.currentOccupants > 1) {
                const n = room.currentOccupants;
                const base = Math.round(inv.totalAmount / n);
                return {
                  ...inv,
                  splits: Array.from({ length: n }, (_, i) => ({
                    id: `SPLIT-${inv.roomId}-${inv.month}-${inv.year}-${i + 1}`,
                    label: `Người ở ${i + 1}`,
                    amount: i === 0 ? inv.totalAmount - base * (n - 1) : base,
                    paidAmount: 0,
                    status: 'UNPAID' as const,
                  })),
                };
              }
              return inv;
            }));
          }
          if (state?.payments) setPayments(state.payments);
          if (state?.notifications) setNotifications(state.notifications);
          if (state?.contracts) setContracts(state.contracts);
          if (state?.warnings) setWarnings(state.warnings);
          if (state?.warningLimit) setWarningLimitState(Number(state.warningLimit));
        }
      } catch {
        // ignore state load errors; user is still logged in
      }
      return { success: true };
    } catch {
      return { success: false, message: 'Không kết nối được máy chủ.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('hm_token');
    setCurrentUser(null);
    setRooms([]);
    setInvoices([]);
    setPayments([]);
    setNotifications([]);
    setContracts([]);
    setWarnings([]);
    setUsers([]);
    setPropertyName('');
    setOwnerName('');
  };

  const updatePropertySettings = (nextPropertyName: string, nextOwnerName: string) => {
    const trimmedPropertyName = nextPropertyName.trim();
    const trimmedOwnerName = nextOwnerName.trim();
    if (!trimmedPropertyName || !trimmedOwnerName) return;

    setPropertyName(trimmedPropertyName);
    setOwnerName(trimmedOwnerName);
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.role === 'ADMIN' ? { ...user, fullName: trimmedOwnerName } : user
      )
    );
    setCurrentUser((prevUser) =>
      prevUser?.role === 'ADMIN' ? { ...prevUser, fullName: trimmedOwnerName } : prevUser
    );
    apiPut('/api/settings', { propertyName: trimmedPropertyName, ownerName: trimmedOwnerName });
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
    const requestedPeriod = year * 12 + month;
    const currentPeriod = currentYear * 12 + currentMonth;
    if (requestedPeriod > currentPeriod) {
      return {
        success: false,
        message: `Chưa thể chốt kỳ ${month}/${year} vì thời gian thực mới đến ${currentMonth}/${currentYear}!`,
      };
    }

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

    // January is the opening reading: save the meter for February, but do not charge electricity yet.
    const isOpeningPeriod = month === 1;
    const electricityUsage = isOpeningPeriod ? 0 : newIndex - oldIndex;
    const electricityRate = 4000; // 4.000 VNĐ / số điện theo đúng yêu cầu
    const electricityAmount = isOpeningPeriod ? 0 : electricityUsage * electricityRate;

    const roomPriceFull = room.basePrice; // 2.000.000 cho VIP, 1.000.000 cho Thường

    // Water & electricity split rules: chia đều khi 2 người ở từ đầu tháng,
    // tính theo ngày thực tế khi người 2 đến giữa tháng.
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    let secondPersonDays = 0;
    if (room.currentOccupants >= 2 && room.sharedStartDate) {
      const start = new Date(room.sharedStartDate);
      if (start <= monthStart) secondPersonDays = daysInMonth;
      else if (start <= monthEnd) secondPersonDays = Math.max(0, daysInMonth - start.getDate() + 1);
    } else if (room.currentOccupants >= 2) {
      secondPersonDays = daysInMonth;
    }
    let mainPersonDays = daysInMonth;
    if (room.tenant?.startDate) {
      const mainStart = new Date(room.tenant.startDate);
      if (mainStart > monthStart && mainStart <= monthEnd) {
        mainPersonDays = Math.max(0, daysInMonth - mainStart.getDate() + 1);
      } else if (mainStart > monthEnd) {
        mainPersonDays = 0;
      }
    }
    const personDays1 = mainPersonDays;
    const personDays2 = secondPersonDays;

    // Tiền phòng tính theo số ngày ở thực tế của khách chính trong kỳ
    const roomPrice = Math.round(roomPriceFull * (personDays1 / daysInMonth));
    const occupants = waterCount !== undefined ? waterCount : room.currentOccupants || 1;
    const waterUsagePersons =
      occupants >= 2 && (waterCount === undefined || waterCount === room.currentOccupants)
        ? Math.round(((personDays1 + personDays2) / daysInMonth) * 10) / 10
        : occupants;
    const waterAmount =
      occupants >= 2 && (waterCount === undefined || waterCount === room.currentOccupants)
        ? Math.round(room.waterRate * ((personDays1 + personDays2) / daysInMonth))
        : occupants * room.waterRate;

    const wifiFee = room.wifiFee;
    const garbageFee = room.garbageFee;

    const totalAmount = roomPrice + electricityAmount + waterAmount + wifiFee + garbageFee + otherFee;

    // Split the bill across occupants: equal when both lived the whole month,
    // proportional to actual days lived together otherwise.
    const occupantsForSplit = room.currentOccupants || 1;
    const splits =
      occupantsForSplit > 1
        ? (() => {
            const useProrate = personDays2 > 0 && personDays2 < daysInMonth;
            const totalPersonDays = personDays1 + personDays2 || 1;
            const ratio1 = useProrate ? personDays1 / totalPersonDays : 1 / occupantsForSplit;
            const ratio2 = useProrate ? personDays2 / totalPersonDays : 1 / occupantsForSplit;
            const amt1 = Math.round(totalAmount * ratio1);
            return [
              { id: `SPLIT-${room.id}-${month}-${year}-1`, label: 'Người ở 1', amount: amt1, paidAmount: 0, status: 'UNPAID' as const },
              { id: `SPLIT-${room.id}-${month}-${year}-2`, label: 'Người ở 2', amount: totalAmount - amt1, paidAmount: 0, status: 'UNPAID' as const },
            ];
          })()
        : undefined;

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
        waterUsage: waterUsagePersons,
        waterAmount,
        wifiFee,
        garbageFee,
        otherFee,
        otherFeeNote,
        totalAmount,
        paidAmount: prev.status === 'PAID' ? totalAmount : prev.paidAmount,
        splits: splits ?? prev.splits,
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
        waterUsage: waterUsagePersons,
        waterRate: room.waterRate,
        waterAmount,
        wifiFee,
        garbageFee,
        otherFee,
        otherFeeNote,
        totalAmount,
        paidAmount: 0,
        status: 'UNPAID',
        splits,
        createdAt: new Date().toISOString(),
        remindedCount: 0,
      };

      setInvoices((prev) => [updatedInvoice, ...prev]);
    }

    // Keep the room shortcut aligned with the latest recorded billing period.
    const isLaterPeriod = (leftMonth: number, leftYear: number, rightMonth: number, rightYear: number) =>
      leftYear > rightYear || (leftYear === rightYear && leftMonth >= rightMonth);
    const latestRecordedInvoice = invoices
      .filter((inv) => inv.roomId === roomId && (inv.month !== month || inv.year !== year))
      .sort((a, b) => b.year - a.year || b.month - a.month)[0];

    if (
      !latestRecordedInvoice ||
      isLaterPeriod(month, year, latestRecordedInvoice.month, latestRecordedInvoice.year)
    ) {
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
      apiPut(`/api/rooms/${roomId}`, { ...room, lastElectricityIndex: newIndex });
    }

    apiPut(`/api/invoices/${updatedInvoice.id}`, updatedInvoice);

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
    apiPost('/api/notifications', notif);

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
    updatedInvoices
      .filter((inv) => targetInvoices.some((t) => t.id === inv.id))
      .forEach((inv) => apiPut(`/api/invoices/${inv.id}`, inv));
    newNotifs.forEach((n) => apiPost('/api/notifications', n));

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
    apiPost('/api/payments', newPayment);

    // Update invoice splits/status for this payment
    setInvoices((prev) => {
      const next = prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const splits = applyAmountToSplits(inv.splits, amount, 'PENDING_APPROVAL');
        const newPaidAmount = (inv.paidAmount || 0) + amount;
        let status: typeof inv.status = inv.status;
        if (newPaidAmount >= inv.totalAmount) status = 'PENDING_APPROVAL';
        else if (newPaidAmount > 0) status = 'PARTIAL';
        return { ...inv, paidAmount: newPaidAmount, status, paidAt: nowStr, splits };
      });
      const updated = next.find((inv) => inv.id === invoiceId);
      if (updated) apiPut(`/api/invoices/${updated.id}`, updated);
      return next;
    });

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
    apiPost('/api/notifications', landlordNotif);

    // Thông báo lại cho người thuê biết đã gửi yêu cầu thanh toán
    const tenantConfirmNotif: AppNotification = {
      id: `NOTIF-TENANT-PAY-${Date.now()}`,
      targetRole: 'TENANT',
      targetRoomId: invoice.roomId,
      title: 'Đã gửi báo cáo thanh toán',
      message: `Bạn đã gửi xác nhận thanh toán ${amount.toLocaleString('vi-VN')} đ cho hóa đơn ${invoice.invoiceCode}. Vui lòng chờ chủ trọ kiểm tra tài khoản và xác nhận.`,
      type: 'SYSTEM',
      isRead: false,
      createdAt: nowStr,
      relatedInvoiceId: invoice.id,
      relatedPaymentId: paymentId,
    };
    setNotifications((prev) => [tenantConfirmNotif, ...prev]);
    apiPost('/api/notifications', tenantConfirmNotif);

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
    apiPatch(`/api/payments/${paymentId}`, { approvedByAdmin: true, approvedAt: nowStr });

    setInvoices((prev) => {
      const next = prev.map((inv) => {
        if (inv.id !== payment.invoiceId) return inv;
        const splits = (inv.splits || []).map((s) =>
          s.status === 'PENDING_APPROVAL' ? { ...s, status: 'PAID' as const, paidAmount: s.amount } : s
        );
        const allPaid = splits.length > 0 ? splits.every((s) => s.status === 'PAID') : true;
        return {
          ...inv,
          status: allPaid ? ('PAID' as const) : inv.status,
          paidAmount: payment.amount,
          paidAt: payment.paidAt,
          splits,
        };
      });
      const updated = next.find((inv) => inv.id === payment.invoiceId);
      if (updated) apiPut(`/api/invoices/${updated.id}`, updated);
      return next;
    });

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
    apiPost('/api/notifications', tenantNotif);
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
      apiPost('/api/payments', newPayment);

      setInvoices((prev) => {
        const next = prev.map((inv) =>
          inv.id === invoiceId
            ? {
                ...inv,
                status: 'PAID' as const,
                paidAmount: invoice.totalAmount,
                paidAt: nowStr,
                splits: (inv.splits || []).map((s) => ({ ...s, status: 'PAID' as const, paidAmount: s.amount })),
              }
            : inv
        );
        const updated = next.find((inv) => inv.id === invoiceId);
        if (updated) apiPut(`/api/invoices/${updated.id}`, updated);
        return next;
      });

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
      apiPost('/api/notifications', tenantNotif);
    }
  };

  // 5. Room & Tenant Management
  const updateRoom = (roomId: string, updates: Partial<Room>) => {
    setRooms((prev) => {
      const next = prev.map((r) => {
        if (r.id !== roomId) return r;
        const merged = { ...r, ...updates };
        if (merged.currentOccupants >= 2 && merged.isOccupied && !merged.sharedStartDate) {
          merged.sharedStartDate = new Date().toISOString().split('T')[0];
        }
        return merged;
      });
      const updated = next.find((r) => r.id === roomId);
      if (updated) apiPut(`/api/rooms/${roomId}`, updated);
      return next;
    });
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
    const sharedStartDate = occupants > 1 ? (data.startDate || new Date().toISOString().split('T')[0]) : undefined;

    const updatedRoom = {
      ...room,
      isOccupied: true,
      currentOccupants: occupants,
      tenant: newTenant,
      lastElectricityIndex: lastElec,
      sharedStartDate,
    };
    setRooms((prev) => prev.map((r) => (r.id === roomId ? updatedRoom : r)));
    apiPut(`/api/rooms/${roomId}`, updatedRoom);

    // Phòng sạch cảnh cáo cho người thuê mới (lưu trữ bản ghi cũ thay vì xóa)
    archiveRoomWarnings(roomId);

    // Create or update user account(s) for this room so tenant can log in
    // e.g. "phonga1" or "phong1" — đồng nhất với tên phòng
    const username = normalizeRoomUsername(room.roomNumber);

    setUsers((prev) => {
      let next = [...prev];
      const existingIndex = next.findIndex((u) => u.roomId === roomId && u.username === username);
      const firstAcc: UserAccount = {
        id: `user-${room.id.toLowerCase()}`,
        username,
        role: 'TENANT',
        fullName: newTenant.name,
        phone: newTenant.phone,
        roomId: room.id,
      };
      if (existingIndex >= 0) next[existingIndex] = firstAcc;
      else next.push(firstAcc);
      apiPut(`/api/users/${firstAcc.id}`, firstAcc);

      // For rooms with multiple occupants, create one account per person (share bill)
      for (let i = 2; i <= occupants; i++) {
        const subUsername = `${username}-${i}`;
        const subAcc: UserAccount = {
          id: `user-${room.id.toLowerCase()}-${i}`,
          username: subUsername,
          role: 'TENANT',
          fullName: `${newTenant.name} (người ${i})`,
          phone: newTenant.phone,
          roomId: room.id,
        };
        const subExisting = next.findIndex((u) => u.roomId === roomId && u.username === subUsername);
        if (subExisting >= 0) next[subExisting] = subAcc;
        else next.push(subAcc);
        apiPut(`/api/users/${subAcc.id}`, subAcc);
      }
      return next;
    });

    // Send admin notification
    const nowStr = new Date().toISOString();
    const assignNotif: AppNotification = {
      id: `NOTIF-ASSIGN-${Date.now()}`,
      targetRole: 'ADMIN',
      title: `Đã cho thuê: ${room.roomNumber}`,
      message: `${room.roomNumber} (${room.type === 'VIP' ? 'VIP' : 'Thường'}) đã được bàn giao cho khách ${newTenant.name} (${newTenant.phone}). Tiền cọc: ${data.deposit.toLocaleString('vi-VN')} đ.`,
      type: 'SYSTEM',
      isRead: false,
      createdAt: nowStr,
    };
    setNotifications((prev) => [assignNotif, ...prev]);
    apiPost('/api/notifications', assignNotif);

    return true;
  };

  // Remove tenant from room (Khách không thuê nữa / Trả phòng)
  const removeTenantFromRoom = (roomId: string, reason?: string): boolean => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return false;

    const formerTenantName = room.tenant?.name || 'Khách thuê';
    const formerTenantPhone = room.tenant?.phone || '';

    const clearedRoom = {
      ...room,
      isOccupied: false,
      currentOccupants: 0,
      tenant: undefined,
    };
    setRooms((prev) => prev.map((r) => (r.id === roomId ? clearedRoom : r)));
    apiPut(`/api/rooms/${roomId}`, clearedRoom);

    // Cảnh cáo của người cũ được lưu trữ lại — người mới vào sẽ bắt đầu từ 0
    archiveRoomWarnings(roomId);

    // Remove or reset tenant user account
    const removedUser = users.find((u) => u.roomId === roomId);
    setUsers((prev) => prev.filter((u) => u.roomId !== roomId));
    if (removedUser) apiDelete(`/api/users/${removedUser.id}`);

    // Send notification
    const nowStr = new Date().toISOString();
    const leaveNotif: AppNotification = {
      id: `NOTIF-LEAVE-${Date.now()}`,
      targetRole: 'ADMIN',
      title: `Trả phòng: ${room.roomNumber}`,
      message: `${room.roomNumber} đã hoàn tất thủ tục trả phòng cho khách ${formerTenantName} (${formerTenantPhone}). Trạng thái phòng chuyển sang Còn trống.${
        reason ? ` Lý do: ${reason}` : ''
      }`,
      type: 'SYSTEM',
      isRead: false,
      createdAt: nowStr,
    };
    setNotifications((prev) => [leaveNotif, ...prev]);
    apiPost('/api/notifications', leaveNotif);

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
          const updatedRoom = {
            ...r,
            tenant: updatedTenant,
            currentOccupants: occupants !== undefined ? occupants : r.currentOccupants,
            sharedStartDate:
              occupants !== undefined && occupants >= 2 && !r.sharedStartDate
                ? new Date().toISOString().split('T')[0]
                : r.sharedStartDate,
          };
          apiPut(`/api/rooms/${roomId}`, updatedRoom);
          return updatedRoom;
        }
        return r;
      })
    );

    // Sync user account fullName & phone
    if (tenantData.name || tenantData.phone) {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.roomId === roomId) {
            const updated = {
              ...u,
              fullName: tenantData.name || u.fullName,
              phone: tenantData.phone || u.phone,
            };
            apiPut(`/api/users/${updated.id}`, updated);
            return updated;
          }
          return u;
        })
      );
    }
  };

  // Create tenant login accounts for a room based on occupant count
  const setInvoiceBillingMode = (invoiceId: string, mode: 'COMBINED' | 'SPLIT') => {
    setInvoices((prev) => {
      const next = prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        if (mode === 'COMBINED') {
          return { ...inv, billingMode: mode, splits: [] };
        }
        // Giữ nguyên splits hiện có (chia theo tỉ lệ ngày) nếu đã có, chỉ sinh mới khi chưa có
        if (inv.splits && inv.splits.length > 0) {
          return { ...inv, billingMode: mode, splits: inv.splits };
        }
        const room = rooms.find((r) => r.id === inv.roomId);
        const n = room?.currentOccupants && room.currentOccupants > 1 ? room.currentOccupants : 2;
        const base = Math.round(inv.totalAmount / n);
        const splits = Array.from({ length: n }, (_, i) => ({
          id: `SPLIT-${inv.roomId}-${inv.month}-${inv.year}-${i + 1}`,
          label: `Người ở ${i + 1}`,
          amount: i === 0 ? inv.totalAmount - base * (n - 1) : base,
          paidAmount: 0,
          status: 'UNPAID' as const,
        }));
        return { ...inv, billingMode: mode, splits };
      });
      const updated = next.find((inv) => inv.id === invoiceId);
      if (updated) apiPut(`/api/invoices/${updated.id}`, updated);
      return next;
    });
  };

  const updateUserAccount = (userId: string, updates: Partial<UserAccount>) => {
    setUsers((prev) => {
      const next = prev.map((u) => (u.id === userId ? { ...u, ...updates } : u));
      const updated = next.find((u) => u.id === userId);
      if (updated) apiPut(`/api/users/${updated.id}`, updated);
      return next;
    });
  };

  const deleteUserAccount = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    apiDelete(`/api/users/${userId}`);
  };

  const createTenantAccounts = (roomId: string, occupantCount: number): { success: boolean; message: string } => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return { success: false, message: 'Không tìm thấy phòng!' };
    if (!room.isOccupied || !room.tenant) return { success: false, message: 'Phòng này chưa có khách thuê.' };
    if (occupantCount < 1 || occupantCount > 2) return { success: false, message: 'Số người ở tối đa là 2.' };

    const baseUsername = normalizeRoomUsername(room.roomNumber); // đồng nhất với tên phòng, ví dụ "phong1", "phonga1"

    setUsers((prev) => {
      let next = [...prev];
      for (let i = 1; i <= occupantCount; i++) {
        const username = i === 1 ? baseUsername : `${baseUsername}-${i}`;
        const existing = next.findIndex((u) => u.username === username || (u.roomId === roomId && u.username === username));
        const acc: UserAccount = {
          id: i === 1 ? `user-${room.id.toLowerCase()}` : `user-${room.id.toLowerCase()}-${i}`,
          username,
          role: 'TENANT',
          fullName: i === 1 ? room.tenant!.name : `${room.tenant!.name} (người ${i})`,
          phone: room.tenant!.phone,
          roomId: room.id,
        };
        if (existing >= 0) next[existing] = acc;
        else next.push(acc);
        apiPut(`/api/users/${acc.id}`, acc);
      }
      // remove extra accounts beyond occupantCount
      const extraByIndex = next.filter((u) => u.roomId === roomId && u.role === 'TENANT' && /-(\d+)$/.test(u.username) && parseInt(u.username.split('-').pop()!, 10) > occupantCount);
      if (extraByIndex.length > 0) {
        extraByIndex.forEach((u) => apiDelete(`/api/users/${u.id}`));
        next = next.filter((u) => !extraByIndex.includes(u));
      }
      return next;
    });

    return { success: true, message: `Đã tạo ${occupantCount} tài khoản cho ${room.roomNumber} (${baseUsername}${occupantCount === 2 ? ', ' + baseUsername + '-2' : ''}).` };
  };

  // Toggle room status between Occupied and Vacant
  const toggleRoomStatus = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    if (room.isOccupied) {
      removeTenantFromRoom(roomId, 'Chủ trọ chuyển trạng thái phòng sang trống');
    }
    // When toggling a vacant room to occupied, use assignTenantToRoom with real tenant info instead.
  };

  // ---------- Hợp đồng thuê nhà điện tử ----------
  const createContract = (draft: ContractDraft): { success: boolean; message: string; contract?: Contract } => {
    const room = rooms.find((r) => r.id === draft.roomId);
    if (!room) return { success: false, message: 'Không tìm thấy phòng!' };
    if (!draft.tenantName.trim()) return { success: false, message: 'Thiếu thông tin người thuê.' };
    if (contracts.some((c) => c.roomId === draft.roomId && c.status === 'ACTIVE')) {
      return { success: false, message: 'Phòng này đã có hợp đồng còn hiệu lực!' };
    }

    const contract: Contract = {
      id: `CTR-${Date.now()}-${room.id}`,
      contractCode: `HD-${draft.startDate.replace(/-/g, '').slice(0, 6)}-${room.id.replace(/[^a-zA-Z0-9]/g, '')}`,
      roomId: room.id,
      roomNumber: room.roomNumber,
      tenantId: draft.tenantId,
      tenantName: draft.tenantName.trim(),
      tenantPhone: draft.tenantPhone.trim(),
      tenantIdCard: draft.tenantIdCard.trim(),
      startDate: draft.startDate,
      endDate: draft.endDate,
      monthlyRent: draft.monthlyRent,
      deposit: draft.deposit,
      terms: draft.terms,
      notes: draft.notes,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    setContracts((prev) => [contract, ...prev]);
    apiPost('/api/contracts', contract);
    return { success: true, message: `Đã tạo hợp đồng ${contract.contractCode} cho ${room.roomNumber}.`, contract };
  };

  const updateContract = (contractId: string, updates: Partial<Contract>) => {
    setContracts((prev) => {
      const next = prev.map((c) => (c.id === contractId ? { ...c, ...updates } : c));
      const updated = next.find((c) => c.id === contractId);
      if (updated) apiPut(`/api/contracts/${updated.id}`, updated);
      return next;
    });
  };

  const terminateContract = (contractId: string, reason: string) => {
    updateContract(contractId, {
      status: 'TERMINATED',
      terminatedAt: new Date().toISOString(),
      terminationReason: reason,
    });
  };

  const uploadContractScan = async (contractId: string, file: File): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/contracts/${contractId}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'x-file-name': encodeURIComponent(file.name),
          Authorization: `Bearer ${localStorage.getItem('hm_token') || ''}`,
        },
        body: file,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, message: payload?.message || 'Không tải lên được bản scan.' };
      setContracts((prev) =>
        prev.map((c) => (c.id === contractId ? { ...c, scanFilePath: payload.scanFilePath } : c))
      );
      return { success: true, message: 'Đã lưu bản scan hợp đồng giấy thành công.' };
    } catch {
      return { success: false, message: 'Không kết nối được máy chủ.' };
    }
  };

  // ---------- Cảnh cáo phòng trọ ----------
  const warningCountForRoom = (roomId: string): number =>
    warnings.filter((w) => w.roomId === roomId && w.status === 'ACTIVE').length;

  const issueWarning = (
    roomId: string,
    violationType: ViolationType,
    description: string
  ): { success: boolean; message: string } => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return { success: false, message: 'Không tìm thấy phòng!' };
    if (!room.isOccupied || !room.tenant) return { success: false, message: 'Phòng này chưa có người thuê.' };

    const nowStr = new Date().toISOString();
    const newCount = warningCountForRoom(roomId) + 1;
    const reachedLimit = newCount >= warningLimit;

    const warning: RoomWarning = {
      id: `WRN-${Date.now()}-${room.id}`,
      roomId: room.id,
      roomNumber: room.roomNumber,
      tenantId: room.tenant.id,
      tenantName: room.tenant.name,
      violationType,
      description: description.trim(),
      issuedAt: nowStr,
      issuedBy: ownerName || 'Chủ trọ',
      status: 'ACTIVE',
    };
    setWarnings((prev) => [warning, ...prev]);
    apiPost('/api/warnings', warning);

    const notif: AppNotification = {
      id: `NOTIF-WARN-${warning.id}`,
      targetRole: 'TENANT',
      targetRoomId: room.id,
      title: reachedLimit
        ? `CẢNH BÁO CUỐI ${newCount}/${warningLimit}: ${room.roomNumber}`
        : `Cảnh cáo nội quy ${newCount}/${warningLimit}: ${room.roomNumber}`,
      message: `${room.tenant.name} bị cảnh cáo vì hành vi: ${VIOLATION_LABELS[violationType]}.${
        description.trim() ? ` Ghi chú: ${description.trim()}.` : ''
      } Tổng cảnh cáo đã nhận: ${newCount}/${warningLimit} lần.${
        reachedLimit
          ? ' Bạn đã đạt giới hạn cảnh cáo, vui lòng liên hệ chủ trọ để làm thủ tục rời khỏi nhà trọ trong thời gian thỏa thuận.'
          : ' Vui lòng chấp hành nội quy nhà trọ để không bị lập biên bản thêm.'
      }`,
      type: 'SYSTEM',
      isRead: false,
      createdAt: nowStr,
    };
    setNotifications((prev) => [notif, ...prev]);
    apiPost('/api/notifications', notif);

    return {
      success: true,
      message: `Đã lập cảnh cáo lần ${newCount}/${warningLimit} cho ${room.roomNumber} (${VIOLATION_LABELS[violationType]})${
        reachedLimit ? ' — ĐẠT GIỚI HẠN, phòng phải rời đi!' : ''
      }.`,
    };
  };

  const revokeWarning = (warningId: string, reason: string) => {
    const nowStr = new Date().toISOString();
    setWarnings((prev) =>
      prev.map((w) =>
        w.id === warningId
          ? { ...w, status: 'REVOKED' as const, revokedAt: nowStr, revokedReason: reason }
          : w
      )
    );
    apiPatch(`/api/warnings/${warningId}`, { status: 'REVOKED', revokedAt: nowStr, revokedReason: reason });
  };

  const setWarningLimit = (limit: number) => {
    const clamped = Math.min(10, Math.max(1, Math.round(Number(limit) || 5)));
    setWarningLimitState(clamped);
    apiPut('/api/settings', { propertyName, ownerName, warningLimit: clamped });
  };

  // Chuyển toàn bộ cảnh cáo còn hiệu lực của phòng sang ARCHIVED (không tính cho người thuê mới)
  const archiveRoomWarnings = (roomId: string) => {
    const hasActive = warnings.some((w) => w.roomId === roomId && w.status === 'ACTIVE');
    if (!hasActive) return;
    setWarnings((prev) =>
      prev.map((w) => (w.roomId === roomId && w.status === 'ACTIVE' ? { ...w, status: 'ARCHIVED' as const } : w))
    );
    apiPatch(`/api/warnings/room/${roomId}/archive`, {});
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    apiPatch(`/api/notifications/${id}`, { isRead: true });
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
    apiPost('/api/notifications/mark-all-read', {});
  };

  const resetData = () => {
    setRooms([]);
    setInvoices([]);
    setPayments([]);
    setNotifications([]);
    setContracts([]);
    setWarnings([]);
    setUsers((previousUsers) => previousUsers.filter((user) => user.role === 'ADMIN'));
    setCurrentUser((previousUser) => previousUser?.role === 'ADMIN' ? previousUser : null);
    setRooms((prev) => prev.map((r) => ({ ...r, isOccupied: false, currentOccupants: 0, tenant: undefined })));
    apiPost('/api/reset', {});
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
        propertyName,
        ownerName,
        users,
        rooms,
        invoices,
        payments,
        notifications,
        currentMonth,
        currentYear,
        login,
        logout,
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
        setInvoiceBillingMode,
        createTenantAccounts,
        updateUserAccount,
        deleteUserAccount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        resetData,
        updatePropertySettings,
        unreadNotificationCount,
        contracts,
        warnings,
        warningLimit,
        createContract,
        updateContract,
        terminateContract,
        uploadContractScan,
        issueWarning,
        revokeWarning,
        setWarningLimit,
        warningCountForRoom,
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
