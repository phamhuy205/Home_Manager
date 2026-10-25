import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || databaseUrl.includes('your_password')) {
  console.error('DATABASE_URL chưa được cấu hình mật khẩu PostgreSQL thật trong file .env.');
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
});

const jwtSecret = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me';
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || '123456';

const signToken = (user: any) =>
  jwt.sign({ sub: user.id, username: user.username, role: user.role, roomId: user.room_id || undefined, fullName: user.full_name, phone: user.phone || '' }, jwtSecret, { expiresIn: '7d' });

const requireAuth: express.RequestHandler = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    (req as any).auth = jwt.verify(token, jwtSecret);
    next();
  } catch {
    res.status(401).json({ message: 'Chưa đăng nhập hoặc phiên hết hạn.' });
  }
};

const requireAdmin: express.RequestHandler = (req, res, next) => {
  if ((req as any).auth?.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Chỉ chủ trọ mới được phép.' });
  }
  next();
};

app.use(cors());
app.use(express.json({ limit: '4mb' }));

// File scan hợp đồng (upload thô qua express.raw, không cần dependency multipart)
const UPLOADS_DIR = join(process.cwd(), 'uploads', 'contracts');
app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

// Basic request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

const numberValue = (value: unknown) => Number(value || 0);
const nullable = (value: unknown) => value || null;

