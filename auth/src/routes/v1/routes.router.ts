import express, { Request, Response, NextFunction } from 'express';

// import route files
import authRoutes from './routers/auth.router'
import emailRoutes from './routers/email.router'
import userRoutes from './routers/user.router'
import annRoutes from './routers/announcement.router'
import systemRoutes from './routers/system.router'
import complianceRoutes from './routers/compliance.router'
import permissionRoutes from './routers/permission.router'
import auditRoutes from './routers/audit.router'

// create router
const router = express.Router();

// define routes
router.use('/auth', authRoutes);
router.use('/emails', emailRoutes);
router.use('/announcements', annRoutes);
router.use('/users', userRoutes);
router.use('/system', systemRoutes);
router.use('/compliance', complianceRoutes);
router.use('/permissions', permissionRoutes);
router.use('/audits', auditRoutes);

router.get('/', (req: Request, res: Response, next: NextFunction) => {

    res.status(200).json({
        error: false,
        errors: [],
        message: 'successful',
        data: {
            name: 'vacepay-identity-service',
            version: '1.0.0'
        },
        status: 200
    })

});

export default router;