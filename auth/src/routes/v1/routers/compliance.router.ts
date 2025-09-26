import express, { Router } from 'express'
import { CacheKeys, computeKey} from '../../../utils/cache.util'

import {
    getKYCList,
    getKYBList,
    getUserKyc,
    getUserKyb,
    updateBasicKyc,
    updateFaceKyc,
    updateIDKyc,
    updateCompliance,
    updateAddressKyc,
    updateBVNKyc,
    updateBankKYB,
    updateBasicKYB,
    updateCompanyKYB,
    updateNINKyc,
    updateOwnerKYB,
    updateSecurity,
    checkDojahWebhook,
    checkQoreIDWebhook,
    verifyCACNumber,
    updateKYBSettings,
    updateLegalDetails
} from '../../../controllers/compliance.controller';

import advanced from '../../../middleware/adanced.mw'
import User from '../../../models/User.model'

const router: Router = express.Router({ mergeParams: true });

import { protect, authorize, permit } from '../../../middleware/auth.mw'
import { validateChannels as vcd } from '../../../middleware/header.mw';
import permissionService from '../../../services/permission.service';
import { ModelType, PermissionType } from '../../../utils/enums.util';

const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];

router.get('/kyc-list', vcd, protect, authorize(roles, { entity: ModelType.KYC, actions: [PermissionType.CAN_READ], roles: roles }), getKYCList);
router.get('/kyb-list', vcd, protect, authorize(roles, { entity: ModelType.KYB, actions: [PermissionType.CAN_READ], roles: roles }), getKYBList);
router.get('/kyc/:id', vcd, protect, authorize(allRoles), getUserKyc);
router.get('/kyb/:id', vcd, protect, authorize(allRoles), getUserKyb);

router.put('/kyc/update-basic/:id', vcd, protect, authorize(allRoles), updateBasicKyc);
router.put('/kyc/update-address/:id', vcd, protect, authorize(allRoles), updateAddressKyc);
router.put('/kyc/update-bvn/:id', vcd, protect, authorize(allRoles), updateBVNKyc);
router.put('/kyc/update-nin/:id', vcd, protect, authorize(allRoles), updateNINKyc);
router.put('/kyc/update-id/:id', vcd, protect, authorize(allRoles), updateIDKyc);
router.put('/kyc/update-face/:id', vcd, protect, authorize(allRoles), updateFaceKyc);
router.put('/kyc/update-legal/:id', vcd, protect, authorize(roles, { entity: ModelType.KYC, actions: [PermissionType.CAN_UPATE], roles: roles }), updateLegalDetails);

router.put('/kyb/update-basic/:id', vcd, protect, authorize(allRoles), updateBasicKYB);
router.put('/kyb/update-company/:id', vcd, protect, authorize(allRoles), updateCompanyKYB);
router.put('/kyb/update-owner/:id', vcd, protect, authorize(allRoles), updateOwnerKYB);
router.put('/kyb/update-bank/:id', vcd, protect, authorize(allRoles), updateBankKYB);
router.put('/kyb/update-settings/:id', vcd, protect, authorize(bizRoles), updateKYBSettings);
router.put('/kyb/update-legal/:id', vcd, protect, authorize(roles, { entity: ModelType.KYB, actions: [PermissionType.CAN_UPATE], roles: roles }), updateLegalDetails);

router.put('/update-security/:id', vcd, protect, authorize(allRoles), updateSecurity);
router.put('/update-compliance/:id', vcd, protect, authorize(roles, { entity: ModelType.KYB, actions: [PermissionType.CAN_UPATE], roles: roles }), updateCompliance);
router.put('/verify-cac/:id', vcd, protect, authorize(roles, { entity: ModelType.KYB, actions: [PermissionType.CAN_UPATE], roles: roles }), verifyCACNumber);

// Webhooks
router.post('/webhooks/qoreid', checkQoreIDWebhook);
router.post('/webhooks/dojah', checkDojahWebhook);

export default router;