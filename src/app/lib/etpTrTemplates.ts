export interface ETPSection {
  title: string;
  key: string;
  content: string;
}

export interface TRSection {
  title: string;
  key: string;
  content: string;
}

export const ETP_STANDARD_SECTIONS: ETPSection[] = [
  {
    key: 'necessidade',
    title: '1. Descrição da Necessidade da Contratação',
    content: '',
  },
  {
    key: 'modalidade',
    title: '2. Justificativa da Modalidade',
    content: '',
  },
  {
    key: 'pca',
    title: '3. Previsão no Plano de Contratações Anual (PCA)',
    content: '',
  },
  {
    key: 'requisitos',
    title: '4. Requisitos da Contratação',
    content: '',
  },
  {
    key: 'quantidades',
    title: '5. Levantamento e Estimativa de Quantidades',
    content: '',
  },
  {
    key: 'mercado',
    title: '6. Levantamento de Mercado e Adequação à Modalidade (Alternativas)',
    content: '',
  },
  {
    key: 'estimativa_valor',
    title: '7. Estimativa do Valor da Contratação',
    content: '',
  },
  {
    key: 'solucao_completa',
    title: '8. Descrição da Solução como um Todo',
    content: '',
  },
  {
    key: 'parcelamento',
    title: '9. Justificativas para o Parcelamento',
    content: '',
  },
  {
    key: 'resultados',
    title: '10. Demonstrativo dos Resultados Pretendidos',
    content: '',
  },
  {
    key: 'providencias',
    title: '11. Providências a serem Adotadas pela Administração',
    content: '',
  },
  {
    key: 'correlatas',
    title: '12. Contratações Correlatas e/ou Interdependentes',
    content: '',
  },
  {
    key: 'impacto_ambiental',
    title: '13. Possíveis Impactos Ambientais',
    content: '',
  },
  {
    key: 'viabilidade',
    title: '14. Declaração de Viabilidade',
    content: '',
  },
];

export const TR_STANDARD_SECTIONS: TRSection[] = [
  {
    key: 'tr_objeto',
    title: '1. Objeto',
    content: '',
  },
  {
    key: 'tr_descricao',
    title: '2. Descrição Detalhada do Objeto',
    content: '',
  },
  {
    key: 'tr_prazo',
    title: '3. Prazo de Contratação e Vigência',
    content: '',
  },
  {
    key: 'tr_fundamentacao',
    title: '4. Fundamentação e Justificativa da Contratação',
    content: '',
  },
  {
    key: 'tr_solucao',
    title: '5. Descrição da Solução como um Todo',
    content: '',
  },
  {
    key: 'tr_requisitos',
    title: '6. Requisitos da Contratação',
    content: '',
  },
  {
    key: 'tr_execucao',
    title: '7. Modelo de Execução do Objeto',
    content: '',
  },
  {
    key: 'tr_gestao',
    title: '8. Modelo de Gestão e Fiscalização do Contrato',
    content: '',
  },
  {
    key: 'tr_pagamento',
    title: '9. Critérios de Medição e de Pagamento',
    content: '',
  },
  {
    key: 'tr_selecao',
    title: '10. Forma e Critérios de Seleção do Fornecedor',
    content: '',
  },
];
