import express, { Request, Response, NextFunction } from 'express';

// import route files
import userRoutes from './routers/user.router'
import categoryRoutes from './routers/category.router'
import tagRoutes from './routers/tag.router'
import postRoutes from './routers/post.router'
import commentRoutes from './routers/comment.router'
import bracketRoutes from './routers/bracket.router'
import subRoutes from './routers/subscriber.router'
import campRoutes from './routers/campaign.router'

// create router
const router = express.Router();

// define routes
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/tags', tagRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/brackets', bracketRoutes);
router.use('/subscribers', subRoutes);
router.use('/campaigns', campRoutes);


router.get('/', (req: Request, res: Response, next: NextFunction) => {

    res.status(200).json({
        error: false,
        errors: [],
        message: 'successful',
        data: {
            name: 'vacepay-blog-service',
            version: '1.0.0'
        },
        status: 200
    })

});

export default router;