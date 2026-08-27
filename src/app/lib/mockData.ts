export interface Contract {
  id: string;
  title: string;
  type: 'MSA' | 'SOW' | 'SLA' | 'SAAS' | 'NDA' | 'HARDWARE' | 'PARTNERSHIP' | 'AMENDMENT';
  counterpart: string;
  status: 'DRAFT' | 'IN_REVIEW' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  start_date: string;
  end_date: string;
  auto_renewal: boolean;
  notice_period_days: number;
  total_value: number;
  raw_text_or_url?: string;
}

export interface Milestone {
  id: string;
  contract_id: string;
  contract_title?: string;
  title: string;
  scope_description: string;
  due_date: string;
  acceptance_criteria: string;
  acceptance_status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  billing_value: number;
  invoice_id?: string;
}

export interface ChangeRequest {
  id: string;
  contract_id: string;
  contract_title?: string;
  title: string;
  requested_by: string;
  scope_impact: string;
  financial_impact: number;
  time_impact_days: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  created_at: string;
}

export interface ContractRisk {
  id: string;
  contract_id: string;
  contract_title?: string;
  category: 'LGPD' | 'FINANCIAL' | 'OPERATIONAL' | 'IP' | 'COMPLIANCE';
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  mitigation_plan: string;
  status: 'IDENTIFIED' | 'MITIGATED' | 'MONITORED';
}

export interface Invoice {
  id: string;
  contract_id: string;
  contract_title?: string;
  milestone_id?: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  amount: number;
  status: 'PENDING_ACCEPTANCE' | 'ISSUED' | 'PAID' | 'DISPUTED';
  payment_proof_url?: string;
}

export interface MonthlyReport {
  id: string;
  period_month_year: string;
  performed_activities: string[];
  next_month_plan: string[];
  status: 'DRAFT' | 'CONSOLIDATED' | 'SENT';
  generated_pdf_url?: string;
}

// Arrays limpos por solicitação do usuário
export const MOCK_CONTRACTS: Contract[] = [];
export const MOCK_MILESTONES: Milestone[] = [];
export const MOCK_CHANGE_REQUESTS: ChangeRequest[] = [];
export const MOCK_RISKS: ContractRisk[] = [];
export const MOCK_INVOICES: Invoice[] = [];
export const MOCK_MONTHLY_REPORTS: MonthlyReport[] = [];
