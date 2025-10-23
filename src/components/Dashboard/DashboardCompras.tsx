// src/components/Dashboard/DashboardCompras.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { fetchSolicitations, updateComprasField } from '../../services/sheetsService';

interface RequestRow {
  rowIndex: number;
  dataCompras: string;
  statusCompras: string; // Status editável pelo setor de Compras
  ordemCompra: string;
  previsaoChegada: string;
  statusAutomacao: string; // Status da Engenharia (apenas visualização)
  reqMat: string;
  dataAutomacao: string;
  projeto: string;
  codRef: string;
  descricaoProduto: string;
  materialMarca: string;
  qtde: string;
  dataNecessidade: string;
  orcamentoLink: string;
  solicitante: string;
  observacao: string;
}

// Opções de status que Compras pode editar
const STATUS_COMPRAS_OPTIONS = [
  'COMPRAR',
  'ORÇAMENTO',
  'COMPRADO'
];

// Opções de status da Engenharia (apenas visualização)
const STATUS_ENGENHARIA_OPTIONS = [
  'URGENTÍSSIMO',
  'COMPRAR URGENTE',
  'COMPRAR NORMAL',
  'RECEBIDO',
  'CANCELAR',
  'ESTOQUE'
];

// Cores para status da Engenharia
const getStatusEngenhariaColor = (status: string): string => {
  switch (status) {
    case 'URGENTÍSSIMO': return 'bg-red-600 text-white';
    case 'COMPRAR URGENTE': return 'bg-orange-500 text-white';
    case 'COMPRAR NORMAL': return 'bg-yellow-500 text-white';
    case 'RECEBIDO': return 'bg-green-600 text-white';
    case 'CANCELAR': return 'bg-gray-600 text-white';
    case 'ESTOQUE': return 'bg-blue-600 text-white';
    default: return 'bg-gray-400 text-white';
  }
};

// Cores para status de Compras
const getStatusComprasColor = (status: string): string => {
  switch (status) {
    case 'COMPRAR': return 'bg-blue-500 text-white';
    case 'ORÇAMENTO': return 'bg-yellow-500 text-white';
    case 'COMPRADO': return 'bg-green-600 text-white';
    default: return 'bg-gray-400 text-white';
  }
};

