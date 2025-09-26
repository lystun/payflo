import express, { Router } from 'express'
import { CacheKeys } from '../../../utils/cache.util'

import {
   getSubscribers,
   getAllSubscribers,
   getSubscriber,
   addSubscriber,
   updateSubscriber,
   updateDetails,
   enableSubscriber,
   disableSubscriber,
   deleteSubscriber,
   seekSubscribers
} from '../../../controllers/subscriber.controller';

import advanced from '../../../middleware/adanced.mw'
import Subscriber from '../../../models/Subscriber.model'

const router: Router = express.Router({ mergeParams: true });

import { protect, authorize } from '../../../middleware/auth.mw'
import { validateChannels as vcd } from '../../../middleware/header.mw';

const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];
const writerRoles = ['superadmin', 'admin', 'writer'];

router.get('/', vcd, protect, authorize(roles), advanced(Subscriber, [], CacheKeys.Subscribers, '', false), getSubscribers);
router.get('/all', vcd, getAllSubscribers);
router.get('/:id', vcd, protect, authorize(roles), getSubscriber);
router.post('/', vcd, addSubscriber);
router.post('/seek', vcd, protect, authorize(roles), seekSubscribers);
router.put('/update', vcd, updateDetails);
router.put('/enable/:id', vcd, protect, authorize(roles), enableSubscriber);
router.put('/disable', vcd, disableSubscriber);
router.put('/:id', vcd, protect, authorize(roles), updateSubscriber);
router.delete('/:id', vcd, protect, authorize(roles), deleteSubscriber);



export default router;