import { NewAuditDTO, UpdateAuditDTO } from '../dtos/audit.dto';
import Audit from '../models/Audit.model';
import User from '../models/User.model';
import { IAuditDoc, IResult } from '../utils/types.util'

class AuditService {

    public result: IResult;

    constructor () {
        this.result = { error: false, message: '', data: null }
    }

    public async createAudit(data: NewAuditDTO): Promise<IAuditDoc> {

        const user = await User.findOne({ _id: data.user });

        const audit = await Audit.create({
            action: data.action,
            entity: data.entity,
            entityId: data.entityId,
            changes: data.changes,
            controller: data.controller,
            type: data.type,
            description: data.description,
            user: data.user,
            email: user ? user.email : ""
        });

        return audit;

    }

    

}

export default new AuditService();