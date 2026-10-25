\encoding UTF8
-- Generated from initialData.ts for one-time database import.
-- Runtime application data is read from PostgreSQL, not from this TypeScript file.
BEGIN;

TRUNCATE TABLE notifications, payments, invoices, app_users, rooms, tenants, property_settings RESTART IDENTITY CASCADE;

INSERT INTO property_settings (id, property_name, owner_name)
VALUES
(1, 'Nhà Trọ Bà Tuyết', 'Hoàng Thị Tuyết');

INSERT INTO tenants (id, name, phone, id_card, email, start_date, deposit)
VALUES
('T-VIPA1', 'Nguyễn Duy Phong', '0912 345 678', '079201004521', 'nam.nguyen@example.com', '2025-06-01', 2000000),
('T-VIPA2', 'Nguyễn Hương Giang', '0983 221 445', '080201008892', 'maiphuong.tran@example.com', '2025-08-15', 2000000),
('T-VIPA3', 'Nguyễn Thị Thùy Dung', '0909 888 123', '072200001234', 'quan.le@example.com', '2025-09-01', 2000000),
('T-VIPA4', 'Tô Đức Mạnh', '0934 567 890', '068202009871', 'ductrong@example.com', '2025-10-01', 2000000),
('T-VIPA5', 'Nguyễn Đức Đạt', '0977 112 334', '075203004321', 'thaonguyen.vu@example.com', '2026-01-10', 2000000),
('T-P1', 'Nguyễn Minh Đức', '0903 123 456', '079201009988', 'tuananh.dang@example.com', '2025-05-10', 1000000),
('T-P2', 'Nguyễn Thành An', '0944 234 567', '082200004561', 'kimngan.bui@example.com', '2025-07-01', 1000000),
('T-P3', 'Ngô Đình Khương', '0918 765 432', '070202008765', 'quochuy.ly@example.com', '2025-08-01', 1000000),
('T-P4', 'Phạm Xuân Huy', '0988 776 655', '066201007712', 'thuytrang.do@example.com', '2025-09-15', 1000000),
('T-P5', 'Ngô Đình Khương', '0965 432 109', '074200003456', 'vanbach.hoang@example.com', '2025-11-01', 1000000),
('T-P6', 'Trương Hùng Việt', '0908 998 877', '079203001122', 'thanhson.ngo@example.com', '2025-12-01', 1000000),
('T-P7', 'Trần Duy Nam', '0937 665 544', '083204005544', 'yennhi.phan@example.com', '2026-01-05', 1000000),
('T-P8', 'Phan Hải Ninh', '0972 881 992', '077201006677', 'chihao.luong@example.com', '2026-02-15', 1000000),
('T-P9', 'Lưu Hải Tuân', '0915 234 890', '089202003321', 'mylinh.duong@example.com', '2026-03-01', 1000000),
('T-P10', 'Nghuyễn Đức Dũng', '0902 456 789', '079201004433', 'quocdat.chu@example.com', '2026-04-01', 1000000);

