// src/App.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { getUserDepartmentFromFirestore } from './services/userService';
import Login from './components/Auth/Login';
import DashboardCompras from './components/Dashboard/DashboardCompras';
import DashboardEngenharia from './components/Dashboard/DashboardEngenharia';
import AdminPanel from './components/Admin/AdminPanel';
import type { Department } from './utils/permissions';
import './index.css';

function App() {
  const { user, loading } = useAuth();
  const [userDepartment, setUserDepartment] = useState<Department | 'ADM' | null>(null);
  const [loadingDepartment, setLoadingDepartment] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserDepartment = async () => {
      if (!user?.email) return;

      try {
        setLoadingDepartment(true);
        const department = await getUserDepartmentFromFirestore(user.email);
        
        if (!department) {
          setError('Usuário não autorizado. Contacte o administrador.');
        } else {
          setUserDepartment(department);
          setError(null);
        }
      } catch (err) {
        setError('Erro ao carregar permissões do usuário.');
        console.error(err);
      } finally {
        setLoadingDepartment(false);
      }
    };

    fetchUserDepartment();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se NÃO tem usuário, mostra Login (ANTES de verificar departamento)
  if (!user) {
    return <Login />;
  }

  // Só DEPOIS que tem usuário, carrega o departamento
  if (loadingDepartment) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando permissões...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <p className="text-sm text-gray-500">Email: {user.email}</p>
        </div>
      </div>
    );
  }

  // Renderiza o dashboard correto baseado no departamento
  if (userDepartment === 'ADM') {
    return <AdminPanel />;
  }

  if (userDepartment === 'COMPRAS') {
    return <DashboardCompras department={userDepartment} />;
  }

  if (userDepartment === 'ENGENHARIA') {
    return <DashboardEngenharia department={userDepartment} />;
  }

  // Se chegou aqui, departamento não foi reconhecido
  return (
    <div className="flex items-center justify-center min-h-screen bg-red-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Erro</h1>
        <p className="text-gray-700 mb-6">Departamento não reconhecido: {userDepartment}</p>
        <p className="text-sm text-gray-500">Email: {user.email}</p>
      </div>
    </div>
  );
}

export default App;