import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  INITIAL_ROOMS,
  INITIAL_USERS,
  INITIAL_INVOICES,
  INITIAL_PAYMENTS,
  INITIAL_NOTIFICATIONS,
} from '../src/data/initialData';

const sql = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '0';
  return `'${String(value).replaceAll("'", "''")}'`;
};

const tuple = (values: unknown[]) => `(${values.map(sql).join(', ')})`;
const insert = (table: string, columns: string[], rows: unknown[][]) => {
  if (rows.length === 0) return '';
  return `INSERT INTO ${table} (${columns.join(', ')})\nVALUES\n${rows.map(tuple).join(',\n')};\n`;
};

const tenantRows = INITIAL_ROOMS
  .filter((room) => room.tenant)
  .map((room) => {
    const tenant = room.tenant!;
    return [tenant.id, tenant.name, tenant.phone, tenant.idCard, tenant.email, tenant.startDate, tenant.deposit];
  });

const roomRows = INITIAL_ROOMS.map((room) => [
  room.id, room.roomNumber, room.type, room.basePrice, room.area, room.maxOccupants,
  room.currentOccupants, room.isOccupied, room.tenant?.id, room.lastElectricityIndex,
  room.lastWaterIndex, room.waterBillingType, room.waterRate, room.electricityRate,
  room.wifiFee, room.garbageFee, room.description,
]);

const userRows = INITIAL_USERS.map((user) => [
  user.id, user.username, user.role, user.fullName, user.phone, user.roomId,
]);

const invoiceRows = INITIAL_INVOICES.map((invoice) => [
  invoice.id, invoice.invoiceCode, invoice.roomId, invoice.month, invoice.year, invoice.dueDate,
  invoice.tenantName, invoice.tenantPhone, invoice.roomPrice, invoice.oldElectricityIndex,
  invoice.newElectricityIndex, invoice.electricityUsage, invoice.electricityRate, invoice.electricityAmount,
  invoice.waterBillingType, invoice.oldWaterIndex, invoice.newWaterIndex, invoice.waterUsage,
  invoice.waterRate, invoice.waterAmount, invoice.wifiFee, invoice.garbageFee, invoice.otherFee,
  invoice.otherFeeNote, invoice.totalAmount, invoice.paidAmount, invoice.status, invoice.createdAt,
  invoice.paidAt, invoice.remindedCount, invoice.lastRemindedAt, invoice.notes,
]);

const paymentRows = INITIAL_PAYMENTS.map((payment) => [
  payment.id, payment.invoiceId, payment.invoiceCode, payment.roomId, payment.roomNumber, payment.roomType,
  payment.tenantName, payment.amount, payment.paymentMethod, payment.transactionRef, payment.note,
  payment.paidAt, payment.approvedByAdmin, payment.approvedAt, payment.month, payment.year,
]);

const notificationRows = INITIAL_NOTIFICATIONS.map((notification) => [
  notification.id, notification.targetRole, notification.targetRoomId, notification.title, notification.message,
  notification.type, notification.isRead, notification.createdAt, notification.relatedInvoiceId,
  notification.relatedPaymentId,
]);

const output = `-- Generated from initialData.ts for one-time database import.
-- Runtime application data is read from PostgreSQL, not from this TypeScript file.
BEGIN;

TRUNCATE TABLE notifications, payments, invoices, app_users, rooms, tenants, property_settings RESTART IDENTITY CASCADE;

${insert('property_settings', ['id', 'property_name', 'owner_name'], [[1, 'Nhà Trọ Bà Tuyết', 'Hoàng Thị Tuyết']])}
${insert('tenants', ['id', 'name', 'phone', 'id_card', 'email', 'start_date', 'deposit'], tenantRows)}
${insert('rooms', ['id', 'room_number', 'room_type', 'base_price', 'area', 'max_occupants', 'current_occupants', 'is_occupied', 'tenant_id', 'last_electricity_index', 'last_water_index', 'water_billing_type', 'water_rate', 'electricity_rate', 'wifi_fee', 'garbage_fee', 'description'], roomRows)}
${insert('app_users', ['id', 'username', 'role', 'full_name', 'phone', 'room_id'], userRows)}
${insert('invoices', ['id', 'invoice_code', 'room_id', 'month', 'year', 'due_date', 'tenant_name', 'tenant_phone', 'room_price', 'old_electricity_index', 'new_electricity_index', 'electricity_usage', 'electricity_rate', 'electricity_amount', 'water_billing_type', 'old_water_index', 'new_water_index', 'water_usage', 'water_rate', 'water_amount', 'wifi_fee', 'garbage_fee', 'other_fee', 'other_fee_note', 'total_amount', 'paid_amount', 'status', 'created_at', 'paid_at', 'reminded_count', 'last_reminded_at', 'notes'], invoiceRows)}
${insert('payments', ['id', 'invoice_id', 'invoice_code', 'room_id', 'room_number', 'room_type', 'tenant_name', 'amount', 'payment_method', 'transaction_ref', 'note', 'paid_at', 'approved_by_admin', 'approved_at', 'month', 'year'], paymentRows)}
${insert('notifications', ['id', 'target_role', 'target_room_id', 'title', 'message', 'type', 'is_read', 'created_at', 'related_invoice_id', 'related_payment_id'], notificationRows)}
COMMIT;
`;

const outputPath = resolve(process.cwd(), 'seed.sql');
writeFileSync(outputPath, output, 'utf8');
console.log(`Generated ${outputPath}`);
console.log(`Rooms: ${INITIAL_ROOMS.length}, tenants: ${tenantRows.length}, users: ${INITIAL_USERS.length}, invoices: ${INITIAL_INVOICES.length}, payments: ${INITIAL_PAYMENTS.length}, notifications: ${INITIAL_NOTIFICATIONS.length}`);
