import express from 'express';
import { CacheKeys } from '../../../utils/cache.util'

import {
    getWallets,
    getWallet,
    getWalletTransactions,
    sendMoneyFromWallet,
    withdrawFromWallet,
    buyAirtime,
    buyData,
    payBill,
    filterTransactions,
    searchTransactions
} from '../../../controllers/wallet.controller';

import advancedResults from '../../../middleware/adanced.mw';

const router = express.Router({ mergeParams: true });

import { protect, authorize } from '../../../middleware/auth.mw';
import { validateChannels as vcd } from '../../../middleware/header.mw'
import { checkIdempotency as idmp } from '../../../middleware/idempotent.mw'
import Wallet from '../../../models/Wallet.model';
import { ModelType, PermissionType } from '../../../utils/enums.util';


const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];

router.get('/', vcd, protect, authorize(roles, { entity: ModelType.WALLET, actions: [PermissionType.CAN_READ], roles: roles }), advancedResults(Wallet, [], CacheKeys.Wallets, 'name', false), getWallets);
router.get('/transactions/:id', vcd, protect, authorize(roles, { entity: ModelType.WALLET, actions: [PermissionType.CAN_READ], roles: roles }), getWalletTransactions);
router.get('/:id', vcd, protect, authorize(roles, { entity: ModelType.WALLET, actions: [PermissionType.CAN_READ], roles: roles }), getWallet);

router.post('/send-money/:id', vcd, protect, authorize(bizRoles), idmp, sendMoneyFromWallet);
router.post('/withdraw/:id', vcd, protect, authorize(bizRoles), idmp, withdrawFromWallet);
router.post('/buy-airtime/:id', vcd, protect, authorize(bizRoles), buyAirtime);
router.post('/buy-data/:id', vcd, protect, authorize(bizRoles), buyData);
router.post('/bill/:id', vcd, protect, authorize(bizRoles), payBill);
router.post('/search-transactions/:id', vcd, protect, authorize(bizRoles), searchTransactions);
router.post('/filter-transactions/:id', vcd, protect, authorize(bizRoles), filterTransactions);

export default router;