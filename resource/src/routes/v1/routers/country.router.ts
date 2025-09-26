import express from 'express';
import { CacheKeys } from '../../../utils/cache.util'

import {
    getCountries,
    listCountries,
    getCountry,
    getStates
} from '../../../controllers/country.controller';

import advancedResults from '../../../middleware/advanced.mw';

const router = express.Router({ mergeParams: true });

import { protect, authorize } from '../../../middleware/auth.mw';
import { validateChannels as vcd } from '../../../middleware/header.mw'
import Country from '../../../models/Country.model';

const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];
const writerRoles = ['superadmin', 'admin', 'writer'];
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];

router.get('/', vcd, advancedResults(Country, [], CacheKeys.Countries, 'name', false), getCountries);
router.get('/list', vcd, protect, authorize(teamRoles), listCountries);

router.get('/:id', vcd, getCountry);
router.get('/states/:id', vcd, getStates);

export default router;