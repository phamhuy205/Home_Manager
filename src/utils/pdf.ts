import { jsPDF } from 'jspdf';
import { Contract, Invoice } from '../types';
import { formatCurrency, formatDate } from './formatters';

// jsPDF mặc định không hỗ trợ dấu tiếng Việt -> chuyển về không dấu
const vn = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

export const exportInvoicePdf = (invoice: Invoice, propertyName: string, ownerName: string) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 50;

  const center = (text: string, size: number, bold = false) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(vn(text), pageWidth / 2, y, { align: 'center' });
    y += size + 8;
  };

  const line = (label: string, value: string, bold = false) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(vn(label), 50, y);
    doc.text(vn(value), pageWidth - 50, y, { align: 'right' });
    y += 18;
  };

  center('PHIEU THU TIEN PHONG & DIEN NUOC', 16, true);
  center(propertyName.toUpperCase(), 11);
  y += 6;
  doc.setDrawColor(180);
  doc.line(50, y, pageWidth - 50, y);
  y += 18;

  line('Ma hoa don:', invoice.invoiceCode);
  line('Ky thanh toan:', `Thang ${invoice.month}/${invoice.year}`);
  line('Phong:', `${invoice.roomNumber} (${invoice.roomType === 'VIP' ? 'VIP' : 'Thuong'})`);
  line('Nguoi thue:', invoice.tenantName);
  line('Han nop:', formatDate(invoice.dueDate));
  line('Trang thai:', invoice.status);
  y += 6;
  doc.line(50, y, pageWidth - 50, y);
  y += 18;

  line('Tien thue phong', formatCurrency(invoice.roomPrice));
  line(`Tien dien (${invoice.electricityUsage} kWh x ${formatCurrency(invoice.electricityRate)})`, formatCurrency(invoice.electricityAmount));
  line(`Tien nuoc (${invoice.waterUsage} x ${formatCurrency(invoice.waterRate)})`, formatCurrency(invoice.waterAmount));
  line('Wifi', formatCurrency(invoice.wifiFee));
  line('Rac & Ve sinh', formatCurrency(invoice.garbageFee));
  if (invoice.otherFee) line(`Phu phi: ${invoice.otherFeeNote || 'Khac'}`, formatCurrency(invoice.otherFee));
  y += 6;
  doc.line(50, y, pageWidth - 50, y);
  y += 20;
  line('TONG CONG', formatCurrency(invoice.totalAmount), true);
  line('DA THANH TOAN', formatCurrency(invoice.paidAmount), true);

  if (invoice.splits && invoice.splits.length > 0) {
    y += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CHIA DEU CHO NGUOI O', 50, y);
    y += 16;
    invoice.splits.forEach((split) => {
      line(`${split.label} - ${split.status}`, formatCurrency(split.amount));
    });
  }

  y += 30;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Nguoi nop tien', 90, y, { align: 'center' });
  doc.text(vn(ownerName), pageWidth - 90, y, { align: 'center' });
  y += 40;
  doc.text(vn(invoice.tenantName), 90, y, { align: 'center' });
  doc.text('(Xac nhan da nhan tien)', pageWidth - 90, y, { align: 'center' });

  doc.save(`${invoice.invoiceCode}.pdf`);
};

// ---------- Hợp đồng thuê nhà điện tử ----------
export const exportContractPdf = (contract: Contract, propertyName: string, ownerName: string) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 50;
  let y = 50;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const center = (text: string, size: number, bold = false) => {
    ensureSpace(size + 12);
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(vn(text), pageWidth / 2, y, { align: 'center' });
    y += size + 8;
  };

  const line = (label: string, value: string, bold = false) => {
    ensureSpace(18);
    doc.setFontSize(10);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(vn(label), margin, y);
    doc.text(vn(value), pageWidth - margin, y, { align: 'right' });
    y += 18;
  };

  center('HOP DONG THUE NHA TRO', 16, true);
  center(propertyName.toUpperCase(), 11);
  center(`Ma hop dong: ${contract.contractCode}`, 10);
  y += 4;
  doc.setDrawColor(180);
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;

  line('Ben A (Chu nha tro):', ownerName);
  line('Ben B (Nguoi thue):', contract.tenantName);
  line('CCCD/Ho chieu so:', contract.tenantIdCard || '...');
  line('So dien thoai:', contract.tenantPhone || '...');
  line('Phong thue:', contract.roomNumber);
  line('Thoi han:', `${formatDate(contract.startDate)} - ${formatDate(contract.endDate)}`);
  line('Gia thue:', `${formatCurrency(contract.monthlyRent)} / thang`);
  line('Tien dat coc:', formatCurrency(contract.deposit));
  y += 4;
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  // In toàn bộ điều khoản (tự xuống trang khi hết chỗ)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const paragraphs = (contract.terms || '').split('\n');
  paragraphs.forEach((raw) => {
    if (raw.trim() === '') {
      y += 8;
      return;
    }
    const isHeading = /^(HỢP ĐỒNG|ĐIỀU \d|Căn cứ|BÊN A|BÊN B|Hai bên|Lưu ý)/i.test(raw.trim());
    doc.setFont('helvetica', isHeading ? 'bold' : 'normal');
    const lines: string[] = doc.splitTextToSize(vn(raw), pageWidth - margin * 2) as string[];
    lines.forEach((text) => {
      ensureSpace(16);
      doc.text(text, margin, y);
      y += 15;
    });
    y += 3;
  });

  // Chữ ký
  ensureSpace(120);
  y += 24;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BEN A (Chu nha tro)', margin + 30, y, { align: 'center' });
  doc.text('BEN B (Nguoi thue)', pageWidth - margin - 60, y, { align: 'center' });
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('(Ky, ghi ro ho ten)', margin + 30, y, { align: 'center' });
  doc.text('(Ky, ghi ro ho ten)', pageWidth - margin - 60, y, { align: 'center' });
  y += 50;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(vn(ownerName), margin + 30, y, { align: 'center' });
  doc.text(vn(contract.tenantName), pageWidth - margin - 60, y, { align: 'center' });

  doc.save(`${contract.contractCode}.pdf`);
};

