import express, { Router } from 'express'
import { CacheKeys, computeKey} from '../../../utils/cache.util'

import {
    getBusinessAccount,
    getWalletDetails,
    getWalletTransactions,
    sendMoneyFromWallet,
    withdrawFromWallet,
    buyAirtime,
    buyData,
    payBill,
    getBusinessProducts,
    getProduct,
    searchProducts,
    filterProducts,
    createProduct,
    updateProduct,
    getBusinessPaymentLinks,
    getPaymentLink,
    searchPaymentLinks,
    filterPaymentLinks,
    getPaymentlinkTransactions,
    createPaymentLink,
    enablePaymentLink,
    disablePaymentLink,
    attachLinkResource,
    detachLinkSplit,
    updatePaymentLink,
    getBusinessSubaccounts,
    getSubaccount,
    searchSubaccounts,
    filterSubaccounts,
    createSubaccount,
    updateSubaccount,
    getBusinessInvoices,
    getInvoice,
    searchInvoices,
    filterInvoices,
    createInvoice,
    removeInvoiceItem,
    updateInvoice,
    getBusinessBanks,
    getBusinessTransactions,
    verifyTransaction,
    getTransaction,
    filterTransactions,
    searchTransactions,
    getBeneficiaries,
    addBusinessBank,
    getBusinessRefunds,
    getRefund,
    createRefund,
    resolveBankAccount,
    updateSettlementBank,
    validateBiller,
    getTopUpStatus,
    validateBillTransaction,
    initializeTransaction
} from '../../../controllers/corporate.controller';

import { 
    getBillers,
    getBillerSubCategories,
    getMobileDataPlans
}  from '../../../controllers/vas.controller'

import advanced from '../../../middleware/adanced.mw'

const router: Router = express.Router({ mergeParams: true });

import { protect, authorize } from '../../../middleware/auth.mw'
import { validateChannels as vcd } from '../../../middleware/header.mw';

const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];

router.get('/account', vcd, protect, authorize(bizRoles), getBusinessAccount);
router.get('/wallet', vcd, protect, authorize(bizRoles), getWalletDetails);
router.get('/wallet-transactions', vcd, protect, authorize(bizRoles), getWalletTransactions);
router.get('/products', vcd, protect, authorize(bizRoles), getBusinessProducts);
router.get('/product/:code', vcd, protect, authorize(bizRoles), getProduct);
router.get('/payments', vcd, protect, authorize(bizRoles), getBusinessPaymentLinks);
router.get('/payment/:slug', vcd, protect, authorize(bizRoles), getPaymentLink);
router.get('/payment-transactions/:slug', vcd, protect, authorize(bizRoles), getPaymentlinkTransactions);
router.get('/subaccounts', vcd, protect, authorize(bizRoles), getBusinessSubaccounts);
router.get('/subaccount/:code', vcd, protect, authorize(bizRoles), getSubaccount);
router.get('/invoices', vcd, protect, authorize(bizRoles), getBusinessInvoices);
router.get('/invoice/:code', vcd, protect, authorize(bizRoles), getInvoice);
router.get('/banks', vcd, protect, authorize(bizRoles), getBusinessBanks);
router.get('/beneficiaries', vcd, protect, authorize(bizRoles), getBeneficiaries);
router.get('/transactions', vcd, protect, authorize(bizRoles), getBusinessTransactions);
router.get('/transaction/:ref', vcd, protect, authorize(bizRoles), getTransaction);
router.get('/refunds', vcd, protect, authorize(bizRoles), getBusinessRefunds);
router.get('/refund/:code', vcd, protect, authorize(bizRoles), getRefund);
router.get('/bill-categories', vcd, protect, authorize(teamRoles), getBillers);

router.post('/mobile-data-plans', vcd, protect, authorize(teamRoles), getMobileDataPlans);
router.post('/bill-sub-categories', vcd, protect, authorize(teamRoles), getBillerSubCategories);
router.post('/product', vcd, protect, authorize(bizRoles), createProduct);
router.post('/search-products', vcd, protect, authorize(bizRoles), searchProducts);
router.post('/filter-products', vcd, protect, authorize(bizRoles), filterProducts);
router.post('/search-transactions', vcd, protect, authorize(bizRoles), searchTransactions);
router.post('/filter-transactions', vcd, protect, authorize(bizRoles), filterTransactions);
router.post('/invoice', vcd, protect, authorize(bizRoles), createInvoice);
router.post('/search-invoices', vcd, protect, authorize(bizRoles), searchInvoices);
router.post('/filter-invoices', vcd, protect, authorize(bizRoles), filterInvoices);
router.post('/subaccount', vcd, protect, authorize(bizRoles), createSubaccount);
router.post('/search-subaccounts', vcd, protect, authorize(bizRoles), searchSubaccounts);
router.post('/filter-subaccounts', vcd, protect, authorize(bizRoles), filterSubaccounts)
router.post('/payment', vcd, protect, authorize(bizRoles), createPaymentLink);
router.post('/search-payments', vcd, protect, authorize(bizRoles), searchPaymentLinks);
router.post('/filter-payments', vcd, protect, authorize(bizRoles), filterPaymentLinks);
router.post('/transfer', vcd, protect, authorize(bizRoles), sendMoneyFromWallet);
router.post('/withdraw', vcd, protect, authorize(bizRoles), withdrawFromWallet);
router.post('/airtime', vcd, protect, authorize(bizRoles), buyAirtime);
router.post('/data', vcd, protect, authorize(bizRoles), buyData);
router.post('/bill', vcd, protect, authorize(bizRoles), payBill);
router.post('/bank', vcd, protect, authorize(bizRoles), addBusinessBank);
router.post('/refund', vcd, protect, authorize(bizRoles), createRefund);
router.post('/resolve', vcd, protect, authorize(bizRoles), resolveBankAccount);
router.post('/verify-transaction', vcd, protect, authorize(bizRoles), verifyTransaction);
router.post('/validate-biller', vcd, protect, authorize(teamRoles), validateBiller);
router.post('/bill-status', vcd, protect, authorize(teamRoles), validateBillTransaction);
router.post('/topup-status', vcd, protect, authorize(teamRoles), getTopUpStatus);
router.post('/initialize', vcd, protect, authorize(teamRoles), initializeTransaction);

router.put('/enable-payment/:slug', vcd, protect, authorize(bizRoles), enablePaymentLink);
router.put('/disable-payment/:slug', vcd, protect, authorize(bizRoles), disablePaymentLink);
router.put('/payment-resource/:slug', vcd, protect, authorize(bizRoles), attachLinkResource);
router.put('/remove-subaccount/:slug', vcd, protect, authorize(bizRoles), detachLinkSplit);
router.put('/product/:code', vcd, protect, authorize(bizRoles), updateProduct);
router.put('/payment/:slug', vcd, protect, authorize(bizRoles), updatePaymentLink);
router.put('/subaccount/:code', vcd, protect, authorize(bizRoles), updateSubaccount);
router.put('/remove-invoice-item/:code', vcd, protect, authorize(bizRoles), removeInvoiceItem);
router.put('/invoice/:code', vcd, protect, authorize(bizRoles), updateInvoice);
router.put('/change-settlement-bank', vcd, protect, authorize(bizRoles), updateSettlementBank);


export default router;