import express, { Router } from 'express'

import {
    sendActivationEmail,
    sendWelcomeEmail,
    sendResetLink,
    resetPassword,
    sendOTPEmail,
    sendInvite
} from '../../../controllers/email.controller';


const router: Router = express.Router({ mergeParams: true });
import { protect, authorize } from '../../../middleware/auth.mw'
import { validateChannels as vcd } from '../../../middleware/header.mw';

const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];

router.post('/welcome/:id', vcd, protect, authorize(allRoles), sendWelcomeEmail);
router.post('/activate/:id', vcd, protect, authorize(allRoles), sendActivationEmail);
router.post('/forgot-password/:id', vcd, protect, authorize(allRoles), sendResetLink);
router.post('/reset-password/:token', vcd, protect, authorize(allRoles), resetPassword);
router.post('/send-otp-code', vcd, sendOTPEmail);
router.post('/send-invite', vcd, sendInvite);

export default router;