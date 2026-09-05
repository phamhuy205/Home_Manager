import React, { useState } from 'react';
import {
  Zap,
  Droplets,
  Save,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Room } from '../../types';
import { formatCurrency, formatNumber } from '../../utils/formatters';

export const ElectricityManager: React.FC = () => {
  const { rooms, invoices, recordElectricityAndCreateInvoice, currentMonth, currentYear } = useApp();

  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || 'VIP-A1');
  const [targetMonth, setTargetMonth] = useState<number>(currentMonth);
  const [targetYear, setTargetYear] = useState<number>(currentYear);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  // Existing invoice for target month/year if any
  const existingInvoice = invoices.find(
    (inv) => inv.roomId === selectedRoomId && inv.month === targetMonth && inv.year === targetYear
  );

  // Input states
  const [oldIndex, setOldIndex] = useState<number>(() => {
    return existingInvoice?.oldElectricityIndex ?? (selectedRoom?.lastElectricityIndex || 0);
  });
  const [newIndex, setNewIndex] = useState<number>(() => {
    return existingInvoice?.newElectricityIndex ?? (selectedRoom?.lastElectricityIndex || 0) + 30;
  });
  const [waterCount, setWaterCount] = useState<number>(() => {
    return existingInvoice?.waterUsage ?? (selectedRoom?.currentOccupants || 1);
  });
  const [otherFee, setOtherFee] = useState<number>(() => existingInvoice?.otherFee || 0);
  const [otherFeeNote, setOtherFeeNote] = useState<string>(() => existingInvoice?.otherFeeNote || '');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Update inputs whenever selected room changes
  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    setFeedback(null);
    const r = rooms.find((item) => item.id === roomId);
    const inv = invoices.find(
      (item) => item.roomId === roomId && item.month === targetMonth && item.year === targetYear
    );

    if (inv) {
      setOldIndex(inv.oldElectricityIndex);
      setNewIndex(inv.newElectricityIndex);
      setWaterCount(inv.waterUsage);
      setOtherFee(inv.otherFee || 0);
      setOtherFeeNote(inv.otherFeeNote || '');
    } else if (r) {
      setOldIndex(r.lastElectricityIndex);
      setNewIndex(r.lastElectricityIndex + 45); // suggestion
      setWaterCount(r.currentOccupants || 1);
      setOtherFee(0);
      setOtherFeeNote('');
    }
  };

  // Real-time calculations
  const electricityRate = 4000; // 4,000 VND / kWh
  const usage = Math.max(0, newIndex - oldIndex);
  const electricityCost = usage * electricityRate;
  const roomPrice = selectedRoom?.basePrice || 0;
  const waterRate = selectedRoom?.waterRate || 100000;
  const waterCost = waterCount * waterRate;
  const wifiFee = selectedRoom?.wifiFee || 0;
  const garbageFee = selectedRoom?.garbageFee || 0;
  const estimatedTotal = roomPrice + electricityCost + waterCost + wifiFee + garbageFee + (Number(otherFee) || 0);

  const isIndexInvalid = newIndex < oldIndex;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (isIndexInvalid) {
      setFeedback({
        type: 'error',
        message: `Số điện mới (${newIndex}) không được nhỏ hơn số điện cũ (${oldIndex})!`,
      });
      return;
    }

    const result = recordElectricityAndCreateInvoice({
      roomId: selectedRoomId,
      oldIndex: Number(oldIndex),
      newIndex: Number(newIndex),
      month: targetMonth,
      year: targetYear,
      waterCount: Number(waterCount),
      otherFee: Number(otherFee),
      otherFeeNote,
    });

    if (result.success) {
      setFeedback({
        type: 'success',
        message: result.message,
      });
    } else {
      setFeedback({
        type: 'error',
        message: result.message,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Banner */}
      <div className="bg-[#1E293B] p-5 sm:p-6 rounded-3xl border border-slate-700 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-md shadow-amber-500/10">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-100">
                Ghi Chỉ Số Điện Nước & Lập Hóa Đơn
              </h2>
              <p className="text-xs text-slate-400">
                Đơn giá cố định <strong className="text-amber-400 font-bold">4.000 đ / 1 số điện (kWh)</strong>. Số điện mới tháng này sẽ tự động lưu làm số cũ cho tháng sau!
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <label className="text-xs font-semibold text-slate-400">Kỳ tính:</label>
            <select
              value={targetMonth}
              onChange={(e) => setTargetMonth(Number(e.target.value))}
              className="text-xs font-bold border border-slate-700 rounded-xl px-3 py-2 bg-slate-900 text-slate-100 focus:outline-hidden focus:border-indigo-500"
            >
              {[7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  Tháng {m}/{targetYear}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center space-x-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Grid: Room Selector and Entry Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: List of 16 rooms */}
        <div className="lg:col-span-5 bg-[#1E293B] rounded-3xl border border-slate-700 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-700/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Chọn phòng (16 phòng)
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              {rooms.filter((r) => r.isOccupied).length}/16 đang ở
            </span>
          </div>

          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {rooms.map((room) => {
              const isSelected = room.id === selectedRoomId;
              const hasInvoice = invoices.some(
                (inv) => inv.roomId === room.id && inv.month === targetMonth && inv.year === targetYear
              );
              const isVIP = room.type === 'VIP';

              return (
                <button
                  key={room.id}
                  onClick={() => handleSelectRoom(room.id)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-600/20 shadow-md shadow-indigo-600/20 ring-1 ring-indigo-500/40'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black ${
                        isVIP
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {isVIP ? 'VIP' : 'TH'}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-100">{room.roomNumber}</span>
                        <span className="text-[10px] text-slate-400">
                          ({isVIP ? '2tr' : '1tr'})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[130px]">
                        {room.tenant ? room.tenant.name : 'Phòng trống'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] font-semibold text-slate-300 flex items-center space-x-1 justify-end">
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>{room.lastElectricityIndex} số</span>
                    </div>
                    {hasInvoice ? (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Đã chốt T{targetMonth}
                      </span>
                    ) : (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                        Chưa chốt
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right column: Meter form & Real-time Bill Preview */}
        <div className="lg:col-span-7 space-y-6">
          {selectedRoom ? (
            <form onSubmit={handleSubmit} className="bg-[#1E293B] rounded-3xl border border-slate-700 p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-700/80">
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        selectedRoom.type === 'VIP'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {selectedRoom.type === 'VIP' ? 'Phòng VIP (2tr)' : 'Phòng Thường (1tr)'}
                    </span>
                    <h3 className="text-xl font-black text-slate-100">{selectedRoom.roomNumber}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Người thuê: <strong className="text-slate-200">{selectedRoom.tenant?.name || 'Chưa có'}</strong> • SĐT: {selectedRoom.tenant?.phone || '---'}
                  </p>
                </div>

                <div className="text-right text-xs">
                  <span className="text-slate-400">Giá phòng: </span>
                  <strong className="text-slate-100 font-extrabold text-sm block">{formatCurrency(selectedRoom.basePrice)}</strong>
                </div>
              </div>

              {/* Electricity Inputs */}
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-amber-500/30 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="uppercase tracking-wider">CHỈ SỐ ĐIỆN (4.000 đ / 1 kWh)</span>
                  </div>
                  <span className="text-[11px] text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 rounded-md font-bold">
                    Giá chuẩn: 4.000 đ/số
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Số điện cũ (Tháng trước đã lưu)
                    </label>
                    <input
                      type="number"
                      value={oldIndex}
                      onChange={(e) => setOldIndex(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 text-sm font-bold border border-slate-700 rounded-xl bg-slate-950 text-slate-100 focus:outline-hidden focus:border-amber-500"
                      min={0}
                      required
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Tự động lấy từ chỉ số tháng trước ({selectedRoom.lastElectricityIndex} kWh)
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Số điện mới (Chốt tháng này)
                    </label>
                    <input
                      type="number"
                      value={newIndex}
                      onChange={(e) => setNewIndex(Number(e.target.value))}
                      className={`w-full px-3.5 py-2.5 text-sm font-bold border rounded-xl focus:outline-hidden ${
                        isIndexInvalid
                          ? 'border-rose-500 bg-rose-950/40 text-rose-300'
                          : 'border-amber-500/60 bg-amber-950/20 text-amber-200 focus:border-amber-400'
                      }`}
                      min={0}
                      required
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Số mới sẽ lưu lại làm số cũ cho tháng sau
                    </span>
                  </div>
                </div>

                {/* Calculation breakdown */}
                <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs">
                  <div className="text-slate-300">
                    Tiêu thụ: <strong className="text-amber-400 font-bold">{usage} kWh</strong> x 4.000 đ
                  </div>
                  <div className="font-black text-amber-300 text-sm">
                    {formatCurrency(electricityCost)}
                  </div>
                </div>

                {isIndexInvalid && (
                  <p className="text-xs text-rose-400 font-medium">
                    ⚠️ Lỗi: Số điện mới ({newIndex}) không được nhỏ hơn số cũ ({oldIndex})!
                  </p>
                )}
              </div>

              {/* Water & Services */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700 space-y-2">
                  <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs">
                    <Droplets className="w-4 h-4 text-cyan-400" />
                    <span>TIỀN NƯỚC</span>
                  </div>
                  <label className="block text-xs text-slate-300">
                    Số người ở ({formatCurrency(waterRate)}/người)
                  </label>
                  <input
                    type="number"
                    value={waterCount}
                    onChange={(e) => setWaterCount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-bold border border-slate-700 rounded-xl bg-slate-950 text-slate-100 focus:outline-hidden focus:border-cyan-500"
                    min={1}
                    max={5}
                  />
                  <div className="text-right text-xs font-bold text-cyan-300 pt-1">
                    = {formatCurrency(waterCost)}
                  </div>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700 space-y-2">
                  <div className="text-xs font-bold text-slate-200">DỊCH VỤ CỐ ĐỊNH & KHÁC</div>
                  <div className="text-xs text-slate-300 flex justify-between">
                    <span>Wifi + Rác:</span>
                    <span className="font-semibold text-slate-100">{formatCurrency(wifiFee + garbageFee)}</span>
                  </div>
                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="text"
                      placeholder="Ghi chú khác"
                      value={otherFeeNote}
                      onChange={(e) => setOtherFeeNote(e.target.value)}
                      className="w-2/3 px-3 py-1.5 text-xs border border-slate-700 rounded-xl bg-slate-950 text-slate-100"
                    />
                    <input
                      type="number"
                      placeholder="Số tiền"
                      value={otherFee || ''}
                      onChange={(e) => setOtherFee(Number(e.target.value))}
                      className="w-1/3 px-3 py-1.5 text-xs border border-slate-700 rounded-xl bg-slate-950 text-slate-100 text-right font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Total Summary Preview */}
              <div className="bg-slate-950 border border-slate-700 text-white p-5 rounded-2xl flex items-center justify-between shadow-lg">
                <div>
                  <span className="text-xs text-slate-400 block">Tổng hóa đơn Tháng {targetMonth}/{targetYear}</span>
                  <span className="text-2xl font-black text-amber-400">
                    {formatCurrency(estimatedTotal)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isIndexInvalid}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition ${
                    isIndexInvalid
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>Chốt & Lưu Hóa Đơn</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-[#1E293B] rounded-3xl border border-slate-700 p-12 text-center text-slate-400">
              Vui lòng chọn phòng cần ghi điện nước
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
