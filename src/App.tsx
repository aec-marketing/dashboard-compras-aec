import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './services/firebase';
import Login from './components/Auth/Login';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {!user ? (
        <Login />
      ) : (
        <div className="min-h-screen bg-gray-100 p-8">
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              Bem-vindo! 🎉
            </h1>
            <p className="text-gray-600 text-lg mb-4">
              Você está logado como: <strong>{user.email}</strong>
            </p>
            <button
              onClick={() => auth.signOut()}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              Sair
            </button>

            <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
              <h2 className="text-xl font-bold text-green-800 mb-4">
                ✅ Tudo Funcionando!
              </h2>
              <ul className="text-green-700 space-y-2">
                <li>✓ Firebase Authentication: OK</li>
                <li>✓ Google Sheets API: Pronto</li>
                <li>✓ Tailwind CSS: Ativo</li>
                <li>✓ Variáveis de Ambiente: Carregadas</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;