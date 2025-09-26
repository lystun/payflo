import express from 'express';
import { CacheKeys } from '../../../utils/cache.util'

import {
    getBusinesses,
    filterBusinesses,
    searchBusinesses,
    getBusiness,
    getWalletDetails,
    getWalletTransactions,
    getBusinessAccounts,
    getBusinessTransactions,
    getBusinessBanks,
    getBeneficiaries,
    getBusinessProducts,
    getBusinessPaymentLinks,
    addBusinessBank,
    searchProducts,
    searchPaymentLinks,
    filterProducts,
    filterPaymentLinks,
    filterTransactions,
    searchTransactions,
    getBusinessInvoices,
    searchInvoices,
    filterInvoices,
    getBusinessSubaccounts,
    searchSubaccounts,
    filterSubaccounts,
    getWebhookData,
    updateWebhookData,
    updateSettlementBank,
    updateSettings,
    setBusinessCharges,
    getBusinessSettlements,
    getSettlementTransactions,
    getSettlementAnalytics,
    exportTransactions,
    getBusinessSettlement,
    deleteAccount
} from '../../../controllers/business.controller';

import advancedResults from '../../../middleware/adanced.mw';

const router = express.Router({ mergeParams: true });

import { protect, authorize } from '../../../middleware/auth.mw';
import { validateChannels as vcd } from '../../../middleware/header.mw'
import Business from '../../../models/Business.model';
import { ModelType, PermissionType } from '../../../utils/enums.util';


const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];

router.get('/', vcd, protect, authorize(roles, { entity: ModelType.BUSINESS, actions: [PermissionType.CAN_READ], roles: roles }), advancedResults(Business, [
    { path: 'user' },
    { path: 'settings' },
    { path: 'accounts', populate: [
        { path: 'provider' }
    ]},
], CacheKeys.Businesses, 'name', false), getBusinesses);
router.get('/webhook/:id', vcd, protect, authorize(teamRoles), getWebhookData);
router.get('/invoices/:id', vcd, protect, authorize(teamRoles), getBusinessInvoices);
router.get('/products/:id', vcd, protect, authorize(teamRoles), getBusinessProducts);
router.get('/subaccounts/:id', vcd, protect, authorize(teamRoles), getBusinessSubaccounts);
router.get('/settlements/:id', vcd, protect, authorize(teamRoles), getBusinessSettlements);
router.get('/payment-links/:id', vcd, protect, authorize(teamRoles), getBusinessPaymentLinks);
router.get('/transactions/:id', vcd, protect, authorize(teamRoles), getBusinessTransactions);
router.get('/banks/:id', vcd, protect, authorize(teamRoles), getBusinessBanks);
router.get('/beneficiaries/:id', vcd, protect, authorize(teamRoles), getBeneficiaries);
router.get('/wallet/:id', vcd, protect, authorize(bizRoles), getWalletDetails);
router.get('/wallet-transactions/:id', vcd, protect, authorize(teamRoles), getWalletTransactions);
router.get('/accounts/:id', vcd, protect, authorize(bizRoles), getBusinessAccounts);
router.get('/get-settlement/:id', vcd, protect, authorize(teamRoles), getBusinessSettlement);
router.get('/:id', vcd, protect, authorize(teamRoles), getBusiness);

router.post('/search', vcd, protect, authorize(roles, { entity: ModelType.BUSINESS, actions: [PermissionType.CAN_READ], roles: roles }), searchBusinesses);
router.post('/filter', vcd, protect, authorize(roles, { entity: ModelType.BUSINESS, actions: [PermissionType.CAN_READ], roles: roles }), filterBusinesses);
router.post('/add-bank/:id', vcd, protect, authorize(bizRoles), addBusinessBank);
router.post('/search-products/:id', vcd, protect, authorize(teamRoles), searchProducts);
router.post('/search-links/:id', vcd, protect, authorize(teamRoles), searchPaymentLinks);
router.post('/search-invoices/:id', vcd, protect, authorize(teamRoles), searchInvoices);
router.post('/search-transactions/:id', vcd, protect, authorize(teamRoles), searchTransactions);
router.post('/search-subaccounts/:id', vcd, protect, authorize(teamRoles), searchSubaccounts);
router.post('/filter-products/:id', vcd, protect, authorize(teamRoles), filterProducts);
router.post('/filter-links/:id', vcd, protect, authorize(teamRoles), filterPaymentLinks);
router.post('/filter-invoices/:id', vcd, protect, authorize(teamRoles), filterInvoices);
router.post('/filter-subaccounts/:id', vcd, protect, authorize(teamRoles), filterSubaccounts);
router.post('/filter-transactions/:id', vcd, protect, authorize(teamRoles), filterTransactions);
router.post('/export-transactions/:id', vcd, protect, authorize(teamRoles), exportTransactions);
router.post('/settlement-transactions/:id', vcd, protect, authorize(teamRoles), getSettlementTransactions);
router.post('/settlement-analytics', vcd, protect, authorize(teamRoles), getSettlementAnalytics);

router.put('/update-settings/:id', vcd, protect, authorize(bizRoles), updateSettings);
router.put('/set-charges/:id', vcd, protect, authorize(roles), setBusinessCharges);
router.put('/update-settlement/:id', vcd, protect, authorize(bizRoles), updateSettlementBank);
router.put('/webhook/:id', vcd, protect, authorize(teamRoles), updateWebhookData);

router.delete('/:id', vcd, protect, authorize(bizRoles), deleteAccount);

export default router;