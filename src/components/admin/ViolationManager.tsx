import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Plus,
  History,
  Undo2,
  DoorOpen,
  Users,
  X,
  CheckCircle2,
  Settings2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RoomWarning, ViolationType } from '../../types';
import { VIOLATION_TYPES, VIOLATION_LABELS } from '../../constants';
import { formatDateTime } from '../../utils/formatters';

interface ViolationManagerProps {
  initialRoomId?: string;
  onConsumeInitialRoom?: () => void;
  onEvictRoom: (roomId: string, reason: string) => void;
}

const warningColor = (count: number, limit: number) => {
  if (count >= limit) return { chip: 'bg-rose-600 text-white border-rose-500', text: 'text-rose-400', border: 'border-rose-500/50' };
  if (count >= 3) return { chip: 'bg-orange-500/20 text-orange-300 border-orange-500/40', text: 'text-orange-400', border: 'border-orange-500/40' };
  if (count >= 1) return { chip: 'bg-amber-500/20 text-amber-300 border-amber-500/40', text: 'text-amber-400', border: 'border-amber-500/40' };
  return { chip: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', text: 'text-emerald-400', border: 'border-slate-700' };
};

export const ViolationManager: React.FC<ViolationManagerProps> = ({
  initialRoomId,
  onConsumeInitialRoom,
  onEvictRoom,
}) => {
  const {
    rooms,
    warnings,
    warningLimit,
    issueWarning,
    revokeWarning,
    setWarningLimit,
    warningCountForRoom,
  } = useApp();

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ViolationType | null>(null);
  const [description, setDescription] = useState('');
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [limitInput, setLimitInput] = useState(String(warningLimit));
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setLimitInput(String(warningLimit));
  }, [warningLimit]);

  // Khi nhảy từ tab Phòng sang (bấm badge cảnh cáo), chọn sẵn phòng đó
  useEffect(() => {
    if (initialRoomId) {
      setSelectedRoomId(initialRoomId);
      onConsumeInitialRoom?.();
    }
  }, [initialRoomId]);

  useEffect(() => {
    if (!selectedRoomId && rooms.length > 0) {
      const firstWithWarning = rooms.find((r) => r.isOccupied && warningCountForRoom(r.id) > 0);
      setSelectedRoomId((firstWithWarning || rooms.find((r) => r.isOccupied) || rooms[0]).id);
    }
  }, [rooms, selectedRoomId]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const selectedWarnings = selectedRoomId
    ? warnings.filter((w) => w.roomId === selectedRoomId)
    : [];

  const listableRooms = rooms.filter((r) => r.isOccupied || warnings.some((w) => w.roomId === r.id));
  const roomsWithWarnings = rooms.filter((r) => warningCountForRoom(r.id) > 0);
  const overLimitRooms = rooms.filter((r) => warningCountForRoom(r.id) >= warningLimit);
  const now = new Date();
  const warningsThisMonth = warnings.filter((w) => {
    const d = new Date(w.issuedAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const handleIssue = () => {
    if (!selectedRoom || !selectedType) return;
    const result = issueWarning(selectedRoom.id, selectedType, description.trim());
    showToast(result.message);
    if (result.success) {
      setSelectedType(null);
      setDescription('');
    }
  };

  const handleRevoke = (warning: RoomWarning) => {
    revokeWarning(warning.id, revokeReason.trim() || 'Chủ trọ thu hồi do nhận định chưa đủ căn cứ');
    showToast(`Đã thu hồi cảnh cáo ${VIOLATION_LABELS[warning.violationType]} của ${warning.roomNumber}.`);
    setRevokingId(null);
    setRevokeReason('');
  };

  const handleSaveLimit = () => {
    setWarningLimit(Number(limitInput));
    showToast(`Đã đặt giới hạn cảnh cáo là ${Math.min(10, Math.max(1, Number(limitInput) || 5))} lần.`);
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
      <div className="bg-[#1E293B] p-6 rounded-3xl border border-slate-700 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-rose-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" />
            <span>Cảnh Cáo Vi Phạm Nội Quy Nhà Trọ</span>
          </div>
          <h2 className="text-xl font-black text-slate-100 mt-1.5">Biên Bản Cảnh Cáo & Giới Hạn 5 Lần</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Đạt {warningLimit}/5 lần → phòng phải rời đi. Cảnh cáo được lưu trữ khi đổi người thuê, người mới bắt đầu từ 0.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center space-x-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-700">
            <Settings2 className="w-4 h-4 text-slate-400" />
            <label className="text-xs font-bold text-slate-400">Giới hạn cảnh cáo:</label>
            <input
              type="number"
              min={1}
              max={10}
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              className="w-14 px-2 py-1 text-xs text-center bg-slate-950 border border-slate-700 text-amber-400 font-black rounded-lg focus:outline-hidden focus:border-amber-500"
            />
            <span className="text-xs text-slate-400 font-bold">lần</span>
            <button
              onClick={handleSaveLimit}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-[11px] font-bold text-slate-200 transition"
            >
              Lưu
            </button>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1E293B] p-5 rounded-3xl border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phòng có cảnh cáo</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-amber-400">{roomsWithWarnings.length} phòng</div>
          <p className="text-[11px] text-slate-400 mt-1">Trong tổng số {rooms.filter((r) => r.isOccupied).length} phòng đang thuê</p>
        </div>

        <div className="bg-[#1E293B] p-5 rounded-3xl border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vượt giới hạn</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <DoorOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-rose-400">{overLimitRooms.length} phòng</div>
          <p className="text-[11px] text-rose-400 font-semibold mt-1">Bắt buộc phải rời khỏi trọ</p>
        </div>

        <div className="bg-[#1E293B] p-5 rounded-3xl border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cảnh cáo tháng này</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-indigo-400">{warningsThisMonth} biên bản</div>
          <p className="text-[11px] text-slate-400 mt-1">Tổng cộng đã lập: {warnings.length}</p>
        </div>
      </div>

      {/* Bố cục 2 cột: danh sách phòng + chi tiết */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Danh sách phòng */}
        <div className="lg:col-span-4 bg-[#1E293B] rounded-3xl border border-slate-700 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-700/80 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-100">Phòng & Số Lần Cảnh Cáo</h3>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <div className="max-h-[560px] overflow-y-auto divide-y divide-slate-800/80">
            {listableRooms.map((room) => {
              const count = warningCountForRoom(room.id);
              const colors = warningColor(count, warningLimit);
              const isActive = selectedRoomId === room.id;
              return (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`w-full px-5 py-3 flex items-center justify-between text-left transition ${
                    isActive ? 'bg-indigo-600/15 border-l-2 border-indigo-500' : 'hover:bg-slate-900/60 border-l-2 border-transparent'
                  }`}
                >
                  <div>
                    <div className="text-xs font-extrabold text-slate-100">
                      {room.roomNumber}
                      {!room.isOccupied && <span className="ml-2 text-[9px] text-slate-500 font-bold">ĐÃ TRẢ PHÒNG</span>}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                      {room.tenant?.name || (warnings.some((w) => w.roomId === room.id) ? 'Lịch sử' : 'Trống')}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${colors.chip}`}
                    title={`${count}/${warningLimit} lần cảnh cáo`}
                  >
                    {count}/{warningLimit}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chi tiết phòng được chọn */}
        <div className="lg:col-span-8 space-y-4">
          {!selectedRoom ? (
            <div className="bg-[#1E293B] p-8 rounded-3xl border border-slate-700 text-center text-slate-400 text-xs">
              Chọn một phòng để xem lịch sử và lập biên bản cảnh cáo.
            </div>
          ) : (
            <>
              {/* Banner vượt giới hạn */}
              {warningCountForRoom(selectedRoom.id) >= warningLimit && (
                <div className="bg-rose-600/15 border-2 border-rose-500/60 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/30 text-rose-200 border border-rose-400/50 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-rose-200">
                        ĐẠT GIỚI HẠN {warningCountForRoom(selectedRoom.id)}/{warningLimit} CẢNH BÁO — YÊU CẦU RỜI TRỌ
                      </h4>
                      <p className="text-xs text-rose-200/80 mt-0.5">
                        {selectedRoom.tenant?.name} ({selectedRoom.roomNumber}) vi phạm nội quy quá nhiều lần. Bấm để mở
                        sẵn thủ tục trả phòng với lý do mặc định.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      onEvictRoom(
                        selectedRoom.id,
                        `Vi phạm nội quy nhà trọ ${warningCountForRoom(selectedRoom.id)}/${warningLimit} lần`
                      )
                    }
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 shadow-md shrink-0"
                  >
                    <DoorOpen className="w-4 h-4" />
                    <span>Mở thủ tục trả phòng</span>
                  </button>
                </div>
              )}

              {/* Form lập biên bản */}
              <div className="bg-[#1E293B] rounded-3xl border border-slate-700 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-100">
                      Lập biên bản cảnh cáo: {selectedRoom.roomNumber}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Người thuê: {selectedRoom.tenant?.name || '—'} • Đang có{' '}
                      <strong className={warningColor(warningCountForRoom(selectedRoom.id), warningLimit).text}>
                        {warningCountForRoom(selectedRoom.id)}/{warningLimit}
                      </strong>{' '}
                      lần cảnh cáo
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">6 hành vi vi phạm</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {VIOLATION_TYPES.map((v) => {
                    const active = selectedType === v.type;
                    return (
                      <button
                        key={v.type}
                        onClick={() => setSelectedType(v.type)}
                        disabled={!selectedRoom.isOccupied}
                        className={`p-3 rounded-2xl border text-left transition disabled:opacity-40 ${
                          active
                            ? 'bg-rose-500/15 border-rose-500/60 shadow-sm'
                            : 'bg-slate-900/70 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <div className={`text-xs font-black ${active ? 'text-rose-300' : 'text-slate-200'}`}>
                          {v.label}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{v.hint}</div>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Mô tả sự việc (tùy chọn)</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ví dụ: 23h30 mở nhạc to phòng 3 lần liên tiếp, đã nhắc nhở nhưng không khắc phục..."
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end">
                  <button
                    onClick={handleIssue}
                    disabled={!selectedRoom.isOccupied || !selectedType}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl text-xs font-black transition flex items-center space-x-2 shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      Lập biên bản cảnh cáo (
                      {warningCountForRoom(selectedRoom.id) + 1}/{warningLimit})
                    </span>
                  </button>
                </div>
                {!selectedRoom.isOccupied && (
                  <p className="text-[11px] text-slate-500 text-right">Phòng này chưa có người thuê để lập cảnh cáo.</p>
                )}
              </div>

              {/* Lịch sử cảnh cáo */}
              <div className="bg-[#1E293B] rounded-3xl border border-slate-700 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-700/80 flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-100">Lịch sử cảnh cáo ({selectedWarnings.length})</h3>
                </div>
                <div className="divide-y divide-slate-800/80 max-h-96 overflow-y-auto">
                  {selectedWarnings.length === 0 ? (
                    <div className="py-10 text-center text-slate-500 text-xs">
                      Phòng này chưa từng bị lập biên bản cảnh cáo 🎉
                    </div>
                  ) : (
                    selectedWarnings.map((w) => (
                      <div key={w.id} className="px-5 py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <span className="text-xs font-black text-slate-100">
                                {VIOLATION_LABELS[w.violationType]}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                  w.status === 'ACTIVE'
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : w.status === 'REVOKED'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-slate-700 text-slate-400 border-slate-600'
                                }`}
                              >
                                {w.status === 'ACTIVE' ? 'Còn hiệu lực' : w.status === 'REVOKED' ? 'Đã thu hồi' : 'Đã lưu trữ'}
                              </span>
                            </div>
                            {w.description && (
                              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{w.description}</p>
                            )}
                            <p className="text-[10px] text-slate-500 mt-1">
                              {formatDateTime(w.issuedAt)} • Người lập: {w.issuedBy || 'Chủ trọ'} • Người thuê:{' '}
                              {w.tenantName}
                              {w.revokedReason ? ` • Lý do thu hồi: ${w.revokedReason}` : ''}
                            </p>
                          </div>

                          {w.status === 'ACTIVE' && (
                            <div className="shrink-0">
                              {revokingId === w.id ? (
                                <div className="flex items-center space-x-1.5">
                                  <input
                                    type="text"
                                    value={revokeReason}
                                    onChange={(e) => setRevokeReason(e.target.value)}
                                    placeholder="Lý do thu hồi"
                                    className="w-40 px-2 py-1 text-[10px] bg-slate-950 border border-slate-700 text-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                                  />
                                  <button
                                    onClick={() => handleRevoke(w)}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black"
                                    title="Xác nhận thu hồi"
                                  >
                                    OK
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRevokingId(null);
                                      setRevokeReason('');
                                    }}
                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setRevokingId(w.id);
                                    setRevokeReason('');
                                  }}
                                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-300 flex items-center space-x-1 transition"
                                  title="Thu hồi biên bản (giảm bộ đếm)"
                                >
                                  <Undo2 className="w-3 h-3" />
                                  <span>Thu hồi</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
