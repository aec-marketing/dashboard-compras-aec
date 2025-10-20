// src/utils/permissions.ts

export type Department = 'COMPRAS' | 'ENGENHARIA' | 'UNKNOWN';

export const STATUS_OPTIONS = {
  compras: ['COMPRAR', 'ORÇAMENTO', 'COMPRADO', '-'],
  automacao: ['COMPRAR URGENTE', 'COMPRAR NORMAL', 'RECEBIDO', '-']
};

export const AUTOMACAO_EDITABLE_FIELDS = [
  'E', // statusAutomacao
  'F', // reqMat
  'G', // dataAutomacao
  'H', // projeto
  'I', // estaCadastrado
  'J', // codRef
  'K', // descricaoProduto
  'L', // materialMarca
  'M', // qtde
  'N', // dataNecessidade
  'O', // orcamentoLink
  'P', // solicitante
  'Q'  // observacao
] as const;

export const COMPRAS_EDITABLE_FIELDS = [
  'B', // statusCompras
  'C', // ordemCompra
  'D'  // previsaoChegada
] as const;

export function getUserDepartment(email: string | undefined): Department {
  if (!email) return 'UNKNOWN';

  // Valida se é email corporativo
  if (!email.endsWith('@almeidaecamargo.com.br')) return 'UNKNOWN';

  // Adicionar lógica de departamento aqui
  // Pode ser: por prefixo de email, por lista fixa, etc.
  // Exemplo com prefixo:
  if (email.startsWith('compras.')) return 'COMPRAS';
  if (email.startsWith('eng.') || email.startsWith('engenharia.')) return 'ENGENHARIA';

  // Se tiver integração com LDAP/Active Directory, use aqui
  // Por enquanto, retorna UNKNOWN e você configura manualmente
  return 'UNKNOWN';
}

export function canEditField(department: Department, field: string): boolean {
  if (department === 'COMPRAS') {
    return COMPRAS_EDITABLE_FIELDS.includes(field as any);
  }
  if (department === 'ENGENHARIA') {
    return AUTOMACAO_EDITABLE_FIELDS.includes(field as any);
  }
  return false;
}

export function canViewField(department: Department, field: string): boolean {
  // Ambos os departamentos veem tudo
  return true;
}

export function getStatusOptions(department: Department): string[] {
  if (department === 'COMPRAS') return STATUS_OPTIONS.compras;
  if (department === 'ENGENHARIA') return STATUS_OPTIONS.automacao;
  return [];
}

export function getCurrentStatusField(department: Department): 'B' | 'E' {
  return department === 'COMPRAS' ? 'B' : 'E';
}