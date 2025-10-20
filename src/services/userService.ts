// src/services/userService.ts
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Department } from '../utils/permissions';

interface UserData {
  email: string;
  department: Department | 'ADM';
  createdAt?: any;
}

export async function getUserDepartmentFromFirestore(email: string): Promise<Department | 'ADM' | null> {
  try {
    // Buscar documento do usuário usando email como ID
    const userRef = doc(db, 'users', email);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.warn(`Usuário ${email} não encontrado no Firestore`);
      return null;
    }

    const userData = userSnap.data() as UserData;
    return userData.department as Department | 'ADM';
  } catch (error) {
    console.error('Erro ao buscar departamento do usuário:', error);
    return null;
  }
}

export async function isAdmin(email: string): Promise<boolean> {
  const department = await getUserDepartmentFromFirestore(email);
  return department === 'ADM';
}