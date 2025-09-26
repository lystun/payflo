import { ObjectId } from "mongoose";
import { AuditType } from "../utils/types.util";

export interface NewAuditDTO {
    user: ObjectId,
    action: string,
    entity: string,
    controller?: string,
    type?: AuditType,
    description?: string,
    changes: Record<string, any>
}

export interface UpdateAuditDTO {
    user: ObjectId,
    action?: string,
    type?: AuditType,
    entity?: string,
    description?: string,
    changes?: Record<string, any>
}