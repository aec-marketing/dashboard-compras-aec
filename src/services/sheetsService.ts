// sheetsService.ts

const SHEET_ID = process.env.REACT_APP_SHEET_ID!;
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY!;

export interface RequestRow {
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
  // Novos campos para suporte a lotes
  statusItemIndividual: string; // R: Status individual dentro do lote
  vistoCompras: string; // S: Timestamp + email de quem viu
  ultimaModificacao: string; // T: Timestamp + email de quem editou
  itemRemovido: string; // U: "ATIVO" ou "REMOVIDO"
}

// Funções auxiliares para comunicação com Google Sheets API
async function fetchSheetData(range: string): Promise<string[][]> {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) throw new Error('Erro ao buscar dados da planilha');

    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error('Erro ao buscar dados:', error);
    throw error;
  }
}

async function getAccessToken(): Promise<string> {
  try {
    const email = process.env.REACT_APP_GOOGLE_SERVICE_ACCOUNT_EMAIL!;
    const privateKeyString = process.env.REACT_APP_GOOGLE_PRIVATE_KEY!;

    // Corrigir as quebras de linha que vêm como string literal
    const privateKey = privateKeyString.replace(/\\n/g, '\n');

    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    const headerEncoded = btoa(JSON.stringify(header));
    const payloadEncoded = btoa(JSON.stringify(payload));
    const signatureInput = `${headerEncoded}.${payloadEncoded}`;

    // Converter PEM para DER (formato que crypto.subtle aceita)
    const binaryString = atob(privateKey.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\n/g, ''));
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const key = await crypto.subtle.importKey(
      'pkcs8',
      bytes.buffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      new TextEncoder().encode(signatureInput)
    );

    const signatureEncoded = btoa(String.fromCharCode(...Array.from(new Uint8Array(signature))));
    const jwt = `${signatureInput}.${signatureEncoded}`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error('Falha ao obter access token: ' + JSON.stringify(tokenData));
    }
    return tokenData.access_token;
  } catch (error) {
    console.error('Erro ao gerar access token:', error);
    throw error;
  }
}

/**
 * Funçao original que faz uma única escrita (PUT).
 * Mantida para uso em atualizações de item único que não fazem loop.
 */
async function updateSheetValue(range: string, values: string[][]): Promise<void> {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAccessToken()}`
      },
      body: JSON.stringify({
        values: values as any
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro da API:', errorData);
      throw new Error(`Erro ao atualizar célula. Status: ${response.status}`);
    }
  } catch (error) {
    console.error('Erro ao atualizar:', error);
    throw error;
  }
}

/**
 * **NOVA FUNÇÃO**
 * Realiza múltiplas atualizações de células/intervalos em uma única requisição (BATCH).
 * Isso resolve o erro 429 "Too Many Requests" em loops.
 */
export async function batchUpdateSheetValues(updates: { range: string; values: string[][] }[]): Promise<void> {
  if (updates.length === 0) return;

  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchUpdate`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAccessToken()}`
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: updates
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro da API no Batch Update:', errorData);
      throw new Error(`Erro ao atualizar lote de células. Status: ${response.status}`);
    }

    console.log(`✅ ${updates.length} operações de escrita consolidadas em 1 requisição.`);
  } catch (error) {
    console.error('Erro ao realizar Batch Update:', error);
    throw error;
  }
}

async function appendSheetRows(range: string, values: string[][]): Promise<void> {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAccessToken()}`
      },
      body: JSON.stringify({
        values: values
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro da API ao adicionar linhas:', errorData);
      throw new Error(`Erro ao adicionar linhas. Status: ${response.status}`);
    }

    console.log('✅ Linhas adicionadas com sucesso');
  } catch (error) {
    console.error('Erro ao adicionar linhas:', error);
    throw error;
  }
}