const loadState = async () => {
  const settings = await client.query('SELECT property_name, owner_name, warning_limit FROM property_settings WHERE id = 1');
  const rooms = await client.query(`
    SELECT r.*, t.id AS tenant_id_ref, t.name AS tenant_name_ref, t.phone AS tenant_phone_ref,
      t.id_card AS tenant_id_card_ref, t.email AS tenant_email_ref,
      t.start_date AS tenant_start_date_ref, t.deposit AS tenant_deposit_ref
    FROM rooms r LEFT JOIN tenants t ON t.id = r.tenant_id ORDER BY r.id
  `);
  const users = await client.query('SELECT id, username, role, full_name, phone, room_id FROM app_users ORDER BY id');
  const invoices = await client.query(`
    SELECT i.*, r.room_number, r.room_type FROM invoices i
    JOIN rooms r ON r.id = i.room_id ORDER BY i.year DESC, i.month DESC, i.id
  `);
  const payments = await client.query('SELECT * FROM payments ORDER BY paid_at DESC');
  const notifications = await client.query('SELECT * FROM notifications ORDER BY created_at DESC');
  const contracts = await client.query(`
    SELECT c.*, r.room_number FROM contracts c
    JOIN rooms r ON r.id = c.room_id ORDER BY c.status, c.end_date DESC, c.id
  `);
  const warnings = await client.query(`
    SELECT w.*, r.room_number FROM warnings w
    JOIN rooms r ON r.id = w.room_id ORDER BY w.issued_at DESC, w.id
  `);

  return {
    propertyName: settings.rows[0]?.property_name || '',
    ownerName: settings.rows[0]?.owner_name || '',
    warningLimit: Number(settings.rows[0]?.warning_limit || 5),
    currentUser: null,
    users: users.rows.map((row) => ({ id: row.id, username: row.username, role: row.role, fullName: row.full_name, phone: row.phone, roomId: row.room_id || undefined })),
    rooms: rooms.rows.map((row) => ({
      id: row.id, roomNumber: row.room_number, type: row.room_type,
      basePrice: numberValue(row.base_price), area: numberValue(row.area), maxOccupants: row.max_occupants,
      currentOccupants: row.current_occupants, isOccupied: row.is_occupied,
      tenant: row.tenant_id_ref ? { id: row.tenant_id_ref, name: row.tenant_name_ref, phone: row.tenant_phone_ref, idCard: row.tenant_id_card_ref, email: row.tenant_email_ref || undefined, startDate: row.tenant_start_date_ref, deposit: numberValue(row.tenant_deposit_ref) } : undefined,
      lastElectricityIndex: row.last_electricity_index, lastWaterIndex: row.last_water_index,
      waterBillingType: row.water_billing_type, waterRate: numberValue(row.water_rate), electricityRate: numberValue(row.electricity_rate),
      wifiFee: numberValue(row.wifi_fee), garbageFee: numberValue(row.garbage_fee), description: row.description || undefined,
      sharedStartDate: row.shared_start_date || undefined,
    })),
    invoices: invoices.rows.map((row) => ({
      id: row.id, invoiceCode: row.invoice_code, roomId: row.room_id, roomNumber: row.room_number, roomType: row.room_type,
      month: row.month, year: row.year, dueDate: row.due_date, tenantName: row.tenant_name, tenantPhone: row.tenant_phone,
      roomPrice: numberValue(row.room_price), oldElectricityIndex: row.old_electricity_index, newElectricityIndex: row.new_electricity_index,
      electricityUsage: row.electricity_usage, electricityRate: numberValue(row.electricity_rate), electricityAmount: numberValue(row.electricity_amount),
      waterBillingType: row.water_billing_type, oldWaterIndex: row.old_water_index, newWaterIndex: row.new_water_index,
      waterUsage: numberValue(row.water_usage), waterRate: numberValue(row.water_rate), waterAmount: numberValue(row.water_amount),
      wifiFee: numberValue(row.wifi_fee), garbageFee: numberValue(row.garbage_fee), otherFee: numberValue(row.other_fee), otherFeeNote: row.other_fee_note || undefined,
      totalAmount: numberValue(row.total_amount), paidAmount: numberValue(row.paid_amount), status: row.status, createdAt: row.created_at,
      paidAt: row.paid_at || undefined, remindedCount: row.reminded_count, lastRemindedAt: row.last_reminded_at || undefined, notes: row.notes || undefined,
      splits: Array.isArray(row.splits) ? row.splits : [],
      billingMode: row.billing_mode || undefined,
    })),
    payments: payments.rows.map((row) => ({
      id: row.id, invoiceId: row.invoice_id, invoiceCode: row.invoice_code, roomId: row.room_id, roomNumber: row.room_number, roomType: row.room_type,
      tenantName: row.tenant_name, amount: numberValue(row.amount), paymentMethod: row.payment_method, transactionRef: row.transaction_ref || undefined,
      note: row.note || undefined, paidAt: row.paid_at, approvedByAdmin: row.approved_by_admin, approvedAt: row.approved_at || undefined, month: row.month, year: row.year,
    })),
    notifications: notifications.rows.map((row) => ({
      id: row.id, targetRole: row.target_role, targetRoomId: row.target_room_id || undefined, title: row.title, message: row.message,
      type: row.type, isRead: row.is_read, createdAt: row.created_at, relatedInvoiceId: row.related_invoice_id || undefined, relatedPaymentId: row.related_payment_id || undefined,
    })),
    contracts: contracts.rows.map((row) => ({
      id: row.id, contractCode: row.contract_code, roomId: row.room_id, roomNumber: row.room_number,
      tenantId: row.tenant_id || undefined, tenantName: row.tenant_name, tenantPhone: row.tenant_phone, tenantIdCard: row.tenant_id_card,
      startDate: row.start_date, endDate: row.end_date, monthlyRent: numberValue(row.monthly_rent), deposit: numberValue(row.deposit),
      terms: row.terms || '', notes: row.notes || undefined, status: row.status, scanFilePath: row.scan_file_path || undefined,
      createdAt: row.created_at, terminatedAt: row.terminated_at || undefined, terminationReason: row.termination_reason || undefined,
    })),
    warnings: warnings.rows.map((row) => ({
      id: row.id, roomId: row.room_id, roomNumber: row.room_number, tenantId: row.tenant_id || undefined,
      tenantName: row.tenant_name, violationType: row.violation_type, description: row.description || '',
      issuedAt: row.issued_at, issuedBy: row.issued_by || '', status: row.status,
      revokedAt: row.revoked_at || undefined, revokedReason: row.revoked_reason || undefined,
    })),
  };
};

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
    }
    const result = await client.query('SELECT * FROM app_users WHERE LOWER(username) = LOWER($1)', [String(username).trim()]);
    const user = result.rows[0];
    if (!user || !user.password_hash || !(await bcrypt.compare(String(password), user.password_hash))) {
      return res.status(401).json({ message: 'Tài khoản hoặc mật khẩu không chính xác!' });
    }
    res.json({
      token: signToken(user),
      user: { id: user.id, username: user.username, role: user.role, fullName: user.full_name, phone: user.phone, roomId: user.room_id || undefined },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi đăng nhập.' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const result = await client.query('SELECT id, username, role, full_name, phone, room_id FROM app_users WHERE id = $1', [(req as any).auth.sub]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ message: 'Tài khoản không còn tồn tại.' });
    res.json({ user: { id: user.id, username: user.username, role: user.role, fullName: user.full_name, phone: user.phone, roomId: user.room_id || undefined } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi xác thực.' });
  }
});

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
    }
    const result = await client.query('SELECT password_hash FROM app_users WHERE id = $1', [(req as any).auth.sub]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(String(oldPassword), user.password_hash || ''))) {
      return res.status(401).json({ message: 'Mật khẩu cũ không đúng.' });
    }
    await client.query('UPDATE app_users SET password_hash = $1 WHERE id = $2', [await bcrypt.hash(String(newPassword), 10), (req as any).auth.sub]);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Không đổi được mật khẩu.' });
  }
});

