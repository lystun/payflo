import express, { Router } from 'express'
import { CacheKeys, computeKey} from '../../../utils/cache.util'

import {
    getUsers,
    getUser,
    getUserKyc,
    getUserKyb,
    getSystemOverview,
    searchUsers,
    filterUsers,
    addUser,
    updateUserPIN,
    updateUserPassword,
    enableEmailVerification,
    enableSmsVerification,
    toggleBlackList,
    changeSuperPassword,
    enableResource,
    disableResource,
    getAPIKey,
    getAllAPIKey,
    generateAPIKey,
    activateUserAccount,
    deactivateUserAccount,
    getUserNotifications,
    markNotificationAsRead,
    publishUser,
    getUserDevices,
    decideInvite,
    decodeUserSecret,
    deleteUser
} from '../../../controllers/user.controller';

import advanced from '../../../middleware/adanced.mw'
import User from '../../../models/User.model'

const router: Router = express.Router({ mergeParams: true });

import { protect, authorize, permit } from '../../../middleware/auth.mw'
import { validateChannels as vcd } from '../../../middleware/header.mw';
import { ModelType, PermissionType } from '../../../utils/enums.util';

const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];

router.get('/', vcd, protect, authorize(roles, { entity: ModelType.USER, actions: [PermissionType.CAN_READ], roles: roles }), advanced(User, [
    { path: 'roles', select: '_id name', },
    { path: 'verification', select: '_id sms email' },
    { path: 'country', select: '_id name code2 flag' }
], CacheKeys.Users, 'firstName', false), getUsers);
router.get('/overview', vcd, protect, authorize(roles), getSystemOverview);
router.get('/devices/:id', vcd, protect, authorize(allRoles), getUserDevices);
router.get('/notifications/:id', vcd, protect, authorize(bizRoles), getUserNotifications);
router.get('/kyc/:id', vcd, protect, authorize(allRoles), getUserKyc);
router.get('/kyb/:id', vcd, protect, authorize(allRoles), getUserKyb);

router.get('/apikey/:id', vcd, protect, authorize(allRoles), getAPIKey);
router.get('/list-apikeys/:id', vcd, protect, authorize(allRoles), getAllAPIKey);

router.get('/:id', vcd, protect, authorize(allRoles), getUser);

router.post('/generate-apikey/:id', vcd, protect, authorize(allRoles), generateAPIKey);
router.post('/add-user', vcd, protect, authorize(roles, { entity: ModelType.USER, actions: [PermissionType.CAN_CREATE], roles: roles }), addUser);
router.post('/search', vcd, protect, authorize(bizRoles), searchUsers);
router.post('/filter', vcd, protect, authorize(roles, { entity: ModelType.USER, actions: [PermissionType.CAN_READ], roles: roles }), filterUsers);
router.post('/publish', vcd, protect, authorize(roles, { entity: ModelType.USER, actions: [PermissionType.CAN_READ], roles: roles }), publishUser);

router.put('/update-pin/:id', vcd, protect, authorize(bizRoles), updateUserPIN);
router.put('/update-password/:id', vcd, protect, authorize(allRoles), updateUserPassword);
router.put('/decide-invite', vcd, decideInvite);
router.put('/decode-secret/:id', vcd, protect, authorize(['superadmin']), decodeUserSecret);

router.put('/enable-sms/:id', vcd, protect, authorize(allRoles), enableSmsVerification);
router.put('/enable-email/:id', vcd, protect, authorize(allRoles), enableEmailVerification);
router.put('/enable/:id', vcd, protect, authorize(allRoles), enableResource);
router.put('/disable/:id', vcd, protect, authorize(allRoles), disableResource);
router.put('/activate/:id', vcd, protect, authorize(roles, { entity: ModelType.USER, actions: [PermissionType.CAN_UPATE], roles: roles }), activateUserAccount);
router.put('/deactivate/:id', vcd, protect, authorize(roles, { entity: ModelType.USER, actions: [PermissionType.CAN_UPATE], roles: roles }), deactivateUserAccount);
router.put('/read-notification/:id', vcd, protect, authorize(bizRoles), markNotificationAsRead);

router.put('/blacklist/:id', vcd, protect, authorize(['superadmin']), toggleBlackList);
router.put('/csp/:id', vcd, protect, authorize(['superadmin']), changeSuperPassword);

router.delete('/:id', vcd, protect, authorize(['superadmin']), deleteUser);

export default router;