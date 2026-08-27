import pkg from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const { PrismaClient } = pkg;

const adapter = new PrismaBetterSqlite3({
  url: 'file:dev.db',
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Clearing database...');
  await prisma.invoice.deleteMany({});
  await prisma.contractRisk.deleteMany({});
  await prisma.changeRequest.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.contract.deleteMany({});
  await prisma.monthlyReport.deleteMany({});

  console.log('Seeding CLMS database...');

  // 1. MSA Contract (Master Services Agreement)
  const msa = await prisma.contract.create({
    data: {
      title: 'Master Services Agreement - Cloud Infrastructure Outsourcing',
      type: 'MSA',
      counterpart: 'Nexus Cloud Systems Ltd.',
      status: 'ACTIVE',
      start_date: new Date('2026-01-01'),
      end_date: new Date('2027-12-31'),
      auto_renewal: true,
      notice_period_days: 90,
      total_value: 1200000.00,
      raw_text_or_url: 'https://storage.googleapis.com/clms-contracts/msa-nexus-2026.pdf',
    },
  });

  // 2. SOW Contract (Statement of Work) - linked to MSA counterpart
  const sow = await prisma.contract.create({
    data: {
      title: 'SOW #01 - Migration of Core ERP to Google Cloud Platform',
      type: 'SOW',
      counterpart: 'Nexus Cloud Systems Ltd.',
      status: 'ACTIVE',
      start_date: new Date('2026-02-15'),
      end_date: new Date('2026-12-15'),
      auto_renewal: false,
      notice_period_days: 30,
      total_value: 450000.00,
      raw_text_or_url: 'https://storage.googleapis.com/clms-contracts/sow-nexus-erp-migration.pdf',
    },
  });

  // 3. SLA Contract (Service Level Agreement)
  const sla = await prisma.contract.create({
    data: {
      title: 'SLA - Core Applications 24/7 Managed Support Services',
      type: 'SLA',
      counterpart: 'Apex Helpdesk Corp.',
      status: 'ACTIVE',
      start_date: new Date('2026-03-01'),
      end_date: new Date('2027-02-28'),
      auto_renewal: true,
      notice_period_days: 60,
      total_value: 180000.00,
      raw_text_or_url: 'https://storage.googleapis.com/clms-contracts/sla-apex-support.pdf',
    },
  });

  // 4. SaaS Subscription Agreement
  const saas = await prisma.contract.create({
    data: {
      title: 'Enterprise Licence Agreement - Analytics Dashboard Suite',
      type: 'SAAS',
      counterpart: 'Insightful BI LLC',
      status: 'ACTIVE',
      start_date: new Date('2026-06-01'),
      end_date: new Date('2027-05-31'),
      auto_renewal: true,
      notice_period_days: 45,
      total_value: 75000.00,
      raw_text_or_url: 'https://storage.googleapis.com/clms-contracts/saas-insightful-bi.pdf',
    },
  });

  // 5. NDA Contract (Non-Disclosure Agreement)
  const nda = await prisma.contract.create({
    data: {
      title: 'Mutual NDA for Strategic Partnerships Exploration',
      type: 'NDA',
      counterpart: 'Synergy Devs Inc.',
      status: 'ACTIVE',
      start_date: new Date('2026-08-01'),
      end_date: new Date('2029-07-31'),
      auto_renewal: false,
      notice_period_days: 0,
      total_value: 0.00,
      raw_text_or_url: 'https://storage.googleapis.com/clms-contracts/mnda-synergy-devs.pdf',
    },
  });

  // --- Milestones for SOW Contract (ERP Migration) ---
  const m1 = await prisma.milestone.create({
    data: {
      contract_id: sow.id,
      title: 'Milestone 1: Blueprint & Architecture Design Approval',
      scope_description: 'Delivery and formal acceptance of the Cloud Architecture Blueprint and Migration Path Plan.',
      due_date: new Date('2026-04-15'),
      acceptance_criteria: 'Architectural diagrams signed off by IT Director, and migration security framework cleared.',
      acceptance_status: 'ACCEPTED',
      billing_value: 90000.00,
    },
  });

  const m2 = await prisma.milestone.create({
    data: {
      contract_id: sow.id,
      title: 'Milestone 2: Database Migration & Schema Mapping',
      scope_description: 'Migration of database schemas, replication test, and initial validation run in dev environment.',
      due_date: new Date('2026-07-15'),
      acceptance_criteria: 'Zero data mismatch on 10M rows test sync. Read latency under 5ms.',
      acceptance_status: 'ACCEPTED',
      billing_value: 135000.00,
    },
  });

  const m3 = await prisma.milestone.create({
    data: {
      contract_id: sow.id,
      title: 'Milestone 3: Application Deployment in Staging',
      scope_description: 'Full stack deployment in staging environment, integration tests, and performance load test.',
      due_date: new Date('2026-10-15'),
      acceptance_criteria: 'All services running. Load testing exceeding 1000 requests/second with error rate < 0.1%.',
      acceptance_status: 'PENDING',
      billing_value: 135000.00,
    },
  });

  const m4 = await prisma.milestone.create({
    data: {
      contract_id: sow.id,
      title: 'Milestone 4: Final Go-Live & Post-Migration Hypercare',
      scope_description: 'Production switchover, data reconciliation validation, and 30 days of direct support.',
      due_date: new Date('2026-12-15'),
      acceptance_criteria: 'Production environment active. Support tickets resolved within standard operational times.',
      acceptance_status: 'PENDING',
      billing_value: 90000.00,
    },
  });

  // --- Change Requests for SOW Contract (ERP Migration) ---
  await prisma.changeRequest.create({
    data: {
      contract_id: sow.id,
      title: 'Scope Expansion - Additional Dev/Test Environments Setup',
      requested_by: 'PM John Doe',
      scope_impact: 'Provisioning and configuration of 2 supplementary isolated environments for QA testing.',
      financial_impact: 18500.00,
      time_impact_days: 10,
      status: 'APPROVED',
    },
  });

  await prisma.changeRequest.create({
    data: {
      contract_id: sow.id,
      title: 'Legacy System Integration Connector development',
      requested_by: 'PM Jane Smith',
      scope_impact: 'Coding of custom legacy connectors for direct on-premise ledger sync.',
      financial_impact: 32000.00,
      time_impact_days: 20,
      status: 'SUBMITTED',
    },
  });

  // --- Risks Matrix for Contracts ---
  await prisma.contractRisk.create({
    data: {
      contract_id: sow.id,
      category: 'LGPD',
      risk_level: 'CRITICAL',
      description: 'Storage of sensitive legacy user profile records in Cloud Storage without field encryption.',
      mitigation_plan: 'Enforce application-level envelope encryption prior to upload. Restrict IAM permissions.',
      status: 'IDENTIFIED',
    },
  });

  await prisma.contractRisk.create({
    data: {
      contract_id: msa.id,
      category: 'FINANCIAL',
      risk_level: 'HIGH',
      description: 'Currency exchange fluctuation impact on hourly rate adjustments for overseas specialists.',
      mitigation_plan: 'Define fixed rate bands with standard indexing applied annually.',
      status: 'MITIGATED',
    },
  });

  await prisma.contractRisk.create({
    data: {
      contract_id: sla.id,
      category: 'OPERATIONAL',
      risk_level: 'MEDIUM',
      description: 'Potential support response delays during year-end peak infrastructure activity.',
      mitigation_plan: 'Mandate temporary staff scale-up and pre-scheduled change windows.',
      status: 'MONITORED',
    },
  });

  // --- Invoices & Reconciliation Log ---
  // Invoice for Milestone 1 (Accepted and Issued/Paid)
  await prisma.invoice.create({
    data: {
      contract_id: sow.id,
      milestone_id: m1.id,
      invoice_number: 'INV-2026-001',
      issue_date: new Date('2026-04-20'),
      due_date: new Date('2026-05-20'),
      amount: 90000.00,
      status: 'PAID',
      payment_proof_url: 'https://storage.googleapis.com/clms-invoices/proofs/pay-001.pdf',
    },
  });

  // Invoice for Milestone 2 (Accepted, Invoice Issued but Pending Payment)
  await prisma.invoice.create({
    data: {
      contract_id: sow.id,
      milestone_id: m2.id,
      invoice_number: 'INV-2026-008',
      issue_date: new Date('2026-07-18'),
      due_date: new Date('2026-08-18'),
      amount: 135000.00,
      status: 'ISSUED',
    },
  });

  // Disputed Invoice for SLA Managed Support
  await prisma.invoice.create({
    data: {
      contract_id: sla.id,
      invoice_number: 'INV-APEX-492',
      issue_date: new Date('2026-07-01'),
      due_date: new Date('2026-07-31'),
      amount: 15000.00,
      status: 'DISPUTED',
      payment_proof_url: 'https://storage.googleapis.com/clms-invoices/disputes/apex-july-claims.pdf',
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
