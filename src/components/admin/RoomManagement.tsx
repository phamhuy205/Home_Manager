import React, { useState } from 'react';
import {
  Building2,
  Users,
  Search,
  Filter,
  Zap,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  Edit3,
  Sparkles,
  UserPlus,
  UserMinus,
  X,
  CreditCard,
  ShieldCheck,
  FileText,
  AlertCircle,
  Home,
  Check,
} from 'lucide-react';
import { useApp, AssignTenantData } from '../../context/AppContext';
import { Room } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface RoomManagementProps {
  onRecordElectricity: (roomId: string) => void;
}

export const RoomManagement: React.FC<RoomManagementProps> = ({ onRecordElectricity }) => {
  const {
    rooms,
    assignTenantToRoom,
    removeTenantFromRoom,
    updateTenant,
    updateRoom,
  } = useApp();

  const [filterType, setFilterType] = useState<'ALL' | 'VIP' | 'STANDARD' | 'OCCUPIED' | 'VACANT'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [assigningRoom, setAssigningRoom] = useState<Room | null>(null);
  const [leavingRoom, setLeavingRoom] = useState<Room | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Form states for Assigning Tenant (Cho thuê phòng trống)
  const [assignForm, setAssignForm] = useState<AssignTenantData>({
    name: '',
    phone: '',
    idCard: '',
    email: '',
    startDate: new Date().toISOString().split('T')[0],
    deposit: 1000000,
    occupants: 1,
    startElectricityIndex: 0,
  });

  // Form states for Leaving Room (Khách không thuê nữa)
  const [leaveReason, setLeaveReason] = useState('Hết hạn hợp đồng');
  const [finalElecIndex, setFinalElecIndex] = useState<number>(0);
  const [refundDeposit, setRefundDeposit] = useState(true);

  // Form states for Editing Room/Tenant
  const [editTenantName, setEditTenantName] = useState('');
  const [editTenantPhone, setEditTenantPhone] = useState('');
  const [editTenantIdCard, setEditTenantIdCard] = useState('');
  const [editTenantDeposit, setEditTenantDeposit] = useState<number>(0);
  const [editOccupants, setEditOccupants] = useState<number>(1);
  const [editBasePrice, setEditBasePrice] = useState<number>(0);
  const [editArea, setEditArea] = useState<number>(0);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredRooms = rooms.filter((r) => {
    let matchType = true;
    if (filterType === 'VIP') matchType = r.type === 'VIP';
    else if (filterType === 'STANDARD') matchType = r.type === 'STANDARD';
    else if (filterType === 'OCCUPIED') matchType = r.isOccupied;
    else if (filterType === 'VACANT') matchType = !r.isOccupied;

    const matchSearch =
      r.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.tenant && r.tenant.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.tenant && r.tenant.phone.includes(searchTerm)) ||
      (r.tenant && r.tenant.idCard.includes(searchTerm));
    return matchType && matchSearch;
  });

  const vipCount = rooms.filter((r) => r.type === 'VIP').length;
  const stdCount = rooms.filter((r) => r.type === 'STANDARD').length;
  const occupiedCount = rooms.filter((r) => r.isOccupied).length;
  const vacantCount = rooms.filter((r) => !r.isOccupied).length;

  // Open Assign Modal
  const handleOpenAssign = (room: Room) => {
    setAssigningRoom(room);
    setAssignForm({
      name: '',
      phone: '',
      idCard: '',
      email: '',
      startDate: new Date().toISOString().split('T')[0],
      deposit: room.type === 'VIP' ? 2000000 : 1000000,
      occupants: 1,
      startElectricityIndex: room.lastElectricityIndex,
    });
  };

  const handleSubmitAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningRoom) return;

    if (!assignForm.name.trim()) {
      alert('Vui lòng nhập họ và tên khách thuê');
      return;
    }
    if (!assignForm.phone.trim()) {
      alert('Vui lòng nhập số điện thoại');
      return;
    }

    const success = assignTenantToRoom(assigningRoom.id, assignForm);
    if (success) {
      showToast(`Đã cho thuê thành công ${assigningRoom.roomNumber} cho khách ${assignForm.name}!`);
      setAssigningRoom(null);
    }
  };

  // Open Leaving Modal (Không thuê nữa)
  const handleOpenLeave = (room: Room) => {
    setLeavingRoom(room);
    setLeaveReason('Hết hạn hợp đồng');
    setFinalElecIndex(room.lastElectricityIndex);
    setRefundDeposit(true);
  };

  const handleSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leavingRoom) return;

    const roomNum = leavingRoom.roomNumber;
    const tName = leavingRoom.tenant?.name || 'Khách';

    removeTenantFromRoom(leavingRoom.id, leaveReason);
    showToast(`Đã hoàn tất trả phòng cho ${roomNum} (${tName}). Phòng chuyển sang Còn trống.`);
    setLeavingRoom(null);
  };

  // Open Edit Modal
  const handleOpenEdit = (room: Room) => {
    setEditingRoom(room);
    setEditTenantName(room.tenant?.name || '');
    setEditTenantPhone(room.tenant?.phone || '');
    setEditTenantIdCard(room.tenant?.idCard || '');
    setEditTenantDeposit(room.tenant?.deposit || (room.type === 'VIP' ? 2000000 : 1000000));
    setEditOccupants(room.currentOccupants || 1);
    setEditBasePrice(room.basePrice);
    setEditArea(room.area);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    // Update room base parameters
    updateRoom(editingRoom.id, {
      basePrice: editBasePrice,
      area: editArea,
      currentOccupants: editOccupants,
    });

    // If occupied, update tenant info
    if (editingRoom.isOccupied && editingRoom.tenant) {
      updateTenant(
        editingRoom.id,
        {
          name: editTenantName.trim(),
          phone: editTenantPhone.trim(),
          idCard: editTenantIdCard.trim(),
          deposit: editTenantDeposit,
        },
        editOccupants
      );
    }

    showToast(`Đã cập nhật thông tin ${editingRoom.roomNumber} thành công!`);
    setEditingRoom(null);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 p-4 rounded-2xl text-emerald-200 text-xs font-bold flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & stats */}
      <div className="bg-[#1E293B] p-6 rounded-3xl border border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            <span>Quản Lý 16 Phòng Trọ & Khách Thuê</span>
          </div>
          <h2 className="text-xl font-black text-slate-100 mt-1.5">
            Trạng Thái Phòng, Thêm/Xóa Người Thuê
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            5 phòng VIP (<strong className="text-amber-300">A1-A5</strong>, 2tr/tháng) • 11 phòng Thường (<strong className="text-emerald-300">1-11</strong>, 1tr/tháng)
          </p>
        </div>

        {/* Quick summary pill counters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
            <span className="text-slate-300 font-bold">Đang thuê:</span>
            <strong className="text-emerald-400 font-black">{occupiedCount}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
            <span className="text-slate-300 font-bold">Còn trống:</span>
            <strong className="text-amber-400 font-black">{vacantCount}</strong>
          </div>
        </div>
      </div>

      {/* Filter and search controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="bg-[#1E293B] p-3 rounded-2xl border border-slate-700 shadow-sm flex items-center flex-1">
          <Search className="w-4 h-4 text-slate-400 ml-2" />
          <input
            type="text"
            placeholder="Tìm theo số phòng (A1-A5, 1-11), tên khách, SĐT, CCCD..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-3 py-1 text-xs text-slate-100 placeholder-slate-500 font-medium focus:outline-hidden bg-transparent"
          />
        </div>

        {/* Quick filter chips */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#1E293B] p-2 rounded-2xl border border-slate-700">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterType === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tất cả (16)
          </button>
          <button
            onClick={() => setFilterType('VIP')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterType === 'VIP'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            VIP A1-A5 ({vipCount})
          </button>
          <button
            onClick={() => setFilterType('STANDARD')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterType === 'STANDARD'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            Thường 1-11 ({stdCount})
          </button>
          <button
            onClick={() => setFilterType('OCCUPIED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterType === 'OCCUPIED'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-emerald-300'
            }`}
          >
            Đang thuê ({occupiedCount})
          </button>
          <button
            onClick={() => setFilterType('VACANT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterType === 'VACANT'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-amber-300'
            }`}
          >
            Còn trống ({vacantCount})
          </button>
        </div>
      </div>

      {/* Room Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRooms.map((room) => {
          const isVIP = room.type === 'VIP';
          const isOccupied = room.isOccupied;

          return (
            <div
              key={room.id}
              className={`bg-[#1E293B] rounded-3xl border p-5 sm:p-6 shadow-sm flex flex-col justify-between transition hover:border-slate-500 ${
                isVIP
                  ? isOccupied ? 'border-amber-500/40' : 'border-dashed border-amber-500/30 bg-[#1E293B]/70'
                  : isOccupied ? 'border-slate-700' : 'border-dashed border-slate-600 bg-[#1E293B]/70'
              }`}
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${
                        isVIP
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {isVIP ? 'VIP' : 'TH'}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-black text-base text-slate-100">{room.roomNumber}</h3>
                        <span className="text-[10px] text-slate-400">{room.area}m²</span>
                      </div>
                      <span className="text-xs font-bold text-slate-400">
                        {formatCurrency(room.basePrice)} / tháng
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center space-x-1 ${
                        isOccupied
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      <span>{isOccupied ? 'Đang thuê' : 'Còn trống'}</span>
                    </span>
                  </div>
                </div>

                {/* Tenant Details / Vacant Status Display */}
                <div className="mt-4 p-3.5 bg-slate-900/90 rounded-2xl border border-slate-700/80 space-y-2 text-xs">
                  {isOccupied && room.tenant ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Khách thuê:</span>
                        <strong className="text-slate-100 font-bold">{room.tenant.name}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Số điện thoại:</span>
                        <a
                          href={`tel:${room.tenant.phone}`}
                          className="text-indigo-400 font-mono font-semibold hover:underline"
                        >
                          {room.tenant.phone}
                        </a>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">CCCD / CMND:</span>
                        <span className="text-slate-300 font-mono">{room.tenant.idCard}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Ngày dọn vào:</span>
                        <span className="text-slate-300">{formatDate(room.tenant.startDate)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Tiền cọc giữ chỗ:</span>
                        <span className="text-slate-200 font-bold">
                          {formatCurrency(room.tenant.deposit)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="py-3 text-center space-y-2">
                      <div className="text-amber-400 font-bold text-xs flex items-center justify-center space-x-1">
                        <Home className="w-4 h-4 text-amber-400" />
                        <span>Phòng hiện đang trống</span>
                      </div>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        Đã dọn dẹp sạch sẽ, sẵn sàng ký hợp đồng và đón người thuê mới.
                      </p>
                      <button
                        onClick={() => handleOpenAssign(room)}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 shadow-sm mt-1"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Cho Thuê Phòng Này Ngay</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Meter information */}
                <div className="mt-3.5 flex items-center justify-between text-xs px-1 text-slate-300">
                  <div className="flex items-center space-x-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      Số điện chốt kỳ trước: <strong className="text-slate-100 font-black">{room.lastElectricityIndex}</strong>
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-300 font-bold bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-md">
                    4k / số điện
                  </span>
                </div>
              </div>

              {/* Action Buttons: Edit, Leave / Rent, Record Electricity */}
              <div className="mt-4 pt-3.5 border-t border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">
                    {isOccupied ? `${room.currentOccupants} người đang ở` : 'Chưa có người ở'}
                  </span>

                  <div className="flex items-center space-x-1.5">
                    {/* Edit room / tenant button */}
                    <button
                      onClick={() => handleOpenEdit(room)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition"
                      title="Chỉnh sửa thông tin phòng và người thuê"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* If occupied: Button to handle "Không thuê nữa (Trả phòng)" */}
                    {isOccupied && (
                      <button
                        onClick={() => handleOpenLeave(room)}
                        className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                        title="Khách không thuê nữa, làm thủ tục trả phòng"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        <span>Trả phòng</span>
                      </button>
                    )}

                    {/* Record electricity button */}
                    <button
                      onClick={() => onRecordElectricity(room.id)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center space-x-1.5 shadow-sm"
                      title="Ghi số điện cũ & mới để tính hóa đơn"
                    >
                      <Zap className="w-3.5 h-3.5 fill-slate-950" />
                      <span>Tính điện</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: Cho thuê phòng còn trống (Thêm người thuê mới) */}
      {assigningRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#1E293B] w-full max-w-lg rounded-3xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 border-b border-slate-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-100">
                    Cho Thuê Phòng: {assigningRoom.roomNumber}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {assigningRoom.type === 'VIP' ? 'Phòng VIP (2.000.000 đ/tháng)' : 'Phòng Thường (1.000.000 đ/tháng)'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssigningRoom(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAssign} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Họ và tên khách thuê <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Văn An"
                    value={assignForm.name}
                    onChange={(e) => setAssignForm({ ...assignForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Số điện thoại liên hệ <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ví dụ: 0912 345 678"
                    value={assignForm.phone}
                    onChange={(e) => setAssignForm({ ...assignForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl font-mono focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Số CCCD / CMND <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 079201008899"
                    value={assignForm.idCard}
                    onChange={(e) => setAssignForm({ ...assignForm, idCard: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl font-mono focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Email (Tùy chọn)
                  </label>
                  <input
                    type="email"
                    placeholder="khachthue@gmail.com"
                    value={assignForm.email || ''}
                    onChange={(e) => setAssignForm({ ...assignForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Ngày dọn vào
                  </label>
                  <input
                    type="date"
                    value={assignForm.startDate}
                    onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Tiền đặt cọc (VNĐ)
                  </label>
                  <input
                    type="number"
                    step="100000"
                    value={assignForm.deposit}
                    onChange={(e) => setAssignForm({ ...assignForm, deposit: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 rounded-xl font-mono focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Số người ở
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={assigningRoom.maxOccupants}
                    value={assignForm.occupants}
                    onChange={(e) => setAssignForm({ ...assignForm, occupants: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 rounded-xl font-mono focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Chỉ số công tơ điện bàn giao ban đầu (kWh)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0"
                    value={assignForm.startElectricityIndex}
                    onChange={(e) =>
                      setAssignForm({ ...assignForm, startElectricityIndex: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-amber-400 font-mono font-bold rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />
                  <span className="text-xs text-slate-400 whitespace-nowrap">Đơn giá: 4.000 đ/số</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Số điện này sẽ được dùng làm mốc cũ để tính hóa đơn tiền điện tháng tiếp theo.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-700 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setAssigningRoom(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-xs font-bold transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition flex items-center space-x-2 shadow-md"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Xác Nhận Cho Thuê Phòng</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Có người không thuê nữa (Trả phòng / Xóa người thuê) */}
      {leavingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#1E293B] w-full max-w-md rounded-3xl shadow-2xl border border-slate-700 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 border-b border-slate-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                  <UserMinus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-100">
                    Thủ Tục Trả Phòng: {leavingRoom.roomNumber}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Khách không thuê nữa • Chuyển trạng thái sang Còn trống
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLeavingRoom(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLeave} className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-700 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Khách đang trả phòng:</span>
                  <strong className="text-slate-100 font-bold">{leavingRoom.tenant?.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Số điện thoại:</span>
                  <span className="text-indigo-400 font-mono">{leavingRoom.tenant?.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tiền cọc cần đối soát:</span>
                  <span className="text-amber-400 font-bold font-mono">
                    {formatCurrency(leavingRoom.tenant?.deposit || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Chỉ số điện hiện tại:</span>
                  <span className="text-slate-200 font-mono">{leavingRoom.lastElectricityIndex} kWh</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Lý do không thuê nữa / Ghi chú
                </label>
                <input
                  type="text"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:outline-hidden focus:border-rose-500"
                  placeholder="Ví dụ: Hết hạn hợp đồng, chuyển chỗ làm..."
                />
              </div>

              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-xs text-amber-200 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  Khi bấm xác nhận, hệ thống sẽ xóa thông tin người thuê phòng {leavingRoom.roomNumber}, cập nhật trạng thái phòng sang <strong>Còn trống</strong> để bạn có thể đón khách thuê tiếp theo.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-700 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setLeavingRoom(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-xs font-bold transition"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition flex items-center space-x-1.5 shadow-md"
                >
                  <UserMinus className="w-4 h-4" />
                  <span>Xác Nhận Khách Trả Phòng</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Chỉnh sửa thông tin phòng & Người thuê */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#1E293B] w-full max-w-lg rounded-3xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 border-b border-slate-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-100">
                    Chỉnh Sửa: {editingRoom.roomNumber}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingRoom.isOccupied ? 'Cập nhật thông tin khách thuê & giá phòng' : 'Cập nhật thông số phòng'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingRoom(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Giá phòng (VNĐ/tháng)
                  </label>
                  <input
                    type="number"
                    step="100000"
                    value={editBasePrice}
                    onChange={(e) => setEditBasePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-amber-400 font-mono font-bold rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Diện tích (m²)
                  </label>
                  <input
                    type="number"
                    value={editArea}
                    onChange={(e) => setEditArea(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              {editingRoom.isOccupied && (
                <>
                  <div className="pt-2 border-t border-slate-700/60">
                    <span className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider block mb-2">
                      Thông tin khách đang thuê
                    </span>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Họ và tên khách thuê
                        </label>
                        <input
                          type="text"
                          value={editTenantName}
                          onChange={(e) => setEditTenantName(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 rounded-xl focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Số điện thoại
                          </label>
                          <input
                            type="text"
                            value={editTenantPhone}
                            onChange={(e) => setEditTenantPhone(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 rounded-xl font-mono focus:outline-hidden focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Số CCCD / CMND
                          </label>
                          <input
                            type="text"
                            value={editTenantIdCard}
                            onChange={(e) => setEditTenantIdCard(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 rounded-xl font-mono focus:outline-hidden focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Tiền đặt cọc (VNĐ)
                          </label>
                          <input
                            type="number"
                            step="100000"
                            value={editTenantDeposit}
                            onChange={(e) => setEditTenantDeposit(Number(e.target.value))}
                            className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 rounded-xl font-mono focus:outline-hidden focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Số người ở
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="5"
                            value={editOccupants}
                            onChange={(e) => setEditOccupants(Number(e.target.value))}
                            className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 rounded-xl font-mono focus:outline-hidden focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="pt-3 border-t border-slate-700 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-xs font-bold transition"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition flex items-center space-x-1.5 shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu Thay Đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