app.get('/api/health', async (_req, res) => {
  try {
    await client.query('SELECT 1');
    res.json({ ok: true, database: 'postgresql' });
  } catch {
    res.status(503).json({ ok: false, database: 'unavailable' });
  }
});

app.get('/api/state', requireAuth, async (_req, res) => {
  try {
    res.json(await loadState());
  } catch (error) {
    console.error(error);
    res.status(503).json({ message: 'Không thể đọc dữ liệu PostgreSQL.' });
  }
});

// ---------- Fine-grained CRUD endpoints (replace full-state dump) ----------
let defaultHashCache: string | null = null;
const getDefaultHash = async () => {
  if (!defaultHashCache) defaultHashCache = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  return defaultHashCache;
};

app.put('/api/settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { propertyName, ownerName, warningLimit } = req.body || {};
    if (!propertyName || !ownerName) return res.status(400).json({ message: 'Thiếu tên nhà trọ hoặc chủ trọ.' });
    await client.query(
      `INSERT INTO property_settings (id, property_name, owner_name, updated_at) VALUES (1, $1, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET property_name = EXCLUDED.property_name, owner_name = EXCLUDED.owner_name, updated_at = NOW()`,
      [propertyName, ownerName]
    );
    await client.query("UPDATE app_users SET full_name = $1 WHERE role = 'ADMIN'", [ownerName]);
    if (warningLimit !== undefined && warningLimit !== null) {
      const limit = Math.min(10, Math.max(1, Math.round(Number(warningLimit) || 5)));
      await client.query('UPDATE property_settings SET warning_limit = $1, updated_at = NOW() WHERE id = 1', [limit]);
    }
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Không lưu được cài đặt.' });
  }
});

const upsertTenant = async (tenant: any) => {
  if (!tenant?.id) return;
  await client.query(
    `INSERT INTO tenants (id, name, phone, id_card, email, start_date, deposit) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, id_card = EXCLUDED.id_card, email = EXCLUDED.email, start_date = EXCLUDED.start_date, deposit = EXCLUDED.deposit`,
    [tenant.id, tenant.name, tenant.phone || '', tenant.idCard || '', tenant.email || null, tenant.startDate, tenant.deposit || 0]
  );
};

const upsertRoom = async (room: any) => {
  if (room.tenant) await upsertTenant(room.tenant);
  await client.query(
    `INSERT INTO rooms (id, room_number, room_type, base_price, area, max_occupants, current_occupants, is_occupied, tenant_id,
      last_electricity_index, last_water_index, water_billing_type, water_rate, electricity_rate, wifi_fee, garbage_fee, description, shared_start_date, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
     ON CONFLICT (id) DO UPDATE SET room_number = EXCLUDED.room_number, room_type = EXCLUDED.room_type, base_price = EXCLUDED.base_price,
      area = EXCLUDED.area, max_occupants = EXCLUDED.max_occupants, current_occupants = EXCLUDED.current_occupants, is_occupied = EXCLUDED.is_occupied,
      tenant_id = EXCLUDED.tenant_id, last_electricity_index = EXCLUDED.last_electricity_index, last_water_index = EXCLUDED.last_water_index,
      water_billing_type = EXCLUDED.water_billing_type, water_rate = EXCLUDED.water_rate, electricity_rate = EXCLUDED.electricity_rate,
      wifi_fee = EXCLUDED.wifi_fee, garbage_fee = EXCLUDED.garbage_fee, description = EXCLUDED.description, updated_at = NOW(), shared_start_date = EXCLUDED.shared_start_date`,
    [room.id, room.roomNumber, room.type, room.basePrice || 0, room.area || 0, room.maxOccupants || 1, room.currentOccupants || 0,
      !!room.isOccupied, room.tenant?.id || null, room.lastElectricityIndex || 0, room.lastWaterIndex || 0, room.waterBillingType,
      room.waterRate || 0, room.electricityRate || 4000, room.wifiFee || 0, room.garbageFee || 0, room.description || null, room.sharedStartDate || null]
  );
};

