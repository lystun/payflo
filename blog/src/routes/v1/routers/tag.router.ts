import express, { Router } from 'express'
import { CacheKeys } from '../../../utils/cache.util'

import {
    getTags,
    getUserTags,
    getTag,
    addTag,
    updateTag,
    enableTag,
    disableTag,
    deleteTag,
    getAllTags,
    getPosts,
    seekTags
} from '../../../controllers/tag.controller';

import advanced from '../../../middleware/adanced.mw'
import Tag from '../../../models/Tag.model'

const router: Router = express.Router({ mergeParams: true });

import { protect, authorize } from '../../../middleware/auth.mw'
import { validateChannels as vcd } from '../../../middleware/header.mw';

const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];
const writerRoles = ['superadmin', 'admin', 'writer'];

router.get('/', vcd, protect, authorize(roles), advanced(Tag, [{ path: 'posts' }, { path: 'user' }], CacheKeys.Tags, 'name', false), getTags);
router.get('/all', vcd, getAllTags);
router.get('/posts/:id', vcd, getPosts);
router.get('/user-tags/:id', vcd, protect, authorize(writerRoles), getUserTags);
router.get('/:id', vcd, protect, authorize(writerRoles), getTag);
router.post('/seek', vcd, protect, authorize(writerRoles), seekTags);
router.post('/', vcd, protect, authorize(writerRoles), addTag);
router.put('/:id', vcd, protect, authorize(writerRoles), updateTag);
router.put('/disable/:id', vcd, protect, authorize(roles), disableTag);
router.put('/enable/:id', vcd, protect, authorize(roles), enableTag);
router.delete('/:id', vcd, protect, authorize(writerRoles), deleteTag);

export default router;