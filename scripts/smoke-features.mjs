/* Smoke test 3 tính năng mới: Hợp đồng, Cảnh cáo, Công nợ (dữ liệu state).
   Chạy: node scripts/smoke-features.mjs  (server phải đang chạy) */
import pg from 'pg';

const API = 'http://localhost:4000';
const results = [];
const ok = (name, pass, extra = '') => {
  results.push({ name, pass, extra });
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${name}${extra ? ' — ' + extra : ''}`);
};

const loginRes = await fetch(`${API}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: process.env.DEFAULT_PASSWORD || '123456' }),
});
const login = await loginRes.json();
if (!login.token) {
  console.log('LOGIN FAIL:', login);
  process.exit(1);
}
const H = { Authorization: `Bearer ${login.token}`, 'Content-Type': 'application/json' };

const getState = async () => (await fetch(`${API}/api/state`, { headers: H })).json();
let state = await getState();

ok('loadState có warningLimit', typeof state.warningLimit === 'number', `= ${state.warningLimit}`);
ok('loadState có contracts', Array.isArray(state.contracts), `${state.contracts.length} bản ghi`);
ok('loadState có warnings', Array.isArray(state.warnings), `${state.warnings.length} bản ghi`);

const room = state.rooms.find((r) => r.isOccupied);
if (!room) {
  console.log('SKIP: không có phòng đang thuê để test');
  process.exit(results.some((r) => !r.pass) ? 1 : 0);
}

// ---- HỢP ĐỒNG ----
const today = new Date();
const start = today.toISOString().split('T')[0];
const end = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString().split('T')[0];
const contract = {
  id: `CTR-TEST-${Date.now()}`,
  contractCode: `HD-TEST-${Date.now()}`,
  roomId: room.id,
  roomNumber: room.roomNumber,
  tenantName: room.tenant?.name || 'Khach test',
  tenantPhone: room.tenant?.phone || '0900000000',
  tenantIdCard: room.tenant?.idCard || '00000000000',
  startDate: start,
  endDate: end,
  monthlyRent: room.basePrice,
  deposit: room.tenant?.deposit || 1000000,
  terms: 'Dieu khoan test',
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
};

let res = await fetch(`${API}/api/contracts`, { method: 'POST', headers: H, body: JSON.stringify(contract) });
ok('POST /api/contracts', res.ok, `status ${res.status}`);

// HĐ trùng phòng ACTIVE phải bị chặn 409
res = await fetch(`${API}/api/contracts`, {
  method: 'POST',
  headers: H,
  body: JSON.stringify({ ...contract, id: `CTR-TEST-DUP-${Date.now()}` }),
});
ok('Chặn 2 HĐ ACTIVE cùng phòng', res.status === 409, `status ${res.status}`);

// Upload bản scan (raw body)
const pngBytes = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);
res = await fetch(`${API}/api/contracts/${contract.id}/scan`, {
  method: 'POST',
  headers: {
    Authorization: H.Authorization,
    'Content-Type': 'application/octet-stream',
    'x-file-name': encodeURIComponent('scan-test.png'),
  },
  body: pngBytes,
});
const scanPayload = await res.json().catch(() => ({}));
ok('Upload scan hợp đồng', res.ok && !!scanPayload.scanFilePath, `path ${scanPayload.scanFilePath}`);
state = await getState();
const saved = state.contracts.find((c) => c.id === contract.id);
ok('State trả về scanFilePath', saved?.scanFilePath === scanPayload.scanFilePath);

// ---- CẢNH CÁO ----
const mkWarning = (type) => ({
  id: `WRN-TEST-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  roomId: room.id,
  roomNumber: room.roomNumber,
  tenantName: room.tenant?.name || 'Khach test',
  violationType: type,
  description: 'Test vi pham',
  issuedAt: new Date().toISOString(),
  issuedBy: 'Test',
  status: 'ACTIVE',
});
const w1 = mkWarning('NOISE');
res = await fetch(`${API}/api/warnings`, { method: 'POST', headers: H, body: JSON.stringify(w1) });
ok('POST /api/warnings #1', res.ok, `status ${res.status}`);
const w2 = mkWarning('TRASH');
res = await fetch(`${API}/api/warnings`, { method: 'POST', headers: H, body: JSON.stringify(w2) });
ok('POST /api/warnings #2', res.ok, `status ${res.status}`);

state = await getState();
const activeOfRoom = state.warnings.filter((w) => w.roomId === room.id && w.status === 'ACTIVE');
ok('Đếm được 2 cảnh cáo ACTIVE', activeOfRoom.length === 2, `${activeOfRoom.length}`);

// Thu hồi 1 cảnh cáo → ACTIVE còn 1
res = await fetch(`${API}/api/warnings/${w1.id}`, {
  method: 'PATCH',
  headers: H,
  body: JSON.stringify({ status: 'REVOKED', revokedAt: new Date().toISOString(), revokedReason: 'Test thu hoi' }),
});
ok('PATCH thu hồi cảnh cáo', res.ok, `status ${res.status}`);
state = await getState();
const afterRevoke = state.warnings.filter((w) => w.roomId === room.id && w.status === 'ACTIVE');
ok('Sau thu hồi ACTIVE còn 1', afterRevoke.length === 1, `${afterRevoke.length}`);

// Lưu trữ toàn bộ (khi trả phòng) → ACTIVE = 0
res = await fetch(`${API}/api/warnings/room/${room.id}/archive`, { method: 'PATCH', headers: H, body: '{}' });
ok('PATCH archive toàn bộ phòng', res.ok, `status ${res.status}`);
state = await getState();
const afterArchive = state.warnings.filter((w) => w.roomId === room.id && w.status === 'ACTIVE');
const archived = state.warnings.filter((w) => w.roomId === room.id && w.status === 'ARCHIVED');
ok('Sau archive ACTIVE = 0', afterArchive.length === 0, `${afterArchive.length}`);
ok('Bản ACTIVE được chuyển ARCHIVED', archived.length === 1, `${archived.length}`);

// ---- DỌN DẸP dữ liệu test ----
try {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query("DELETE FROM warnings WHERE id LIKE 'WRN-TEST-%' OR issued_by = 'Test'");
  await client.query("DELETE FROM contracts WHERE id LIKE 'CTR-TEST-%'");
  await client.query('NOTIFY pgrst, \'reload schema\'');
  await client.end();
  if (scanPayload.scanFilePath) {
    const { rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    await rm(join(process.cwd(), scanPayload.scanFilePath.replace(/^\//, '')), { force: true });
  }
  console.log('CLEANUP: đã xóa dữ liệu test');
} catch (e) {
  console.log('CLEANUP WARN:', e.message);
}

const failed = results.filter((r) => !r.pass);
console.log(`\nKẾT QUẢ: ${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
