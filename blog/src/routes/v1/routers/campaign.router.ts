import express, { Router } from 'express'
import { CacheKeys } from '../../../utils/cache.util'

import {
    getCampaigns,
    getCampaign,
    getCampaignByCode,
    getUserCampaigns,
    seekCampaigns,
    addCampaign,
    updateCampaign,
    enableCampaign,
    disableCampaign,
    publishCampaign,
    trackCampaign,
    deleteCampaign,
    detachSection
} from '../../../controllers/campaign.controller';

import advanced from '../../../middleware/adanced.mw'
import Campaign from '../../../models/Campaign.model'

const router: Router = express.Router({ mergeParams: true });

import { protect, authorize } from '../../../middleware/auth.mw'
import { validateChannels as vcd } from '../../../middleware/header.mw';

const writerRoles = ['superadmin', 'admin', 'writer'];
const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];

router.get('/', vcd, protect, authorize(roles), advanced(Campaign, [{ path: 'user' }], CacheKeys.Campaigns, '', false), getCampaigns);
router.get('/get-campaign/:code', vcd, getCampaignByCode);
router.get('/user-campaigns/:id', vcd, protect, authorize(roles), getUserCampaigns);
router.get('/:id', vcd, protect, authorize(roles), getCampaign);
router.post('/seek', vcd, protect, authorize(roles), seekCampaigns);
router.post('/', vcd, protect, authorize(roles), addCampaign);
router.put('/track', vcd, trackCampaign);
router.put('/:id', vcd, protect, authorize(roles), updateCampaign);
router.put('/disable/:id', vcd, protect, authorize(roles), disableCampaign);
router.put('/enable/:id', vcd, protect, authorize(roles), enableCampaign);
router.put('/publish/:id', vcd, protect, authorize(roles), publishCampaign);
router.put('/detach/:id', vcd, protect, authorize(roles), detachSection);
router.delete('/:id', vcd, protect, authorize(roles), deleteCampaign);

export default router;