// Atualizar função fetchSolicitations para incluir novos campos
export async function fetchSolicitations(): Promise<RequestRow[]> {
  try {
    const rows = await fetchSheetData('COMPRAS!A3:U'); // Expandido até coluna U

    return rows.map((row: string[], index: number) => {
      const normalizedRow: string[] = row.map((cell: string | number | boolean) => {
        if (typeof cell === 'string') return cell;
        if (Array.isArray(cell)) return cell.join('');
        return String(cell || '');
      });

      // Normalizar para 21 colunas (A-U)
      while (normalizedRow.length < 21) {
        normalizedRow.push('');
      }

      return {
        rowIndex: index + 3,
        dataCompras: normalizedRow[0] || '',
        statusCompras: normalizedRow[1] || '',
        ordemCompra: normalizedRow[2] || '',
        previsaoChegada: normalizedRow[3] || '',
        statusAutomacao: normalizedRow[4] || '',
        reqMat: normalizedRow[5] || '',
        dataAutomacao: normalizedRow[6] || '',
        projeto: normalizedRow[7] || '',
        estaCadastrado: normalizedRow[8] || '',
        codRef: normalizedRow[9] || '',
        descricaoProduto: normalizedRow[10] || '',
        materialMarca: normalizedRow[11] || '',
        qtde: normalizedRow[12] || '',
        dataNecessidade: normalizedRow[13] || '',
        orcamentoLink: normalizedRow[14] || '',
        solicitante: normalizedRow[15] || '',
        observacao: normalizedRow[16] || '',
        statusItemIndividual: normalizedRow[17] || '',
        vistoCompras: normalizedRow[18] || '',
        ultimaModificacao: normalizedRow[19] || '',
        itemRemovido: normalizedRow[20] || 'ATIVO'
      };
    });
  } catch (error) {
    console.error('Erro ao buscar solicitações:', error);
    throw error;
  }
}

// Tipo para produtos de um lote
interface BatchProduct {
  codRef: string;
  descricaoProduto: string;
  materialMarca: string;
  qtde: string;
  observacao?: string;
}

// Tipo para dados compartilhados do lote
interface BatchSharedData {
  reqMat: string; // Preenchido pelo solicitante
  statusAutomacao: string;
  dataAutomacao: string;
  projeto: string;
  dataNecessidade: string;
  orcamentoLink?: string;
  solicitante: string;
}

/**
 * Adiciona múltiplos produtos como um lote
 * Todos compartilham: REQ MAT, Status Automação, Datas, Projeto, Solicitante
 */
export async function addBatchRequest(
  sharedData: BatchSharedData,
  products: BatchProduct[]
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const userEmail = sharedData.solicitante;

    // Criar uma linha para cada produto
    const allRows = products.map(product => [
      '', // A: Data Compras (vazio inicialmente)
      '', // B: Status Compras (vazio inicialmente)
      '', // C: Ordem Compra (vazio inicialmente)
      '', // D: Previsão Chegada (vazio inicialmente)
      sharedData.statusAutomacao, // E: Status Automação (compartilhado)
      sharedData.reqMat, // F: REQ MAT (compartilhado - identifica o lote)
      sharedData.dataAutomacao, // G: Data Automação (compartilhado)
      sharedData.projeto, // H: Projeto (compartilhado)
      '', // I: Está Cadastrado (vazio)
      product.codRef, // J: Código/Ref (individual)
      product.descricaoProduto, // K: Descrição (individual)
      product.materialMarca, // L: Material/Marca (individual)
      product.qtde, // M: Quantidade (individual)
      sharedData.dataNecessidade, // N: Data Necessidade (compartilhado)
      sharedData.orcamentoLink || '', // O: Orçamento Link (compartilhado)
      sharedData.solicitante, // P: Solicitante (compartilhado)
      product.observacao || '', // Q: Observação (individual)
      '', // R: Status Item Individual (novo - vazio inicialmente)
      '', // S: Visto Compras (novo - vazio inicialmente)
      `${timestamp}|${userEmail}`, // T: Última Modificação (novo)
      'ATIVO' // U: Item Removido (novo - flag)
    ]);

    // Inserir todas as linhas de uma vez usando append
    await appendSheetRows('COMPRAS!A3:U', allRows);

    console.log(`✅ Lote criado: ${sharedData.reqMat} com ${products.length} produtos`);
  } catch (error) {
    console.error('Erro ao adicionar lote:', error);
    throw error;
  }
}

/**
 * Atualiza item individual dentro de um lote
 * Registra quem e quando modificou
 */
export async function updateBatchItem(
  rowIndex: number,
  field: string,
  value: string,
  userEmail: string
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    
    // Atualizar o campo solicitado
    const fieldRange = `COMPRAS!${field}${rowIndex}`;
    await updateSheetValue(fieldRange, [[value]]);

    // Atualizar timestamp de modificação (coluna T)
    const timestampRange = `COMPRAS!T${rowIndex}`;
    await updateSheetValue(timestampRange, [[`${timestamp}|${userEmail}`]]);

    console.log(`✅ Item atualizado: linha ${rowIndex}, campo ${field}`);
  } catch (error) {
    console.error('Erro ao atualizar item do lote:', error);
    throw error;
  }
}

