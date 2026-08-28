export type FinancialImportRow = {
  period_start: string;
  period_end: string;
  scenario: 'PLANNED' | 'ACTUAL';
  nature: 'REVENUE' | 'EXPENSE';
  category: string;
  account: string;
  amount: number;
  is_internal_transfer: boolean;
  description?: string;
  document_number?: string;
  due_date?: string;
  settlement_date?: string;
  source_ref?: string;
};

export type ImportFormat = 'FINANCIAL_PLAN' | 'SANKHYA';

const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const blocks = [
  { nature: 'REVENUE', category: 'Faturamento', start: 8, end: 11 },
  { nature: 'REVENUE', category: 'Outras Receitas', start: 14, end: 24 },
  { nature: 'EXPENSE', category: 'Despesas Fixas', start: 28, end: 59 },
  { nature: 'EXPENSE', category: 'Despesas Variáveis', start: 62, end: 77 },
  { nature: 'EXPENSE', category: 'Impostos', start: 80, end: 86 },
  { nature: 'EXPENSE', category: 'Pessoal Fixo', start: 90, end: 102 },
  { nature: 'EXPENSE', category: 'Pessoal Variável', start: 104, end: 119 },
  { nature: 'EXPENSE', category: 'Parcelamento', start: 122, end: 123 },
  { nature: 'EXPENSE', category: 'Mútuo', start: 126, end: 131 },
  { nature: 'EXPENSE', category: 'Contingência', start: 134, end: 134 },
] as const;

function parsePeriod(value: unknown, month: number) {
  const match = String(value || '').match(/(\d{2})[./-]\d{2}\s+a\s+(\d{2})[./-]\d{2}/i);
  if (!match) return null;
  const iso = (day: number) => `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { start: iso(Number(match[1])), end: iso(Number(match[2])) };
}

function parseActualCutoff(title: unknown, month: number) {
  const match = String(title || '').match(/AT[ÉE]\s+(\d{2})[./-](\d{2})/i);
  if (!match) return null;
  return `2026-${String(Number(match[2]) || month).padStart(2, '0')}-${match[1]}`;
}

function normalizeHeader(value: unknown) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function toIsoDate(XLSX: any, value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return undefined;
    return `${String(parsed.y).padStart(4, '0')}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  const text = String(value).trim();
  const br = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (br) {
    const year = Number(br[3]) < 100 ? 2000 + Number(br[3]) : Number(br[3]);
    return `${year}-${String(Number(br[2])).padStart(2, '0')}-${String(Number(br[1])).padStart(2, '0')}`;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

function stableHash(value: string) {
  let first = 2166136261;
  let second = 3335557771;
  for (let index = 0; index < value.length; index++) {
    first = Math.imul(first ^ value.charCodeAt(index), 16777619);
    second = Math.imul(second ^ value.charCodeAt(index), 2246822519);
  }
  return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`;
}

export function inferCompanyCode(fileName: string) {
  const normalized = normalizeHeader(fileName);
  if (normalized.startsWith('aba')) return 'ABA-BLOCK';
  if (normalized.startsWith('iu') || normalized.includes('integra')) return 'INTEGRA';
  if (normalized.includes('smarttsce')) return 'SMARTTS-SPE';
  if (normalized.includes('smarttsrj')) return 'SMARTTS-RJ';
  return undefined;
}

function normalizeFinancialPlan(XLSX: any, workbook: any): FinancialImportRow[] {
  const rows: FinancialImportRow[] = [];
  monthNames.forEach((monthName, monthIndex) => {
    const sheet = workbook.Sheets[`${monthName} 2026`];
    if (!sheet) return;
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
    const actualCutoff = parseActualCutoff(matrix[0]?.[0], monthIndex + 1);
    for (let col = 3; col <= 11; col += 2) {
      const period = parsePeriod(matrix[1]?.[col], monthIndex + 1);
      if (!period) continue;
      for (const block of blocks) {
        for (let rowIndex = block.start - 1; rowIndex <= block.end - 1; rowIndex++) {
          const account = String(matrix[rowIndex]?.[0] || '').trim();
          if (!account) continue;
          ([['PLANNED', 0], ['ACTUAL', 1]] as const).forEach(([scenario, offset]) => {
            if (scenario === 'ACTUAL' && actualCutoff && period.start > actualCutoff) return;
            const raw = Number(matrix[rowIndex]?.[col + offset] || 0);
            const amount = Number.isFinite(raw) ? Math.round(Math.abs(raw) * 100) / 100 : 0;
            if (!amount) return;
            rows.push({ period_start: period.start, period_end: period.end, scenario, nature: block.nature, category: block.category, account, amount, is_internal_transfer: /transferência entre cc/i.test(account) });
          });
        }
      }
    }
  });
  return rows;
}

function normalizeSankhya(XLSX: any, workbook: any): FinancialImportRow[] {
  const rows: FinancialImportRow[] = [];
  const identityOccurrences = new Map<string, number>();
  for (const sheetName of workbook.SheetNames) {
    const matrix: unknown[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true, defval: null });
    const headerIndex = matrix.findIndex((row) => row.some((cell) => normalizeHeader(cell) === 'receitadespesa') && row.some((cell) => normalizeHeader(cell) === 'databaixa'));
    if (headerIndex < 0) continue;
    const headers = matrix[headerIndex].map(normalizeHeader);
    const column = (name: string) => headers.indexOf(name);
    for (const record of matrix.slice(headerIndex + 1)) {
      const kind = String(record[column('receitadespesa')] || '').trim().toLowerCase();
      if (kind !== 'receita' && kind !== 'despesa') continue;
      const dueDate = toIsoDate(XLSX, record[column('dtvencimento')]);
      const settlementDate = toIsoDate(XLSX, record[column('databaixa')]);
      const date = settlementDate || dueDate;
      if (!date) continue;
      const paidAmount = Math.abs(Number(record[column('vlrbaixa')] || 0));
      const faceAmount = Math.abs(Number(record[column('vlrdodesdobramento')] || record[column('valorliquido')] || 0));
      const amount = Math.round((settlementDate && paidAmount ? paidAmount : faceAmount) * 100) / 100;
      if (!Number.isFinite(amount) || !amount) continue;
      const partnerCode = String(record[column('cod')] || '').trim();
      const partner = String(record[column('parceiro')] || 'Não identificado').trim();
      const documentNumber = String(record[column('nronota')] || '').trim();
      const description = String(record[column('historico')] || '').trim();
      const category = description.split(' (')[0].trim() || (kind === 'receita' ? 'Outras Receitas' : 'Outras Despesas');
      const identity = [partnerCode, partner, documentNumber, description, dueDate, settlementDate, amount, kind].join('|');
      const occurrence = (identityOccurrences.get(identity) || 0) + 1;
      identityOccurrences.set(identity, occurrence);
      rows.push({
        period_start: date,
        period_end: date,
        scenario: settlementDate ? 'ACTUAL' : 'PLANNED',
        nature: kind === 'receita' ? 'REVENUE' : 'EXPENSE',
        category: category.slice(0, 120),
        account: partner.slice(0, 220),
        amount,
        is_internal_transfer: /transfer[eê]ncia entre (contas|cc)|aplica[cç][aã]o e resgate/i.test(`${description} ${partner}`),
        description: description || undefined,
        document_number: documentNumber || undefined,
        due_date: dueDate,
        settlement_date: settlementDate,
        source_ref: `SANKHYA:${stableHash(identity)}:${occurrence}`,
      });
    }
  }
  return rows;
}

export function normalizeWorkbook(XLSX: any, workbook: any): { rows: FinancialImportRow[]; format: ImportFormat } {
  const financialPlanRows = normalizeFinancialPlan(XLSX, workbook);
  if (financialPlanRows.length) return { rows: financialPlanRows, format: 'FINANCIAL_PLAN' };
  const sankhyaRows = normalizeSankhya(XLSX, workbook);
  if (sankhyaRows.length) return { rows: sankhyaRows, format: 'SANKHYA' };
  throw new Error('Formato não reconhecido. Envie o Plano Financeiro mensal ou o relatório “Movimentação Financeira” do Sankhya.');
}
