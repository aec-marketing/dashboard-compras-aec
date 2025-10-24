// src/components/Dashboard/DashboardEngenharia.tsx - ATUALIZADO
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
  fetchSolicitations, 
  updateAutomacaoField, 
  addNewRequest,
  addBatchRequest,
  isBatch 
} from '../../services/sheetsService';
import { FormularioLote } from './FormularioLote';

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
  statusItemIndividual: string;
  vistoCompras: string;
  ultimaModificacao: string;
  itemRemovido: string;
}

const STATUS_AUTOMACAO_OPTIONS = [
  'COMPRAR URGENTE',
  'COMPRAR NORMAL',
  'URGENTÍSSIMO',
  'RECEBIDO',
  'CANCELAR',
  'ESTOQUE'
];

const getStatusAutomacaoColor = (status: string): string => {
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

interface DashboardEngenhariaProps {
  department: string;
}

export const DashboardEngenharia: React.FC<DashboardEngenhariaProps> = ({ department }) => {
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; field: string } | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [showFormType, setShowFormType] = useState<'none' | 'item' | 'lote'>('none');
  
  // Filtros
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [searchText, setSearchText] = useState('');
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSolicitations();
      // Filtrar apenas itens ativos
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

  const handleStatusUpdate = async (rowIndex: number, reqMat: string, isLote: boolean, newStatus: string) => {
    try {
      if (isLote) {
        // Atualizar todos os itens do lote
        const batchItems = requests.filter(r => r.reqMat === reqMat);
        for (const item of batchItems) {
          await updateAutomacaoField(item.rowIndex, 'E', newStatus);
        }
        // Atualizar estado local
        setRequests(prev =>
          prev.map(req =>
            req.reqMat === reqMat
              ? { ...req, statusAutomacao: newStatus }
              : req
          )
        );
      } else {
        // Atualizar apenas o item individual
        await updateAutomacaoField(rowIndex, 'E', newStatus);
        setRequests(prev =>
          prev.map(req =>
            req.rowIndex === rowIndex
              ? { ...req, statusAutomacao: newStatus }
              : req
          )
        );
      }
      setEditingCell(null);
    } catch (err) {
      setError('Erro ao atualizar status.');
      console.error(err);
    }
  };

  const handleNewItemRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      setLoading(true);
      
      const dataNecessidade = formData.get('dataNecessidade') as string;
      const dataNecessidadeBR = dataNecessidade ? new Date(dataNecessidade).toLocaleDateString('pt-BR') : '';
      
      await addNewRequest({
        statusAutomacao: (formData.get('statusAutomacao') as string) || 'COMPRAR NORMAL',
        reqMat: (formData.get('reqMat') as string) || '',
        dataAutomacao: new Date().toLocaleDateString('pt-BR'),
        projeto: (formData.get('projeto') as string) || '',
        codRef: (formData.get('codRef') as string) || '',
        descricaoProduto: (formData.get('descricaoProduto') as string) || '',
        materialMarca: (formData.get('materialMarca') as string) || '',
        qtde: (formData.get('qtde') as string) || '',
        dataNecessidade: dataNecessidadeBR,
        orcamentoLink: (formData.get('orcamentoLink') as string) || '',
        solicitante: user?.email || '',
        observacao: (formData.get('observacao') as string) || ''
      });

      await loadData();
      setShowFormType('none');
      setError(null);
    } catch (err) {
      setError('Erro ao criar solicitação.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewBatchRequest = async (sharedData: any, products: any[]) => {
    try {
      setLoading(true);
      await addBatchRequest(sharedData, products);
      await loadData();
      setShowFormType('none');
      setError(null);
    } catch (err) {
      setError('Erro ao criar lote.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleBatchExpansion = (reqMat: string) => {
    setExpandedBatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reqMat)) {
        newSet.delete(reqMat);
      } else {
        newSet.add(reqMat);
      }
      return newSet;
    });
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

  // Aplicar filtros
  const filteredGroups = Object.entries(groupedRequests).filter(([key, items]) => {
    const firstItem = items[0];
    
    // Filtro de status
    if (filterStatus !== 'TODOS' && firstItem.statusCompras !== filterStatus) return false;
    
    // Busca por texto
    if (searchText) {
      const search = searchText.toLowerCase();
      return items.some(item =>
        item.descricaoProduto?.toLowerCase().includes(search) ||
        item.codRef?.toLowerCase().includes(search) ||
        item.projeto?.toLowerCase().includes(search) ||
        item.solicitante?.toLowerCase().includes(search) ||
        item.reqMat?.toLowerCase().includes(search)
      );
    }
    
    return true;
  }).sort(([, itemsA], [, itemsB]) => {
    // Ordenar por urgência
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
    minhasSolicitacoes: requests.filter(r => r.solicitante === user?.email).length
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                🔧 Setor de Engenharia
              </h1>
              <p className="text-green-100 mt-1">{user?.email}</p>
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
            <p className="text-gray-600 text-sm">Total Itens</p>
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
          <div className="bg-indigo-50 rounded-lg shadow p-4 border border-indigo-200">
            <p className="text-indigo-600 text-sm font-medium">Minhas</p>
            <p className="text-2xl font-bold text-indigo-700">{stats.minhasSolicitacoes}</p>
          </div>
        </div>

        {/* Botões de Nova Solicitação */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex gap-2">
              <button
                onClick={() => setShowFormType(showFormType === 'item' ? 'none' : 'item')}
                className={`px-6 py-3 rounded-lg transition font-semibold text-lg shadow-md ${
                  showFormType === 'item'
                    ? 'bg-gray-400 text-white'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {showFormType === 'item' ? '✕ Cancelar' : '📦 Solicitar Item'}
              </button>
              <button
                onClick={() => setShowFormType(showFormType === 'lote' ? 'none' : 'lote')}
                className={`px-6 py-3 rounded-lg transition font-semibold text-lg shadow-md ${
                  showFormType === 'lote'
                    ? 'bg-gray-400 text-white'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {showFormType === 'lote' ? '✕ Cancelar' : '📦 Solicitar Lote'}
              </button>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="🔍 Buscar por item, código, REQ MAT, projeto..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="COMPRAR">Comprar</option>
              <option value="ORÇAMENTO">Orçamento</option>
              <option value="COMPRADO">Comprado</option>
            </select>

            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-medium"
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

        {/* Formulário de Item Individual */}
        {showFormType === 'item' && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-2 border-green-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              📝 Solicitar Item Individual
            </h2>
            <form onSubmit={handleNewItemRequest} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mesmos campos do formulário anterior */}
              <div>
                <label htmlFor="statusAutomacao" className="block text-sm font-medium mb-1">
                  Prioridade <span className="text-red-600">*</span>
                </label>
                <select
                  id="statusAutomacao"
                  name="statusAutomacao"
                  defaultValue="COMPRAR NORMAL"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  {STATUS_AUTOMACAO_OPTIONS.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="dataNecessidade" className="block text-sm font-medium mb-1">
                  Data Necessidade <span className="text-red-600">*</span>
                </label>
                <input
                  id="dataNecessidade"
                  type="date"
                  name="dataNecessidade"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="descricaoProduto" className="block text-sm font-medium mb-1">
                  Descrição do Produto <span className="text-red-600">*</span>
                </label>
                <input
                  id="descricaoProduto"
                  type="text"
                  name="descricaoProduto"
                  required
                  placeholder="Ex: Parafuso M8 x 20mm aço inox"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label htmlFor="codRef" className="block text-sm font-medium mb-1">
                  Código/Referência
                </label>
                <input
                  id="codRef"
                  type="text"
                  name="codRef"
                  placeholder="Ex: AC20340500"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label htmlFor="qtde" className="block text-sm font-medium mb-1">
                  Quantidade <span className="text-red-600">*</span>
                </label>
                <input
                  id="qtde"
                  type="text"
                  name="qtde"
                  required
                  placeholder="Ex: 50"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label htmlFor="materialMarca" className="block text-sm font-medium mb-1">
                  Material/Marca
                </label>
                <input
                  id="materialMarca"
                  type="text"
                  name="materialMarca"
                  placeholder="Ex: Aço inox / TASCO"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label htmlFor="projeto" className="block text-sm font-medium mb-1">
                  Projeto
                </label>
                <input
                  id="projeto"
                  type="text"
                  name="projeto"
                  placeholder="Ex: CHÃO DE FÁBRICA"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label htmlFor="reqMat" className="block text-sm font-medium mb-1">
                  REQ MAT (opcional)
                </label>
                <input
                  id="reqMat"
                  type="text"
                  name="reqMat"
                  placeholder="Deixe vazio para item individual"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="orcamentoLink" className="block text-sm font-medium mb-1">
                  Orçamento (Link ou Informação)
                </label>
                <input
                  id="orcamentoLink"
                  type="text"
                  name="orcamentoLink"
                  placeholder="Cole o link ou escreva 'Orçamento no email', 'Ver pasta X', etc."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="observacao" className="block text-sm font-medium mb-1">
                  Observação
                </label>
                <textarea
                  id="observacao"
                  name="observacao"
                  rows={3}
                  placeholder="Informações adicionais..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                ></textarea>
              </div>

              <div className="md:col-span-2 bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>📧 Solicitante:</strong> {user?.email}
                </p>
              </div>

              <div className="md:col-span-2 flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition font-semibold"
                >
                  {loading ? '⟳ Criando...' : '✓ Criar Solicitação'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowFormType('none')}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Formulário de Lote */}
        {showFormType === 'lote' && (
          <FormularioLote
            userEmail={user?.email || ''}
            onSubmit={handleNewBatchRequest}
            onCancel={() => setShowFormType('none')}
            loading={loading}
          />
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
              const isMinhaSolicitacao = firstItem.solicitante === user?.email;
              const isExpanded = expandedBatches.has(firstItem.reqMat);
              
              return (
                <div
                  key={groupKey}
                  className={`bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow border-l-4 ${
                    isMinhaSolicitacao ? 'ring-2 ring-purple-300' : ''
                  }`}
                  style={{
                    borderLeftColor:
                      firstItem.statusCompras === 'COMPRADO' ? '#16a34a' :
                      firstItem.statusCompras === 'ORÇAMENTO' ? '#eab308' :
                      firstItem.statusCompras === 'COMPRAR' ? '#3b82f6' :
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
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusComprasColor(firstItem.statusCompras)}`}>
                            📦 {firstItem.statusCompras || 'PENDENTE'}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusAutomacaoColor(firstItem.statusAutomacao)}`}>
                            🔧 {firstItem.statusAutomacao || 'SEM STATUS'}
                          </span>
                          <span className={`text-sm font-semibold ${urgency.color}`}>
                            ⏱ {urgency.label}
                          </span>
                          {isMinhaSolicitacao && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded">
                              👤 MINHA
                            </span>
                          )}
                        </div>
                        
                        {isLoteGroup ? (
                          <div>
                            <h3 className="text-lg font-bold text-gray-800">
                              REQ MAT: {firstItem.reqMat}
                            </h3>
                            <p className="text-sm text-gray-600">{firstItem.projeto || 'Sem projeto'}</p>
                            <button
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

                    {/* Informações Principais do Lote ou Item */}
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
                          <p className="font-semibold text-gray-800 text-xs">{firstItem.solicitante || '-'}</p>
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

                    {/* Lista de Produtos do Lote (quando expandido) */}
                    {isLoteGroup && isExpanded && (
                      <div className="mb-4 space-y-3">
                        {items.map((item, idx) => (
                          <div key={item.rowIndex} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
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

                    {/* Material/Marca (apenas para item individual) */}
                    {!isLoteGroup && firstItem.materialMarca && (
                      <div className="mb-3">
                        <p className="text-gray-500 text-xs">Material/Marca</p>
                        <p className="text-sm text-gray-700">{firstItem.materialMarca}</p>
                      </div>
                    )}

                    {/* Status de Compras - Informações adicionais */}
                    {(firstItem.ordemCompra || firstItem.previsaoChegada) && (
                      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-700 font-semibold mb-2">📋 Informações de Compras:</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {firstItem.ordemCompra && (
                            <div>
                              <p className="text-blue-600 text-xs">Ordem de Compra</p>
                              <p className="font-semibold text-blue-900">{firstItem.ordemCompra}</p>
                            </div>
                          )}
                          {firstItem.previsaoChegada && (
                            <div>
                              <p className="text-blue-600 text-xs">Previsão Chegada</p>
                              <p className="font-semibold text-blue-900">{firstItem.previsaoChegada}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Link/Info Orçamento */}
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

                    {/* Editar Status */}
                    <div className="border-t pt-4">
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <label className="text-xs text-green-700 font-semibold block mb-1">
                          🔧 Atualizar Status {isLoteGroup ? '(aplica a todo o lote)' : ''}
                        </label>
                        {editingCell?.rowIndex === firstItem.rowIndex && editingCell?.field === 'E' ? (
                          <select
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => handleStatusUpdate(firstItem.rowIndex, firstItem.reqMat, isLoteGroup, tempValue)}
                            autoFocus
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                          >
                            {STATUS_AUTOMACAO_OPTIONS.map(status => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingCell({ rowIndex: firstItem.rowIndex, field: 'E' });
                              setTempValue(firstItem.statusAutomacao);
                            }}
                            className="w-full px-3 py-2 border border-green-300 bg-white rounded-lg hover:bg-green-50 text-left text-sm font-medium"
                          >
                            {firstItem.statusAutomacao || 'Clique para definir'}
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

export default DashboardEngenharia;