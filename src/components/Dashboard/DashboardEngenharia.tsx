// src/components/Dashboard/DashboardEngenharia.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { fetchSolicitations, updateAutomacaoField, addNewRequest } from '../../services/sheetsService';

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
  const [showForm, setShowForm] = useState(false);
  
  // Filtros
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [searchText, setSearchText] = useState('');

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
      setLoading(true);
      
      // Converter data para formato BR se necessário
      const dataNecessidade = formData.get('dataNecessidade') as string;
      const dataNecessidadeBR = dataNecessidade ? new Date(dataNecessidade).toLocaleDateString('pt-BR') : '';
      
      const newReq = await addNewRequest({
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

      await loadData(); // Recarregar para pegar o novo item
      setShowForm(false);
      setError(null);
    } catch (err) {
      setError('Erro ao criar solicitação.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtros
  const filteredRequests = requests.filter(req => {
    // Filtro de status
    if (filterStatus !== 'TODOS' && req.statusCompras !== filterStatus) return false;
    
    // Busca por texto
    if (searchText) {
      const search = searchText.toLowerCase();
      return (
        req.descricaoProduto?.toLowerCase().includes(search) ||
        req.codRef?.toLowerCase().includes(search) ||
        req.projeto?.toLowerCase().includes(search) ||
        req.solicitante?.toLowerCase().includes(search)
      );
    }
    
    return true;
  }).sort((a, b) => {
    // Ordenar por data de necessidade (mais urgente primeiro)
    const urgA = calculateUrgency(a.dataAutomacao, a.dataNecessidade).days;
    const urgB = calculateUrgency(b.dataAutomacao, b.dataNecessidade).days;
    return urgA - urgB;
  });

  const stats = {
    total: requests.length,
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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
          <div className="bg-purple-50 rounded-lg shadow p-4 border border-purple-200">
            <p className="text-purple-600 text-sm font-medium">Minhas Solicitações</p>
            <p className="text-2xl font-bold text-purple-700">{stats.minhasSolicitacoes}</p>
          </div>
        </div>

        {/* Botão Nova Solicitação + Filtros */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold text-lg shadow-md"
            >
              {showForm ? '✕ Cancelar' : '+ Nova Solicitação'}
            </button>
            
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="🔍 Buscar por item, código, projeto..."
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

        {/* Formulário de Nova Solicitação */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-2 border-green-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              📝 Nova Solicitação
            </h2>
            <form onSubmit={handleNewRequest} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  REQ. MAT.
                </label>
                <input
                  id="reqMat"
                  type="text"
                  name="reqMat"
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
                <p className="text-xs text-gray-500 mt-1">
                  💡 Pode ser um link direto ou uma descrição como "Orçamento no email"
                </p>
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
                <p className="text-xs text-blue-600 mt-1">
                  Seu email será automaticamente registrado na solicitação
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
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </form>
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
              const isMinhaSolicitacao = req.solicitante === user?.email;
              
              return (
                <div
                  key={req.rowIndex}
                  className={`bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow border-l-4 ${
                    isMinhaSolicitacao ? 'ring-2 ring-purple-300' : ''
                  }`}
                  style={{
                    borderLeftColor:
                      req.statusCompras === 'COMPRADO' ? '#16a34a' :
                      req.statusCompras === 'ORÇAMENTO' ? '#eab308' :
                      req.statusCompras === 'COMPRAR' ? '#3b82f6' :
                      '#6b7280'
                  }}
                >
                  <div className="p-5">
                    {/* Header do Card */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {/* Status de Compras (informado pelo setor de compras) */}
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusComprasColor(req.statusCompras)}`}>
                            📦 {req.statusCompras || 'PENDENTE'}
                          </span>
                          {/* Status da Engenharia (editável) */}
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusAutomacaoColor(req.statusAutomacao)}`}>
                            🔧 {req.statusAutomacao || 'SEM STATUS'}
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
                        <p className="font-semibold text-gray-800 text-xs">{req.solicitante || '-'}</p>
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

                    {/* Status de Compras - Informações adicionais */}
                    {(req.ordemCompra || req.previsaoChegada) && (
                      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-700 font-semibold mb-2">📋 Informações de Compras:</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {req.ordemCompra && (
                            <div>
                              <p className="text-blue-600 text-xs">Ordem de Compra</p>
                              <p className="font-semibold text-blue-900">{req.ordemCompra}</p>
                            </div>
                          )}
                          {req.previsaoChegada && (
                            <div>
                              <p className="text-blue-600 text-xs">Previsão Chegada</p>
                              <p className="font-semibold text-blue-900">{req.previsaoChegada}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Link/Info Orçamento */}
                    {req.orcamentoLink && (
                      <div className="mb-4">
                        {req.orcamentoLink.startsWith('http') ? (
                          <a
                            href={req.orcamentoLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center gap-1"
                          >
                            🔗 Ver Orçamento →
                          </a>
                        ) : (
                          <div className="p-2 bg-gray-50 border border-gray-200 rounded">
                            <p className="text-xs text-gray-600">Orçamento:</p>
                            <p className="text-sm text-gray-800 font-medium">{req.orcamentoLink}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Observação */}
                    {req.observacao && (
                      <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-xs text-yellow-800 font-medium">💬 Observação:</p>
                        <p className="text-sm text-yellow-900">{req.observacao}</p>
                      </div>
                    )}

                    {/* Editar Status */}
                    <div className="border-t pt-4">
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <label className="text-xs text-green-700 font-semibold block mb-1">
                          🔧 Atualizar Status (seu controle)
                        </label>
                        {editingCell?.rowIndex === req.rowIndex && editingCell?.field === 'E' ? (
                          <select
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onBlur={() => handleStatusUpdate(req.rowIndex, tempValue)}
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
                              setEditingCell({ rowIndex: req.rowIndex, field: 'E' });
                              setTempValue(req.statusAutomacao);
                            }}
                            className="w-full px-3 py-2 border border-green-300 bg-white rounded-lg hover:bg-green-50 text-left text-sm font-medium"
                          >
                            {req.statusAutomacao || 'Clique para definir'}
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