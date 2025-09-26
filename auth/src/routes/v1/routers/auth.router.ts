import express, { Router } from 'express';

import {
    
    register,
    login,
    forcePassword,
    logout,
    getUser,
    updatePassword,
    resetPassword,
    activateAccount,
    sendResetLink,
    attachRole,
    detachRole,

} from '../../../controllers/auth.controller'

import { validateChannels as vcd } from '../../../middleware/header.mw'

const router: Router = express.Router({ mergeParams: true });
import { protect, authorize, permit } from '../../../middleware/auth.mw';
import PermissionService from '../../../services/permission.service';
import { ModelType } from '../../../utils/enums.util';

const roles = ['superadmin', 'admin']
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];

//actions for permission
const uActions = PermissionService.extractActions(['update', 'modify'])

router.post('/register', vcd, register);
router.post('/login', vcd, login);
router.post('/logout', vcd, logout);
router.get('/user/:id', vcd, protect, authorize(allRoles), getUser);
router.post('/force-password', vcd, forcePassword);
router.post('/change-password/:id', vcd, protect, authorize(allRoles), updatePassword);
router.post('/forgot-password', vcd, sendResetLink);
router.post('/reset-password', vcd, resetPassword);
router.post('/activate-account', vcd, activateAccount);
router.post('/attach-role/:id', vcd, protect, authorize(roles, { entity: ModelType.USER, actions: uActions, roles }), attachRole);
router.post('/detach-role/:id', vcd, protect, authorize(roles, { entity: ModelType.USER, actions: uActions, roles }), detachRole);

export default router;
