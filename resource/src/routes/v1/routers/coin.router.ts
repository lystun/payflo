import express from 'express';
import { CacheKeys } from '../../../utils/cache.util'

import {
    getCoins,
    getCoin,
    addCoin,
    enableCoin,
    disableCoin,
    removeCoin
} from '../../../controllers/coin.controller';

import advancedResults from '../../../middleware/advanced.mw';
import { protect, authorize } from '../../../middleware/auth.mw';
import { validateChannels as vcd } from '../../../middleware/header.mw'
import Coin from '../../../models/Coin.model'

const router = express.Router({ mergeParams: true });

router.get('/', vcd, advancedResults(Coin, [], CacheKeys.Coin, 'name', false), getCoins);
router.get('/:id', vcd, getCoin);
router.post('/', vcd, protect, authorize(['superadmin', 'admin']), addCoin);
router.put('/enable/:id', vcd, protect, authorize(['superadmin', 'admin']), enableCoin);
router.put('/disable/:id', vcd, protect, authorize(['superadmin', 'admin']), disableCoin);
router.delete('/:id', vcd, removeCoin)

export default router;