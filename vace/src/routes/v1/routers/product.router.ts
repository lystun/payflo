import express, { Router } from 'express'
import { CacheKeys, computeKey} from '../../../utils/cache.util'

import {
    getProducts,
    getProduct,
    searchProducts,
    createProduct,
    enableProduct,
    disableProduct,
    updateProduct,
    filterProducts,
    getProductTransactions
} from '../../../controllers/product.controller';

import advanced from '../../../middleware/adanced.mw'

const router: Router = express.Router({ mergeParams: true });

import { protect, authorize } from '../../../middleware/auth.mw'
import { validateChannels as vcd } from '../../../middleware/header.mw';
import Product from '../../../models/Product.model';
import { ModelType, PermissionType } from '../../../utils/enums.util';


const roles = ['superadmin', 'admin'];
const bizRoles = ['superadmin', 'admin', 'business'];
const teamRoles = ['superadmin', 'admin', 'business', 'team'];
const allRoles = ['superadmin', 'admin', 'business', 'team', 'writer', 'user'];

router.get('/', vcd, protect, authorize(roles, { entity: ModelType.PRODUCT, actions: [PermissionType.CAN_READ], roles: roles }), advanced(Product, [], CacheKeys.Products, 'name', false), getProducts);
router.get('/transactions/:id', vcd, protect, authorize(teamRoles), getProductTransactions);
router.get('/:id', vcd, protect, authorize(teamRoles), getProduct);

router.post('/search', vcd, protect, authorize(roles, { entity: ModelType.PRODUCT, actions: [PermissionType.CAN_READ], roles: roles }), searchProducts);
router.post('/filter', vcd, protect, authorize(roles, { entity: ModelType.PRODUCT, actions: [PermissionType.CAN_READ], roles: roles }), filterProducts);
router.post('/:id', vcd, protect, authorize(teamRoles), createProduct);

router.put('/enable/:id', vcd, protect, authorize(bizRoles), enableProduct);
router.put('/disable/:id', vcd, protect, authorize(bizRoles), disableProduct);
router.put('/:id', vcd, protect, authorize(bizRoles), updateProduct);

export default router;