const calculateUrgency = (dataAutomacao: string, dataNecessidade: string): { days: number; label: string; color: string } => {
  if (!dataAutomacao || !dataNecessidade) return { days: 999, label: 'Sem prazo', color: 'text-gray-400' };
  
  const solicitacao = new Date(dataAutomacao.split('/').reverse().join('-'));
  const necessidade = new Date(dataNecessidade.split('/').reverse().join('-'));
  const hoje = new Date();
  
  const diasRestantes = Math.ceil((necessidade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diasRestantes < 0) return { days: diasRestantes, label: `${Math.abs(diasRestantes)}d atrasado`, color: 'text-red-600 font-bold' };
  if (diasRestantes <= 7) return { days: diasRestantes, label: `${diasRestantes} dias`, color: 'text-red-600 font-bold' };
  if (diasRestantes <= 15) return { days: diasRestantes, label: `${diasRestantes} dias`, color: 'text-orange-600 font-semibold' };
  if (diasRestantes <= 30) return { days: diasRestantes, label: `${diasRestantes} dias`, color: 'text-yellow-600' };
  return { days: diasRestantes, label: `${diasRestantes} dias`, color: 'text-green-600' };
};

interface DashboardComprasProps {
  department: string;
}

export const DashboardCompras: React.FC<DashboardComprasProps> = ({ department }) => {
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; field: string } | null>(null);
  const [tempValue, setTempValue] = useState('');
  
  // Filtros
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [filterUrgency, setFilterUrgency] = useState<string>('TODOS');
  const [searchText, setSearchText] = useState('');
  const [showNewOnly, setShowNewOnly] = useState(false);

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

  const handleFieldUpdate = async (rowIndex: number, field: 'B' | 'C' | 'D', value: string) => {
    try {
      await updateComprasField(rowIndex, field, value);
      
      const fieldMap = { B: 'statusCompras', C: 'ordemCompra', D: 'previsaoChegada' };
      setRequests(prev =>
        prev.map(req =>
          req.rowIndex === rowIndex
            ? { ...req, [fieldMap[field]]: value }
            : req
        )
      );
      setEditingCell(null);
    } catch (err) {
      setError('Erro ao atualizar campo.');
      console.error(err);
    }
  };

  const handleSetDataCompras = async (rowIndex: number) => {
    const hoje = new Date().toLocaleDateString('pt-BR');
    await handleFieldUpdate(rowIndex, 'B', requests.find(r => r.rowIndex === rowIndex)?.statusCompras || '');
    
    // Atualiza apenas localmente a data (coluna A não é editável via API diretamente aqui)
    setRequests(prev =>
      prev.map(req =>
        req.rowIndex === rowIndex ? { ...req, dataCompras: hoje } : req
      )
    );
  };

  // Aplicar filtros
  const filteredRequests = requests
    .filter(req => {
      // Filtro de status
      if (filterStatus !== 'TODOS' && req.statusCompras !== filterStatus) return false;
      
      // Filtro de urgência
      if (filterUrgency !== 'TODOS') {
        const { days } = calculateUrgency(req.dataAutomacao, req.dataNecessidade);
        if (filterUrgency === 'URGENTE' && days > 7) return false;
        if (filterUrgency === 'MEDIA' && (days <= 7 || days > 30)) return false;
        if (filterUrgency === 'BAIXA' && days <= 30) return false;
      }
      
      // Filtro de novas (hoje)
      if (showNewOnly) {
        const hoje = new Date().toLocaleDateString('pt-BR');
        if (req.dataAutomacao !== hoje) return false;
      }
      
      // Busca por texto
      if (searchText) {
        const search = searchText.toLowerCase();
        return (
          req.descricaoProduto?.toLowerCase().includes(search) ||
          req.codRef?.toLowerCase().includes(search) ||
          req.solicitante?.toLowerCase().includes(search) ||
          req.projeto?.toLowerCase().includes(search)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      // Ordenar por urgência (mais urgente primeiro)
      const urgA = calculateUrgency(a.dataAutomacao, a.dataNecessidade).days;
      const urgB = calculateUrgency(b.dataAutomacao, b.dataNecessidade).days;
      return urgA - urgB;
    });

  const stats = {
    total: requests.length,
    comprar: requests.filter(r => r.statusCompras === 'COMPRAR').length,
    orcamento: requests.filter(r => r.statusCompras === 'ORÇAMENTO').length,
    comprado: requests.filter(r => r.statusCompras === 'COMPRADO').length,
    urgentissimo: requests.filter(r => r.statusAutomacao === 'URGENTÍSSIMO').length,
    novas: requests.filter(r => r.dataAutomacao === new Date().toLocaleDateString('pt-BR')).length
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                📦 Setor de Compras
              </h1>
              <p className="text-blue-100 mt-1">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition font-medium"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Total</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-4 border border-blue-200">
            <p className="text-blue-600 text-sm font-medium">Comprar</p>
            <p className="text-2xl font-bold text-blue-700">{stats.comprar}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-4 border border-yellow-200">
            <p className="text-yellow-600 text-sm font-medium">Orçamento</p>
            <p className="text-2xl font-bold text-yellow-700">{stats.orcamento}</p>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
            <p className="text-green-600 text-sm font-medium">Comprado</p>
            <p className="text-2xl font-bold text-green-700">{stats.comprado}</p>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
            <p className="text-red-600 text-sm font-medium">Urgentíssimo</p>
            <p className="text-2xl font-bold text-red-700">{stats.urgentissimo}</p>
          </div>
          <div className="bg-purple-50 rounded-lg shadow p-4 border border-purple-200">
            <p className="text-purple-600 text-sm font-medium">Novas (hoje)</p>
            <p className="text-2xl font-bold text-purple-700">{stats.novas}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="🔍 Buscar por item, código, solicitante..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="TODOS">Todos os Status</option>
              {STATUS_COMPRAS_OPTIONS.map((status: string) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <select
              value={filterUrgency}
              onChange={(e) => setFilterUrgency(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="TODOS">Todas Urgências</option>
              <option value="URGENTE">Urgente (≤7 dias)</option>
              <option value="MEDIA">Média (8-30 dias)</option>
              <option value="BAIXA">Baixa (&gt;30 dias)</option>
            </select>

            <button
              onClick={() => setShowNewOnly(!showNewOnly)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                showNewOnly
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {showNewOnly ? '✓ Apenas Novas' : 'Apenas Novas'}
            </button>

            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition font-medium"
            >
              {loading ? '⟳ Carregando...' : '↻ Atualizar'}
            </button>
          </div>
          
          {lastUpdate && (
            <p className="text-xs text-gray-400 mt-2">
              Última atualização: {lastUpdate.toLocaleString('pt-BR')}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-6 text-red-800">
            ⚠️ {error}
          </div>
        )}

        {/* Cards Grid */}
        {loading && requests.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-4">⟳</div>
            <p className="text-gray-600">Carregando solicitações...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 text-lg">📭 Nenhuma solicitação encontrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredRequests.map((req) => {
              const urgency = calculateUrgency(req.dataAutomacao, req.dataNecessidade);
              
              return (
                <div
                  key={req.rowIndex}
                  className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow border-l-4"
                  style={{
                    borderLeftColor:
                      req.statusAutomacao === 'URGENTÍSSIMO' ? '#dc2626' :
                      req.statusAutomacao === 'COMPRAR URGENTE' ? '#f97316' :
                      req.statusAutomacao === 'COMPRAR NORMAL' ? '#eab308' :
                      req.statusAutomacao === 'RECEBIDO' ? '#16a34a' :
                      '#6b7280'
                  }}
                >
                  <div className="p-5">
                    {/* Header do Card */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusEngenhariaColor(req.statusAutomacao)}`}>
                            🔧 {req.statusAutomacao || 'SEM STATUS'}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusComprasColor(req.statusCompras)}`}>
                            📦 {req.statusCompras || 'SEM STATUS'}
                          </span>
                          <span className={`text-sm font-semibold ${urgency.color}`}>
                            ⏱ {urgency.label}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 line-clamp-2">
                          {req.descricaoProduto || 'Sem descrição'}
                        </h3>
                      </div>
                    </div>

                    {/* Informações Principais */}
                    <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Código/Ref</p>
                        <p className="font-semibold text-gray-800">{req.codRef || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Quantidade</p>
                        <p className="font-semibold text-gray-800">{req.qtde || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Solicitante</p>
                        <p className="font-semibold text-gray-800">{req.solicitante || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Projeto</p>
                        <p className="font-semibold text-gray-800">{req.projeto || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Data Solicitação</p>
                        <p className="font-semibold text-gray-800">{req.dataAutomacao || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Data Necessidade</p>
                        <p className="font-semibold text-red-600">{req.dataNecessidade || '-'}</p>
                      </div>
                    </div>

                    {/* Material/Marca */}
                    {req.materialMarca && (
                      <div className="mb-3">
                        <p className="text-gray-500 text-xs">Material/Marca</p>
                        <p className="text-sm text-gray-700">{req.materialMarca}</p>
                      </div>
                    )}

                    {/* Link Orçamento */}
                    {req.orcamentoLink && (
                      <div className="mb-4">
                        <a
                          href={req.orcamentoLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center gap-1"
                        >
                          🔗 Ver Orçamento →
                        </a>
                      </div>
                    )}

                    {/* Observação */}
                    {req.observacao && (
                      <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-xs text-yellow-800 font-medium">💬 Observação:</p>
                        <p className="text-sm text-yellow-900">{req.observacao}</p>
                      </div>
                    )}

                    {/* Ações de Compras */}
                    <div className="border-t pt-4 space-y-3">
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <label className="text-xs text-blue-700 font-semibold block mb-1">📦 Status Compras (seu controle)</label>
                        {editingCell?.rowIndex === req.rowIndex && editingCell?.field === 'B' ? (
                          <select
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => handleFieldUpdate(req.rowIndex, 'B', tempValue)}
                            autoFocus
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            {STATUS_COMPRAS_OPTIONS.map((status: string) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingCell({ rowIndex: req.rowIndex, field: 'B' });
                              setTempValue(req.statusCompras);
                            }}
                            className="w-full px-3 py-2 border border-blue-300 bg-white rounded-lg hover:bg-blue-50 text-left text-sm font-medium"
                          >
                            {req.statusCompras || 'Clique para definir'}
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Ordem de Compra</label>
                        {editingCell?.rowIndex === req.rowIndex && editingCell?.field === 'C' ? (
                          <input
                            type="text"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => handleFieldUpdate(req.rowIndex, 'C', tempValue)}
                            autoFocus
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        ) : (
                          <button
                            onClick={() => {
                              setEditingCell({ rowIndex: req.rowIndex, field: 'C' });
                              setTempValue(req.ordemCompra);
                            }}
                            className="w-full px-3 py-2 border rounded-lg hover:bg-gray-50 text-left text-sm"
                          >
                            {req.ordemCompra || 'Clique para adicionar'}
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Previsão de Chegada</label>
                        {editingCell?.rowIndex === req.rowIndex && editingCell?.field === 'D' ? (
                          <input
                            type="date"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => {
                              const formatted = new Date(tempValue).toLocaleDateString('pt-BR');
                              handleFieldUpdate(req.rowIndex, 'D', formatted);
                            }}
                            autoFocus
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        ) : (
                          <button
                            onClick={() => {
                              setEditingCell({ rowIndex: req.rowIndex, field: 'D' });
                              const [day, month, year] = (req.previsaoChegada || '').split('/');
                              setTempValue(year && month && day ? `${year}-${month}-${day}` : '');
                            }}
                            className="w-full px-3 py-2 border rounded-lg hover:bg-gray-50 text-left text-sm"
                          >
                            {req.previsaoChegada || 'Clique para adicionar'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardCompras;