import express from 'express';
import { CacheKeys } from '../../../utils/cache.util'

import {
    getNetworks,
    getNetwork,
    createNetwork
} from '../../../controllers/network.controller';

import advancedResults from '../../../middleware/advanced.mw';

const router = express.Router({ mergeParams: true });
import { protect, authorize } from '../../../middleware/auth.mw';

import { validateChannels as vcd } from '../../../middleware/header.mw'
import Network from '../../../models/Network.model'

router.get('/', vcd, advancedResults(Network,[], CacheKeys.Networks, 'name', false), getNetworks);
router.get('/:id', vcd, getNetwork);
router.post('/', vcd, protect, authorize(['superadmin']), createNetwork);

export default router;