app.put('/api/rooms/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await upsertRoom({ ...req.body, id: req.params.id });
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Không cập nhật được phòng.' });
  }
});

const upsertUser = async (user: any) => {
  const existing = await client.query('SELECT password_hash FROM app_users WHERE id = $1', [user.id]);
  const hash = existing.rows[0]?.password_hash || (await getDefaultHash());
  await client.query(
    `INSERT INTO app_users (id, username, role, full_name, phone, room_id, password_hash) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, role = EXCLUDED.role, full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, room_id = EXCLUDED.room_id`,
    [user.id, user.username, user.role, user.fullName, user.phone || '', user.roomId || null, hash]
  );
};

app.put('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await upsertUser({ ...req.body, id: req.params.id });
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Không cập nhật được tài khoản.' });
  }
});

app.delete('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await client.query("DELETE FROM app_users WHERE id = $1 AND role <> 'ADMIN'", [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Không xóa được tài khoản.' });
  }
});

const upsertInvoice = async (invoice: any) => {
  await client.query(
    `INSERT INTO invoices (id, invoice_code, room_id, month, year, due_date, tenant_name, tenant_phone, room_price,
      old_electricity_index, new_electricity_index, electricity_usage, electricity_rate, electricity_amount, water_billing_type,
      old_water_index, new_water_index, water_usage, water_rate, water_amount, wifi_fee, garbage_fee, other_fee, other_fee_note,
      total_amount, paid_amount, status, created_at, paid_at, reminded_count, last_reminded_at, notes, splits, billing_mode)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34)
     ON CONFLICT (id) DO UPDATE SET invoice_code = EXCLUDED.invoice_code, room_id = EXCLUDED.room_id, month = EXCLUDED.month, year = EXCLUDED.year,
      due_date = EXCLUDED.due_date, tenant_name = EXCLUDED.tenant_name, tenant_phone = EXCLUDED.tenant_phone, room_price = EXCLUDED.room_price,
      old_electricity_index = EXCLUDED.old_electricity_index, new_electricity_index = EXCLUDED.new_electricity_index, electricity_usage = EXCLUDED.electricity_usage,
      electricity_rate = EXCLUDED.electricity_rate, electricity_amount = EXCLUDED.electricity_amount, water_billing_type = EXCLUDED.water_billing_type,
      old_water_index = EXCLUDED.old_water_index, new_water_index = EXCLUDED.new_water_index, water_usage = EXCLUDED.water_usage, water_rate = EXCLUDED.water_rate,
      water_amount = EXCLUDED.water_amount, wifi_fee = EXCLUDED.wifi_fee, garbage_fee = EXCLUDED.garbage_fee, other_fee = EXCLUDED.other_fee,
      other_fee_note = EXCLUDED.other_fee_note, total_amount = EXCLUDED.total_amount, paid_amount = EXCLUDED.paid_amount, status = EXCLUDED.status,
      created_at = EXCLUDED.created_at, paid_at = EXCLUDED.paid_at, reminded_count = EXCLUDED.reminded_count, last_reminded_at = EXCLUDED.last_reminded_at, notes = EXCLUDED.notes, splits = EXCLUDED.splits, billing_mode = EXCLUDED.billing_mode`,
    [invoice.id, invoice.invoiceCode, invoice.roomId, invoice.month, invoice.year, invoice.dueDate, invoice.tenantName, invoice.tenantPhone || '', invoice.roomPrice || 0,
      invoice.oldElectricityIndex || 0, invoice.newElectricityIndex || 0, invoice.electricityUsage || 0, invoice.electricityRate || 4000, invoice.electricityAmount || 0,
      invoice.waterBillingType, invoice.oldWaterIndex ?? null, invoice.newWaterIndex ?? null, invoice.waterUsage || 0, invoice.waterRate || 0, invoice.waterAmount || 0,
      invoice.wifiFee || 0, invoice.garbageFee || 0, invoice.otherFee ?? 0, invoice.otherFeeNote || null, invoice.totalAmount || 0, invoice.paidAmount || 0,
      invoice.status, invoice.createdAt, invoice.paidAt || null, invoice.remindedCount || 0, invoice.lastRemindedAt || null, invoice.notes || null,
      JSON.stringify(invoice.splits || []), invoice.billingMode || null]);
};

