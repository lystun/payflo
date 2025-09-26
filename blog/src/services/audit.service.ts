import { NewAuditDTO, UpdateAuditDTO } from '../dtos/audit.dto';
import Audit from '../models/Audit.model';
import { IAuditDoc, IResult } from '../utils/types.util'

class AuditService {

    public result: IResult;

    constructor () {
        this.result = { error: false, message: '', data: null }
    }

    public async createAudit(data: NewAuditDTO): Promise<IAuditDoc> {

        const audit = await Audit.create({
            action: data.action,
            entity: data.entity,
            changes: data.changes,
            description: data.description,
            user: data.user
        });

        return audit;

    }

    

}

export default new AuditService();