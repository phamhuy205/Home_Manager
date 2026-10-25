import React, { useState } from 'react';
import { UserPlus, Edit3, Trash2, X, Check, KeyRound, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserAccount } from '../../types';

export const AccountManager: React.FC = () => {
  const { users, rooms, createTenantAccounts, updateUserAccount, deleteUserAccount } = useApp();
  const tenantUsers = users.filter((u) => u.role === 'TENANT');
  const [tab, setTab] = useState<'list' | 'create'>('list');
  const [createRoomId, setCreateRoomId] = useState('');
  const [createOccupants, setCreateOccupants] = useState(1);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editUsername, setEditUsername] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createRoomId) return;
    const result = createTenantAccounts(createRoomId, createOccupants);
    setCreateMessage(result.message);
  };

  const openEdit = (user: UserAccount) => {
    setEditingUser(user);
    setEditFullName(user.fullName);
    setEditPhone(user.phone);
    setEditUsername(user.username);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    updateUserAccount(editingUser.id, { fullName: editFullName.trim(), phone: editPhone.trim(), username: editUsername.trim() });
    setEditingUser(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#1E293B] p-5 rounded-3xl border border-slate-700">
        <h2 className="text-lg font-extrabold text-slate-100">Quản Lý Tài Khoản Khách Thuê</h2>
        <p className="text-xs text-slate-400">Tạo, sửa, xóa tài khoản đăng nhập cho từng phòng. Mật khẩu mặc định: 123456.</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('list')} className={`px-4 py-2 rounded-xl text-xs font-bold ${tab === 'list' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>Danh sách ({tenantUsers.length})</button>
        <button onClick={() => setTab('create')} className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 ${tab === 'create' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}><UserPlus className="w-4 h-4" /><span>Tạo mới</span></button>
      </div>

      {tab === 'create' && (
        <form onSubmit={handleCreate} className="bg-[#1E293B] p-5 rounded-3xl border border-slate-700 space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Chọn phòng</label>
            <select value={createRoomId} onChange={(e) => setCreateRoomId(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 rounded-xl" required>
              <option value="">-- Chọn phòng --</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.roomNumber} {r.isOccupied ? `• ${r.tenant?.name}` : '• Trống'}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Số người ở (tối đa 2)</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setCreateOccupants(1)} className={`py-2.5 rounded-xl text-xs font-bold border ${createOccupants === 1 ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>1 người</button>
              <button type="button" onClick={() => setCreateOccupants(2)} className={`py-2.5 rounded-xl text-xs font-bold border ${createOccupants === 2 ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>2 người (share bill)</button>
            </div>
          </div>
          {createMessage && <div className="p-3 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl">{createMessage}</div>}
          <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black">Tạo tài khoản</button>
        </form>
      )}

      {tab === 'list' && (
        <div className="bg-[#1E293B] rounded-3xl border border-slate-700 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-900 text-slate-400 text-left">
                <th className="p-3">Username</th>
                <th className="p-3">Họ tên</th>
                <th className="p-3">SĐT</th>
                <th className="p-3">Phòng</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {tenantUsers.map((u) => (
                <tr key={u.id} className="text-slate-200">
                  <td className="p-3 font-mono font-bold text-indigo-300">{u.username}</td>
                  <td className="p-3">{u.fullName}</td>
                  <td className="p-3">{u.phone}</td>
                  <td className="p-3">{u.roomId || '---'}</td>
                  <td className="p-3 text-right space-x-1">
                    <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800" title="Sửa"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => { if (confirm(`Xóa tài khoản ${u.username}?`)) deleteUserAccount(u.id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800" title="Xóa"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <form onSubmit={handleSaveEdit} className="bg-[#1E293B] w-full max-w-md rounded-3xl border border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-100">Sửa tài khoản {editingUser.username}</h3>
              <button type="button" onClick={() => setEditingUser(null)} className="p-1.5 rounded-xl text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="Username" className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 rounded-xl" required />
            <input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} placeholder="Họ tên" className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 rounded-xl" required />
            <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="SĐT" className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 text-slate-100 rounded-xl" />
            <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black">Lưu</button>
          </form>
        </div>
      )}
    </div>
  );
};
