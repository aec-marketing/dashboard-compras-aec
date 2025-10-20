// src/components/Dashboard/DashboardEngenharia.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { fetchSolicitations, updateAutomacaoField, addNewRequest } from '../../services/sheetsService';
import type { Department } from '../../utils/permissions';

interface RequestRow {
  rowIndex: number;
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

interface DashboardEngenhrariaProps {
  department: Department;
}

const STATUS_AUTOMACAO = ['COMPRAR URGENTE', 'COMPRAR NORMAL', 'RECEBIDO', '-'];

export const DashboardEngenharia: React.FC<DashboardEngenhrariaProps> = () => {
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; field: string } | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSolicitations();
      
      const engenhariaData = data.map(req => ({
        rowIndex: req.rowIndex,
        statusAutomacao: req.statusAutomacao,
        reqMat: req.reqMat,
        dataAutomacao: req.dataAutomacao,
        projeto: req.projeto,
        estaCadastrado: req.estaCadastrado,
        codRef: req.codRef,
        descricaoProduto: req.descricaoProduto,
        materialMarca: req.materialMarca,
        qtde: req.qtde,
        dataNecessidade: req.dataNecessidade,
        orcamentoLink: req.orcamentoLink,
        solicitante: req.solicitante,
        observacao: req.observacao
      }));
      
      setRequests(engenhariaData);
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
      await updateAutomacaoField(rowIndex, 'E', newStatus);
      setRequests(prev =>
        prev.map(req =>
          req.rowIndex === rowIndex
            ? { ...req, statusAutomacao: newStatus }
            : req
        )
      );
      setEditingCell(null);
    } catch (err) {
      setError('Erro ao atualizar status.');
      console.error(err);
    }
  };

  const handleNewRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const newReq = await addNewRequest({
        statusAutomacao: (formData.get('statusAutomacao') as string) || 'COMPRAR NORMAL',
        reqMat: (formData.get('reqMat') as string) || '',
        dataAutomacao: (formData.get('dataAutomacao') as string) || new Date().toLocaleDateString('pt-BR'),
        projeto: (formData.get('projeto') as string) || '',
        codRef: (formData.get('codRef') as string) || '',
        descricaoProduto: (formData.get('descricaoProduto') as string) || '',
        materialMarca: (formData.get('materialMarca') as string) || '',
        qtde: (formData.get('qtde') as string) || '',
        dataNecessidade: (formData.get('dataNecessidade') as string) || '',
        orcamentoLink: (formData.get('orcamentoLink') as string) || '',
        solicitante: user?.email || '',
        observacao: (formData.get('observacao') as string) || ''
      });

      setRequests(prev => [newReq as any, ...prev]);
      setShowForm(false);
      (e.currentTarget as HTMLFormElement).reset();
    } catch (err) {
      setError('Erro ao criar solicitação.');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-600 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Engenharia/Automação</h1>
            <p className="text-sm text-green-100 mt-1">{user?.email}</p>
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
          <div className="space-x-2">
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              + Nova Solicitação
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {loading ? 'Carregando...' : 'Atualizar'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-800">
            {error}
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">Nova Solicitação</h2>
            <form onSubmit={handleNewRequest} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="statusAutomacao" className="block text-sm font-medium mb-1">Status</label>
                <select id="statusAutomacao" name="statusAutomacao" className="w-full px-3 py-2 border rounded-lg">
                  {STATUS_AUTOMACAO.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="reqMat" className="block text-sm font-medium mb-1">REQ. MAT.</label>
                <input id="reqMat" type="text" name="reqMat" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label htmlFor="projeto" className="block text-sm font-medium mb-1">Projeto</label>
                <input id="projeto" type="text" name="projeto" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label htmlFor="codRef" className="block text-sm font-medium mb-1">Cód. Ref.</label>
                <input id="codRef" type="text" name="codRef" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="descricaoProduto" className="block text-sm font-medium mb-1">Descrição do Produto</label>
                <input id="descricaoProduto" type="text" name="descricaoProduto" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label htmlFor="materialMarca" className="block text-sm font-medium mb-1">Material/Marca</label>
                <input id="materialMarca" type="text" name="materialMarca" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label htmlFor="qtde" className="block text-sm font-medium mb-1">Quantidade</label>
                <input id="qtde" type="text" name="qtde" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label htmlFor="dataNecessidade" className="block text-sm font-medium mb-1">Data Necessidade</label>
                <input id="dataNecessidade" type="date" name="dataNecessidade" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="orcamentoLink" className="block text-sm font-medium mb-1">Orçamento Link</label>
                <input id="orcamentoLink" type="url" name="orcamentoLink" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="observacao" className="block text-sm font-medium mb-1">Observação</label>
                <textarea id="observacao" name="observacao" rows={3} className="w-full px-3 py-2 border rounded-lg"></textarea>
              </div>
              <div className="md:col-span-2 flex gap-2">
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Criar Solicitação
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
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
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">REQ. MAT.</th>
                    <th className="px-4 py-3 text-left font-semibold">Projeto</th>
                    <th className="px-4 py-3 text-left font-semibold">Cód. Ref.</th>
                    <th className="px-4 py-3 text-left font-semibold">Descrição</th>
                    <th className="px-4 py-3 text-left font-semibold">Material</th>
                    <th className="px-4 py-3 text-left font-semibold">Qtde</th>
                    <th className="px-4 py-3 text-left font-semibold">Data Necessária</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => (
                    <tr key={req.rowIndex} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {editingCell?.rowIndex === req.rowIndex && editingCell?.field === 'E' ? (
                          <select
                            value={req.statusAutomacao}
                            onChange={e => handleStatusUpdate(req.rowIndex, e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            title="Status Automação"
                            autoFocus
                            className="px-2 py-1 border border-green-400 rounded"
                          >
                            {STATUS_AUTOMACAO.map((status: string) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        ) : (
                          <span
                            onClick={() => setEditingCell({ rowIndex: req.rowIndex, field: 'E' })}
                            className="cursor-pointer hover:bg-green-100 px-2 py-1 rounded"
                          >
                            {req.statusAutomacao || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{req.reqMat || '-'}</td>
                      <td className="px-4 py-3">{req.projeto || '-'}</td>
                      <td className="px-4 py-3">{req.codRef || '-'}</td>
                      <td className="px-4 py-3 max-w-xs truncate">{req.descricaoProduto || '-'}</td>
                      <td className="px-4 py-3 max-w-xs truncate">{req.materialMarca || '-'}</td>
                      <td className="px-4 py-3">{req.qtde || '-'}</td>
                      <td className="px-4 py-3">{req.dataNecessidade || '-'}</td>
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

export default DashboardEngenharia;