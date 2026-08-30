// Normaliza um nome de categoria para efeito de COMPARAÇÃO (não de gravação):
// tira acentos, colapsa espaços, remove pontuação de borda e baixa a caixa.
// Usado só para sugerir grupos de categorias duplicadas na tela de merge —
// o nome real gravado no banco continua sendo o que o usuário digitou/importou.
export function normalizeCategoryName(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}
