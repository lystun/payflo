import express, { Router } from 'express'
import { CacheKeys } from '../../../utils/cache.util'

import {
    getComments,
    getComment,
    getUserComments,
    addComment,
    addReaction,
    enableComment,
    disableComment,
    deleteComment
} from '../../../controllers/comment.controller';

import advanced from '../../../middleware/adanced.mw'
import Comment from '../../../models/Comment.model'

const router: Router = express.Router({ mergeParams: true });

import { protect, authorize } from '../../../middleware/auth.mw'
import { validateChannels as vcd } from '../../../middleware/header.mw';

const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];
const writerRoles = ['superadmin', 'admin', 'writer'];

// protect, authorize(roles),
router.get('/', vcd, protect, authorize(roles), advanced(Comment, [{ path: 'post' }], CacheKeys.Comments, '', false), getComments);
router.get('/user-comments/:id', vcd, protect, authorize(writerRoles), getUserComments);
router.get('/:id', vcd, protect, authorize(roles), getComment);
router.post('/:id', vcd, addComment);
router.put('/add-reaction/:id', vcd, addReaction);
router.put('/disable/:id', vcd, protect, authorize(roles), disableComment);
router.put('/enable/:id', vcd, protect, authorize(roles), enableComment);
router.delete('/:id', vcd, protect, authorize(roles), deleteComment);
export default router;