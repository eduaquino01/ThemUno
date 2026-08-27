export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return 'R$ 0,00';
  }
  return `R$ ${Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function parseNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (!value) return 0;
  
  // Remove currency symbols, spaces, letters (except digits, comma, hyphen)
  let cleanStr = value.toString().replace(/[^\d,-]/g, '').trim();
  
  // Handle Brazilian formatting: "4.087,69" or "4087,69" -> "4087.69"
  if (cleanStr.includes(',')) {
    cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
  }
  
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}