app.put('/api/invoices/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await upsertInvoice({ ...req.body, id: req.params.id });
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Không cập nhật được hóa đơn.' });
  }
});

app.post('/api/payments', requireAuth, async (req, res) => {
  try {
    const p = req.body;
    await client.query(
      `INSERT INTO payments (id, invoice_id, invoice_code, room_id, room_number, room_type, tenant_name, amount, payment_method, transaction_ref, note, paid_at, approved_by_admin, approved_at, month, year)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) ON CONFLICT (id) DO NOTHING`,
      [p.id, p.invoiceId, p.invoiceCode, p.roomId, p.roomNumber, p.roomType, p.tenantName, p.amount || 0, p.paymentMethod,
        p.transactionRef || null, p.note || null, p.paidAt, !!p.approvedByAdmin, p.approvedAt || null, p.month, p.year]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Không lưu được thanh toán.' });
  }
});

app.patch('/api/payments/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { approvedByAdmin, approvedAt } = req.body || {};
    await client.query('UPDATE payments SET approved_by_admin = $1, approved_at = $2 WHERE id = $3', [!!approvedByAdmin, approvedAt || null, req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Không duyệt được thanh toán.' });
  }
});

const upsertNotification = async (n: any) => {
  await client.query(
    `INSERT INTO notifications (id, target_role, target_room_id, title, message, type, is_read, created_at, related_invoice_id, related_payment_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (id) DO UPDATE SET is_read = EXCLUDED.is_read`,
    [n.id, n.targetRole, n.targetRoomId || null, n.title, n.message, n.type, !!n.isRead, n.createdAt, n.relatedInvoiceId || null, n.relatedPaymentId || null]
  );
};

app.post('/api/notifications', requireAuth, async (req, res) => {
  try {
    await upsertNotification(req.body);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Không lưu được thông báo.' });
  }
});

app.patch('/api/notifications/:id', requireAuth, async (req, res) => {
  try {
    await client.query('UPDATE notifications SET is_read = $1 WHERE id = $2', [!!req.body?.isRead, req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Không cập nhật được thông báo.' });
  }
});

app.post('/api/notifications/mark-all-read', requireAuth, async (req, res) => {
  try {
    const auth = (req as any).auth;
    if (auth.role === 'ADMIN') {
      await client.query("UPDATE notifications SET is_read = TRUE WHERE target_role IN ('ADMIN', 'ALL')");
    } else {
      await client.query("UPDATE notifications SET is_read = TRUE WHERE (target_role IN ('TENANT', 'ALL')) AND (target_room_id IS NULL OR target_room_id = $1)", [auth.roomId || null]);
    }
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Không cập nhật được thông báo.' });
  }
});

// ---------- Hợp đồng thuê nhà điện tử ----------
const upsertContract = async (contract: any) => {
  await client.query(
    `INSERT INTO contracts (id, contract_code, room_id, tenant_id, tenant_name, tenant_phone, tenant_id_card,
      start_date, end_date, monthly_rent, deposit, terms, notes, status, scan_file_path, created_at, terminated_at, termination_reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
     ON CONFLICT (id) DO UPDATE SET contract_code = EXCLUDED.contract_code, room_id = EXCLUDED.room_id,
      tenant_id = EXCLUDED.tenant_id, tenant_name = EXCLUDED.tenant_name, tenant_phone = EXCLUDED.tenant_phone,
      tenant_id_card = EXCLUDED.tenant_id_card, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date,
      monthly_rent = EXCLUDED.monthly_rent, deposit = EXCLUDED.deposit, terms = EXCLUDED.terms, notes = EXCLUDED.notes,
      status = EXCLUDED.status, scan_file_path = EXCLUDED.scan_file_path, terminated_at = EXCLUDED.terminated_at,
      termination_reason = EXCLUDED.termination_reason`,
    [contract.id, contract.contractCode, contract.roomId, contract.tenantId || null, contract.tenantName,
      contract.tenantPhone || '', contract.tenantIdCard || '', contract.startDate, contract.endDate,
      contract.monthlyRent || 0, contract.deposit || 0, contract.terms || '', contract.notes || null,
      contract.status || 'ACTIVE', contract.scanFilePath || null, contract.createdAt || new Date().toISOString(),
      contract.terminatedAt || null, contract.terminationReason || null]
  );
};

app.post('/api/contracts', requireAuth, requireAdmin, async (req, res) => {
  try {
    const c = req.body || {};
    if (!c.id || !c.roomId || !c.startDate || !c.endDate || !c.tenantName) {
      return res.status(400).json({ message: 'Thiếu thông tin hợp đồng.' });
    }
    await upsertContract(c);
    res.json({ ok: true });
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ message: 'Phòng này đã có hợp đồng còn hiệu lực. Hãy chấm dứt hợp đồng cũ trước.' });
    }
    console.error(error);
    res.status(500).json({ message: 'Không lưu được hợp đồng.' });
  }
});

