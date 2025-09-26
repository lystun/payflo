import express, { Router } from 'express'
import { CacheKeys, computeKey} from '../../../utils/cache.util'

import {
    getSettlements,
    getSettlement,
    getSettlementByCode,
    getSettlementByDate,
    searchSettlements,
    filterSettlements,
    filterBusinessTransactions,
    getSettlementTransactions,
    filterTransactions,
    searchTransactions,
    runSettlement,
    getSettlementBusinesses,
    getSettlementHistories,
    getBusinessAnalytics
} from '../../../controllers/settlement.controller';

import advanced from '../../../middleware/adanced.mw'

const router: Router = express.Router({ mergeParams: true });

import { protect, authorize } from '../../../middleware/auth.mw'
import { validateChannels as vcd } from '../../../middleware/header.mw';
import Settlement from '../../../models/Settlement.model';
import { ModelType, PermissionType } from '../../../utils/enums.util';


const roles = ['superadmin', 'admin'];

router.get('/', vcd, protect, authorize(roles, { entity: ModelType.SETTLEMENT, actions: [PermissionType.CAN_READ], roles: roles }), advanced(Settlement, [], CacheKeys.Settlements, 'code', false), getSettlements);
router.get('/transactions/:id', vcd, protect, authorize(roles, { entity: ModelType.SETTLEMENT, actions: [PermissionType.CAN_READ], roles: roles }), getSettlementTransactions);
router.get('/by-code', vcd, protect, authorize(roles, { entity: ModelType.SETTLEMENT, actions: [PermissionType.CAN_READ], roles: roles }), getSettlementByCode);
router.get('/by-date', vcd, protect, authorize(roles, { entity: ModelType.SETTLEMENT, actions: [PermissionType.CAN_READ], roles: roles }), getSettlementByDate);
router.get('/businesses/:id', vcd, protect, authorize(roles, { entity: ModelType.SETTLEMENT, actions: [PermissionType.CAN_READ], roles: roles }), getSettlementBusinesses);
router.get('/histories/:id', vcd, protect, authorize(roles, { entity: ModelType.SETTLEMENT, actions: [PermissionType.CAN_READ], roles: roles }), getSettlementHistories);
router.get('/:id', vcd, protect, authorize(roles, { entity: ModelType.SETTLEMENT, actions: [PermissionType.CAN_READ], roles: roles }), getSettlement);

router.post('/search', vcd, protect, authorize(roles, { entity: ModelType.SETTLEMENT, actions: [PermissionType.CAN_READ], roles: roles }), searchSettlements);
router.post('/filter', vcd, protect, authorize(roles, { entity: ModelType.SETTLEMENT, actions: [PermissionType.CAN_READ], roles: roles }), filterSettlements);
router.post('/search-transactions/:id', vcd, protect, authorize(roles, { entity: ModelType.SETTLEMENT, actions: [PermissionType.CAN_READ], roles: roles }), searchTransactions);
router.post('/filter-transactions/:id', vcd, protect, authorize(roles, { entity: ModelType.SETTLEMENT, actions: [PermissionType.CAN_READ], roles: roles }), filterTransactions);
router.post('/business-transactions', vcd, protect, authorize(roles, { entity: ModelType.SETTLEMENT, actions: [PermissionType.CAN_READ], roles: roles }), filterBusinessTransactions);
router.post('/business-analytics', vcd, protect, authorize(roles, { entity: ModelType.SETTLEMENT, actions: [PermissionType.CAN_READ], roles: roles }), getBusinessAnalytics);
router.post('/run/:id', vcd, protect, authorize(roles, { entity: ModelType.SETTLEMENT, actions: [PermissionType.CAN_UPATE], roles: roles }), runSettlement);

export default router;