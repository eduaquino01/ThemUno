import { formatDate } from './formatters';

// Client-side PDF generation helper using pdfmake
export async function generateMonthlyReportPDF(period: string, performed: string[], planned: string[]) {
  if (typeof window === 'undefined') return;

  // Dynamically import pdfmake to avoid Next.js SSR document/window crashes
  const pdfMakeModule = await import('pdfmake/build/pdfmake');
  const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
  
  const pdfMake = (pdfMakeModule as any).default || pdfMakeModule;
  const pdfFonts = (pdfFontsModule as any).default || pdfFontsModule;
  
  // Bind fonts to virtual file system
  if (pdfFonts && (pdfFonts as any).pdfMake && (pdfFonts as any).pdfMake.vfs) {
    (pdfMake as any).vfs = (pdfFonts as any).pdfMake.vfs;
  }

  const docDefinition: any = {
    content: [
      // Title Header
      {
        text: 'RELATÓRIO MENSAL CONSOLIDADO',
        style: 'header',
        alignment: 'center'
      },
      {
        text: 'CLMS - SISTEMA DE GOVERNANÇA E CONTROLE CONTRATUAL',
        style: 'subheader',
        alignment: 'center',
        margin: [0, 0, 0, 20]
      },

      // Metadata Info Box
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                fillColor: '#f1f5f9',
                borderColor: '#cbd5e1',
                margin: [10, 10, 10, 10],
                stack: [
                  { text: `Período de Referência: ${period}`, bold: true, fontSize: 10 },
                  { text: `Data de Emissão: ${formatDate(new Date())}`, fontSize: 9, margin: [0, 4, 0, 0] },
                  { text: 'Finalidade: Conciliação técnica e acompanhamento para liberação de notas fiscais.', fontSize: 9, margin: [0, 4, 0, 0] }
                ]
              }
            ]
          ]
        },
        margin: [0, 0, 0, 25]
      },

      // Performed Activities Section
      {
        text: '1. ATIVIDADES DESEMPENHADAS NO PERÍODO',
        style: 'sectionHeader',
        margin: [0, 10, 0, 10]
      },
      {
        ul: performed.map(act => ({ text: act, style: 'listItem' })),
        margin: [10, 0, 0, 20]
      },

      // Planned Activities Section
      {
        text: '2. PLANEJAMENTO DE ATIVIDADES - PRÓXIMO MÊS',
        style: 'sectionHeader',
        margin: [0, 10, 0, 10]
      },
      {
        ul: planned.map(plan => ({ text: plan, style: 'listItem' })),
        margin: [10, 0, 0, 30]
      },

      // Signature Block
      {
        text: 'Declaro a execução conforme e ratifico os marcos de prestação descritos acima.',
        fontSize: 9,
        italics: true,
        alignment: 'center',
        margin: [0, 40, 0, 40]
      },
      {
        columns: [
          {
            stack: [
              { text: '_____________________________________', alignment: 'center' },
              { text: 'Gestor de Contrato (TI)', alignment: 'center', bold: true, fontSize: 9, margin: [0, 4, 0, 0] },
              { text: 'CLMS Portal', alignment: 'center', fontSize: 8, color: '#64748b' }
            ]
          },
          {
            stack: [
              { text: '_____________________________________', alignment: 'center' },
              { text: 'Homologador / Contraparte', alignment: 'center', bold: true, fontSize: 9, margin: [0, 4, 0, 0] },
              { text: 'Fiscalização Operacional', alignment: 'center', fontSize: 8, color: '#64748b' }
            ]
          }
        ]
      }
    ],
    styles: {
      header: {
        fontSize: 16,
        bold: true,
        color: '#0f172a',
        margin: [0, 0, 0, 2]
      },
      subheader: {
        fontSize: 9,
        bold: true,
        color: '#475569'
      },
      sectionHeader: {
        fontSize: 11,
        bold: true,
        color: '#1e3a8a',
        borderBottom: '1px solid #e2e8f0'
      },
      listItem: {
        fontSize: 10,
        color: '#334155',
        margin: [0, 4, 0, 4],
        lineHeight: 1.3
      }
    },
    defaultStyle: {
      columnGap: 20
    }
  };

  // Trigger download
  pdfMake.createPdf(docDefinition).download(`relatorio-consolidado-${period}.pdf`);
}
