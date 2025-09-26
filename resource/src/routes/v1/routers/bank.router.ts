import express from 'express';
import { CacheKeys } from '../../../utils/cache.util'

import {
    getBank,
    getBanks,
    getBanksProviderFilter,
    listBanks,
    createBank,
    enableBank,
    disableBank,
    removebank
} from '../../../controllers/bank.controller';

import advancedResults from '../../../middleware/advanced.mw';

const router = express.Router({ mergeParams: true });
import { protect, authorize } from '../../../middleware/auth.mw';

import { validateChannels as vcd } from '../../../middleware/header.mw'
import Bank from '../../../models/Bank.model'

const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];
const writerRoles = ['superadmin', 'admin', 'writer'];
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];

router.get('/', vcd, getBanks);
router.get('/provider', vcd, getBanksProviderFilter);
router.get('/list', vcd, protect, authorize(teamRoles), listBanks);
router.get('/:id', vcd, getBank);

router.post('/', vcd, protect, authorize(['superadmin']), createBank);

router.put('/enable/:id', vcd, protect, authorize(['superadmin', 'admin']), enableBank);
router.put('/disable/:id', vcd, protect, authorize(['superadmin', 'admin']), disableBank);

router.delete('/:id', vcd, protect, authorize(['superadmin', 'admin']), removebank);

export default router;