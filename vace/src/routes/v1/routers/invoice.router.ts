import express, { Router } from 'express'
import { CacheKeys, computeKey} from '../../../utils/cache.util'

import {
    getInvoices,
    getInvoice,
    searchInvoices,
    filterInvoices,
    createInvoice,
    enableInvoice,
    disableInvoice,
    removeItem,
    updateInvoice,
    getInvoiceByCode,
    getInvoiceTransactions,
    searchTransactions,
    filterTransactions
} from '../../../controllers/invoice.controller';

import advanced from '../../../middleware/adanced.mw'

const router: Router = express.Router({ mergeParams: true });

import { protect, authorize } from '../../../middleware/auth.mw'
import { validateChannels as vcd } from '../../../middleware/header.mw';
import Invoice from '../../../models/Invoice.model';
import { ModelType, PermissionType } from '../../../utils/enums.util';


const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];

router.get('/', vcd, protect, authorize(roles, { entity: ModelType.INVOICE, actions: [PermissionType.CAN_READ], roles: roles }), advanced(Invoice, [], CacheKeys.Invoices, 'name', false), getInvoices);
router.get('/by-code/:code', vcd, getInvoiceByCode);
router.get('/transactions/:id', vcd, protect, authorize(teamRoles), getInvoiceTransactions);
router.get('/:id', vcd, protect, authorize(teamRoles), getInvoice);

router.post('/search', vcd, protect, authorize(roles, { entity: ModelType.INVOICE, actions: [PermissionType.CAN_READ], roles: roles }), searchInvoices);
router.post('/filter', vcd, protect, authorize(roles, { entity: ModelType.INVOICE, actions: [PermissionType.CAN_READ], roles: roles }), filterInvoices);
router.post('/search-transactions/:id', vcd, protect, authorize(bizRoles), searchTransactions);
router.post('/filter-transactions/:id', vcd, protect, authorize(bizRoles), filterTransactions);
router.post('/:id', vcd, protect, authorize(teamRoles), createInvoice);

router.put('/enable/:id', vcd, protect, authorize(bizRoles), enableInvoice);
router.put('/disable/:id', vcd, protect, authorize(bizRoles), disableInvoice);
router.put('/remove-item/:id', vcd, protect, authorize(bizRoles), removeItem);
router.put('/:id', vcd, protect, authorize(bizRoles), updateInvoice);

export default router;