// ---------- Bảng kê công nợ theo kỳ từng phòng ----------
export interface DebtStatementRow {
  roomNumber: string;
  tenantName: string;
  billed: number;
  paid: number;
  dueInPeriod: number;
  cumulativeDebt: number;
}

export const exportDebtStatementPdf = ({
  propertyName,
  ownerName,
  periodLabel,
  rows,
  totalBilled,
  totalPaid,
  totalDue,
  totalCumulativeDebt,
  cashCollected,
}: {
  propertyName: string;
  ownerName: string;
  periodLabel: string;
  rows: DebtStatementRow[];
  totalBilled: number;
  totalPaid: number;
  totalDue: number;
  totalCumulativeDebt: number;
  cashCollected: number;
}) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = 50;

  const center = (text: string, size: number, bold = false) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(vn(text), pageWidth / 2, y, { align: 'center' });
    y += size + 8;
  };

  center('BANG KE CONG NO THEO KY', 15, true);
  center(propertyName.toUpperCase(), 11);
  center(periodLabel, 10);
  y += 4;
  doc.setDrawColor(180);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  // Tổng hợp
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const summary: [string, string][] = [
    ['Tổng phát sinh trong kỳ:', formatCurrency(totalBilled)],
    ['Đã thu (theo hóa đơn):', formatCurrency(totalPaid)],
    ['Còn nợ trong kỳ:', formatCurrency(totalDue)],
    ['Nợ lũy kế đến ngày kết thúc:', formatCurrency(totalCumulativeDebt)],
    ['Thực thu theo giao dịch:', formatCurrency(cashCollected)],
  ];
  summary.forEach(([label, value]) => {
    doc.text(vn(label), margin, y);
    doc.setFont('helvetica', 'bold');
    doc.text(vn(value), pageWidth - margin, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 16;
  });
  y += 8;
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;

  // Bảng chi tiết
  const cols = [margin, margin + 70, margin + 190, margin + 280, margin + 365, margin + 450, pageWidth - margin];
  const header = ['Phong', 'Nguoi thue', 'Phat sinh', 'Da nop', 'No trong ky', 'No luy ke'];
  const drawHeader = () => {
    doc.setFillColor(235, 238, 245);
    doc.rect(margin, y - 12, pageWidth - margin * 2, 18, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    header.forEach((text, i) => {
      if (i < 2) doc.text(vn(text), cols[i] + 4, y);
      else doc.text(vn(text), cols[i], y, { align: 'right' });
    });
    y += 18;
  };
  drawHeader();

  doc.setFontSize(8);
  rows.forEach((row) => {
    if (y > pageHeight - margin - 40) {
      doc.addPage();
      y = margin;
      drawHeader();
    }
    doc.setFont('helvetica', 'normal');
    doc.text(vn(row.roomNumber).slice(0, 12), cols[0] + 4, y);
    doc.text(vn(row.tenantName).slice(0, 22), cols[1] + 4, y);
    doc.setFont('helvetica', 'bold');
    doc.text(vn(formatCurrency(row.billed)), cols[2], y, { align: 'right' });
    doc.text(vn(formatCurrency(row.paid)), cols[3], y, { align: 'right' });
    doc.setTextColor(190, 30, 45);
    doc.text(vn(formatCurrency(row.dueInPeriod)), cols[4], y, { align: 'right' });
    doc.text(vn(formatCurrency(row.cumulativeDebt)), cols[5], y, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 14;
    doc.setDrawColor(225);
    doc.line(margin, y - 10, pageWidth - margin, y - 10);
  });

  // Tổng cộng
  y += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('TONG CONG', cols[0] + 4, y);
  doc.text(vn(formatCurrency(totalBilled)), cols[2], y, { align: 'right' });
  doc.text(vn(formatCurrency(totalPaid)), cols[3], y, { align: 'right' });
  doc.text(vn(formatCurrency(totalDue)), cols[4], y, { align: 'right' });
  doc.text(vn(formatCurrency(totalCumulativeDebt)), cols[5], y, { align: 'right' });

  y += 40;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Chu nha tro', margin + 60, y, { align: 'center' });
  doc.text(vn(ownerName), pageWidth - margin - 60, y, { align: 'center' });
  y += 40;
  doc.setFont('helvetica', 'bold');
  doc.text(vn(ownerName), margin + 60, y, { align: 'center' });

  doc.save(`cong-no-${new Date().toISOString().slice(0, 10)}.pdf`);
};
