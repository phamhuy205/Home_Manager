export type RoomType = 'VIP' | 'STANDARD';

export type UserRole = 'ADMIN' | 'TENANT';

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  idCard: string; // CCCD
  email?: string;
  startDate: string;
  deposit: number;
}

export interface Room {
  id: string; // e.g. 'VIP-101', 'P-101'
  roomNumber: string; // 'VIP 101', 'Phòng 101'
  type: RoomType;
  basePrice: number; // 2,000,000 for VIP, 1,000,000 for STANDARD
  area: number; // m2 (e.g. 28m2 for VIP, 18m2 for Standard)
  maxOccupants: number;
  currentOccupants: number;
  isOccupied: boolean;
  tenant?: Tenant;
  lastElectricityIndex: number; // Số điện chốt kỳ trước (kWh)
  lastWaterIndex: number; // Số khối nước kỳ trước (m3) hoặc tính theo đầu người
  waterBillingType: 'PER_PERSON' | 'PER_CUBIC'; // 100k/người hoặc 20k/m3
  waterRate: number; // 100000 or 20000
  electricityRate: number; // Cố định 4000 VND / kWh
  wifiFee: number; // ví dụ 50.000 / phòng
  garbageFee: number; // ví dụ 30.000 / phòng
  description?: string;
}

export type PaymentStatus = 'UNPAID' | 'PAID' | 'PENDING_APPROVAL' | 'OVERDUE';

export interface Invoice {
  id: string;
  invoiceCode: string; // HD-202609-VIP101
  roomId: string;
  roomNumber: string;
  roomType: RoomType;
  month: number; // 1-12
  year: number; // 2026
  dueDate: string; // YYYY-MM-DD
  tenantName: string;
  tenantPhone: string;
  
  // Tiền phòng
  roomPrice: number; // 2,000,000 (VIP) hoặc 1,000,000 (Thường)
  
  // Tiền điện (4.000 đ/số)
  oldElectricityIndex: number; // Số điện cũ
  newElectricityIndex: number; // Số điện mới
  electricityUsage: number; // new - old
  electricityRate: number; // 4000 VND/kWh
  electricityAmount: number; // usage * 4000
  
  // Tiền nước
  waterBillingType: 'PER_PERSON' | 'PER_CUBIC';
  oldWaterIndex?: number;
  newWaterIndex?: number;
  waterUsage: number; // số khối hoặc số người
  waterRate: number;
  waterAmount: number;
  
  // Dịch vụ khác
  wifiFee: number;
  garbageFee: number;
  otherFee?: number;
  otherFeeNote?: string;
  
  // Tổng cộng
  totalAmount: number;
  paidAmount: number;
  status: PaymentStatus;
  
  // Thời gian
  createdAt: string;
  paidAt?: string;
  remindedCount: number; // Số lần đã gửi nhắc nhở
  lastRemindedAt?: string;
  notes?: string;
}

export type PaymentMethod = 'BANK_TRANSFER' | 'CASH';

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  invoiceCode: string;
  roomId: string;
  roomNumber: string;
  roomType: RoomType;
  tenantName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionRef?: string;
  note?: string;
  paidAt: string; // ISO datetime
  approvedByAdmin: boolean;
  approvedAt?: string;
  month: number;
  year: number;
}

export interface AppNotification {
  id: string;
  targetRole: UserRole | 'ALL';
  targetRoomId?: string; // If targeting specific room tenant
  title: string;
  message: string;
  type: 'PAYMENT_REMINDER' | 'PAYMENT_RECEIVED' | 'INVOICE_CREATED' | 'SYSTEM';
  isRead: boolean;
  createdAt: string;
  relatedInvoiceId?: string;
  relatedPaymentId?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  role: UserRole;
  fullName: string;
  phone: string;
  roomId?: string; // Assigned room if TENANT
}
