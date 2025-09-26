import express, { Router } from 'express'
import { CacheKeys } from '../../../utils/cache.util'

import {
    getCategories,
    getAllCategories,
    getCategory,
    getUserCategories,
    addCategory,
    updateCategory,
    enableCategory,
    disableCategory,
    addPostToCategory,
    removePostFromCategory,
    deleteCategory,
    getPosts,
    seekCategories
} from '../../../controllers/category.controller';

import advanced from '../../../middleware/adanced.mw'
import Category from '../../../models/Category.model'

const router: Router = express.Router({ mergeParams: true });

import { protect, authorize } from '../../../middleware/auth.mw'
import { validateChannels as vcd } from '../../../middleware/header.mw';

const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];
const writerRoles = ['superadmin', 'admin', 'writer'];

router.get('/', vcd, protect, authorize(roles), advanced(Category, [{path: "user"}], CacheKeys.Categories, 'name', false), getCategories);
router.get('/all', vcd, getAllCategories);
router.get('/posts/:id', vcd, getPosts);
router.get('/user-categories/:id', vcd, protect, authorize(roles), getUserCategories);
router.get('/:id', vcd, protect, authorize(roles), getCategory);
router.post('/seek', vcd, protect, authorize(roles), seekCategories);
router.post('/', vcd, protect, authorize(roles), addCategory);
router.put('/:id', vcd, protect, authorize(roles), updateCategory);
router.put('/disable/:id', vcd, protect, authorize(roles), disableCategory);
router.put('/enable/:id', vcd, protect, authorize(roles), enableCategory);
router.put('/add-post/:id', vcd, protect, authorize(roles), addPostToCategory);
router.put('/remove-post/:id', vcd, protect, authorize(roles), removePostFromCategory);
router.delete('/:id', vcd, protect, authorize(roles), deleteCategory);


export default router;