app.put('/api/contracts/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await upsertContract({ ...req.body, id: req.params.id });
    res.json({ ok: true });
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ message: 'Phòng này đã có hợp đồng còn hiệu lực. Hãy chấm dứt hợp đồng cũ trước.' });
    }
    console.error(error);
    res.status(500).json({ message: 'Không cập nhật được hợp đồng.' });
  }
});

// Upload bản scan hợp đồng giấy: gửi file thô (octet-stream) + header tên file
app.post(
  '/api/contracts/:id/scan',
  requireAuth,
  requireAdmin,
  express.raw({ type: 'application/octet-stream', limit: '15mb' }),
  async (req, res) => {
    try {
      const buffer = req.body as Buffer;
      if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        return res.status(400).json({ message: 'Không nhận được dữ liệu file.' });
      }
      const rawName = decodeURIComponent(String(req.headers['x-file-name'] || 'scan'));
      const ext = extname(rawName).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf'].includes(ext)) {
        return res.status(400).json({ message: 'Định dạng file không hỗ trợ (chỉ JPG, PNG, WEBP, PDF).' });
      }
      const existing = await client.query('SELECT scan_file_path FROM contracts WHERE id = $1', [req.params.id]);
      if (existing.rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy hợp đồng.' });

      await mkdir(UPLOADS_DIR, { recursive: true });
      const fileName = `${req.params.id}-${Date.now()}${ext}`;
      await writeFile(join(UPLOADS_DIR, fileName), buffer);
      const filePath = `/uploads/contracts/${fileName}`;

      const oldPath = existing.rows[0].scan_file_path;
      await client.query('UPDATE contracts SET scan_file_path = $1 WHERE id = $2', [filePath, req.params.id]);
      if (oldPath && oldPath.startsWith('/uploads/')) {
        rm(join(process.cwd(), oldPath.replace(/^\//, '')), { force: true }).catch(() => undefined);
      }
      res.json({ ok: true, scanFilePath: filePath });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Không tải lên được bản scan.' });
    }
  }
);

// ---------- Cảnh cáo phòng trọ ----------
const upsertWarning = async (w: any) => {
  await client.query(
    `INSERT INTO warnings (id, room_id, tenant_id, tenant_name, room_number, violation_type, description,
      issued_at, issued_by, status, revoked_at, revoked_reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, revoked_at = EXCLUDED.revoked_at, revoked_reason = EXCLUDED.revoked_reason`,
    [w.id, w.roomId, w.tenantId || null, w.tenantName || '', w.roomNumber || '', w.violationType,
      w.description || '', w.issuedAt || new Date().toISOString(), w.issuedBy || '', w.status || 'ACTIVE',
      w.revokedAt || null, w.revokedReason || null]
  );
};

app.post('/api/warnings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const w = req.body || {};
    if (!w.id || !w.roomId || !w.violationType) {
      return res.status(400).json({ message: 'Thiếu thông tin cảnh cáo.' });
    }
    await upsertWarning(w);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Không lưu được cảnh cáo.' });
  }
});

