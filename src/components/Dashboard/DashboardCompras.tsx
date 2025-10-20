// src/components/Dashboard/DashboardCompras.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { fetchSolicitations, updateComprasField } from '../../services/sheetsService';
import type { Department } from '../../utils/permissions';

interface RequestRow {
  rowIndex: number;
  dataCompras: string;
  statusCompras: string;
  ordemCompra: string;
  previsaoChegada: string;
  statusAutomacao: string;
  projeto: string;
  codRef: string;
  descricaoProduto: string;
  solicitante: string;
}

interface DashboardComprasProps {
  department: Department;
}

const STATUS_COMPRAS = ['COMPRAR', 'ORÇAMENTO', 'COMPRADO', '-'];

export const DashboardCompras: React.FC<DashboardComprasProps> = () => {
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; field: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSolicitations();
      
      // Filtrar apenas as colunas necessárias para Compras
      const comprasData = data.map(req => ({
        rowIndex: req.rowIndex,
        dataCompras: req.dataCompras,
        statusCompras: req.statusCompras,
        ordemCompra: req.ordemCompra,
        previsaoChegada: req.previsaoChegada,
        statusAutomacao: req.statusAutomacao,
        projeto: req.projeto,
        codRef: req.codRef,
        descricaoProduto: req.descricaoProduto,
        solicitante: req.solicitante
      }));
      
      setRequests(comprasData);
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

  const handleStatusUpdate = async (rowIndex: number, newStatus: string) => {
    try {
      await updateComprasField(rowIndex, 'B', newStatus);
      setRequests(prev =>
        prev.map(req =>
          req.rowIndex === rowIndex
            ? { ...req, statusCompras: newStatus }
            : req
        )
      );
      setEditingCell(null);
    } catch (err) {
      setError('Erro ao atualizar status.');
      console.error(err);
    }
  };

  const handleOrdemCompraUpdate = async (rowIndex: number, value: string) => {
    try {
      await updateComprasField(rowIndex, 'C', value);
      setRequests(prev =>
        prev.map(req =>
          req.rowIndex === rowIndex
            ? { ...req, ordemCompra: value }
            : req
        )
      );
      setEditingCell(null);
    } catch (err) {
      setError('Erro ao atualizar ordem de compra.');
      console.error(err);
    }
  };

  const handlePrevisaoUpdate = async (rowIndex: number, value: string) => {
    try {
      await updateComprasField(rowIndex, 'D', value);
      setRequests(prev =>
        prev.map(req =>
          req.rowIndex === rowIndex
            ? { ...req, previsaoChegada: value }
            : req
        )
      );
      setEditingCell(null);
    } catch (err) {
      setError('Erro ao atualizar previsão.');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">📦 Setor de Compras</h1>
            <p className="text-sm text-blue-100 mt-1">{user?.email}</p>
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

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-800">
            {error}
          </div>
        )}

        {loading && requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Carregando solicitações...
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Data</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Ordem Compra</th>
                    <th className="px-4 py-3 text-left font-semibold">Previsão Chegada</th>
                    <th className="px-4 py-3 text-left font-semibold">Solicitante</th>
                    <th className="px-4 py-3 text-left font-semibold">Descrição</th>
                    <th className="px-4 py-3 text-left font-semibold">Projeto</th>
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
                            onChange={e => handleStatusUpdate(req.rowIndex, e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            title="Status Compras"
                            autoFocus
                            className="px-2 py-1 border border-blue-400 rounded"
                          >
                            {STATUS_COMPRAS.map((status: string) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        ) : (
                          <span
                            onClick={() => setEditingCell({ rowIndex: req.rowIndex, field: 'B' })}
                            className="cursor-pointer hover:bg-blue-100 px-2 py-1 rounded"
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
                            onChange={e => handleOrdemCompraUpdate(req.rowIndex, e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            placeholder="Ordem de Compra"
                            autoFocus
                            className="px-2 py-1 border border-blue-400 rounded w-full"
                          />
                        ) : (
                          <span
                            onClick={() => setEditingCell({ rowIndex: req.rowIndex, field: 'C' })}
                            className="cursor-pointer hover:bg-blue-100 px-2 py-1 rounded"
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
                            onChange={e => handlePrevisaoUpdate(req.rowIndex, e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            title="Previsão de Chegada"
                            autoFocus
                            className="px-2 py-1 border border-blue-400 rounded"
                          />
                        ) : (
                          <span
                            onClick={() => setEditingCell({ rowIndex: req.rowIndex, field: 'D' })}
                            className="cursor-pointer hover:bg-blue-100 px-2 py-1 rounded"
                          >
                            {req.previsaoChegada || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{req.solicitante || '-'}</td>
                      <td className="px-4 py-3 max-w-xs truncate">{req.descricaoProduto || '-'}</td>
                      <td className="px-4 py-3">{req.projeto || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardCompras;