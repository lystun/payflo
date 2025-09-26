import express, { Router } from 'express'

import {
    getSystemConfiguration,
    updateNotifications,
    sendTestSMS
} from '../../../controllers/system.controller';


const router: Router = express.Router({ mergeParams: true });
import { protect, authorize } from '../../../middleware/auth.mw'
import { validateChannels as vcd } from '../../../middleware/header.mw';
import { ModelType, PermissionType } from '../../../utils/enums.util';

const roles = ['superadmin', 'admin'];

router.get('/get-config', vcd, protect, authorize(roles, { entity: ModelType.SYSTEM, actions: [PermissionType.CAN_READ], roles: roles }), getSystemConfiguration);

router.post('/test-sms', vcd, protect, authorize(roles, { entity: ModelType.SYSTEM, actions: [PermissionType.CAN_UPATE], roles: roles }), sendTestSMS);
router.put('/update-notifications', vcd, protect, authorize(roles, { entity: ModelType.SYSTEM, actions: [PermissionType.CAN_UPATE], roles: roles }), updateNotifications);

export default router;