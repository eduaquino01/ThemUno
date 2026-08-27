import pkg from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const { PrismaClient } = pkg;

const adapter = new PrismaBetterSqlite3({
  url: 'file:dev.db',
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Clearing database...');
  await prisma.contractCredential.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.contractRisk.deleteMany({});
  await prisma.changeRequest.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.contract.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.monthlyReport.deleteMany({});

  console.log('Seeding CLMS database...');

  // 0. Companies
  const companySmarttsRJ = await prisma.company.create({
    data: {
      name: 'Smartts Utilities RJ',
      code: 'SMARTTS-RJ',
      tax_id: '12.345.678/0001-10',
      color: '#2563eb',
      is_holding: false,
    },
  });

  const companySmarttsCE = await prisma.company.create({
    data: {
      name: 'Smartts Utilities CE',
      code: 'SMARTTS-CE',
      tax_id: '12.345.678/0002-20',
      color: '#0284c7',
      is_holding: false,
    },
  });

  const companyIntegra = await prisma.company.create({
    data: {
      name: 'Íntegra Utilities',
      code: 'INTEGRA',
      tax_id: '98.765.432/0001-99',
      color: '#059669',
      is_holding: false,
    },
  });

  const companyAba = await prisma.company.create({
    data: {
      name: 'ABA Blockchain',
      code: 'ABA-BLOCK',
      tax_id: '45.678.910/0001-33',
      color: '#7c3aed',
      is_holding: false,
    },
  });

  const companyInfometter = await prisma.company.create({
    data: {
      name: 'Infometter',
      code: 'INFOMETTER',
      tax_id: '34.892.104/0001-52',
      color: '#d97706',
      is_holding: false,
    },
  });

  // 1. Smartts Utilities RJ - Contrato Operacional RJ
  const smarttsRJContract = await prisma.contract.create({
    data: {
      company_id: companySmarttsRJ.id,
      title: 'Contrato de Gestão e Operação de Infrastructure Utilities RJ',
      type: 'MSA',
      nature: 'EXPENSE',
      counterpart: 'Smartts Utilities RJ Ltda',
      status: 'ACTIVE',
      start_date: new Date('2026-01-01'),
      end_date: new Date('2027-12-31'),
      auto_renewal: true,
      notice_period_days: 60,
      total_value: 580000.00,
      raw_text_or_url: 'https://storage.googleapis.com/clms-contracts/smartts-rj-2026.pdf',
    },
  });

  // 2. Smartts Utilities CE - Contrato Operacional CE
  const smarttsCEContract = await prisma.contract.create({
    data: {
      company_id: companySmarttsCE.id,
      title: 'Contrato de Suporte e Manutenção de Utilities - Região CE',
      type: 'SOW',
      nature: 'EXPENSE',
      counterpart: 'Smartts Utilities CE Ltda',
      status: 'ACTIVE',
      start_date: new Date('2026-02-01'),
      end_date: new Date('2027-01-31'),
      auto_renewal: true,
      notice_period_days: 30,
      total_value: 420000.00,
      raw_text_or_url: 'https://storage.googleapis.com/clms-contracts/smartts-ce-2026.pdf',
    },
  });

  // 3. Íntegra Utilities - Contrato de Integração de Sistemas
  const integraContract = await prisma.contract.create({
    data: {
      company_id: companyIntegra.id,
      title: 'Contrato de Plataforma de Integrabilidade e Automação de Sistemas',
      type: 'SAAS',
      nature: 'EXPENSE',
      counterpart: 'Íntegra Utilities Soluções S/A',
      status: 'ACTIVE',
      start_date: new Date('2026-03-15'),
      end_date: new Date('2027-03-14'),
      auto_renewal: true,
      notice_period_days: 45,
      total_value: 320000.00,
      raw_text_or_url: 'https://storage.googleapis.com/clms-contracts/integra-utilities-2026.pdf',
    },
  });

  // 4. ABA Blockchain - Contrato de Soluções Blockchain
  const abaContract = await prisma.contract.create({
    data: {
      company_id: companyAba.id,
      title: 'Contrato de Desenvolvimento e Infraestrutura ABA Blockchain',
      type: 'SOW',
      nature: 'EXPENSE',
      counterpart: 'ABA Blockchain Technologies Ltd.',
      status: 'ACTIVE',
      start_date: new Date('2026-04-01'),
      end_date: new Date('2027-03-31'),
      auto_renewal: false,
      notice_period_days: 30,
      total_value: 650000.00,
      raw_text_or_url: 'https://storage.googleapis.com/clms-contracts/aba-blockchain-2026.pdf',
    },
  });

  // 5. Infometter - Contrato de Licenciamento e Serviços
  const infometterContract = await prisma.contract.create({
    data: {
      company_id: companyInfometter.id,
      title: 'Contrato de Licenciamento de Software e Serviços Infometter',
      type: 'SAAS',
      nature: 'EXPENSE',
      counterpart: 'Infometter Tecnologia e Serviços Ltda',
      status: 'ACTIVE',
      start_date: new Date('2026-01-01'),
      end_date: new Date('2026-12-31'),
      auto_renewal: true,
      notice_period_days: 30,
      total_value: 360000.00,
      raw_text_or_url: 'https://storage.googleapis.com/clms-contracts/infometter-2026.pdf',
    },
  });

  // --- Milestones for Smartts Utilities RJ Contract ---
  const m1 = await prisma.milestone.create({
    data: {
      contract_id: smarttsRJContract.id,
      title: 'Milestone 1: Mapeamento de Infraestrutura & Diagnóstico Operacional RJ',
      scope_description: 'Levantamento detalhado e auditoria de campo em todas as subestações e utilidades da região RJ.',
      due_date: new Date('2026-04-15'),
      acceptance_criteria: 'Relatório técnico assinado pela diretoria e mapa de ativos validado.',
      acceptance_status: 'ACCEPTED',
      billing_value: 120000.00,
    },
  });

  const m2 = await prisma.milestone.create({
    data: {
      contract_id: smarttsRJContract.id,
      title: 'Milestone 2: Implantação de Sensores IoT & Telemetria',
      scope_description: 'Instalação e integração da malha de sensores de telemetria em tempo real.',
      due_date: new Date('2026-07-15'),
      acceptance_criteria: 'Zero perda de pacotes e latência de leitura abaixo de 10ms.',
      acceptance_status: 'ACCEPTED',
      billing_value: 180000.00,
    },
  });

  const m3 = await prisma.milestone.create({
    data: {
      contract_id: smarttsRJContract.id,
      title: 'Milestone 3: Rollout do Painel de Controle Operacional',
      scope_description: 'Entrega do painel centralizado de monitoramento e automação de alertas.',
      due_date: new Date('2026-10-15'),
      acceptance_criteria: 'Painel ativo com 99.9% de uptime garantido nos testes de homologação.',
      acceptance_status: 'PENDING',
      billing_value: 150000.00,
    },
  });

  // --- Change Requests ---
  await prisma.changeRequest.create({
    data: {
      contract_id: smarttsRJContract.id,
      title: 'Expansão de Escopo - Cobertura de Pontos Adicionais em Niteroi',
      requested_by: 'Eng. Roberto Santos',
      scope_impact: 'Inclusão de 15 pontos adicionais de monitoramento de utilidades.',
      financial_impact: 45000.00,
      time_impact_days: 15,
      status: 'APPROVED',
    },
  });

  await prisma.changeRequest.create({
    data: {
      contract_id: abaContract.id,
      title: 'Implementação de Módulo de Rastreabilidade em Blockchain',
      requested_by: 'Tech Lead ABA',
      scope_impact: 'Desenvolvimento de smart contracts para registro imutável de medições.',
      financial_impact: 68000.00,
      time_impact_days: 25,
      status: 'SUBMITTED',
    },
  });

  // --- Risks Matrix for Contracts ---
  await prisma.contractRisk.create({
    data: {
      contract_id: smarttsRJContract.id,
      category: 'OPERATIONAL',
      risk_level: 'HIGH',
      description: 'Risco de interrupção temporária durante a troca de sensores de telemetria.',
      mitigation_plan: 'Executar janelas de manutenção em horários de menor tráfego operacional.',
      status: 'MITIGATED',
    },
  });

  await prisma.contractRisk.create({
    data: {
      contract_id: abaContract.id,
      category: 'FINANCIAL',
      risk_level: 'CRITICAL',
      description: 'Oscilação nas taxas de gas/transação da rede Blockchain.',
      mitigation_plan: 'Adotar solução de Layer 2 com taxas fixadas em contrato.',
      status: 'IDENTIFIED',
    },
  });

  await prisma.contractRisk.create({
    data: {
      contract_id: integraContract.id,
      category: 'COMPLIANCE',
      risk_level: 'MEDIUM',
      description: 'Conformidade com padrões de integração de APIs governamentais.',
      mitigation_plan: 'Realizar auditoria prévia dos pacotes de dados enviados.',
      status: 'MONITORED',
    },
  });

  // --- Invoices ---
  await prisma.invoice.create({
    data: {
      contract_id: smarttsRJContract.id,
      milestone_id: m1.id,
      invoice_number: 'INV-RJ-2026-001',
      issue_date: new Date('2026-04-20'),
      due_date: new Date('2026-05-20'),
      amount: 120000.00,
      status: 'PAID',
      payment_proof_url: 'https://storage.googleapis.com/clms-invoices/proofs/pay-rj-001.pdf',
    },
  });

  await prisma.invoice.create({
    data: {
      contract_id: smarttsRJContract.id,
      milestone_id: m2.id,
      invoice_number: 'INV-RJ-2026-002',
      issue_date: new Date('2026-07-18'),
      due_date: new Date('2026-08-18'),
      amount: 180000.00,
      status: 'ISSUED',
    },
  });

  await prisma.invoice.create({
    data: {
      contract_id: infometterContract.id,
      invoice_number: 'INV-INFOMETTER-07',
      issue_date: new Date('2026-07-01'),
      due_date: new Date('2026-07-31'),
      amount: 30000.00,
      status: 'PAID',
      payment_proof_url: 'https://storage.googleapis.com/clms-invoices/proofs/infometter-july.pdf',
    },
  });

  // --- Monthly Reports ---
  await prisma.monthlyReport.create({
    data: {
      period_month_year: '2026-07',
      performed_activities: [
        'Completed Milestone 2 for ERP Migration: Database migration replication tests validated successfully in dev.',
        'Reviewed Apex SLA helpdesk performance: identified response breaches on critical tickets, logged dispute.',
        'Assessed Cloud Outsourcing risk profile: created encryption strategy for legacy storage buckets.',
      ],
      next_month_plan: [
        'Initiate Milestone 3 deployment in staging environment for ERP Migration.',
        'Resolve Apex SLA invoice dispute through mediation on contract terms.',
        'Perform annual compliance audit for Nexus Cloud Systems.',
      ],
      status: 'CONSOLIDATED',
      generated_pdf_url: 'https://storage.googleapis.com/clms-reports/monthly-report-2026-07.pdf',
    },
  });

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
