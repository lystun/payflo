import express, { Router } from 'express'
import { CacheKeys, computeKey} from '../../../utils/cache.util'

import {
    getUsers,
    getOverview,
    getGraphData
} from '../../../controllers/user.controller';

import advanced from '../../../middleware/adanced.mw';
import User from '../../../models/User.model';

const router: Router = express.Router({ mergeParams: true });

import { protect, authorize } from '../../../middleware/auth.mw'
import { validateChannels as vcd } from '../../../middleware/header.mw';

const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];

router.get('/', vcd, protect, authorize(roles), advanced(User, [], CacheKeys.Users, 'firstName', false), getUsers);
router.get('/overview', vcd, protect, authorize(teamRoles), getOverview);

router.post('/graph', vcd, protect, authorize(teamRoles), getGraphData);

export default router;