/**
 * Marca item como removido (soft delete)
 * Nota: Esta função ainda usa updateSheetValue, mas deve ser evitada em loops (como updateCompleteBatch)
 */
export async function markItemAsRemoved(
  rowIndex: number,
  userEmail: string
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    
    // Marcar como REMOVIDO (coluna U)
    const statusRange = `COMPRAS!U${rowIndex}`;
    await updateSheetValue(statusRange, [['REMOVIDO']]);

    // Atualizar timestamp de modificação (coluna T)
    const timestampRange = `COMPRAS!T${rowIndex}`;
    await updateSheetValue(timestampRange, [[`${timestamp}|${userEmail}`]]);

    console.log(`✅ Item marcado como removido: linha ${rowIndex}`);
  } catch (error) {
    console.error('Erro ao marcar item como removido:', error);
    throw error;
  }
}

/**
 * Marca lote como visto pelo setor de compras
 * REFATORADA: Usa Batch Update (batchUpdateSheetValues) para consolidar N chamadas em 1.
 */
export async function markBatchAsSeen(
  reqMat: string,
  userEmail: string
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const allRequests = await fetchSolicitations();
    
    // Encontrar todos os itens do lote
    const batchItems = allRequests.filter(req => req.reqMat === reqMat);
    const updates: { range: string; values: string[][] }[] = [];

    // Acumular a marcação de visto para cada item (coluna S)
    for (const item of batchItems) {
      const vistoRange = `COMPRAS!S${item.rowIndex}`;
      updates.push({ range: vistoRange, values: [[`${timestamp}|${userEmail}`]] });
    }

    // Executar todas as atualizações em uma única chamada de API
    await batchUpdateSheetValues(updates);

    console.log(`✅ Lote ${reqMat} marcado como visto por ${userEmail} (Batch).`);
  } catch (error) {
    console.error('Erro ao marcar lote como visto:', error);
    throw error;
  }
}

/**
 * Atualiza status individual de item dentro do lote (coluna R)
 * Para Compras marcar itens específicos como "COMPRADO", "ORÇAMENTO", etc.
 */
export async function updateItemStatus(
  rowIndex: number,
  status: string,
  userEmail: string
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    
    // Atualizar status individual (coluna R)
    const statusRange = `COMPRAS!R${rowIndex}`;
    await updateSheetValue(statusRange, [[status]]);

    // Atualizar timestamp de modificação (coluna T)
    const timestampRange = `COMPRAS!T${rowIndex}`;
    await updateSheetValue(timestampRange, [[`${timestamp}|${userEmail}`]]);

    console.log(`✅ Status individual atualizado: linha ${rowIndex} → ${status}`);
  } catch (error) {
    console.error('Erro ao atualizar status individual:', error);
    throw error;
  }
}

/**
 * Busca todos os produtos de um lote específico
 */
export async function getBatchProducts(reqMat: string): Promise<RequestRow[]> {
  try {
    const allRequests = await fetchSolicitations();
    return allRequests.filter(req => 
      req.reqMat === reqMat && 
      req.itemRemovido !== 'REMOVIDO' // Apenas itens ativos
    );
  } catch (error) {
    console.error('Erro ao buscar produtos do lote:', error);
    throw error;
  }
}

/**
 * Verifica se uma solicitação é um lote (múltiplos produtos com mesmo REQ MAT)
 */
export function isBatch(reqMat: string, allRequests: RequestRow[]): boolean {
  if (!reqMat) return false;
  const count = allRequests.filter(r => r.reqMat === reqMat && r.itemRemovido !== 'REMOVIDO').length;
  return count > 1;
}

/**
 * Adiciona novo produto a um lote existente
 */
