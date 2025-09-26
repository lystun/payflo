import express, { Router } from 'express'
import { CacheKeys, computeKey} from '../../../utils/cache.util'

import {
    getSubaccounts,
    getSubaccount,
    getSubaccountByCode,
    searchSubaccounts,
    filterSubaccounts,
    filterTransactions,
    getTransactions,
    createSubaccount,
    enableSubaccount,
    disableSubaccount,
    updateSubaccount
} from '../../../controllers/subaccount.controller';

import advanced from '../../../middleware/adanced.mw'

const router: Router = express.Router({ mergeParams: true });

import { protect, authorize } from '../../../middleware/auth.mw'
import { validateChannels as vcd } from '../../../middleware/header.mw';
import Subaccount from '../../../models/Subaccount.model';
import { ModelType, PermissionType } from '../../../utils/enums.util';


const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];

router.get('/', vcd, protect, authorize(roles, { entity: ModelType.SUBACCOUNT, actions: [PermissionType.CAN_READ], roles: roles }), advanced(Subaccount, [], CacheKeys.Subaccounts, 'name', false), getSubaccounts);
router.get('/transactions/:id', vcd, protect, authorize(teamRoles), getTransactions);
router.get('/by-code/:code', vcd, protect, authorize(teamRoles), getSubaccountByCode);
router.get('/:id', vcd, protect, authorize(teamRoles), getSubaccount);

router.post('/search', vcd, protect, authorize(roles, { entity: ModelType.SUBACCOUNT, actions: [PermissionType.CAN_READ], roles: roles }), searchSubaccounts);
router.post('/filter', vcd, protect, authorize(roles, { entity: ModelType.SUBACCOUNT, actions: [PermissionType.CAN_READ], roles: roles }), filterSubaccounts);
router.post('/:id', vcd, protect, authorize(teamRoles), createSubaccount);

router.put('/enable/:id', vcd, protect, authorize(bizRoles), enableSubaccount);
router.put('/disable/:id', vcd, protect, authorize(bizRoles), disableSubaccount);
router.put('/:id', vcd, protect, authorize(bizRoles), updateSubaccount);

export default router;