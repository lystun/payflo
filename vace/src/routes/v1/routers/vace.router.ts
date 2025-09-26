import express, { Router } from 'express'
import { CacheKeys, computeKey} from '../../../utils/cache.util'

import {
    getWalletDetails,
    getAccounts,
    getWalletTransactions,
    filterTransactions,
    searchTransactions,
    fundWallet,
    withdrawRevenue,
    swapRevenueFunds,
    runScriptTasks
} from '../../../controllers/vace.controller';

import advanced from '../../../middleware/adanced.mw'

const router: Router = express.Router({ mergeParams: true });

import { protect, authorize } from '../../../middleware/auth.mw'
import { validateChannels as vcd } from '../../../middleware/header.mw';
import { ModelType, PermissionType } from '../../../utils/enums.util';

const roles = ['superadmin', 'admin'];

router.get('/wallet', vcd, protect, authorize(roles, { entity: ModelType.WALLET, actions: [PermissionType.CAN_READ], roles: roles }), getWalletDetails);
router.get('/accounts', vcd, protect, authorize(roles), getAccounts);
router.get('/transactions', vcd, protect, authorize(roles, { entity: ModelType.WALLET, actions: [PermissionType.CAN_READ], roles: roles }), getWalletTransactions);

router.post('/fund-wallet', vcd, protect, authorize(roles, { entity: ModelType.WALLET, actions: [PermissionType.CAN_UPATE], roles: roles }), fundWallet);
router.post('/withdraw-revenue', vcd, protect, authorize(roles, { entity: ModelType.WALLET, actions: [PermissionType.CAN_UPATE], roles: roles }), withdrawRevenue);
router.post('/filter-transactions', vcd, protect, authorize(roles, { entity: ModelType.WALLET, actions: [PermissionType.CAN_READ], roles: roles }), filterTransactions);
router.post('/search-transactions', vcd, protect, authorize(roles, { entity: ModelType.WALLET, actions: [PermissionType.CAN_READ], roles: roles }), searchTransactions);
router.post('/swap-revenue', vcd, protect, authorize(roles, { entity: ModelType.WALLET, actions: [PermissionType.CAN_UPATE], roles: roles }), swapRevenueFunds);

router.put('/run-script', vcd, protect, authorize(['superadmin']), runScriptTasks);

export default router;