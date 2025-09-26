import { AuditType, IUserDoc } from "../utils/types.util";

export interface NewAuditDTO {
    user: IUserDoc,
    action: string,
    entity: string,
    entityId?: any
    controller?: string,
    type?: AuditType,
    description?: string,
    changes: Record<string, any>
}

export interface UpdateAuditDTO {
    user: IUserDoc,
    action?: string,
    type?: AuditType,
    entity?: string,
    description?: string,
    changes?: Record<string, any>
}