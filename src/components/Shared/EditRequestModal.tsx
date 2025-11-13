import React, { useState, useEffect } from 'react';
import { RequestRow } from '../../services/sheetsService';

interface EditRequestModalProps {
  request: RequestRow;
  userEmail: string;
  onClose: () => void;
  onSave: (updatedRequest: Partial<RequestRow>) => Promise<void>;
  isOwner: boolean; // Se o usuário é o solicitante
}

const EditRequestModal: React.FC<EditRequestModalProps> = ({
  request,
  userEmail,
  onClose,
  onSave,
  isOwner
}) => {
  const [formData, setFormData] = useState<Partial<RequestRow>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Inicializar com os dados atuais da solicitação
    setFormData({
      statusAutomacao: request.statusAutomacao,
      projeto: request.projeto,
      codRef: request.codRef,
      descricaoProduto: request.descricaoProduto,
      materialMarca: request.materialMarca,
      qtde: request.qtde,
      dataNecessidade: request.dataNecessidade,
      orcamentoLink: request.orcamentoLink,
      observacao: request.observacao
    });
  }, [request]);

  const handleChange = (field: keyof RequestRow, value: string) => {
    setFormData((prev: Partial<RequestRow>) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOwner) {
      setError('Você não tem permissão para editar esta solicitação');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError('Erro ao salvar alterações. Tente novamente.');
      console.error('Erro ao salvar:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions = [
    'COMPRAR URGENTE',
    'COMPRAR NORMAL',
    'RECEBIDO',
    'CANCELAR',
    'ESTOQUE'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-lg">
          <h2 className="text-2xl font-bold">Editar Solicitação</h2>
          <p className="text-sm mt-1 opacity-90">
            Solicitante: {request.solicitante}
          </p>
          {!isOwner && (
            <div className="mt-2 bg-red-500 bg-opacity-20 border border-red-300 rounded p-2">
              <p className="text-sm">⚠️ Você não é o solicitante desta requisição</p>
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

          <div className="space-y-4">
            {/* Status Automação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.statusAutomacao || ''}
                onChange={(e) => handleChange('statusAutomacao', e.target.value)}
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
                value={formData.projeto || ''}
                onChange={(e) => handleChange('projeto', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={!isOwner}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Código/Referência */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código/Referência <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.codRef || ''}
                  onChange={(e) => handleChange('codRef', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={!isOwner}
                  required
                />
              </div>

              {/* Quantidade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.qtde || ''}
                  onChange={(e) => handleChange('qtde', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={!isOwner}
                  required
                />
              </div>
            </div>

            {/* Descrição do Produto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição do Produto <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.descricaoProduto || ''}
                onChange={(e) => handleChange('descricaoProduto', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={!isOwner}
                required
              />
            </div>

            {/* Material/Marca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Material/Marca
              </label>
              <input
                type="text"
                value={formData.materialMarca || ''}
                onChange={(e) => handleChange('materialMarca', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={!isOwner}
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
                  value={formData.dataNecessidade || ''}
                  onChange={(e) => handleChange('dataNecessidade', e.target.value)}
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
                  value={formData.orcamentoLink || ''}
                  onChange={(e) => handleChange('orcamentoLink', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={!isOwner}
                />
              </div>
            </div>

            {/* Observação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações
              </label>
              <textarea
                value={formData.observacao || ''}
                onChange={(e) => handleChange('observacao', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={!isOwner}
              />
            </div>
          </div>

          {/* Informações de Auditoria */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Informações da Solicitação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
              <div>
                <span className="font-medium">REQ MAT:</span> {request.reqMat || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Data Solicitação:</span> {request.dataAutomacao}
              </div>
              <div className="md:col-span-2">
                <span className="font-medium">Última Modificação:</span>{' '}
                {request.ultimaModificacao ?
                  (() => {
                    const [timestamp, email] = request.ultimaModificacao.split('|');
                    const date = new Date(timestamp);
                    return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')} - ${email}`;
                  })()
                  : 'N/A'
                }
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
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
              {isLoading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRequestModal;
