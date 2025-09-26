import express, { Router } from 'express'
import { CacheKeys, computeKey} from '../../../utils/cache.util'

import {
    getChargebacks,
    getChargeback,
    getChargebackByCode,
    searchChargebacks,
    filterChargebacks,
    createChargeback,
    acceptChargeback,
    declineChargeback,
    updateChargeback
} from '../../../controllers/chargeback.controller';

import advanced from '../../../middleware/adanced.mw'

const router: Router = express.Router({ mergeParams: true });

import { protect, authorize } from '../../../middleware/auth.mw'
import { validateChannels as vcd } from '../../../middleware/header.mw';
import Chargeback from '../../../models/Chargeback.model';
import { ModelType, PermissionType } from '../../../utils/enums.util';


const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];

router.get('/', vcd, protect, authorize(roles, { entity: ModelType.CHARGEBACK, actions: [PermissionType.CAN_READ], roles: roles }), advanced(Chargeback, [
    { path: 'business', select: '_id email name officialEmail id' }
], CacheKeys.Chargebacks, 'code', false), getChargebacks);
router.get('/by-code', vcd, protect, authorize(roles, { entity: ModelType.CHARGEBACK, actions: [PermissionType.CAN_READ], roles: roles }), getChargebackByCode);
router.get('/:id', vcd, protect, authorize(teamRoles), getChargeback);

router.post('/search', vcd, protect, authorize(roles, { entity: ModelType.CHARGEBACK, actions: [PermissionType.CAN_READ], roles: roles }), searchChargebacks);
router.post('/filter', vcd, protect, authorize(roles, { entity: ModelType.CHARGEBACK, actions: [PermissionType.CAN_READ], roles: roles }), filterChargebacks);
router.post('/', vcd, protect, authorize(roles, { entity: ModelType.CHARGEBACK, actions: [PermissionType.CAN_CREATE], roles: roles }), createChargeback);

router.put('/accept/:id', vcd, protect, authorize(teamRoles), acceptChargeback);
router.put('/decline/:id', vcd, protect, authorize(teamRoles), declineChargeback);
router.put('/:id', vcd, protect, authorize(roles, { entity: ModelType.TRANSACTION, actions: [PermissionType.CAN_UPATE], roles: roles }), updateChargeback);

export default router;