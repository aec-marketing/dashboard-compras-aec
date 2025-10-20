// src/components/Dashboard/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { fetchSolicitations, updateComprasField, updateAutomacaoField } from '../../services/sheetsService';
import { getUserDepartment, canEditField, getStatusOptions } from '../../utils/permissions';
import type { Department } from '../../utils/permissions';

interface RequestRow {
  rowIndex: number;
  dataCompras: string;
  statusCompras: string;
  ordemCompra: string;
  previsaoChegada: string;
  statusAutomacao: string;
  reqMat: string;
  dataAutomacao: string;
  projeto: string;
  estaCadastrado: string;
  codRef: string;
  descricaoProduto: string;
  materialMarca: string;
  qtde: string;
  dataNecessidade: string;
  orcamentoLink: string;
  solicitante: string;
  observacao: string;
}

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; field: string } | null>(null);

  const userDepartment = user ? getUserDepartment(user.email ?? undefined) : 'UNKNOWN';
  const statusOptions = getStatusOptions(userDepartment as Department);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSolicitations();
      setRequests(data);
      setLastUpdate(new Date());
    } catch (err) {
      setError('Erro ao carregar solicitações. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleFieldUpdate = async (rowIndex: number, field: string, value: string) => {
    if (!canEditField(userDepartment as Department, field)) {
      alert('Você não tem permissão para editar este campo.');
      return;
    }

    try {
      if (['B', 'C', 'D'].includes(field)) {
        await updateComprasField(rowIndex, field as 'B' | 'C' | 'D', value);
      } else {
        await updateAutomacaoField(rowIndex, field as any, value);
      }

      setRequests(prev => prev.map(req => 
        req.rowIndex === rowIndex 
          ? { ...req, [getFieldKey(field)]: value }
          : req
      ));
      setEditingCell(null);
    } catch (err) {
      setError('Erro ao atualizar campo.');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Dashboard • {userDepartment}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Status Bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">
              Total de solicitações: <span className="font-bold">{requests.length}</span>
            </p>
            {lastUpdate && (
              <p className="text-xs text-gray-400 mt-1">
                Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
              </p>
            )}
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            {loading ? 'Carregando...' : 'Atualizar'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-800">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Carregando solicitações...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Seção COMPRAS */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-blue-50 px-6 py-4 border-b border-blue-200">
                <h2 className="text-lg font-semibold text-blue-900">📦 Seção Compras</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Data</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Ordem Compra</th>
                      <th className="px-4 py-3 text-left font-semibold">Previsão Chegada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map(req => (
                      <tr key={req.rowIndex} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">{req.dataCompras || '-'}</td>
                        <td className="px-4 py-3">
                          {editingCell?.rowIndex === req.rowIndex && editingCell?.field === 'B' ? (
                            <select
                              value={req.statusCompras}
                              onChange={e => handleFieldUpdate(req.rowIndex, 'B', e.target.value)}
                              onBlur={() => setEditingCell(null)}
                              title="Status Compras"
                              autoFocus
                              className="px-2 py-1 border border-blue-400 rounded"
                            >
                              {statusOptions.map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <span
                              onClick={() => userDepartment === 'COMPRAS' && setEditingCell({ rowIndex: req.rowIndex, field: 'B' })}
                              className={userDepartment === 'COMPRAS' ? 'cursor-pointer hover:bg-blue-100 px-2 py-1 rounded' : ''}
                            >
                              {req.statusCompras || '-'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {editingCell?.rowIndex === req.rowIndex && editingCell?.field === 'C' ? (
                            <input
                              type="text"
                              value={req.ordemCompra}
                              onChange={e => handleFieldUpdate(req.rowIndex, 'C', e.target.value)}
                              onBlur={() => setEditingCell(null)}
                              placeholder="Ordem de Compra"
                              autoFocus
                              className="px-2 py-1 border border-blue-400 rounded w-full"
                            />
                          ) : (
                            <span
                              onClick={() => userDepartment === 'COMPRAS' && setEditingCell({ rowIndex: req.rowIndex, field: 'C' })}
                              className={userDepartment === 'COMPRAS' ? 'cursor-pointer hover:bg-blue-100 px-2 py-1 rounded' : ''}
                            >
                              {req.ordemCompra || '-'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {editingCell?.rowIndex === req.rowIndex && editingCell?.field === 'D' ? (
                            <input
                              type="date"
                              value={req.previsaoChegada}
                              onChange={e => handleFieldUpdate(req.rowIndex, 'D', e.target.value)}
                              onBlur={() => setEditingCell(null)}
                              title="Previsão de Chegada"
                              autoFocus
                              className="px-2 py-1 border border-blue-400 rounded"
                            />
                          ) : (
                            <span
                              onClick={() => userDepartment === 'COMPRAS' && setEditingCell({ rowIndex: req.rowIndex, field: 'D' })}
                              className={userDepartment === 'COMPRAS' ? 'cursor-pointer hover:bg-blue-100 px-2 py-1 rounded' : ''}
                            >
                              {req.previsaoChegada || '-'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Seção AUTOMAÇÃO */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-green-50 px-6 py-4 border-b border-green-200">
                <h2 className="text-lg font-semibold text-green-900">⚙️ Seção Automação</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">REQ. MAT.</th>
                      <th className="px-4 py-3 text-left font-semibold">Projeto</th>
                      <th className="px-4 py-3 text-left font-semibold">Cód. Ref.</th>
                      <th className="px-4 py-3 text-left font-semibold">Descrição</th>
                      <th className="px-4 py-3 text-left font-semibold">Qtde</th>
                      <th className="px-4 py-3 text-left font-semibold">Solicitante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map(req => (
                      <tr key={req.rowIndex} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {editingCell?.rowIndex === req.rowIndex && editingCell?.field === 'E' ? (
                            <select
                              value={req.statusAutomacao}
                              onChange={e => handleFieldUpdate(req.rowIndex, 'E', e.target.value)}
                              onBlur={() => setEditingCell(null)}
                              title="Status Automação"
                              autoFocus
                              className="px-2 py-1 border border-green-400 rounded"
                            >
                              {statusOptions.map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <span
                              onClick={() => userDepartment === 'ENGENHARIA' && setEditingCell({ rowIndex: req.rowIndex, field: 'E' })}
                              className={userDepartment === 'ENGENHARIA' ? 'cursor-pointer hover:bg-green-100 px-2 py-1 rounded' : ''}
                            >
                              {req.statusAutomacao || '-'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">{req.reqMat || '-'}</td>
                        <td className="px-4 py-3">{req.projeto || '-'}</td>
                        <td className="px-4 py-3">{req.codRef || '-'}</td>
                        <td className="px-4 py-3 max-w-xs truncate">{req.descricaoProduto || '-'}</td>
                        <td className="px-4 py-3">{req.qtde || '-'}</td>
                        <td className="px-4 py-3">{req.solicitante || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

function getFieldKey(field: string): string {
  const map: Record<string, string> = {
    'A': 'dataCompras',
    'B': 'statusCompras',
    'C': 'ordemCompra',
    'D': 'previsaoChegada',
    'E': 'statusAutomacao',
    'F': 'reqMat',
    'G': 'dataAutomacao',
    'H': 'projeto',
    'I': 'estaCadastrado',
    'J': 'codRef',
    'K': 'descricaoProduto',
    'L': 'materialMarca',
    'M': 'qtde',
    'N': 'dataNecessidade',
    'O': 'orcamentoLink',
    'P': 'solicitante',
    'Q': 'observacao'
  };
  return map[field] || field;
}

export default Dashboard;