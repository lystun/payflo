import express, { Router } from 'express'
import { CacheKeys, computeKey} from '../../../utils/cache.util'

import {
    getPermissions,
    getPermission,
    getPermissionByEntity,
    getDefaultPermissions,
    updateUserPermissions
} from '../../../controllers/permission.controller';

import advanced from '../../../middleware/adanced.mw'
import Permission from '../../../models/Permission.model'

const router: Router = express.Router({ mergeParams: true });
import { protect, authorize } from '../../../middleware/auth.mw'
import { validateChannels as vcd } from '../../../middleware/header.mw';

const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];

router.get('/', vcd, protect, authorize(allRoles), advanced(Permission, [], CacheKeys.Permission, 'name', true), getPermissions);
router.get('/:id', vcd, protect, authorize(roles), getPermission);

router.post('/entity', vcd, protect, authorize(roles), getPermissionByEntity);
router.post('/default', vcd, protect, authorize(roles), getDefaultPermissions);

router.put('/update-user', vcd, protect, authorize(roles), updateUserPermissions);

export default router;