import React, { useState, useEffect } from 'react';
import { RequestRow } from '../../services/sheetsService';

interface BatchProduct {
  rowIndex: number;
  codRef: string;
  descricaoProduto: string;
  materialMarca: string;
  qtde: string;
  observacao: string;
  isNew?: boolean; // Flag para produtos novos
  isDeleted?: boolean; // Flag para produtos removidos
}

interface EditBatchModalProps {
  batchItems: RequestRow[]; // Todos os itens do lote
  userEmail: string;
  onClose: () => void;
  onSave: (
    sharedData: Partial<RequestRow>,
    products: BatchProduct[]
  ) => Promise<void>;
  isOwner: boolean; // Se o usuário é o solicitante
}

const EditBatchModal: React.FC<EditBatchModalProps> = ({
  batchItems,
  userEmail,
  onClose,
  onSave,
  isOwner
}) => {
  const firstItem = batchItems[0];

  // Dados compartilhados do lote
  const [sharedData, setSharedData] = useState({
    statusAutomacao: firstItem.statusAutomacao,
    projeto: firstItem.projeto,
    dataNecessidade: firstItem.dataNecessidade,
    orcamentoLink: firstItem.orcamentoLink
  });

  // Produtos do lote
  const [products, setProducts] = useState<BatchProduct[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);

  useEffect(() => {
    // Inicializar produtos a partir dos itens do lote
    setProducts(
      batchItems.map(item => ({
        rowIndex: item.rowIndex,
        codRef: item.codRef,
        descricaoProduto: item.descricaoProduto,
        materialMarca: item.materialMarca,
        qtde: item.qtde,
        observacao: item.observacao,
        isNew: false,
        isDeleted: false
      }))
    );
  }, [batchItems]);

  const handleSharedDataChange = (field: string, value: string) => {
    setSharedData(prev => ({ ...prev, [field]: value }));
  };

  const handleProductChange = (index: number, field: keyof BatchProduct, value: string) => {
    setProducts(prev =>
      prev.map((product, i) =>
        i === index ? { ...product, [field]: value } : product
      )
    );
  };

  const handleAddProduct = () => {
    setProducts(prev => [
      ...prev,
      {
        rowIndex: -1, // Temporário para produtos novos
        codRef: '',
        descricaoProduto: '',
        materialMarca: '',
        qtde: '',
        observacao: '',
        isNew: true,
        isDeleted: false
      }
    ]);
  };

  const handleToggleDeleteProduct = (index: number) => {
    setProducts(prev =>
      prev.map((product, i) =>
        i === index ? { ...product, isDeleted: !product.isDeleted } : product
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOwner) {
      setError('Você não tem permissão para editar este lote');
      return;
    }

    // Validar produtos ativos
    const activeProducts = products.filter(p => !p.isDeleted);
    if (activeProducts.length === 0) {
      setError('O lote deve ter pelo menos um produto ativo');
      return;
    }

    // Validar campos obrigatórios dos produtos
    for (const product of activeProducts) {
      if (!product.codRef || !product.descricaoProduto || !product.qtde) {
        setError('Todos os produtos devem ter Código/Ref, Descrição e Quantidade');
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave(sharedData, products);
      onClose();
    } catch (err) {
      setError('Erro ao salvar alterações. Tente novamente.');
      console.error('Erro ao salvar lote:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions = [
    'COMPRAR URGENTE',
    'COMPRAR NORMAL',
    'URGENTÍSSIMO',
    'RECEBIDO',
    'CANCELAR',
    'ESTOQUE'
  ];

  const activeProductsCount = products.filter(p => !p.isDeleted).length;
  const newProductsCount = products.filter(p => p.isNew && !p.isDeleted).length;
  const deletedProductsCount = products.filter(p => p.isDeleted && !p.isNew).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">Editar Lote</h2>
              <p className="text-sm mt-1 opacity-90">
                REQ MAT: {firstItem.reqMat} • {batchItems.length} itens originais
              </p>
              <p className="text-xs mt-1 opacity-80">
                Solicitante: {firstItem.solicitante}
              </p>
            </div>
            <div className="text-right text-sm">
              <div className="bg-white bg-opacity-20 rounded px-3 py-1 mb-1">
                ✅ {activeProductsCount} ativos
              </div>
              {newProductsCount > 0 && (
                <div className="bg-green-500 bg-opacity-30 rounded px-3 py-1 mb-1">
                  ➕ {newProductsCount} novos
                </div>
              )}
              {deletedProductsCount > 0 && (
                <div className="bg-red-500 bg-opacity-30 rounded px-3 py-1">
                  🗑️ {deletedProductsCount} removidos
                </div>
              )}
            </div>
          </div>
          {!isOwner && (
            <div className="mt-3 bg-red-500 bg-opacity-20 border border-red-300 rounded p-2">
              <p className="text-sm">⚠️ Você não é o solicitante deste lote</p>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Dados Compartilhados */}
          <div className="mb-6 bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
            <h3 className="text-lg font-bold text-purple-900 mb-3 flex items-center gap-2">
              📋 Dados Compartilhados do Lote
              <span className="text-xs font-normal text-purple-600">(afeta todos os itens)</span>
            </h3>

            <div className="space-y-4">
              {/* Status Automação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={sharedData.statusAutomacao || ''}
                  onChange={(e) => handleSharedDataChange('statusAutomacao', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={!isOwner}
                  required
                >
                  <option value="">Selecione...</option>
                  {statusOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              {/* Projeto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Projeto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={sharedData.projeto || ''}
                  onChange={(e) => handleSharedDataChange('projeto', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={!isOwner}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Data Necessidade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Necessidade <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={sharedData.dataNecessidade || ''}
                    onChange={(e) => handleSharedDataChange('dataNecessidade', e.target.value)}
                    placeholder="dd/mm/aaaa"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={!isOwner}
                    required
                  />
                </div>

                {/* Link Orçamento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link do Orçamento
                  </label>
                  <input
                    type="text"
                    value={sharedData.orcamentoLink || ''}
                    onChange={(e) => handleSharedDataChange('orcamentoLink', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={!isOwner}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Produtos */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                📦 Produtos do Lote
              </h3>
              {isOwner && (
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  ➕ Adicionar Produto
                </button>
              )}
            </div>

            <div className="space-y-3">
              {products.map((product, index) => (
                <div
                  key={index}
                  className={`border-2 rounded-lg p-4 transition-all ${
                    product.isDeleted
                      ? 'bg-red-50 border-red-300 opacity-60'
                      : product.isNew
                      ? 'bg-green-50 border-green-300'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  {/* Header do Produto */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-700">#{index + 1}</span>
                      {product.isNew && (
                        <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded">
                          NOVO
                        </span>
                      )}
                      {product.isDeleted && (
                        <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded">
                          REMOVIDO
                        </span>
                      )}
                      {!product.isDeleted && (
                        <button
                          type="button"
                          onClick={() => setExpandedProduct(expandedProduct === index ? null : index)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          {expandedProduct === index ? '▼ Ocultar' : '▶ Editar'}
                        </button>
                      )}
                    </div>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleToggleDeleteProduct(index)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          product.isDeleted
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                      >
                        {product.isDeleted ? '↩️ Restaurar' : '🗑️ Remover'}
                      </button>
                    )}
                  </div>

                  {/* Preview do Produto (sempre visível) */}
                  <div className="text-sm text-gray-700 mb-2">
                    <p className="font-semibold">{product.descricaoProduto || 'Sem descrição'}</p>
                    <p className="text-xs text-gray-500">
                      {product.codRef || 'Sem código'} • Qtd: {product.qtde || '0'}
                    </p>
                  </div>

                  {/* Formulário Expandido */}
                  {expandedProduct === index && !product.isDeleted && (
                    <div className="space-y-3 mt-3 pt-3 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Código/Referência <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={product.codRef}
                            onChange={(e) => handleProductChange(index, 'codRef', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={!isOwner}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Quantidade <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={product.qtde}
                            onChange={(e) => handleProductChange(index, 'qtde', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={!isOwner}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Descrição do Produto <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={product.descricaoProduto}
                          onChange={(e) => handleProductChange(index, 'descricaoProduto', e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={!isOwner}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Material/Marca
                        </label>
                        <input
                          type="text"
                          value={product.materialMarca}
                          onChange={(e) => handleProductChange(index, 'materialMarca', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={!isOwner}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Observações
                        </label>
                        <textarea
                          value={product.observacao}
                          onChange={(e) => handleProductChange(index, 'observacao', e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={!isOwner}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Informações de Auditoria */}
          <div className="mb-6 bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Informações do Lote</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
              <div>
                <span className="font-medium">REQ MAT:</span> {firstItem.reqMat}
              </div>
              <div>
                <span className="font-medium">Data Solicitação:</span> {firstItem.dataAutomacao}
              </div>
              <div className="md:col-span-2">
                <span className="font-medium">Última Modificação:</span>{' '}
                {firstItem.ultimaModificacao ?
                  (() => {
                    const [timestamp, email] = firstItem.ultimaModificacao.split('|');
                    const date = new Date(timestamp);
                    return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')} - ${email}`;
                  })()
                  : 'N/A'
                }
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isOwner || isLoading}
              className={`px-6 py-2 rounded-md text-white font-medium transition-colors ${
                isOwner && !isLoading
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Salvando...' : 'Salvar Todas as Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBatchModal;
