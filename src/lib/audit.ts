import { prisma } from '@/lib/db';

export interface LogAuditParams {
  userId?: string | null;
  companyId?: string | null;
  module: string;
  entityType: string;
  entityId?: string | null;
  action: string;
  previousValues?: any;
  newValues?: any;
  reason?: string | null;
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        user_id: params.userId || null,
        company_id: params.companyId || null,
        module: params.module,
        entity_type: params.entityType,
        entity_id: params.entityId || null,
        action: params.action,
        previous_values: params.previousValues ? JSON.stringify(params.previousValues) : null,
        new_values: params.newValues ? JSON.stringify(params.newValues) : null,
        reason: params.reason || null,
      },
    });
  } catch (error) {
    console.error('Failed to record audit log:', error);
  }
}