export async function addProductToBatch(
  reqMat: string,
  product: BatchProduct,
  userEmail: string
): Promise<void> {
  try {
    // Buscar dados compartilhados do lote
    const batchProducts = await getBatchProducts(reqMat);
    if (batchProducts.length === 0) {
      throw new Error('Lote não encontrado');
    }

    const firstItem = batchProducts[0];
    const timestamp = new Date().toISOString();

    const newRow = [
      '', // A: Data Compras
      '', // B: Status Compras
      '', // C: Ordem Compra
      '', // D: Previsão Chegada
      firstItem.statusAutomacao, // E: Status Automação (do lote)
      reqMat, // F: REQ MAT (do lote)
      firstItem.dataAutomacao, // G: Data Automação (do lote)
      firstItem.projeto, // H: Projeto (do lote)
      '', // I: Está Cadastrado
      product.codRef, // J: Código/Ref (novo produto)
      product.descricaoProduto, // K: Descrição (novo produto)
      product.materialMarca, // L: Material/Marca (novo produto)
      product.qtde, // M: Quantidade (novo produto)
      firstItem.dataNecessidade, // N: Data Necessidade (do lote)
      firstItem.orcamentoLink, // O: Orçamento Link (do lote)
      firstItem.solicitante, // P: Solicitante (do lote)
      product.observacao || '', // Q: Observação (novo produto)
      '', // R: Status Item Individual
      '', // S: Visto Compras
      `${timestamp}|${userEmail}`, // T: Última Modificação
      'ATIVO' // U: Item Removido
    ];

    // Usar append para adicionar a nova linha
    await appendSheetRows('COMPRAS!A3:U', [newRow]);

    console.log(`✅ Produto adicionado ao lote ${reqMat}`);
  } catch (error) {
    console.error('Erro ao adicionar produto ao lote:', error);
    throw error;
  }
}

/**
 * Atualiza campos do setor de Compras (colunas B, C, D)
 */
export async function updateComprasField(
  rowIndex: number,
  field: 'B' | 'C' | 'D',
  value: string
): Promise<void> {
  try {
    const range = `COMPRAS!${field}${rowIndex}`;
    await updateSheetValue(range, [[value]]);
  } catch (error) {
    console.error(`Erro ao atualizar ${field}${rowIndex}:`, error);
    throw error;
  }
}

/**
 * Atualiza campos do setor de Automação/Engenharia (colunas E-Q)
 */
export async function updateAutomacaoField(
  rowIndex: number,
  field: 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q',
  value: string
): Promise<void> {
  try {
    const range = `COMPRAS!${field}${rowIndex}`;
    await updateSheetValue(range, [[value]]);
  } catch (error) {
    console.error(`Erro ao atualizar ${field}${rowIndex}:`, error);
    throw error;
  }
}

/**
 * Adiciona uma nova solicitação individual (não é lote)
 */
export async function addNewRequest(automacaoData: Partial<RequestRow>): Promise<RequestRow> {
  try {
    const timestamp = new Date().toISOString();
    const userEmail = automacaoData.solicitante || '';

    const newRowData = [
      '', // A: Data Compras
      '', // B: Status Compras
      '', // C: Ordem Compra
      '', // D: Previsão Chegada
      automacaoData.statusAutomacao || 'COMPRAR NORMAL', // E: Status Automação
      automacaoData.reqMat || '', // F: REQ MAT
      automacaoData.dataAutomacao || new Date().toLocaleDateString('pt-BR'), // G: Data Automação
      automacaoData.projeto || '', // H: Projeto
      automacaoData.estaCadastrado || '', // I: Está Cadastrado
      automacaoData.codRef || '', // J: Código/Ref
      automacaoData.descricaoProduto || '', // K: Descrição
      automacaoData.materialMarca || '', // L: Material/Marca
      automacaoData.qtde || '', // M: Quantidade
      automacaoData.dataNecessidade || '', // N: Data Necessidade
      automacaoData.orcamentoLink || '', // O: Orçamento Link
      automacaoData.solicitante || '', // P: Solicitante
      automacaoData.observacao || '', // Q: Observação
      '', // R: Status Item Individual
      '', // S: Visto Compras
      `${timestamp}|${userEmail}`, // T: Última Modificação
      'ATIVO' // U: Item Removido
    ];

    // Usar append para adicionar a nova linha
    await appendSheetRows('COMPRAS!A3:U', [newRowData]);

    return {
      rowIndex: 0, // rowIndex será atualizado após reload
      dataCompras: '',
      statusCompras: '',
      ordemCompra: '',
      previsaoChegada: '',
      statusItemIndividual: '',
      vistoCompras: '',
      ultimaModificacao: `${timestamp}|${userEmail}`,
      itemRemovido: 'ATIVO',
      ...automacaoData
    } as RequestRow;
  } catch (error) {
    console.error('Erro ao adicionar solicitação:', error);
    throw error;
  }
}

/**
 * Atualiza múltiplos campos de uma solicitação (para edição completa)
 * Usado pelo solicitante para editar sua própria solicitação
 */
export async function updateRequestFields(
  rowIndex: number,
  updates: Partial<RequestRow>,
  userEmail: string
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();

    // Mapeamento de campos para colunas
    const fieldToColumn: Record<string, string> = {
      statusAutomacao: 'E',
      projeto: 'H',
      codRef: 'J',
      descricaoProduto: 'K',
      materialMarca: 'L',
      qtde: 'M',
      dataNecessidade: 'N',
      orcamentoLink: 'O',
      observacao: 'Q'
    };

    // **OPORTUNIDADE DE MELHORIA**: Você poderia refatorar isso para usar o batchUpdateSheetValues
    // se esta função for chamada frequentemente com muitos campos.
    
    // Atualizar cada campo individualmente
    for (const [field, value] of Object.entries(updates)) {
      const column = fieldToColumn[field];
      if (column && value !== undefined) {
        const range = `COMPRAS!${column}${rowIndex}`;
        await updateSheetValue(range, [[String(value)]]);
      }
    }

    // Atualizar timestamp de modificação (coluna T)
    const timestampRange = `COMPRAS!T${rowIndex}`;
    await updateSheetValue(timestampRange, [[`${timestamp}|${userEmail}`]]);

    console.log(`✅ Solicitação atualizada: linha ${rowIndex}`);
  } catch (error) {
    console.error('Erro ao atualizar solicitação:', error);
    throw error;
  }
}

/**
 * Verifica se um usuário é o solicitante de uma requisição
 */
export function isRequestOwner(request: RequestRow, userEmail: string): boolean {
  return request.solicitante.toLowerCase() === userEmail.toLowerCase();
}

/**
 * Atualiza dados compartilhados de um lote (afeta todos os itens)
 * REFATORADA: Usa Batch Update (batchUpdateSheetValues) para consolidar chamadas.
 */
export async function updateBatchSharedData(
  reqMat: string,
  sharedUpdates: {
    statusAutomacao?: string;
    projeto?: string;
    dataNecessidade?: string;
    orcamentoLink?: string;
  },
  userEmail: string
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const allRequests = await fetchSolicitations();
    const batchItems = allRequests.filter(req => req.reqMat === reqMat && req.itemRemovido !== 'REMOVIDO');

    // Mapeamento de campos compartilhados para colunas
    const fieldToColumn: Record<string, string> = {
      statusAutomacao: 'E',
      projeto: 'H',
      dataNecessidade: 'N',
      orcamentoLink: 'O'
    };

    const updates: { range: string; values: string[][] }[] = [];

    // 1. Acumular atualizações de dados compartilhados
    for (const item of batchItems) {
      for (const [field, value] of Object.entries(sharedUpdates)) {
        const column = fieldToColumn[field];
        if (column && value !== undefined) {
          const range = `COMPRAS!${column}${item.rowIndex}`;
          updates.push({ range: range, values: [[String(value)]] });
        }
      }

      // 2. Acumular atualização de timestamp de modificação (coluna T)
      const timestampRange = `COMPRAS!T${item.rowIndex}`;
      updates.push({ range: timestampRange, values: [[`${timestamp}|${userEmail}`]] });
    }

    // 3. Executar todas as atualizações em uma única chamada de API
    await batchUpdateSheetValues(updates);

    console.log(`✅ Dados compartilhados do lote ${reqMat} atualizados com sucesso (Batch).`);
  } catch (error) {
    console.error('Erro ao atualizar dados compartilhados do lote:', error);
    throw error;
  }
}

/**
 * Interface para produto do lote (usado na edição)
 */
export interface BatchProductUpdate {
  rowIndex: number;
  codRef: string;
  descricaoProduto: string;
  materialMarca: string;
  qtde: string;
  observacao: string;
  isNew?: boolean;
  isDeleted?: boolean;
}

/**
 * Função auxiliar para acumular a atualização de soft delete (U e T)
 */
function accumulateSoftDeleteUpdate(updates: { range: string; values: string[][] }[], rowIndex: number, userEmail: string) {
    const timestamp = new Date().toISOString();
    updates.push({ range: `COMPRAS!U${rowIndex}`, values: [['REMOVIDO']] }); // Coluna U
    updates.push({ range: `COMPRAS!T${rowIndex}`, values: [[`${timestamp}|${userEmail}`]] }); // Coluna T
}


/**
 * Atualiza um lote completo:
 * - Atualiza dados compartilhados (usando o updateBatchSharedData refatorado)
 * - Atualiza produtos existentes
 * - Adiciona novos produtos
 * - Remove produtos marcados para exclusão
 * REFATORADA: Usa Batch Update (batchUpdateSheetValues) para consolidar escritas.
 */
export async function updateCompleteBatch(
  reqMat: string,
  sharedData: {
    statusAutomacao: string;
    projeto: string;
    dataNecessidade: string;
    orcamentoLink?: string;
  },
  products: BatchProductUpdate[],
  userEmail: string
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const allRequests = await fetchSolicitations();
    const currentBatchItems = allRequests.filter(
      req => req.reqMat === reqMat && req.itemRemovido !== 'REMOVIDO'
    );

    if (currentBatchItems.length === 0) {
      throw new Error('Lote não encontrado');
    }

    const firstItem = currentBatchItems[0];

    // 1. Atualizar dados compartilhados em todos os itens existentes
    //    NOTA: updateBatchSharedData JÁ ESTÁ refatorada para usar BATCH.
    await updateBatchSharedData(reqMat, sharedData, userEmail);

    // Array para acumular todas as atualizações restantes (produtos existentes e remoções)
    const productUpdates: { range: string; values: string[][] }[] = [];

    // 2. Processar produtos
    for (const product of products) {
      if (product.isDeleted && !product.isNew) {
        // Acumular Soft Delete para produto existente (Colunas U e T)
        accumulateSoftDeleteUpdate(productUpdates, product.rowIndex, userEmail);
      } else if (product.isNew && !product.isDeleted) {
        // Adicionar novo produto ao lote (APPEND - usa appendSheetRows, OK para inserção)
        const newRow = [
          '', // A: Data Compras
          '', // B: Status Compras
          '', // C: Ordem Compra
          '', // D: Previsão Chegada
          sharedData.statusAutomacao, // E: Status Automação (compartilhado)
          reqMat, // F: REQ MAT (compartilhado - identifica o lote)
          firstItem.dataAutomacao, // G: Data Automação (do lote original)
          sharedData.projeto, // H: Projeto (compartilhado)
          '', // I: Está Cadastrado
          product.codRef, // J: Código/Ref (individual)
          product.descricaoProduto, // K: Descrição (individual)
          product.materialMarca, // L: Material/Marca (individual)
          product.qtde, // M: Quantidade (individual)
          sharedData.dataNecessidade, // N: Data Necessidade (compartilhado)
          sharedData.orcamentoLink || '', // O: Orçamento Link (compartilhado)
          firstItem.solicitante, // P: Solicitante (do lote original)
          product.observacao || '', // Q: Observação (individual)
          '', // R: Status Item Individual
          '', // S: Visto Compras
          `${timestamp}|${userEmail}`, // T: Última Modificação
          'ATIVO' // U: Item Removido
        ];

        // Append ainda é a maneira mais eficiente de ADICIONAR novas linhas.
        await appendSheetRows('COMPRAS!A3:U', [newRow]);
      } else if (!product.isNew && !product.isDeleted) {
        // Atualizar produto existente (campos individuais)
        const fieldToColumn: Record<string, string> = {
          codRef: 'J',
          descricaoProduto: 'K',
          materialMarca: 'L',
          qtde: 'M',
          observacao: 'Q'
        };

        for (const [field, column] of Object.entries(fieldToColumn)) {
          const value = product[field as keyof BatchProductUpdate];
          if (value !== undefined) {
            const range = `COMPRAS!${column}${product.rowIndex}`;
            // Acumular atualização de campo
            productUpdates.push({ range: range, values: [[String(value)]] });
          }
        }

        // Acumular atualização de timestamp (coluna T)
        const timestampRange = `COMPRAS!T${product.rowIndex}`;
        productUpdates.push({ range: timestampRange, values: [[`${timestamp}|${userEmail}`]] });
      }
    }

    // 3. Executar todas as atualizações de produtos existentes e remoções em um Batch
    await batchUpdateSheetValues(productUpdates);
    
    console.log(`✅ Lote ${reqMat} atualizado completamente (Batch).`);
  } catch (error) {
    console.error('Erro ao atualizar lote completo:', error);
    throw error;
  }
}