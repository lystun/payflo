import express from 'express';
import { CacheKeys } from '../../../utils/cache.util'
//
import {
    getLocations,
    getLocation,
    addLocation,
    enableLocation,
    disableLocation
} from '../../../controllers/location.controller';

import advancedResults from '../../../middleware/advanced.mw';

const router = express.Router({ mergeParams: true });
import { protect, authorize } from '../../../middleware/auth.mw';
import { validateChannels as vcd } from '../../../middleware/header.mw'
import Location from '../../../models/Location.model'

router.get('/', vcd, advancedResults(Location, [], CacheKeys.Locations, 'label', false), getLocations);
router.get('/:id', vcd, getLocation);
router.post('/', vcd, protect, authorize(['superadmin', 'admin']), addLocation)
router.put('/enable/:id', vcd, protect, authorize(['superadmin', 'admin']), enableLocation)
router.put('/disable/:id', vcd, protect, authorize(['superadmin', 'admin']), disableLocation);
export default router;