import express, { Router } from 'express'
import { CacheKeys, computeKey} from '../../../utils/cache.util'

import {
    getAudits,
    getAudit,
    getUserAudits
} from '../../../controllers/audit.controller';

import advanced from '../../../middleware/adanced.mw'
import Permission from '../../../models/Permission.model'

const router: Router = express.Router({ mergeParams: true });
import { protect, authorize } from '../../../middleware/auth.mw'
import { validateChannels as vcd } from '../../../middleware/header.mw';
import Audit from '../../../models/Audit.model';

const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];

router.get('/', vcd, protect, authorize(allRoles), advanced(Audit, [
    { path: 'user', select: "_id email firstName lastName businessName userType login" }
], CacheKeys.Audit, 'email', false), getAudits);
router.get('/user-audits/:id', vcd, protect, authorize(allRoles), getUserAudits);
router.get('/:id', vcd, protect, authorize(roles), getAudit);


export default router;