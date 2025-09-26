import express from 'express';
import { CacheKeys } from '../../../utils/cache.util'

import {
    getTransactions,
    getTransaction,
    getTransactionByReference,
    verifyTransaction,
    cancelTransaction,
    filterTransactions,
    searchTransactions,
    getCardData,
    filterDate,
    syncTransactions,
    failTransaction,
    reverseTransactionAmount,
    exportTransactions
} from '../../../controllers/transaction.controller';

import advanced from '../../../middleware/adanced.mw';

const router = express.Router({ mergeParams: true });

import { protect, authorize } from '../../../middleware/auth.mw';
import { validateChannels as vcd } from '../../../middleware/header.mw'
import Transaction from '../../../models/Transaction.model';
import { ModelType, PermissionType } from '../../../utils/enums.util';


const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];

router.get('/', vcd, protect, 
authorize(roles, { entity: ModelType.TRANSACTION, actions: [PermissionType.CAN_READ], roles: roles }), 
advanced(Transaction, [
    { path: 'provider', select: '_id name legalName code type description' },
    { path: 'card', select: '_id cardBin cardLast expiryMonth expiryYear brand' }
], CacheKeys.Transactions, 'name', false), getTransactions);
router.get('/reference/:ref', vcd, getTransactionByReference);
router.get('/pan/:ref', vcd, protect, authorize(roles), getCardData);
router.get('/:id', vcd, protect, authorize(bizRoles, { entity: ModelType.TRANSACTION, actions: [PermissionType.CAN_READ], roles: roles }), getTransaction);

router.post('/filter-date', vcd, protect, authorize(roles), filterDate)
router.post('/filter', vcd, protect, authorize(roles, { entity: ModelType.TRANSACTION, actions: [PermissionType.CAN_READ], roles: roles }), filterTransactions);
router.post('/search', vcd, protect, authorize(roles, { entity: ModelType.TRANSACTION, actions: [PermissionType.CAN_READ], roles: roles }), searchTransactions);
router.post('/sync', vcd, protect, authorize(roles, { entity: ModelType.TRANSACTION, actions: [PermissionType.CAN_MODIFY, PermissionType.CAN_UPATE], roles: roles }), syncTransactions);
router.post('/reverse', vcd, protect, authorize(roles, { entity: ModelType.TRANSACTION, actions: [PermissionType.CAN_READ, PermissionType.CAN_UPATE], roles: roles }), reverseTransactionAmount);
router.post('/export', vcd, protect, authorize(roles, { entity: ModelType.TRANSACTION, actions: [PermissionType.CAN_READ], roles: roles }), exportTransactions);


router.post('/verify', vcd, verifyTransaction);
router.post('/cancel', vcd, cancelTransaction);
router.post('/fail', vcd, failTransaction);


export default router;