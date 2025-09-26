import express from 'express';
import { CacheKeys } from '../../../utils/cache.util'

import {
    checkBaniWebohook,
    getBaniPayoutBanks,
    getBaniCollectionBanks,
    getBaniMobilDataPlans,
    getBaniBillerCategories,
    getBaniBillerSubCategories,
    validateBaniBiller,
    validateBaniBillTransaction,
    findBillerBySubCategory,
    generateBaniAccount,
    switchProvider,
    getProviders,
    getEnabledProviders,
    checkNinePSBWebhook,
    getPSBTransferBanks,
    getLedgerBalance,
    resolveBankAccount,
    fundPSBBankAccount,
    checkPaystackWebhook,
    getPaystackBanks,
    getPSBMobileDataPlans,
    getPSBMobileNetwork,
    getPSBSubCategories,
    getPSBillerCategories,
    getPSBillStatus,
    validatePSBiller,
    generatePSBAccount,
    updateTransactionFee,
    checkInterswitchWebhook,
    testProvider,
    checkBlusaltWebhook,
    checkOwnedWebhook,
    enableProvider,
    disableProvider,
    getTransactionDetails
} from '../../../controllers/provider.controller';

import advanced from '../../../middleware/adanced.mw';

const router = express.Router({ mergeParams: true });

import { protect, authorize } from '../../../middleware/auth.mw';
import { validateChannels as vcd } from '../../../middleware/header.mw'
import Provider from '../../../models/Provider.model';


const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];

router.get('/', vcd, protect, authorize(roles), advanced(Provider, [], CacheKeys.Providers, 'name', false), getProviders);
router.get('/all', vcd, protect, authorize(roles), getEnabledProviders);

// bani routers
router.get('/bani/payout-banks', vcd, getBaniPayoutBanks);
router.get('/bani/collection-banks', vcd, getBaniCollectionBanks);
router.get('/bani/biller-categories', vcd, getBaniBillerCategories);

router.post('/bani/generate-account/:id', vcd, protect, authorize(roles), generateBaniAccount);
router.post('/bani/data-plans', vcd, getBaniMobilDataPlans);
router.post('/bani/sub-categories', vcd, getBaniBillerSubCategories);
router.post('/bani/validate-biller', vcd, validateBaniBiller);
router.post('/bani/validate-bill', vcd, validateBaniBillTransaction);
router.post('/bani/find-category', vcd, findBillerBySubCategory);

// NinePSB routers
router.get('/ninepsb/transfer-banks', vcd, getPSBTransferBanks);
router.get('/ninepsb/biller-categories', vcd, getPSBillerCategories);
router.post('/ninepsb/generate-account/:id', vcd, protect, authorize(roles), generatePSBAccount);
router.post('/ninepsb/data-plans', vcd, getPSBMobileDataPlans);
router.post('/ninepsb/sub-categories', vcd, getPSBSubCategories);
router.post('/ninepsb/bill-status', vcd, getPSBillStatus);
router.post('/ninepsb/validate-bill', vcd, validatePSBiller);
router.post('/ninepsb/get-network', vcd, getPSBMobileNetwork);
router.post('/ninepsb/fund-account/:id', vcd,  protect, authorize(['superadmin', 'admin']), fundPSBBankAccount);

// Paystack routers
router.get('/paystack/list-banks', vcd, getPaystackBanks);

// webhook routers
router.post('/bani', checkBaniWebohook);
router.post('/ninepsb', checkNinePSBWebhook);
router.post('/paystack', checkPaystackWebhook);
router.post('/interswitch', checkInterswitchWebhook);
router.post('/blusalt', checkBlusaltWebhook);
router.post('/owned', checkOwnedWebhook);

// general routes
router.post('/test-provider', vcd, testProvider);
router.post('/ledger-balance', vcd, protect, authorize(['superadmin', 'admin']), getLedgerBalance);
router.post('/resolve-account', vcd, resolveBankAccount);
router.post('/get-transaction', vcd, protect, authorize(roles), getTransactionDetails);

router.put('/switch-provider', vcd, protect, authorize(['superadmin']), switchProvider);
router.put('/update-fee', vcd, protect, authorize(['superadmin']), updateTransactionFee);
router.put('/enable/:id', vcd, protect, authorize(['superadmin']), enableProvider);
router.put('/disable/:id', vcd, protect, authorize(['superadmin']), disableProvider);


export default router;