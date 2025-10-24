// src/components/Dashboard/DashboardCompras.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchSolicitations,
  updateComprasField,
  updateItemStatus,
  markBatchAsSeen,
  isBatch
} from '../../services/sheetsService';

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
  estaCadastrado: string;
  codRef: string;
  descricaoProduto: string;
  materialMarca: string;
  qtde: string;
  dataNecessidade: string;
  orcamentoLink: string;
  solicitante: string;
  observacao: string;
  statusItemIndividual: string;
  vistoCompras: string;
  ultimaModificacao: string;
  itemRemovido: string;
}

// Opções de status que Compras pode editar
const STATUS_COMPRAS_OPTIONS = [
  'COMPRAR',
  'ORÇAMENTO',
  'COMPRADO'
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

  // Estados para lotes
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSolicitations();
      const activeRequests = data.filter(req => req.itemRemovido !== 'REMOVIDO');
      setRequests(activeRequests);
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

  const handleFieldUpdateForGroup = async (reqMat: string, isLote: boolean, field: 'B' | 'C' | 'D', value: string) => {
    try {
      setLoading(true);
      const fieldMap = { B: 'statusCompras', C: 'ordemCompra', D: 'previsaoChegada' };

      if (isLote) {
        // Atualizar todos os itens do lote
        const batchItems = requests.filter(r => r.reqMat === reqMat);
        for (const item of batchItems) {
          await updateComprasField(item.rowIndex, field, value);
        }

        // Atualizar estado local
        setRequests(prev =>
          prev.map(req =>
            req.reqMat === reqMat
              ? { ...req, [fieldMap[field]]: value }
              : req
          )
        );
      } else {
        // Item individual - atualizar apenas um
        const item = requests.find(r => r.reqMat === reqMat);
        if (item) {
          await updateComprasField(item.rowIndex, field, value);
          setRequests(prev =>
            prev.map(req =>
              req.rowIndex === item.rowIndex
                ? { ...req, [fieldMap[field]]: value }
                : req
            )
          );
        }
      }

      setEditingCell(null);
    } catch (err) {
      setError('Erro ao atualizar campo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleItemStatusToggle = (rowIndex: number) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  };

  const handleUpdateCheckedItems = async (status: string) => {
    try {
      setLoading(true);
      for (const rowIndex of Array.from(checkedItems)) {
        await updateItemStatus(rowIndex, status, user?.email || '');
      }
      await loadData();
      setCheckedItems(new Set());
    } catch (err) {
      setError('Erro ao atualizar itens selecionados.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleBatchExpansion = async (reqMat: string) => {
    const isExpanding = !expandedBatches.has(reqMat);

    setExpandedBatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reqMat)) {
        newSet.delete(reqMat);
      } else {
        newSet.add(reqMat);
      }
      return newSet;
    });

    // Marcar como visto na primeira vez
    if (isExpanding) {
      const batchItems = requests.filter(r => r.reqMat === reqMat);
      const alreadySeen = batchItems.some(item => item.vistoCompras);

      if (!alreadySeen) {
        try {
          await markBatchAsSeen(reqMat, user?.email || '');
          await loadData();
        } catch (err) {
          console.error('Erro ao marcar lote como visto:', err);
        }
      }
    }
  };

  // Agrupar solicitações (lotes + itens individuais)
  const groupedRequests = requests.reduce((acc, req) => {
    if (req.reqMat && isBatch(req.reqMat, requests)) {
      // É um lote
      if (!acc[req.reqMat]) {
        acc[req.reqMat] = [];
      }
      acc[req.reqMat].push(req);
    } else {
      // Item individual
      acc[`single-${req.rowIndex}`] = [req];
    }
    return acc;
  }, {} as Record<string, RequestRow[]>);

  // Aplicar filtros aos grupos
  const filteredGroups = Object.entries(groupedRequests).filter(([key, items]) => {
    const firstItem = items[0];

    // Filtro de status
    if (filterStatus !== 'TODOS' && firstItem.statusCompras !== filterStatus) return false;

    // Filtro de urgência
    if (filterUrgency !== 'TODOS') {
      const { days } = calculateUrgency(firstItem.dataAutomacao, firstItem.dataNecessidade);
      if (filterUrgency === 'URGENTE' && days > 7) return false;
      if (filterUrgency === 'MEDIA' && (days <= 7 || days > 30)) return false;
      if (filterUrgency === 'BAIXA' && days <= 30) return false;
    }

    // Filtro de novas (hoje)
    if (showNewOnly) {
      const hoje = new Date().toLocaleDateString('pt-BR');
      if (firstItem.dataAutomacao !== hoje) return false;
    }

    // Busca por texto
    if (searchText) {
      const search = searchText.toLowerCase();
      return items.some(item =>
        item.descricaoProduto?.toLowerCase().includes(search) ||
        item.codRef?.toLowerCase().includes(search) ||
        item.solicitante?.toLowerCase().includes(search) ||
        item.projeto?.toLowerCase().includes(search) ||
        item.reqMat?.toLowerCase().includes(search)
      );
    }

    return true;
  }).sort(([, itemsA], [, itemsB]) => {
    const urgA = calculateUrgency(itemsA[0].dataAutomacao, itemsA[0].dataNecessidade).days;
    const urgB = calculateUrgency(itemsB[0].dataAutomacao, itemsB[0].dataNecessidade).days;
    return urgA - urgB;
  });

  const stats = {
    total: requests.length,
    lotes: Object.keys(groupedRequests).filter(key => !key.startsWith('single-')).length,
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
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Total</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          </div>
          <div className="bg-purple-50 rounded-lg shadow p-4 border border-purple-200">
            <p className="text-purple-600 text-sm font-medium">Lotes</p>
            <p className="text-2xl font-bold text-purple-700">{stats.lotes}</p>
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
          <div className="bg-indigo-50 rounded-lg shadow p-4 border border-indigo-200">
            <p className="text-indigo-600 text-sm font-medium">Novas (hoje)</p>
            <p className="text-2xl font-bold text-indigo-700">{stats.novas}</p>
          </div>
        </div>


        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="🔍 Buscar por item, código, REQ MAT, solicitante..."
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
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 text-lg">📭 Nenhuma solicitação encontrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredGroups.map(([groupKey, items]) => {
              const isLoteGroup = !groupKey.startsWith('single-');
              const firstItem = items[0];
              const urgency = calculateUrgency(firstItem.dataAutomacao, firstItem.dataNecessidade);
              const isExpanded = expandedBatches.has(firstItem.reqMat);
              const wasSeenBefore = firstItem.vistoCompras !== '';
              
              return (
                <div
                  key={groupKey}
                  className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow border-l-4"
                  style={{
                    borderLeftColor:
                      firstItem.statusAutomacao === 'URGENTÍSSIMO' ? '#dc2626' :
                      firstItem.statusAutomacao === 'COMPRAR URGENTE' ? '#f97316' :
                      firstItem.statusAutomacao === 'COMPRAR NORMAL' ? '#eab308' :
                      firstItem.statusAutomacao === 'RECEBIDO' ? '#16a34a' :
                      '#6b7280'
                  }}
                >
                  <div className="p-5">
                    {/* Header do Card */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {isLoteGroup && (
                            <span className="px-3 py-1 bg-purple-600 text-white rounded-full text-xs font-bold">
                              📦 LOTE • {items.length} itens
                            </span>
                          )}
                          {!wasSeenBefore && isLoteGroup && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded animate-pulse">
                              🆕 NOVO
                            </span>
                          )}
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusEngenhariaColor(firstItem.statusAutomacao)}`}>
                            🔧 {firstItem.statusAutomacao || 'SEM STATUS'}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusComprasColor(firstItem.statusCompras)}`}>
                            📦 {firstItem.statusCompras || 'SEM STATUS'}
                          </span>
                          <span className={`text-sm font-semibold ${urgency.color}`}>
                            ⏱ {urgency.label}
                          </span>
                        </div>
                        {isLoteGroup ? (
                          <div>
                            <h3 className="text-lg font-bold text-gray-800">
                              REQ MAT: {firstItem.reqMat}
                            </h3>
                            <p className="text-sm text-gray-600">{firstItem.projeto || 'Sem projeto'}</p>
                            <button
                              type="button"
                              onClick={() => toggleBatchExpansion(firstItem.reqMat)}
                              className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              {isExpanded ? '▼ Ocultar produtos' : '▶ Ver todos os produtos'}
                            </button>
                          </div>
                        ) : (
                          <h3 className="text-lg font-bold text-gray-800 line-clamp-2">
                            {firstItem.descricaoProduto || 'Sem descrição'}
                          </h3>
                        )}
                      </div>
                    </div>

                    {/* Lista de Produtos do Lote (quando expandido) */}
                    {isLoteGroup && isExpanded && (
                      <div className="mb-4 space-y-3">
                        {items.map((item, idx) => (
                          <div key={item.rowIndex} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={checkedItems.has(item.rowIndex)}
                                onChange={() => handleItemStatusToggle(item.rowIndex)}
                                className="mt-1 w-5 h-5 text-blue-600 rounded"
                              />
                              <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-bold text-gray-800">#{idx + 1} - {item.descricaoProduto}</h4>
                                  {item.statusItemIndividual && (
                                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                      {item.statusItemIndividual}
                                    </span>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <p className="text-gray-500 text-xs">Código</p>
                                    <p className="font-semibold">{item.codRef || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 text-xs">Quantidade</p>
                                    <p className="font-semibold">{item.qtde || '-'}</p>
                                  </div>
                                  {item.materialMarca && (
                                    <div className="col-span-2">
                                      <p className="text-gray-500 text-xs">Material/Marca</p>
                                      <p className="text-sm">{item.materialMarca}</p>
                                    </div>
                                  )}
                                  {item.observacao && (
                                    <div className="col-span-2">
                                      <p className="text-gray-500 text-xs">Observação</p>
                                      <p className="text-sm text-gray-700">{item.observacao}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Dados compartilhados do lote */}
                    {isLoteGroup && (
                      <div className="grid grid-cols-2 gap-3 mb-4 text-sm bg-purple-50 p-3 rounded border border-purple-200">
                        <div>
                          <p className="text-purple-700 text-xs font-medium">Solicitante</p>
                          <p className="font-semibold text-purple-900 text-xs">{firstItem.solicitante || '-'}</p>
                        </div>
                        <div>
                          <p className="text-purple-700 text-xs font-medium">Projeto</p>
                          <p className="font-semibold text-purple-900">{firstItem.projeto || '-'}</p>
                        </div>
                        <div>
                          <p className="text-purple-700 text-xs font-medium">Data Solicitação</p>
                          <p className="font-semibold text-purple-900">{firstItem.dataAutomacao || '-'}</p>
                        </div>
                        <div>
                          <p className="text-purple-700 text-xs font-medium">Data Necessidade</p>
                          <p className="font-semibold text-red-600">{firstItem.dataNecessidade || '-'}</p>
                        </div>
                      </div>
                    )}

                    {/* Informações Principais (apenas para item individual) */}
                    {!isLoteGroup && (
                      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs">Código/Ref</p>
                          <p className="font-semibold text-gray-800">{firstItem.codRef || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Quantidade</p>
                          <p className="font-semibold text-gray-800">{firstItem.qtde || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Solicitante</p>
                          <p className="font-semibold text-gray-800">{firstItem.solicitante || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Projeto</p>
                          <p className="font-semibold text-gray-800">{firstItem.projeto || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Data Solicitação</p>
                          <p className="font-semibold text-gray-800">{firstItem.dataAutomacao || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Data Necessidade</p>
                          <p className="font-semibold text-red-600">{firstItem.dataNecessidade || '-'}</p>
                        </div>
                      </div>
                    )}

                    {/* Material/Marca (apenas para item individual) */}
                    {!isLoteGroup && firstItem.materialMarca && (
                      <div className="mb-3">
                        <p className="text-gray-500 text-xs">Material/Marca</p>
                        <p className="text-sm text-gray-700">{firstItem.materialMarca}</p>
                      </div>
                    )}

                    {/* Link Orçamento */}
                    {firstItem.orcamentoLink && (
                      <div className="mb-4">
                        {firstItem.orcamentoLink.startsWith('http') ? (
                          <a
                            href={firstItem.orcamentoLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center gap-1"
                          >
                            🔗 Ver Orçamento →
                          </a>
                        ) : (
                          <div className="p-2 bg-gray-50 border border-gray-200 rounded">
                            <p className="text-xs text-gray-600">Orçamento:</p>
                            <p className="text-sm text-gray-800 font-medium">{firstItem.orcamentoLink}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Observação (apenas para item individual) */}
                    {!isLoteGroup && firstItem.observacao && (
                      <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-xs text-yellow-800 font-medium">💬 Observação:</p>
                        <p className="text-sm text-yellow-900">{firstItem.observacao}</p>
                      </div>
                    )}

                    {/* Ações de Compras */}
                    <div className="border-t pt-4 space-y-3">
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <label className="text-xs text-blue-700 font-semibold block mb-1">📦 Status Compras {isLoteGroup && '(aplica a todo o lote)'}</label>
                        {editingCell?.rowIndex === firstItem.rowIndex && editingCell?.field === 'B' ? (
                          <select
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => handleFieldUpdateForGroup(firstItem.reqMat, isLoteGroup, 'B', tempValue)}
                            autoFocus
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            {STATUS_COMPRAS_OPTIONS.map((status: string) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCell({ rowIndex: firstItem.rowIndex, field: 'B' });
                              setTempValue(firstItem.statusCompras);
                            }}
                            className="w-full px-3 py-2 border border-blue-300 bg-white rounded-lg hover:bg-blue-50 text-left text-sm font-medium"
                          >
                            {firstItem.statusCompras || 'Clique para definir'}
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Ordem de Compra</label>
                        {editingCell?.rowIndex === firstItem.rowIndex && editingCell?.field === 'C' ? (
                          <input
                            type="text"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => handleFieldUpdateForGroup(firstItem.reqMat, isLoteGroup, 'C', tempValue)}
                            autoFocus
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCell({ rowIndex: firstItem.rowIndex, field: 'C' });
                              setTempValue(firstItem.ordemCompra);
                            }}
                            className="w-full px-3 py-2 border rounded-lg hover:bg-gray-50 text-left text-sm"
                          >
                            {firstItem.ordemCompra || 'Clique para adicionar'}
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Previsão de Chegada</label>
                        {editingCell?.rowIndex === firstItem.rowIndex && editingCell?.field === 'D' ? (
                          <input
                            type="date"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => {
                              const formatted = new Date(tempValue).toLocaleDateString('pt-BR');
                              handleFieldUpdateForGroup(firstItem.reqMat, isLoteGroup, 'D', formatted);
                            }}
                            autoFocus
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCell({ rowIndex: firstItem.rowIndex, field: 'D' });
                              const [day, month, year] = (firstItem.previsaoChegada || '').split('/');
                              setTempValue(year && month && day ? `${year}-${month}-${day}` : '');
                            }}
                            className="w-full px-3 py-2 border rounded-lg hover:bg-gray-50 text-left text-sm"
                          >
                            {firstItem.previsaoChegada || 'Clique para adicionar'}
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

      {/* Bottom Sheet - Ações em Lote */}
      {checkedItems.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-2xl border-t-4 border-blue-500 animate-slide-up">
          <div className="max-w-7xl mx-auto px-4 py-3">
            {/* Conteúdo Compacto */}
            <div className="flex items-center gap-4">
              {/* Info de Seleção */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">{checkedItems.size}</span>
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  {checkedItems.size === 1 ? 'item' : 'itens'}
                </span>
              </div>

              {/* Botões de Ação Compactos */}
              <div className="flex-1 flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => handleUpdateCheckedItems('COMPRADO')}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-all shadow-md text-sm font-medium"
                >
                  <span>✓</span>
                  <span>COMPRADO</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateCheckedItems('ORÇAMENTO')}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 transition-all shadow-md text-sm font-medium"
                >
                  <span>📋</span>
                  <span>ORÇAMENTO</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateCheckedItems('COMPRAR')}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-all shadow-md text-sm font-medium"
                >
                  <span>🛒</span>
                  <span>COMPRAR</span>
                </button>
              </div>

              {/* Botão Fechar */}
              <button
                type="button"
                onClick={() => setCheckedItems(new Set())}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
                title="Fechar"
              >
                <span className="text-xl text-gray-400">×</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardCompras;