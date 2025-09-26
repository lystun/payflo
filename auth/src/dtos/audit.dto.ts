import { ObjectId } from "mongoose";
import { AuditType } from "../utils/types.util";

export interface NewAuditDTO {
    user: any,
    action: string,
    entity: string,
    entityId?: any
    controller?: string,
    type?: AuditType,
    description?: string,
    changes: Record<string, any>
}

export interface UpdateAuditDTO {
    user: ObjectId,
    type?: AuditType,
    action?: string,
    entity?: string,
    description?: string,
    changes?: Record<string, any>
}