INSERT INTO rooms (id, room_number, room_type, base_price, area, max_occupants, current_occupants, is_occupied, tenant_id, last_electricity_index, last_water_index, water_billing_type, water_rate, electricity_rate, wifi_fee, garbage_fee, description)
VALUES
('VIP-A1', 'Phòng A1', 'VIP', 2000000, 28, 3, 2, TRUE, 'T-VIPA1', 1245, 68, 'PER_PERSON', 100000, 4000, 50000, 30000, 'Phòng VIP tầng 1, ban công thoáng mát, full máy lạnh, tủ lạnh, gác lửng cao cấp.'),
('VIP-A2', 'Phòng A2', 'VIP', 2000000, 30, 3, 2, TRUE, 'T-VIPA2', 980, 54, 'PER_PERSON', 100000, 4000, 50000, 30000, 'Phòng VIP tầng 1, nội thất gỗ sang trọng, có cửa sổ lớn đón ánh sáng tự nhiên.'),
('VIP-A3', 'Phòng A3', 'VIP', 2000000, 28, 3, 2, TRUE, 'T-VIPA3', 1120, 60, 'PER_PERSON', 100000, 4000, 50000, 30000, 'Phòng VIP góc yên tĩnh, máy giặt riêng, bếp từ âm hiện đại.'),
('VIP-A4', 'Phòng A4', 'VIP', 2000000, 32, 4, 2, TRUE, 'T-VIPA4', 1450, 72, 'PER_PERSON', 100000, 4000, 50000, 30000, 'Phòng VIP view ngắm phố cực chill, trang bị Smart TV và bàn làm việc rộng.'),
('VIP-A5', 'Phòng A5', 'VIP', 2000000, 30, 3, 1, TRUE, 'T-VIPA5', 820, 40, 'PER_PERSON', 100000, 4000, 50000, 30000, 'Phòng VIP không gian riêng tư, thiết kế tối giản phong cách Nhật Bản.'),
('P-1', 'Phòng 1', 'STANDARD', 1000000, 18, 2, 2, TRUE, 'T-P1', 560, 30, 'PER_PERSON', 80000, 4000, 40000, 25000, 'Phòng thường tầng trệt, sạch sẽ, có gác lửng đúc kiên cố, WC riêng.'),
('P-2', 'Phòng 2', 'STANDARD', 1000000, 18, 2, 1, TRUE, 'T-P2', 430, 25, 'PER_PERSON', 80000, 4000, 40000, 25000, 'Phòng thường tầng trệt, quạt trần, lavabo riêng, cửa sổ thoáng khí.'),
('P-3', 'Phòng 3', 'STANDARD', 1000000, 18, 2, 2, TRUE, 'T-P3', 610, 35, 'PER_PERSON', 80000, 4000, 40000, 25000, 'Phòng thường tầng trệt, ốp gạch men sạch mát quanh tường.'),
('P-4', 'Phòng 4', 'STANDARD', 1000000, 18, 2, 1, TRUE, 'T-P4', 390, 22, 'PER_PERSON', 80000, 4000, 40000, 25000, 'Phòng thường tầng trệt, thích hợp sinh viên, người đi làm.'),
('P-5', 'Phòng 5', 'STANDARD', 1000000, 18, 2, 2, TRUE, 'T-P5', 510, 28, 'PER_PERSON', 80000, 4000, 40000, 25000, 'Phòng thường tầng trệt cuối dãy, an ninh tuyệt đối.'),
('P-6', 'Phòng 6', 'STANDARD', 1000000, 19, 2, 2, TRUE, 'T-P6', 480, 27, 'PER_PERSON', 80000, 4000, 40000, 25000, 'Phòng thường lầu 1, nhiều ánh sáng, ban công phơi đồ chung rộng.'),
('P-7', 'Phòng 7', 'STANDARD', 1000000, 18, 2, 1, TRUE, 'T-P7', 320, 19, 'PER_PERSON', 80000, 4000, 40000, 25000, 'Phòng thường lầu 1, không gian gọn gàng ấm cúng.'),
('P-8', 'Phòng 8', 'STANDARD', 1000000, 18, 2, 2, TRUE, 'T-P8', 590, 31, 'PER_PERSON', 80000, 4000, 40000, 25000, 'Phòng thường lầu 1, trang bị bồn rửa chén và kệ để đồ inox.'),
('P-9', 'Phòng 9', 'STANDARD', 1000000, 18, 2, 1, TRUE, 'T-P9', 275, 16, 'PER_PERSON', 80000, 4000, 40000, 25000, 'Phòng thường lầu 1, lối đi rộng, camera an ninh 24/7.'),
('P-10', 'Phòng 10', 'STANDARD', 1000000, 18, 2, 2, TRUE, 'T-P10', 440, 26, 'PER_PERSON', 80000, 4000, 40000, 25000, 'Phòng thường lầu 1, mát mẻ không bị hắt nắng chiều.'),
('P-11', 'Phòng 11', 'STANDARD', 1000000, 18, 2, 0, FALSE, NULL, 210, 12, 'PER_PERSON', 80000, 4000, 40000, 25000, 'Phòng thường cuối dãy vừa được sơn sửa sạch đẹp, thoáng mát, sẵn sàng cho khách thuê mới.');

