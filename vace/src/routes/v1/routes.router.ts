import express, { Request, Response, NextFunction } from 'express';

// import route files
import userRoutes from './routers/user.router'
import businessRoutes from './routers/business.router'
import accountRoutes from './routers/account.router'
import walletRoutes from './routers/wallet.router'
import providerRoutes from './routers/provider.router'
import vaceRoutes from './routers/vace.router'
import productRoutes from './routers/product.router'
import paymentLinkRoutes from './routers/payment.link.router'
import invoiceRoutes from './routers/invoice.router'
import vasRoutes from './routers/vas.router'
import transactionRoutes from './routers/transaction.router'
import settlementRoutes from './routers/settlement.router'
import refundRoutes from './routers/refund.router'
import chargebackRoutes from './routers/chargeback.router'
import subaccountRoutes from './routers/subaccount.router'
import corporateRoutes from './routers/corporate.router'

// create router
const router = express.Router();


// define routes
router.use('/users', userRoutes);
router.use('/businesses', businessRoutes);
router.use('/wallets', walletRoutes);
router.use('/accounts', accountRoutes);
router.use('/providers', providerRoutes);
router.use('/owner', vaceRoutes);
router.use('/products', productRoutes);
router.use('/paymentlinks', paymentLinkRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/vas', vasRoutes);
router.use('/transactions', transactionRoutes);
router.use('/settlements', settlementRoutes);
router.use('/refunds', refundRoutes);
router.use('/chargebacks', chargebackRoutes);
router.use('/subaccounts', subaccountRoutes);
router.use('/corporate', corporateRoutes);

router.get('/', (req: Request, res: Response, next: NextFunction) => {

    res.status(200).json({
        error: false,
        errors: [],
        message: 'successful',
        data: {
            name: 'vacepay-core-service',
            version: '1.0.0'
        },
        status: 200
    })

});

export default router;