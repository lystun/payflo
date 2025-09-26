import express, { Router } from 'express'
import { CacheKeys, computeKey} from '../../../utils/cache.util'

import {
    getMobileDataPlans,
    getBillers,
    getBillerSubCategories,
    getBillProducts,
    validateBiller,
    validateBillTransaction,
    getTopUpStatus
} from '../../../controllers/vas.controller';

import advanced from '../../../middleware/adanced.mw'

const router: Router = express.Router({ mergeParams: true });

import { protect, authorize } from '../../../middleware/auth.mw'
import { validateChannels as vcd } from '../../../middleware/header.mw';

const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];

router.get('/bill-categories', vcd, protect, authorize(teamRoles), getBillers);

router.post('/mobile-data-plans', vcd, protect, authorize(teamRoles), getMobileDataPlans);
router.post('/bill-sub-categories', vcd, protect, authorize(teamRoles), getBillerSubCategories);
router.post('/bill-products', vcd, protect, authorize(teamRoles), getBillProducts);
router.post('/validate-biller', vcd, protect, authorize(teamRoles), validateBiller);
router.post('/bill-status', vcd, protect, authorize(teamRoles), validateBillTransaction);
router.post('/topup-status', vcd, protect, authorize(teamRoles), getTopUpStatus);

export default router;