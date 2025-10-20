// src/components/Dashboard/DepartmentSelector.tsx
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { Department } from '../../utils/permissions';

interface DepartmentSelectorProps {
  onSelect: (department: Department) => void;
}

export const DepartmentSelector: React.FC<DepartmentSelectorProps> = ({ onSelect }) => {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Almeida&Camargo</h1>
          <p className="text-gray-600">Selecione seu departamento</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => onSelect('COMPRAS')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 transform hover:scale-105"
          >
            <div className="text-2xl mb-2">📦</div>
            <div>Setor de Compras</div>
            <div className="text-sm font-normal mt-1 opacity-90">Gerenciar pedidos e orçamentos</div>
          </button>

          <button
            onClick={() => onSelect('ENGENHARIA')}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 transform hover:scale-105"
          >
            <div className="text-2xl mb-2">⚙️</div>
            <div>Engenharia/Automação</div>
            <div className="text-sm font-normal mt-1 opacity-90">Criar e acompanhar solicitações</div>
          </button>
        </div>

        <button
          onClick={logout}
          className="w-full mt-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition"
        >
          Sair
        </button>
      </div>
    </div>
  );
};

export default DepartmentSelector;