import express from 'express';
import { CacheKeys } from '../../../utils/cache.util'

import {
    getAccounts,
    getAccount,
} from '../../../controllers/account.controller';

import advancedResults from '../../../middleware/adanced.mw';

const router = express.Router({ mergeParams: true });

import { protect, authorize } from '../../../middleware/auth.mw';
import { validateChannels as vcd } from '../../../middleware/header.mw'
import Account from '../../../models/Account.model';
import { ModelType, PermissionType } from '../../../utils/enums.util';


const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];

router.get('/', vcd, protect, authorize(roles, { entity: ModelType.ACCOUNT, actions: [PermissionType.CAN_READ], roles: roles }), advancedResults(Account, [], CacheKeys.Accounts, 'name', false), getAccounts);
router.get('/:id', vcd, protect, authorize(roles, { entity: ModelType.ACCOUNT, actions: [PermissionType.CAN_READ], roles: roles }), getAccount);

export default router;