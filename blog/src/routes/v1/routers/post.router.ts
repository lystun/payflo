import express, { Router } from 'express'
import { CacheKeys } from '../../../utils/cache.util'

import {
    getPosts,
    getPost,
    getUserPosts,
    getPublishedPosts,
    getPostBySlug,
    getLatestPosts,
    addPost,
    updatePost,
    publishPost,
    unPublishPost,
    updateImages,
    addTags,
    removeTag,
    addContributors,
    enablePost,
    disablePost,
    deletePost,
    searchPosts,
    seekPosts
} from '../../../controllers/post.controller';

import advanced from '../../../middleware/adanced.mw'
import Post from '../../../models/Post.model'

const router: Router = express.Router({ mergeParams: true });

import { protect, authorize } from '../../../middleware/auth.mw'
import { validateChannels as vcd } from '../../../middleware/header.mw';

const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];
const writerRoles = ['superadmin', 'admin', 'writer'];

// protect, authorize(roles),
router.get('/', vcd, protect, authorize(roles), advanced(Post, [
    { path: 'comments' },
    { path: 'tags' },
    { path: 'category' },
    { path: 'bracket' },
    { path: 'contributors' },
    { path: 'reactions.user', select: '_id firstName, lastName' },
    { path: 'author', select: '_id firstName lastName' },
    { path: 'user', select: '_id firstName, lastName' },
], CacheKeys.Posts, 'createdAt', false), getPosts);
router.get('/all', vcd, getPublishedPosts);
router.get('/latest', vcd, getLatestPosts);
router.get('/user-posts/:id', vcd, protect, authorize(writerRoles), getUserPosts);
router.get('/slug/:slug', vcd, getPostBySlug);
router.get('/:id', vcd, protect, authorize(writerRoles), getPost);

router.post('/', vcd, protect, authorize(writerRoles), addPost);
router.post('/search', vcd, searchPosts);
router.post('/seek', vcd, protect, authorize(writerRoles), seekPosts);

router.put('/:id', vcd, protect, authorize(writerRoles), updatePost);
router.put('/publish/:id', vcd, protect, authorize(roles), publishPost);
router.put('/un-publish/:id', vcd, protect, authorize(writerRoles), unPublishPost);
router.put('/update-images/:id', vcd, protect, authorize(writerRoles), updateImages);
router.put('/add-tags/:id', vcd, protect, authorize(writerRoles), addTags);
router.put('/remove-tag/:id', vcd, protect, authorize(writerRoles), removeTag);
router.put('/add-contributors/:id', vcd, protect, authorize(writerRoles), addContributors);
router.put('/enable/:id', vcd, protect, authorize(roles), enablePost);
router.put('/disable/:id', vcd, protect, authorize(roles), disablePost);

router.delete('/:id', vcd, protect, authorize(writerRoles), deletePost);

export default router;