INSERT INTO app_users (id, username, role, full_name, phone, room_id)
VALUES
('admin-1', 'admin', 'ADMIN', 'Hoàng Thị Tuyết (Chủ Trọ)', '0909 999 888', NULL),
('user-vipa1', 'a1', 'TENANT', 'Nguyễn Duy Phong', '0912 345 678', 'VIP-A1'),
('user-vipa2', 'a2', 'TENANT', 'Nguyễn Hương Giang', '0983 221 445', 'VIP-A2'),
('user-vipa3', 'a3', 'TENANT', 'Nguyễn Thị Thùy Dung', '0909 888 123', 'VIP-A3'),
('user-vipa4', 'a4', 'TENANT', 'Tô Đức Mạnh', '0934 567 890', 'VIP-A4'),
('user-vipa5', 'a5', 'TENANT', 'Nguyễn Đức Đạt', '0977 112 334', 'VIP-A5'),
('user-p1', 'p1', 'TENANT', 'Nguyễn Minh Đức', '0903 123 456', 'P-1'),
('user-p2', 'p2', 'TENANT', 'Nguyễn Thành An', '0944 234 567', 'P-2'),
('user-p3', 'p3', 'TENANT', 'Ngô Đình Khương', '0918 765 432', 'P-3'),
('user-p4', 'p4', 'TENANT', 'Phạm Xuân Huy', '0988 776 655', 'P-4'),
('user-p5', 'p5', 'TENANT', 'Ngô Đình Khương', '0965 432 109', 'P-5'),
('user-p6', 'p6', 'TENANT', 'Trương Hùng Việt', '0908 998 877', 'P-6'),
('user-p7', 'p7', 'TENANT', 'Trần Duy Nam', '0937 665 544', 'P-7'),
('user-p8', 'p8', 'TENANT', 'Phan Hải Ninh', '0972 881 992', 'P-8'),
('user-p9', 'p9', 'TENANT', 'Lưu Hải Tuân', '0915 234 890', 'P-9'),
('user-p10', 'p10', 'TENANT', 'Nghuyễn Đức Dũng', '0902 456 789', 'P-10');

