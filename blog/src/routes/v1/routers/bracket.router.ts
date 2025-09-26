import express, { Router } from 'express'
import { CacheKeys } from '../../../utils/cache.util'

import {
   getBrackets,
   getAllBrackets,
   getBracket,
   getUserBrackets,
   addBracket,
   updateBracket,
   enableBracket,
   disableBracket,
   getPosts
} from '../../../controllers/bracket.controller';

import advanced from '../../../middleware/adanced.mw'
import Bracket from '../../../models/Bracket.model'

const router: Router = express.Router({ mergeParams: true });

import { protect, authorize } from '../../../middleware/auth.mw'
import { validateChannels as vcd } from '../../../middleware/header.mw';

const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];
const writerRoles = ['superadmin', 'admin', 'writer'];

router.get('/', vcd, protect, authorize(roles), advanced(Bracket, [{ path: 'posts' }], CacheKeys.Brackets, 'name', false), getBrackets);
router.get('/all', vcd, getAllBrackets);
router.get('/posts/:id', vcd, getPosts);
router.get('/user-brackets/:id', vcd, protect, authorize(roles), getUserBrackets);
router.get('/:id', vcd, protect, authorize(roles), getBracket);
router.post('/', vcd, protect, authorize(roles), addBracket);
router.put('/:id', vcd, protect, authorize(roles), updateBracket);
router.put('/enable/:id', vcd, protect, authorize(roles), enableBracket);
router.put('/disable/:id', vcd, protect, authorize(roles), disableBracket);



export default router;