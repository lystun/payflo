import express, { Router } from 'express'
import { CacheKeys, computeKey} from '../../../utils/cache.util'

import {
    getPaymentLinks,
    getPaymentLink,
    getLinkByUrl,
    getPaymentlinkTransactions,
    filterTransactions,
    searchTransactions,
    searchPaymentLinks,
    createPaymentLink,
    enablePaymentLink,
    disablePaymentLink,
    createTransferTransaction,
    chargeCardTransaction,
    updatePaymentLink,
    attachResource,
    filterPaymentLinks,
    detachSplit
} from '../../../controllers/payment.link.controller';

import advanced from '../../../middleware/adanced.mw'

const router: Router = express.Router({ mergeParams: true });

import { protect, authorize } from '../../../middleware/auth.mw'
import { validateChannels as vcd } from '../../../middleware/header.mw';
import PaymentLink from '../../../models/PaymentLink.model';
import { ModelType, PermissionType } from '../../../utils/enums.util';


const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];

router.get('/', vcd, protect, authorize(roles, { entity: ModelType.PAYMENTLINK, actions: [PermissionType.CAN_READ], roles: roles }), advanced(PaymentLink, [], CacheKeys.PaymentLinks, 'name', false), getPaymentLinks);
router.get('/url/:slug', vcd, getLinkByUrl);
router.get('/transactions/:id', vcd, protect, authorize(bizRoles), getPaymentlinkTransactions);
router.get('/:id', vcd, protect, authorize(bizRoles), getPaymentLink);

router.post('/create-transfer/:id', vcd, createTransferTransaction);
router.post('/charge-card/:id', vcd, chargeCardTransaction);
router.post('/search', vcd, protect, authorize(roles, { entity: ModelType.PAYMENTLINK, actions: [PermissionType.CAN_READ], roles: roles }), searchPaymentLinks);
router.post('/filter', vcd, protect, authorize(roles, { entity: ModelType.TRANSACTION, actions: [PermissionType.CAN_READ], roles: roles }), filterPaymentLinks);
router.post('/search-transactions/:id', vcd, protect, authorize(bizRoles), searchTransactions);
router.post('/filter-transactions/:id', vcd, protect, authorize(bizRoles), filterTransactions);
router.post('/:id', vcd, protect, authorize(bizRoles), createPaymentLink);

router.put('/enable/:id', vcd, protect, authorize(bizRoles), enablePaymentLink);
router.put('/disable/:id', vcd, protect, authorize(bizRoles), disablePaymentLink);
router.put('/attach/:id', vcd, protect, authorize(bizRoles), attachResource);
router.put('/detach-split/:id', vcd, protect, authorize(bizRoles), detachSplit);
router.put('/:id', vcd, protect, authorize(bizRoles), updatePaymentLink);

export default router;