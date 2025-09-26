import express, { Router } from 'express'
import { CacheKeys, computeKey} from '../../../utils/cache.util'

import {
    getAnnouncements,
    getAnnouncement,
    addAnnouncement,
    updateAnnouncement,
    removeAnnouncement
} from '../../../controllers/announcement.controller';

import advanced from '../../../middleware/adanced.mw'
import Announcement from '../../../models/Announcement.model'

const router: Router = express.Router({ mergeParams: true });
import { protect, authorize } from '../../../middleware/auth.mw'
import { validateChannels as vcd } from '../../../middleware/header.mw';

const roles = ['superadmin', 'admin'];
const allRoles = ['superadmin', 'admin', 'user'];

router.get('/', vcd, protect, authorize(roles), advanced(Announcement, [], CacheKeys.Anns, 'title', true), getAnnouncements);
router.get('/:id', vcd, getAnnouncement);

router.post('/', vcd, protect, authorize(roles), addAnnouncement);

router.put('/:id', vcd, protect, authorize(roles), updateAnnouncement);
router.delete('/:id', vcd, protect, authorize(roles), removeAnnouncement);

export default router;