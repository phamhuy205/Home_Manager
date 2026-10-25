import React, { useMemo, useState } from 'react';
import {
  FileSignature,
  Plus,
  Search,
  FileText,
  Eye,
  Pencil,
  XCircle,
  Clock,
  Upload,
  ExternalLink,
  X,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Contract } from '../../types';
import { buildDefaultContractTerms } from '../../constants';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportContractPdf } from '../../utils/pdf';

type ContractFilter = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'TERMINATED' | 'ALL';

const addMonths = (dateStr: string, months: number) => {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
};

const daysUntil = (dateStr: string) =>
  Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);

interface ContractFormState {
  roomId: string;
  tenantName: string;
  tenantPhone: string;
  tenantIdCard: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  deposit: number;
  terms: string;
  notes: string;
}

export const Contracts: React.FC = () => {
  const {
    rooms,
    contracts,
    propertyName,
    ownerName,
    createContract,
    updateContract,
    terminateContract,
    uploadContractScan,
  } = useApp();

  const [filter, setFilter] = useState<ContractFilter>('ACTIVE');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContractFormState | null>(null);
  const [formError, setFormError] = useState('');
  const [terminateReason, setTerminateReason] = useState('');
  const [extendDate, setExtendDate] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const effectiveStatus = (c: Contract): Contract['status'] =>
    c.status === 'ACTIVE' && daysUntil(c.endDate) < 0 ? 'EXPIRED' : c.status;

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return contracts.filter((c) => {
      const status = effectiveStatus(c);
      const expiring = status === 'ACTIVE' && daysUntil(c.endDate) <= 30;
      let matchFilter = false;
      if (filter === 'ALL') matchFilter = true;
      else if (filter === 'EXPIRING') matchFilter = expiring;
      else matchFilter = status === filter;

      const matchSearch =
        !term ||
        c.contractCode.toLowerCase().includes(term) ||
        c.roomNumber.toLowerCase().includes(term) ||
        c.tenantName.toLowerCase().includes(term) ||
        c.tenantPhone.includes(searchTerm.trim()) ||
        c.tenantIdCard.includes(searchTerm.trim());
      return matchFilter && matchSearch;
    });
  }, [contracts, filter, searchTerm]);

  const activeCount = contracts.filter((c) => effectiveStatus(c) === 'ACTIVE').length;
  const expiringCount = contracts.filter(
    (c) => effectiveStatus(c) === 'ACTIVE' && daysUntil(c.endDate) <= 30
  ).length;
  const expiredCount = contracts.filter((c) => effectiveStatus(c) === 'EXPIRED').length;
  const terminatedCount = contracts.filter((c) => c.status === 'TERMINATED').length;

  const viewing = viewingId ? contracts.find((c) => c.id === viewingId) : undefined;
  const editing = editingId ? contracts.find((c) => c.id === editingId) : undefined;

  const vacantRooms = rooms.filter(
    (r) => r.isOccupied && !contracts.some((c) => c.roomId === r.id && c.status === 'ACTIVE')
  );

  const openCreateForm = () => {
    if (vacantRooms.length === 0) {
      showToast('Tất cả phòng đang thuê đều đã có hợp đồng hiệu lực.');
      return;
    }
    const room = vacantRooms[0];
    setEditingId(null);
    setFormError('');
    setForm({
      roomId: room.id,
      tenantName: room.tenant?.name || '',
      tenantPhone: room.tenant?.phone || '',
      tenantIdCard: room.tenant?.idCard || '',
      startDate: room.tenant?.startDate || new Date().toISOString().split('T')[0],
      endDate: addMonths(room.tenant?.startDate || new Date().toISOString().split('T')[0], 12),
      monthlyRent: room.basePrice,
      deposit: room.tenant?.deposit || (room.type === 'VIP' ? 2000000 : 1000000),
      terms: '',
      notes: '',
    });
  };

  const openEditForm = (contract: Contract) => {
    setViewingId(null);
    setEditingId(contract.id);
    setFormError('');
    setForm({
      roomId: contract.roomId,
      tenantName: contract.tenantName,
      tenantPhone: contract.tenantPhone,
      tenantIdCard: contract.tenantIdCard,
      startDate: contract.startDate,
      endDate: contract.endDate,
      monthlyRent: contract.monthlyRent,
      deposit: contract.deposit,
      terms: contract.terms,
      notes: contract.notes || '',
    });
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const room = rooms.find((r) => r.id === form.roomId);
    if (!room) return;
    if (!form.tenantName.trim()) return setFormError('Vui lòng nhập họ tên người thuê.');
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      return setFormError('Ngày kết thúc phải sau ngày bắt đầu.');
    }

    const terms =
      form.terms.trim() ||
      buildDefaultContractTerms({
        propertyName,
        ownerName,
        roomNumber: room.roomNumber,
        tenantName: form.tenantName.trim(),
        tenantIdCard: form.tenantIdCard.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        monthlyRent: form.monthlyRent,
        deposit: form.deposit,
      });

    if (editing) {
      updateContract(editing.id, {
        tenantName: form.tenantName.trim(),
        tenantPhone: form.tenantPhone.trim(),
        tenantIdCard: form.tenantIdCard.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        monthlyRent: form.monthlyRent,
        deposit: form.deposit,
        terms,
        notes: form.notes.trim() || undefined,
        status: new Date(form.endDate) >= new Date() ? 'ACTIVE' : 'EXPIRED',
      });
      showToast(`Đã cập nhật hợp đồng ${editing.contractCode}.`);
    } else {
      const result = createContract({
        roomId: form.roomId,
        tenantId: room.tenant?.id,
        tenantName: form.tenantName,
        tenantPhone: form.tenantPhone,
        tenantIdCard: form.tenantIdCard,
        startDate: form.startDate,
        endDate: form.endDate,
        monthlyRent: form.monthlyRent,
        deposit: form.deposit,
        terms,
        notes: form.notes.trim() || undefined,
      });
      showToast(result.message);
      if (!result.success) {
        setFormError(result.message);
        return;
      }
    }
    setForm(null);
    setEditingId(null);
  };

  const handleUploadScan = async (contract: Contract, file: File | undefined) => {
    if (!file) return;
    setUploadingId(contract.id);
    const result = await uploadContractScan(contract.id, file);
    setUploadingId(null);
    showToast(result.message);
  };

  const handleTerminate = (contract: Contract) => {
    terminateContract(contract.id, terminateReason.trim() || 'Hai bên đồng ý chấm dứt hợp đồng');
    showToast(`Đã chấm dứt hợp đồng ${contract.contractCode}.`);
    setTerminateReason('');
    setViewingId(null);
  };

  const handleExtend = (contract: Contract) => {
    if (!extendDate || new Date(extendDate) <= new Date(contract.endDate)) {
      showToast('Ngày gia hạn phải sau ngày hết hạn hiện tại.');
      return;
    }
    updateContract(contract.id, { endDate: extendDate, status: 'ACTIVE' });
    showToast(`Đã gia hạn hợp đồng ${contract.contractCode} đến ${formatDate(extendDate)}.`);
    setExtendDate('');
  };

  const statusBadge = (c: Contract) => {
    const status = effectiveStatus(c);
    const days = daysUntil(c.endDate);
    if (c.status === 'TERMINATED')
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300 border border-slate-600">
          Đã chấm dứt
        </span>
      );
    if (status === 'EXPIRED')
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
          Đã hết hạn
        </span>
      );
    if (days <= 30)
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
          Sắp hết hạn ({days} ngày)
        </span>
      );
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
        Còn hiệu lực
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 p-4 rounded-2xl text-emerald-200 text-xs font-bold flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{toast}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#1E293B] p-6 rounded-3xl border border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <FileSignature className="w-4 h-4" />
            <span>Hợp Đồng Thuê Nhà Điện Tử</span>
          </div>
          <h2 className="text-xl font-black text-slate-100 mt-1.5">Quản Lý Hợp Đồng Thuê</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Số hóa hợp đồng giấy: xuất PDF, lưu bản scan gốc, nhắc hạn & chấm dứt hợp đồng
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700">
            <span className="text-slate-400 font-bold">Hiệu lực:</span>{' '}
            <strong className="text-emerald-400 font-black">{activeCount}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700">
            <span className="text-slate-400 font-bold">Sắp hết hạn:</span>{' '}
            <strong className="text-amber-400 font-black">{expiringCount}</strong>
          </div>
          <button
            onClick={openCreateForm}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs transition flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo hợp đồng mới</span>
          </button>
        </div>
      </div>

      {/* Bộ lọc */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="bg-[#1E293B] p-3 rounded-2xl border border-slate-700 shadow-sm flex items-center flex-1">
          <Search className="w-4 h-4 text-slate-400 ml-2" />
          <input
            type="text"
            placeholder="Tìm theo mã HĐ, số phòng, tên khách, SĐT, CCCD..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-3 py-1 text-xs text-slate-100 placeholder-slate-500 font-medium focus:outline-hidden bg-transparent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-[#1E293B] p-2 rounded-2xl border border-slate-700">
          {(
            [
              ['ACTIVE', `Còn hiệu lực (${activeCount})`],
              ['EXPIRING', `Sắp hết hạn (${expiringCount})`],
              ['EXPIRED', `Hết hạn (${expiredCount})`],
              ['TERMINATED', `Đã chấm dứt (${terminatedCount})`],
              ['ALL', 'Tất cả'],
            ] as [ContractFilter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filter === key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách hợp đồng */}
      <div className="bg-[#1E293B] rounded-3xl border border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-700/80 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Mã hợp đồng</th>
                <th className="py-3.5 px-4">Phòng</th>
                <th className="py-3.5 px-4">Người thuê</th>
                <th className="py-3.5 px-4">Thời hạn</th>
                <th className="py-3.5 px-4 text-right">Giá thuê</th>
                <th className="py-3.5 px-4 text-right">Cọc</th>
                <th className="py-3.5 px-4 text-center">Bản scan</th>
                <th className="py-3.5 px-4 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    Không có hợp đồng nào trong bộ lọc này
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-900/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-300">{c.contractCode}</td>
                    <td className="py-3 px-4 font-extrabold text-slate-100">{c.roomNumber}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-100">{c.tenantName}</div>
                      <div className="text-[10px] text-indigo-400 font-mono">{c.tenantPhone}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {formatDate(c.startDate)} &rarr; {formatDate(c.endDate)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-200">
                      {formatCurrency(c.monthlyRent)}
                    </td>
                    <td className="py-3 px-4 text-right text-amber-400">{formatCurrency(c.deposit)}</td>
                    <td className="py-3 px-4 text-center">
                      {c.scanFilePath ? (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Đã lưu
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-800 text-slate-500 border border-slate-700">
                          Chưa có
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">{statusBadge(c)}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => setViewingId(c.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditForm(c)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                          title="Chỉnh sửa"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => exportContractPdf(c, propertyName, ownerName)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                          title="Xuất PDF hợp đồng"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Chi tiết hợp đồng */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#1E293B] w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 border-b border-slate-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <FileSignature className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-100">{viewing.contractCode}</h3>
                  <p className="text-xs text-slate-400">
                    {viewing.roomNumber} • {viewing.tenantName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingId(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-700">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Thời hạn</span>
                  <span className="text-slate-100 font-bold">
                    {formatDate(viewing.startDate)} &rarr; {formatDate(viewing.endDate)}
                  </span>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-700">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Giá thuê</span>
                  <span className="text-amber-400 font-black">{formatCurrency(viewing.monthlyRent)}/tháng</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-700">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Tiền cọc</span>
                  <span className="text-slate-100 font-bold">{formatCurrency(viewing.deposit)}</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-700">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Trạng thái</span>
                  <div className="mt-0.5">{statusBadge(viewing)}</div>
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">CCCD người thuê:</span>
                  <span className="text-slate-200 font-mono">{viewing.tenantIdCard || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">SĐT:</span>
                  <span className="text-indigo-400 font-mono">{viewing.tenantPhone || '—'}</span>
                </div>
                {viewing.terminationReason && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Lý do chấm dứt:</span>
                    <span className="text-rose-300">{viewing.terminationReason}</span>
                  </div>
                )}
                {viewing.notes && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ghi chú:</span>
                    <span className="text-slate-300">{viewing.notes}</span>
                  </div>
                )}
              </div>

              {/* Điều khoản */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider mb-2">
                  Điều khoản & Nội quy (Điều 6 là căn cứ xử lý cảnh cáo)
                </h4>
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {viewing.terms || 'Chưa có điều khoản.'}
                </div>
              </div>

              {/* Bản scan */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
                    Bản scan hợp đồng giấy
                  </h4>
                  <div className="flex items-center space-x-2">
                    {viewing.scanFilePath && (
                      <a
                        href={viewing.scanFilePath}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[11px] font-bold text-slate-200 flex items-center space-x-1 transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Mở / Tải file</span>
                      </a>
                    )}
                    <label
                      className={`px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[11px] font-bold text-white flex items-center space-x-1 transition cursor-pointer ${
                        uploadingId === viewing.id ? 'opacity-60 pointer-events-none' : ''
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>{uploadingId === viewing.id ? 'Đang tải...' : viewing.scanFilePath ? 'Thay bản scan' : 'Tải bản scan lên'}</span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.gif,.pdf"
                        className="hidden"
                        onChange={(e) => handleUploadScan(viewing, e.target.files?.[0])}
                      />
                    </label>
                  </div>
                </div>
                {viewing.scanFilePath ? (
                  viewing.scanFilePath.toLowerCase().endsWith('.pdf') ? (
                    <iframe
                      src={viewing.scanFilePath}
                      title="Bản scan hợp đồng"
                      className="w-full h-72 bg-white rounded-2xl border border-slate-700"
                    />
                  ) : (
                    <img
                      src={viewing.scanFilePath}
                      alt="Bản scan hợp đồng"
                      className="max-h-72 mx-auto rounded-2xl border border-slate-700 bg-white object-contain"
                    />
                  )
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center bg-slate-900/60 rounded-2xl border border-dashed border-slate-700">
                    Chưa lưu bản scan giấy. Bấm "Tải bản scan lên" để lưu bản gốc (JPG/PNG/PDF, tối đa 15MB).
                  </p>
                )}
              </div>

              {/* Gia hạn & Chấm dứt */}
              {viewing.status !== 'TERMINATED' && (
                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-700 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-300 mb-1">Gia hạn đến ngày</label>
                      <input
                        type="date"
                        value={extendDate}
                        onChange={(e) => setExtendDate(e.target.value)}
                        min={viewing.endDate}
                        className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 text-slate-100 rounded-xl focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                    <button
                      onClick={() => handleExtend(viewing)}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5"
                    >
                      <Clock className="w-4 h-4" />
                      <span>Gia hạn hợp đồng</span>
                    </button>
                  </div>

                  <div className="pt-3 border-t border-slate-800">
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Lý do chấm dứt hợp đồng
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={terminateReason}
                        onChange={(e) => setTerminateReason(e.target.value)}
                        placeholder="Ví dụ: Hết hạn không gia hạn, vi phạm nội quy..."
                        className="flex-1 px-3 py-2 text-xs bg-slate-950 border border-slate-800 text-slate-100 rounded-xl focus:outline-hidden focus:border-rose-500"
                      />
                      <button
                        onClick={() => handleTerminate(viewing)}
                        className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Chấm dứt HĐ</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-900 border-t border-slate-700 flex items-center justify-between">
              <button
                onClick={() => exportContractPdf(viewing, propertyName, ownerName)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>Xuất PDF hợp đồng</span>
              </button>
              <button
                onClick={() => setViewingId(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-xs font-bold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Tạo / Sửa hợp đồng */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#1E293B] w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 border-b border-slate-700 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-100">
                  {editing ? `Sửa hợp đồng ${editing.contractCode}` : 'Tạo hợp đồng thuê nhà mới'}
                </h3>
                <p className="text-xs text-slate-400">
                  Để trống điều khoản để hệ thống tự điền mẫu chuẩn (gồm nội quy 6 hành vi)
                </p>
              </div>
              <button
                onClick={() => {
                  setForm(null);
                  setEditingId(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Phòng thuê <span className="text-rose-400">*</span>
                </label>
                <select
                  value={form.roomId}
                  onChange={(e) => {
                    const room = rooms.find((r) => r.id === e.target.value);
                    setForm({
                      ...form,
                      roomId: e.target.value,
                      tenantName: room?.tenant?.name || form.tenantName,
                      tenantPhone: room?.tenant?.phone || form.tenantPhone,
                      tenantIdCard: room?.tenant?.idCard || form.tenantIdCard,
                      monthlyRent: room?.basePrice || form.monthlyRent,
                      deposit: room?.tenant?.deposit ?? form.deposit,
                    });
                  }}
                  disabled={!!editing}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:outline-hidden focus:border-indigo-500 disabled:opacity-60"
                >
                  {(editing ? rooms.filter((r) => r.id === editing.roomId) : vacantRooms).map((r) => (
                    <option key={r.id} value={r.id} className="bg-slate-900">
                      {r.roomNumber} — {r.tenant?.name || 'chưa có khách'} ({formatCurrency(r.basePrice)}/th)
                    </option>
                  ))}
                </select>
                {!editing && vacantRooms.length === 0 && (
                  <p className="text-[11px] text-amber-400 mt-1">
                    Không còn phòng trống nào chưa có hợp đồng hiệu lực.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Họ tên người thuê <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.tenantName}
                    onChange={(e) => setForm({ ...form, tenantName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={form.tenantPhone}
                    onChange={(e) => setForm({ ...form, tenantPhone: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 rounded-xl font-mono focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">CCCD/Hộ chiếu</label>
                  <input
                    type="text"
                    value={form.tenantIdCard}
                    onChange={(e) => setForm({ ...form, tenantIdCard: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 rounded-xl font-mono focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        startDate: e.target.value,
                        endDate:
                          new Date(form.endDate) <= new Date(e.target.value)
                            ? addMonths(e.target.value, 12)
                            : form.endDate,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Giá thuê (đ/tháng)</label>
                  <input
                    type="number"
                    step="100000"
                    value={form.monthlyRent}
                    onChange={(e) => setForm({ ...form, monthlyRent: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-amber-400 font-mono font-bold rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Tiền đặt cọc (đ)</label>
                  <input
                    type="number"
                    step="100000"
                    value={form.deposit}
                    onChange={(e) => setForm({ ...form, deposit: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 font-mono rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Điều khoản (để trống = tự điền mẫu chuẩn)
                </label>
                <textarea
                  rows={6}
                  value={form.terms}
                  onChange={(e) => setForm({ ...form, terms: e.target.value })}
                  placeholder="Nhập điều khoản riêng (nếu có)..."
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Ghi chú thêm (tùy chọn)</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-700 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setForm(null);
                    setEditingId(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-xs font-bold transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition flex items-center space-x-2 shadow-md"
                >
                  <FileSignature className="w-4 h-4" />
                  <span>{editing ? 'Lưu thay đổi' : 'Tạo hợp đồng'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