app.patch('/api/warnings/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, revokedAt, revokedReason } = req.body || {};
    await client.query(
      'UPDATE warnings SET status = $1, revoked_at = $2, revoked_reason = $3 WHERE id = $4',
      [status || 'REVOKED', revokedAt || null, revokedReason || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Không cập nhật được cảnh cáo.' });
  }
});

// Lưu trữ toàn bộ cảnh cáo còn hiệu lực của một phòng (gọi khi trả phòng / đổi người thuê)
app.patch('/api/warnings/room/:roomId/archive', requireAuth, requireAdmin, async (req, res) => {
  try {
    await client.query("UPDATE warnings SET status = 'ARCHIVED' WHERE room_id = $1 AND status = 'ACTIVE'", [req.params.roomId]);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Không lưu trữ được cảnh cáo.' });
  }
});

app.post('/api/reset', requireAuth, requireAdmin, async (_req, res) => {
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM notifications');
    await client.query('DELETE FROM warnings');
    await client.query('DELETE FROM contracts');
    await client.query('DELETE FROM payments');
    await client.query('DELETE FROM invoices');
    await client.query("DELETE FROM app_users WHERE role <> 'ADMIN'");
    await client.query('UPDATE rooms SET is_occupied = FALSE, current_occupants = 0, tenant_id = NULL');
    await client.query('DELETE FROM tenants');
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Không khôi phục được dữ liệu.' });
  }
});

const bootstrap = async () => {
  await client.connect();
  await client.query(readFileSync('schema.sql', 'utf8'));

  // Ensure every account has a password; existing seed users get the default password.
  const missing = await client.query('SELECT id FROM app_users WHERE password_hash IS NULL');
  if (missing.rows.length > 0) {
    const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    await client.query('UPDATE app_users SET password_hash = $1 WHERE password_hash IS NULL', [hash]);
    console.log(`Đã gán mật khẩu mặc định "${DEFAULT_PASSWORD}" cho ${missing.rows.length} tài khoản. Hãy đổi mật khẩu sau khi đăng nhập.`);
  }

  // Ensure admin username from seed always exists for first login.
  const adminCheck = await client.query("SELECT id FROM app_users WHERE username = 'admin'");
  if (adminCheck.rows.length === 0) {
    const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    await client.query(
      "INSERT INTO app_users (id, username, role, full_name, phone, room_id, password_hash) VALUES ('admin-1', 'admin', 'ADMIN', 'Chủ Trọ', '', NULL, $1)",
      [hash]
    );
  }

  // Backfill one tenant account per occupant for occupied rooms (share-bill support)
  try {
    const occupiedRooms = await client.query(
      "SELECT r.id, r.room_number, r.current_occupants, t.name AS tenant_name, t.phone AS tenant_phone FROM rooms r LEFT JOIN tenants t ON t.id = r.tenant_id WHERE r.is_occupied = TRUE AND r.current_occupants > 1"
    );
    for (const room of occupiedRooms.rows) {
      const base = room.room_number.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');
      for (let i = 1; i <= room.current_occupants; i++) {
        const username = i === 1 ? base : `${base}-${i}`;
        const exists = await client.query('SELECT id FROM app_users WHERE username = $1', [username]);
        if (exists.rows.length === 0) {
          const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
          await client.query(
            "INSERT INTO app_users (id, username, role, full_name, phone, room_id, password_hash) VALUES ($1, $2, 'TENANT', $3, $4, $5, $6)",
            [`user-${room.id.toLowerCase()}-${i}`, username, room.tenant_name ? `${room.tenant_name} (người ${i})` : `Người thuê ${i}`, room.tenant_phone || '', room.id, hash]
          );
          console.log(`Tạo tài khoản tenant "${username}" cho ${room.room_number}`);
        }
      }
    }
  } catch (e) {
    console.warn('Không backfill được tài khoản tenant phụ:', e);
  }

  app.listen(port, () => console.log(`API running on http://localhost:${port}`));
};

bootstrap().catch((error) => {
  console.error('Cannot start PostgreSQL API:', error);
  process.exit(1);
});
