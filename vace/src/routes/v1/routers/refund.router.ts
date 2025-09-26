import express, { Router } from 'express'
import { CacheKeys, computeKey} from '../../../utils/cache.util'

import {
    getRefunds,
    getRefund,
    getRefundByCode,
    searchRefunds,
    filterRefunds,
    createRefund
} from '../../../controllers/refund.controller';

import advanced from '../../../middleware/adanced.mw'

const router: Router = express.Router({ mergeParams: true });

import { protect, authorize } from '../../../middleware/auth.mw'
import { validateChannels as vcd } from '../../../middleware/header.mw';
import Refund from '../../../models/Refund.model';
import { ModelType, PermissionType } from '../../../utils/enums.util';


const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];

router.get('/', vcd, protect, authorize(roles, { entity: ModelType.REFUND, actions: [PermissionType.CAN_READ], roles: roles }), advanced(Refund, [
    { path: 'transaction'},
    { path: 'business', select: '_id email name officialEmail' },
    { path: 'provider' }
], CacheKeys.Refunds, 'code', false), getRefunds);
router.get('/by-code', vcd, protect, authorize(roles, { entity: ModelType.REFUND, actions: [PermissionType.CAN_READ], roles: roles }), getRefundByCode);
router.get('/:id', vcd, protect, authorize(teamRoles), getRefund);

router.post('/search', vcd, protect, authorize(roles, { entity: ModelType.REFUND, actions: [PermissionType.CAN_READ], roles: roles }), searchRefunds);
router.post('/filter', vcd, protect, authorize(teamRoles), filterRefunds);
router.post('/', vcd, protect, authorize(teamRoles), createRefund);

export default router;