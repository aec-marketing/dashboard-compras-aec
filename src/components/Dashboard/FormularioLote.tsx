// src/components/Dashboard/FormularioLote.tsx
import React, { useState } from 'react';

interface Product {
  id: string;
  codRef: string;
  descricaoProduto: string;
  materialMarca: string;
  qtde: string;
  observacao: string;
}

interface FormularioLoteProps {
  userEmail: string;
  onSubmit: (sharedData: any, products: any[]) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export const FormularioLote: React.FC<FormularioLoteProps> = ({
  userEmail,
  onSubmit,
  onCancel,
  loading
}) => {
  const [products, setProducts] = useState<Product[]>([
    { id: '1', codRef: '', descricaoProduto: '', materialMarca: '', qtde: '', observacao: '' }
  ]);

  const addProduct = () => {
    const newId = (Math.max(...products.map(p => parseInt(p.id))) + 1).toString();
    setProducts([
      ...products,
      { id: newId, codRef: '', descricaoProduto: '', materialMarca: '', qtde: '', observacao: '' }
    ]);
  };

  const removeProduct = (id: string) => {
    if (products.length > 1) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const updateProduct = (id: string, field: keyof Product, value: string) => {
    setProducts(products.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Dados compartilhados
    const sharedData = {
      reqMat: (formData.get('reqMat') as string) || '',
      statusAutomacao: (formData.get('statusAutomacao') as string) || 'COMPRAR NORMAL',
      dataAutomacao: new Date().toLocaleDateString('pt-BR'),
      projeto: (formData.get('projeto') as string) || '',
      dataNecessidade: formData.get('dataNecessidade')
        ? new Date(formData.get('dataNecessidade') as string).toLocaleDateString('pt-BR')
        : '',
      orcamentoLink: (formData.get('orcamentoLink') as string) || '',
      solicitante: userEmail
    };

    // Validações
    if (!sharedData.reqMat) {
      alert('Por favor, preencha o código REQ MAT para identificar o lote');
      return;
    }

    if (!sharedData.dataNecessidade) {
      alert('Por favor, preencha a data de necessidade');
      return;
    }

    const validProducts = products.filter(p => p.descricaoProduto && p.qtde);
    if (validProducts.length === 0) {
      alert('Adicione pelo menos um produto com descrição e quantidade');
      return;
    }

    await onSubmit(sharedData, validProducts);
  };

  const generateSuggestedReqMat = () => {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const initials = userEmail.split('@')[0].substring(0, 3).toUpperCase();
    return `REQ-${day}${month}-${initials}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-green-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        📦 Solicitar Lote de Produtos
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seção: Dados Compartilhados */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            📋 Dados do Lote (válidos para todos os produtos)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="reqMat" className="block text-sm font-medium mb-1">
                REQ MAT (Código do Lote) <span className="text-red-600">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="reqMat"
                  type="text"
                  name="reqMat"
                  required
                  placeholder="Ex: REQ-2401-PROJ ou CHAO-FAB-01"
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 font-mono"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    const input = document.getElementById('reqMat') as HTMLInputElement;
                    input.value = generateSuggestedReqMat();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap"
                >
                  💡 Sugerir
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Este código identificará todos os produtos deste lote. Sugestão: PROJETO-DATA-INICIAIS
              </p>
            </div>

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
                <option value="COMPRAR NORMAL">COMPRAR NORMAL</option>
                <option value="COMPRAR URGENTE">COMPRAR URGENTE</option>
                <option value="URGENTÍSSIMO">URGENTÍSSIMO</option>
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
              <label htmlFor="orcamentoLink" className="block text-sm font-medium mb-1">
                Orçamento (Link ou Informação)
              </label>
              <input
                id="orcamentoLink"
                type="text"
                name="orcamentoLink"
                placeholder="Link ou 'Orçamento no email'"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="md:col-span-2 bg-purple-50 p-3 rounded border border-purple-200">
              <p className="text-sm text-purple-800">
                <strong>📧 Solicitante:</strong> {userEmail}
              </p>
            </div>
          </div>
        </div>

        {/* Seção: Lista de Produtos */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-green-900">
              📦 Produtos do Lote ({products.length})
            </h3>
            <button
              type="button"
              onClick={addProduct}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm"
            >
              + Adicionar Produto
            </button>
          </div>

          <div className="space-y-4">
            {products.map((product, index) => (
              <div
                key={product.id}
                className="bg-white p-4 rounded-lg border-2 border-green-300 relative"
              >
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  <span className="text-sm font-bold text-green-700">#{index + 1}</span>
                  {products.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProduct(product.id)}
                      className="text-red-600 hover:text-red-800 font-bold text-xl"
                      title="Remover produto"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">
                      Descrição do Produto <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={product.descricaoProduto}
                      onChange={(e) => updateProduct(product.id, 'descricaoProduto', e.target.value)}
                      placeholder="Ex: Parafuso M8 x 20mm aço inox"
                      required
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Código/Referência</label>
                    <input
                      type="text"
                      value={product.codRef}
                      onChange={(e) => updateProduct(product.id, 'codRef', e.target.value)}
                      placeholder="Ex: AC20340500"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Quantidade <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={product.qtde}
                      onChange={(e) => updateProduct(product.id, 'qtde', e.target.value)}
                      placeholder="Ex: 50"
                      required
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Material/Marca</label>
                    <input
                      type="text"
                      value={product.materialMarca}
                      onChange={(e) => updateProduct(product.id, 'materialMarca', e.target.value)}
                      placeholder="Ex: Aço inox / TASCO"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Observação</label>
                    <input
                      type="text"
                      value={product.observacao}
                      onChange={(e) => updateProduct(product.id, 'observacao', e.target.value)}
                      placeholder="Informação adicional deste produto"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition font-semibold text-lg"
          >
            {loading ? '⟳ Criando Lote...' : `✓ Criar Lote (${products.length} produtos)`}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-semibold"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormularioLote;