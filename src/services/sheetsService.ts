// src/services/sheetsService.ts
const SHEET_ID = process.env.REACT_APP_SHEET_ID!;
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY!;

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

export async function fetchSolicitations(): Promise<RequestRow[]> {
  try {
    const rows = await fetchSheetData('COMPRAS!A3:Q');

    return rows.map((row, index) => {
      const normalizedRow: string[] = row.map((cell: any) => {
        if (typeof cell === 'string') return cell;
        if (Array.isArray(cell)) return cell.join('');
        return String(cell || '');
      });

      while (normalizedRow.length < 17) {
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
        observacao: normalizedRow[16] || ''
      };
    });
  } catch (error) {
    console.error('Erro ao buscar solicitações:', error);
    throw error;
  }
}

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

async function insertRowAt(rowIndex: number): Promise<void> {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAccessToken()}`
      },
      body: JSON.stringify({
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: 0, // ID da aba "COMPRAS" (geralmente 0 para a primeira aba)
                dimension: 'ROWS',
                startIndex: rowIndex - 1, // API usa índice baseado em 0
                endIndex: rowIndex // Inserir 1 linha
              },
              inheritFromBefore: false
            }
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro ao inserir linha:', errorData);
      throw new Error(`Erro ao inserir linha. Status: ${response.status}`);
    }

    console.log(`Linha ${rowIndex} inserida com sucesso`);
  } catch (error) {
    console.error('Erro ao inserir linha:', error);
    throw error;
  }
}

export async function addNewRequest(automacaoData: Partial<RequestRow>): Promise<RequestRow> {
  try {
    // Primeiro, inserir uma nova linha vazia na posição 3 (logo após o cabeçalho)
    // Isso empurra todos os dados existentes para baixo
    await insertRowAt(3);

    // Agora preencher a linha 3 recém-criada com os dados
    const newRowData = [
      '',
      '',
      '',
      '',
      automacaoData.statusAutomacao || 'COMPRAR NORMAL',
      automacaoData.reqMat || '',
      automacaoData.dataAutomacao || new Date().toLocaleDateString('pt-BR'),
      automacaoData.projeto || '',
      automacaoData.estaCadastrado || '',
      automacaoData.codRef || '',
      automacaoData.descricaoProduto || '',
      automacaoData.materialMarca || '',
      automacaoData.qtde || '',
      automacaoData.dataNecessidade || '',
      automacaoData.orcamentoLink || '',
      automacaoData.solicitante || '',
      automacaoData.observacao || ''
    ];

    const range = 'COMPRAS!A3:Q3';
    await updateSheetValue(range, [newRowData]);

    console.log('Nova solicitação adicionada na linha 3');

    return {
      rowIndex: 3,
      dataCompras: '',
      statusCompras: '',
      ordemCompra: '',
      previsaoChegada: '',
      ...automacaoData
    } as RequestRow;
  } catch (error) {
    console.error('Erro ao adicionar solicitação:', error);
    throw error;
  }
}