INSERT INTO invoices (id, invoice_code, room_id, month, year, due_date, tenant_name, tenant_phone, room_price, old_electricity_index, new_electricity_index, electricity_usage, electricity_rate, electricity_amount, water_billing_type, old_water_index, new_water_index, water_usage, water_rate, water_amount, wifi_fee, garbage_fee, other_fee, other_fee_note, total_amount, paid_amount, status, created_at, paid_at, reminded_count, last_reminded_at, notes)
VALUES
('INV-202609-VIPA1', 'HD-202609-VIPA1', 'VIP-A1', 9, 2026, '2026-09-10', 'Nguyễn Duy Phong', '0912 345 678', 2000000, 1160, 1245, 85, 4000, 340000, 'PER_PERSON', NULL, NULL, 2, 100000, 200000, 50000, 30000, 0, NULL, 2620000, 2620000, 'PAID', '2026-09-01T08:00:00Z', '2026-09-02T10:15:00Z', 0, NULL, NULL),
('INV-202609-VIPA2', 'HD-202609-VIPA2', 'VIP-A2', 9, 2026, '2026-09-10', 'Nguyễn Hương Giang', '0983 221 445', 2000000, 910, 980, 70, 4000, 280000, 'PER_PERSON', NULL, NULL, 2, 100000, 200000, 50000, 30000, 0, NULL, 2560000, 2560000, 'PENDING_APPROVAL', '2026-09-01T08:00:00Z', '2026-09-04T18:30:00Z', 1, NULL, NULL),
('INV-202609-VIPA3', 'HD-202609-VIPA3', 'VIP-A3', 9, 2026, '2026-09-10', 'Nguyễn Thị Thùy Dung', '0909 888 123', 2000000, 1040, 1120, 80, 4000, 320000, 'PER_PERSON', NULL, NULL, 2, 100000, 200000, 50000, 30000, 0, NULL, 2600000, 0, 'UNPAID', '2026-09-01T08:00:00Z', NULL, 1, NULL, NULL),
('INV-202609-VIPA4', 'HD-202609-VIPA4', 'VIP-A4', 9, 2026, '2026-09-10', 'Tô Đức Mạnh', '0934 567 890', 2000000, 1350, 1450, 100, 4000, 400000, 'PER_PERSON', NULL, NULL, 2, 100000, 200000, 50000, 30000, 0, NULL, 2680000, 2680000, 'PAID', '2026-09-01T08:00:00Z', '2026-09-03T14:20:00Z', 0, NULL, NULL),
('INV-202609-VIPA5', 'HD-202609-VIPA5', 'VIP-A5', 9, 2026, '2026-09-10', 'Nguyễn Đức Đạt', '0977 112 334', 2000000, 760, 820, 60, 4000, 240000, 'PER_PERSON', NULL, NULL, 1, 100000, 100000, 50000, 30000, 0, NULL, 2420000, 0, 'UNPAID', '2026-09-01T08:00:00Z', NULL, 0, NULL, NULL),
('INV-202609-P1', 'HD-202609-P1', 'P-1', 9, 2026, '2026-09-10', 'Nguyễn Minh Đức', '0903 123 456', 1000000, 510, 560, 50, 4000, 200000, 'PER_PERSON', NULL, NULL, 2, 80000, 160000, 40000, 25000, 0, NULL, 1425000, 1425000, 'PAID', '2026-09-01T08:00:00Z', '2026-09-02T16:00:00Z', 0, NULL, NULL),
('INV-202609-P2', 'HD-202609-P2', 'P-2', 9, 2026, '2026-09-10', 'Nguyễn Thành An', '0944 234 567', 1000000, 390, 430, 40, 4000, 160000, 'PER_PERSON', NULL, NULL, 1, 80000, 80000, 40000, 25000, 0, NULL, 1305000, 0, 'UNPAID', '2026-09-01T08:00:00Z', NULL, 1, NULL, NULL),
('INV-202609-P3', 'HD-202609-P3', 'P-3', 9, 2026, '2026-09-10', 'Ngô Đình Khương', '0918 765 432', 1000000, 550, 610, 60, 4000, 240000, 'PER_PERSON', NULL, NULL, 2, 80000, 160000, 40000, 25000, 0, NULL, 1465000, 1465000, 'PAID', '2026-09-01T08:00:00Z', '2026-09-03T09:30:00Z', 0, NULL, NULL),
('INV-202609-P4', 'HD-202609-P4', 'P-4', 9, 2026, '2026-09-10', 'Phạm Xuân Huy', '0988 776 655', 1000000, 355, 390, 35, 4000, 140000, 'PER_PERSON', NULL, NULL, 1, 80000, 80000, 40000, 25000, 0, NULL, 1285000, 0, 'UNPAID', '2026-09-01T08:00:00Z', NULL, 0, NULL, NULL),
('INV-202609-P5', 'HD-202609-P5', 'P-5', 9, 2026, '2026-09-10', 'Ngô Đình Khương', '0965 432 109', 1000000, 465, 510, 45, 4000, 180000, 'PER_PERSON', NULL, NULL, 2, 80000, 160000, 40000, 25000, 0, NULL, 1405000, 1405000, 'PAID', '2026-09-01T08:00:00Z', '2026-09-02T19:00:00Z', 0, NULL, NULL),
('INV-202609-P6', 'HD-202609-P6', 'P-6', 9, 2026, '2026-09-10', 'Trương Hùng Việt', '0908 998 877', 1000000, 430, 480, 50, 4000, 200000, 'PER_PERSON', NULL, NULL, 2, 80000, 160000, 40000, 25000, 0, NULL, 1425000, 0, 'UNPAID', '2026-09-01T08:00:00Z', NULL, 1, NULL, NULL),
('INV-202609-P7', 'HD-202609-P7', 'P-7', 9, 2026, '2026-09-10', 'Trần Duy Nam', '0937 665 544', 1000000, 285, 320, 35, 4000, 140000, 'PER_PERSON', NULL, NULL, 1, 80000, 80000, 40000, 25000, 0, NULL, 1285000, 1285000, 'PAID', '2026-09-01T08:00:00Z', '2026-09-03T11:45:00Z', 0, NULL, NULL),
('INV-202609-P8', 'HD-202609-P8', 'P-8', 9, 2026, '2026-09-10', 'Phan Hải Ninh', '0972 881 992', 1000000, 535, 590, 55, 4000, 220000, 'PER_PERSON', NULL, NULL, 2, 80000, 160000, 40000, 25000, 0, NULL, 1445000, 0, 'UNPAID', '2026-09-01T08:00:00Z', NULL, 0, NULL, NULL),
('INV-202609-P9', 'HD-202609-P9', 'P-9', 9, 2026, '2026-09-10', 'Lưu Hải Tuân', '0915 234 890', 1000000, 245, 275, 30, 4000, 120000, 'PER_PERSON', NULL, NULL, 1, 80000, 80000, 40000, 25000, 0, NULL, 1265000, 1265000, 'PAID', '2026-09-01T08:00:00Z', '2026-09-02T15:20:00Z', 0, NULL, NULL),
('INV-202609-P10', 'HD-202609-P10', 'P-10', 9, 2026, '2026-09-10', 'Nghuyễn Đức Dũng', '0902 456 789', 1000000, 395, 440, 45, 4000, 180000, 'PER_PERSON', NULL, NULL, 2, 80000, 160000, 40000, 25000, 0, NULL, 1405000, 0, 'UNPAID', '2026-09-01T08:00:00Z', NULL, 1, NULL, NULL);

