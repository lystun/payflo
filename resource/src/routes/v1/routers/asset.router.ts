import express from 'express';
import { CacheKeys } from '../../../utils/cache.util'

import {
    getAssets,
    getAsset,
    addAsset,
    removeAsset,
    enableAsset,
    disableAsset
} from '../../../controllers/asset.controller';

import advancedResults from '../../../middleware/advanced.mw';
import { protect, authorize } from '../../../middleware/auth.mw';
import { validateChannels as vcd } from '../../../middleware/header.mw'
import Asset from '../../../models/Asset.model'

const router = express.Router({ mergeParams: true });


router.get('/', vcd, advancedResults(Asset, [], CacheKeys.Assets, 'name', false), getAssets);
router.get('/:id', vcd, getAsset);
router.post('/', vcd, protect, authorize(['superadmin', 'admin']), addAsset);
router.put('/enable/:id', vcd, protect, authorize(['superadmin', 'admin']), enableAsset);
router.put('/disable/:id', vcd, protect, authorize(['superadmin', 'admin']), disableAsset);
router.delete('/:id', vcd, removeAsset)

export default router;