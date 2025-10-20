// src/components/Admin/AdminPanel.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import { collection, getDocs, setDoc, deleteDoc, doc } from 'firebase/firestore';
import type { Department } from '../../utils/permissions';

interface User {
  email: string;
  department: Department | 'ADM';
  createdAt?: any;
}

const DEPARTMENTS: (Department | 'ADM')[] = ['ADM', 'COMPRAS', 'ENGENHARIA'];

export const AdminPanel: React.FC = () => {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newDepartment, setNewDepartment] = useState<Department | 'ADM'>('COMPRAS');

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      const usersList: User[] = [];
      snapshot.forEach(doc => {
        usersList.push({
          email: doc.id,
          ...(doc.data() as Omit<User, 'email'>)
        });
      });
      
      setUsers(usersList.sort((a, b) => a.email.localeCompare(b.email)));
      setError(null);
    } catch (err) {
      setError('Erro ao carregar usuários');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEmail.trim()) {
      setError('Email é obrigatório');
      return;
    }

    try {
      await setDoc(doc(db, 'users', newEmail), {
        email: newEmail,
        department: newDepartment,
        createdAt: new Date()
      });

      setUsers(prev => [...prev, { email: newEmail, department: newDepartment }].sort((a, b) => a.email.localeCompare(b.email)));
      setNewEmail('');
      setNewDepartment('COMPRAS');
      setError(null);
    } catch (err) {
      setError('Erro ao adicionar usuário');
      console.error(err);
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (email === user?.email) {
      setError('Você não pode deletar sua própria conta');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja deletar ${email}?`)) return;

    try {
      await deleteDoc(doc(db, 'users', email));
      setUsers(prev => prev.filter(u => u.email !== email));
      setError(null);
    } catch (err) {
      setError('Erro ao deletar usuário');
      console.error(err);
    }
  };

  const handleUpdateDepartment = async (email: string, newDept: Department | 'ADM') => {
    try {
      await setDoc(doc(db, 'users', email), {
        email,
        department: newDept,
        createdAt: new Date()
      });

      setUsers(prev => prev.map(u => u.email === email ? { ...u, department: newDept } : u));
      setError(null);
    } catch (err) {
      setError('Erro ao atualizar departamento');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-purple-600 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-sm text-purple-100 mt-1">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulário */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">Adicionar Usuário</h2>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="usuario@almeidaecamargo.com.br"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Departamento</label>
                  <select
                    value={newDepartment}
                    onChange={e => setNewDepartment(e.target.value as Department | 'ADM')}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
                >
                  Adicionar
                </button>
              </form>
            </div>
          </div>

          {/* Lista de Usuários */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-bold">Usuários ({users.length})</h2>
              </div>
              
              {loading ? (
                <div className="p-6 text-center text-gray-500">Carregando...</div>
              ) : users.length === 0 ? (
                <div className="p-6 text-center text-gray-500">Nenhum usuário cadastrado</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold">Email</th>
                        <th className="px-6 py-3 text-left font-semibold">Departamento</th>
                        <th className="px-6 py-3 text-left font-semibold">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.email} className="border-b hover:bg-gray-50">
                          <td className="px-6 py-3">
                            <span className="text-sm">{u.email}</span>
                            {u.email === user?.email && (
                              <span className="ml-2 inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                Você
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3">
                            <select
                              value={u.department}
                              onChange={e => handleUpdateDepartment(u.email, e.target.value as Department | 'ADM')}
                              className="px-3 py-1 border rounded text-sm"
                            >
                              {DEPARTMENTS.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-3">
                            <button
                              onClick={() => handleDeleteUser(u.email)}
                              disabled={u.email === user?.email}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:bg-gray-400 transition"
                            >
                              Deletar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;