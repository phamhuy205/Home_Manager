import { ViolationType } from './types';

// 6 hành vi vi phạm nội quy nhà trọ (dùng chung cho hợp đồng & cảnh cáo)
export const VIOLATION_TYPES: { type: ViolationType; label: string; hint: string }[] = [
  { type: 'TRASH', label: 'Vứt rác bừa bãi', hint: 'Không vứt rác đúng nơi quy định, để rác trước phòng làm mất vệ sinh chung' },
  { type: 'DIRTY_ROOM', label: 'Phòng thuê quá bẩn', hint: 'Không dọn dẹp phòng, bốc mùi, ảnh hưởng vệ sinh cả dãy trọ' },
  { type: 'NOISE', label: 'Gây mất an ninh trật tự', hint: 'Nửa đêm mở nhạc to, ồn ào gây ảnh hưởng các phòng khác' },
  { type: 'DAMAGE_SHARED', label: 'Phá hoại đồ dùng chung', hint: 'Làm hỏng/hư hại đồ dùng, thiết bị dùng chung trong dãy trọ' },
  { type: 'DISUNITY', label: 'Gây mất đoàn kết', hint: 'Cự cãi, chia bè phái, gây mất đoàn kết trong dãy trọ thuê' },
  { type: 'OVERNIGHT_GUEST', label: 'Cho người lạ ở qua đêm', hint: 'Đưa người lạ vào ở qua đêm khi chưa được chủ trọ cho phép' },
];

export const VIOLATION_LABELS: Record<ViolationType, string> = VIOLATION_TYPES.reduce(
  (acc, v) => ({ ...acc, [v.type]: v.label }),
  {} as Record<ViolationType, string>
);

// Mẫu điều khoản hợp đồng mặc định — nội quy Điều 6 chính là căn cứ xử lý vi phạm ở tab Cảnh cáo
export const buildDefaultContractTerms = ({
  propertyName,
  ownerName,
  roomNumber,
  tenantName,
  tenantIdCard,
  startDate,
  endDate,
  monthlyRent,
  deposit,
}: {
  propertyName: string;
  ownerName: string;
  roomNumber: string;
  tenantName: string;
  tenantIdCard: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  deposit: number;
}): string => {
  const fmt = (d: string) => {
    const date = new Date(d);
    return isNaN(date.getTime()) ? d : date.toLocaleDateString('vi-VN');
  };
  const money = (n: number) => `${n.toLocaleString('vi-VN')} đồng`;

  return `HỢP ĐỒNG THUÊ NHÀ TRỌ

Căn cứ Bộ luật Dân sự năm 2015 và các quy định của pháp luật hiện hành, hôm nay ngày ${fmt(
    new Date().toISOString()
  )}, chúng tôi gồm:

BÊN A (Bên cho thuê): ${ownerName} — Chủ nhà trọ "${propertyName}"
BÊN B (Bên thuê): ${tenantName} — CCCD/Hộ chiếu số: ${tenantIdCard || '.........................'}

Hai bên thống nhất ký kết Hợp đồng thuê nhà trọ với các điều khoản sau:

ĐIỀU 1: ĐỐI TƯỢNG CHO THUÊ
Phòng số ${roomNumber} thuộc nhà trọ ${propertyName}, đầy đủ nội thất hiện có trong phòng.

ĐIỀU 2: THỜI HẠN THUÊ
Hợp đồng có hiệu lực từ ngày ${fmt(startDate)} đến ngày ${fmt(endDate)}. Hết thời hạn mà hai bên không có ý kiến chấm dứt thì hợp đồng được tiếp tục theo từng tháng cho đến khi bên nào thông báo trước ít nhất 15 ngày.

ĐIỀU 3: GIÁ THUÊ VÀ CÁCH THANH TOÁN
1. Giá thuê phòng: ${money(monthlyRent)} / tháng.
2. Bên B nộp tiền phòng trước ngày 10 hằng tháng bằng tiền mặt hoặc chuyển khoản.
3. Tiền đặt cọc: ${money(deposit)}. Bên A hoàn trả tiền cọc khi bên B trả phòng, sau khi đã đối soát các khoản tiền điện, nước, phí dịch vụ và tiền phạt (nếu có).

ĐIỀU 4: TIỀN ĐIỆN, NƯỚC VÀ PHÍ DỊCH VỤ
1. Tiền điện: 4.000 đồng/số (kWh) theo chỉ số công tơ thực tế.
2. Tiền nước, phí wifi, phí rác sinh hoạt theo mức ghi trên thông báo hàng tháng của nhà trọ.
3. Bên B thanh toán cùng lúc với tiền phòng hằng tháng.

ĐIỀU 5: TRÁCH NHIỆM CỦA CÁC BÊN
1. Bên A có trách nhiệm bảo trì khu vực chung, đảm bảo an ninh và cung cấp dịch vụ đúng cam kết.
2. Bên B có trách nhiệm giữ gìn phòng ở và tài sản chung, chấp hành nội quy nhà trọ, không tự ý cải tạo hay đổi người ở khi chưa được Bên A đồng ý.

ĐIỀU 6: NỘI QUY NHÀ TRỌ — CÁC HÀNH VI BỊ CẤM
1. Không vứt rác bừa bãi, phải bỏ rác đúng nơi quy định.
2. Không để phòng thuê quá bẩn, phải thường xuyên dọn dẹp phòng ở.
3. Không gây mất an ninh trật tự (ví dụ: nửa đêm mở nhạc to làm ảnh hưởng các phòng khác).
4. Không phá hoại đồ dùng, thiết bị dùng chung trong dãy trọ.
5. Không gây mất đoàn kết trong dãy trọ thuê.
6. Không được cho người lạ ở qua đêm khi chưa được chủ trọ cho phép.

Lưu ý: Mỗi lần vi phạm nội quy, Bên B bị lập biên bản cảnh cáo. Khi đạt tối đa 5 lần cảnh cáo, Bên A có quyền chấm dứt hợp đồng và yêu cầu Bên B phải rời khỏi nhà trọ trong thời gian thỏa thuận.

ĐIỀU 7: CHẤM DỪNG HỢP ĐỒNG
1. Một trong hai bên muốn chấm dứt trước thời hạn phải báo trước ít nhất 15 ngày.
2. Bên B vi phạm Điều 6 bị cảnh cáo từ 5 lần trở lên thì Bên A có quyền chấm dứt hợp đồng mà không bồi thường.
3. Sau khi chấm dứt, hai bên ký biên bản bàn giao phòng và đối soát các khoản còn nợ (nếu có).

Hai bên đọc kỹ, hoàn toàn đồng ý và ký xác nhận.

${new Date().toLocaleDateString('vi-VN')}

BÊN A (Chủ nhà trọ)                      BÊN B (Người thuê)


${ownerName}                             ${tenantName}`;
};