INSERT INTO payments (id, invoice_id, invoice_code, room_id, room_number, room_type, tenant_name, amount, payment_method, transaction_ref, note, paid_at, approved_by_admin, approved_at, month, year)
VALUES
('PAY-202609-001', 'INV-202609-VIPA1', 'HD-202609-VIPA1', 'VIP-A1', 'Phòng A1', 'VIP', 'Nguyễn Duy Phong', 2620000, 'BANK_TRANSFER', 'MBB-99882211', 'Thanh toán tiền phòng A1 tháng 9/2026', '2026-09-02T10:15:00Z', TRUE, '2026-09-02T10:30:00Z', 9, 2026),
('PAY-202609-002', 'INV-202609-VIPA2', 'HD-202609-VIPA2', 'VIP-A2', 'Phòng A2', 'VIP', 'Nguyễn Hương Giang', 2560000, 'BANK_TRANSFER', 'VCB-2026090488', 'Mai Phương A2 chuyển tiền phòng + điện nước', '2026-09-04T18:30:00Z', FALSE, NULL, 9, 2026),
('PAY-202609-003', 'INV-202609-VIPA4', 'HD-202609-VIPA4', 'VIP-A4', 'Phòng A4', 'VIP', 'Tô Đức Mạnh', 2680000, 'BANK_TRANSFER', 'TCB-88332211', 'A4 đóng tiền phòng tháng 9', '2026-09-03T14:20:00Z', TRUE, '2026-09-03T14:40:00Z', 9, 2026),
('PAY-202609-004', 'INV-202609-P1', 'HD-202609-P1', 'P-1', 'Phòng 1', 'STANDARD', 'Nguyễn Minh Đức', 1425000, 'CASH', NULL, 'Tuấn Anh nộp tiền mặt trực tiếp cho chủ trọ', '2026-09-02T16:00:00Z', TRUE, '2026-09-02T16:05:00Z', 9, 2026),
('PAY-202609-005', 'INV-202609-P3', 'HD-202609-P3', 'P-3', 'Phòng 3', 'STANDARD', 'Ngô Đình Khương', 1465000, 'BANK_TRANSFER', 'ACB-77441122', 'Phong 3 chuyen khoan tien phong', '2026-09-03T09:30:00Z', TRUE, '2026-09-03T09:45:00Z', 9, 2026);

INSERT INTO notifications (id, target_role, target_room_id, title, message, type, is_read, created_at, related_invoice_id, related_payment_id)
VALUES
('NOTIF-001', 'ADMIN', NULL, 'Báo có thanh toán: Phòng A2', 'Phòng A2 (Nguyễn Hương Giang) vừa gửi xác nhận thanh toán 2.560.000 đ qua VietQR (Mã GD: VCB-2026090488). Vui lòng kiểm tra tài khoản và bấm xác nhận.', 'PAYMENT_RECEIVED', FALSE, '2026-09-04T18:30:00Z', 'INV-202609-VIPA2', 'PAY-202609-002'),
('NOTIF-002', 'ADMIN', NULL, 'Hệ thống khởi tạo thành công', 'Hệ thống quản lý 16 phòng (5 VIP A1-A5, 11 Thường 1-11) đã sẵn sàng. Giá điện chốt cố định 4.000 đ/số.', 'SYSTEM', TRUE, '2026-09-01T08:00:00Z', NULL, NULL),
('NOTIF-003', 'TENANT', 'VIP-A2', 'Hóa đơn tiền phòng Tháng 9/2026', 'Hóa đơn mới của Phòng A2 đã được lập. Tổng tiền: 2.560.000 đ (Điện tiêu thụ: 70 số x 4.000đ = 280.000đ). Hạn nộp: 10/09/2026.', 'INVOICE_CREATED', FALSE, '2026-09-01T08:00:00Z', 'INV-202609-VIPA2', NULL);

COMMIT;
