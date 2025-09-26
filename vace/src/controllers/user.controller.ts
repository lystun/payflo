import crypto from 'crypto';
import mongoose, { ObjectId, Model } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { sendGrid } from '../utils/email.util';
import { asyncHandler, strIncludesEs6, arrayIncludes, isString } from '@btffamily/vacepay'
import { generate } from '../utils/random.util';
import { uploadBase64File } from '../utils/google.util'

import dayjs from 'dayjs'
import customparse from 'dayjs/plugin/customParseFormat';
dayjs.extend(customparse);

// models
import User from '../models/User.model'

import nats from '../events/nats';
import { NewAuditDTO } from '../dtos/audit.dto';
import SystemService from '../services/system.service';
import PaymentLinkService from '../services/payment.link.service';
import { IGraphData, IOverview, IUserDoc } from '../utils/types.util';
import ProductService from '../services/product.service';
import SettlementService from '../services/settlement.service';
import ChargebackService from '../services/chargeback.service';
import RefundService from '../services/refund.service';
import TransactionService from '../services/transaction.service';
import WalletService from '../services/wallet.service';
import InvoiceService from '../services/invoice.service';
import SubaccountService from '../services/subaccount.service';
import UserService from '../services/user.service';

/**
 * @name getUsers
 * @description Get reources from database
 * @route GET /vace/v1/users
 */
export const getUsers = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	res.status(200).json(res.advancedResults);   
})

/**
 * @name getOverview
 * @description Get a reource from database
 * @route GET /vace/v1/users/overview
 */
export const getOverview = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	let overview: IOverview = {};
	const { from, to } = req.query;

	const user = await User.findOne({ _id: req.user._id });
	
	if(user){

		const payment = await PaymentLinkService.getOverview(user);
		const subacccount = await SubaccountService.getOverview(user);
		const product = await ProductService.getOverview(user);
		const settlement = await SettlementService.getOverview(user);
		const chargeback = await ChargebackService.getOverview(user);
		const refund = await RefundService.getOverview(user);
		const transaction = await TransactionService.getOverview(user);
		const wallet = await WalletService.getOverview(user);
		const invoices = await InvoiceService.getOverview(user);

        // graphs
        const waGraph = await WalletService.getGraphData({ 
            user, 
            startDate: from ? from.toString() : '', 
            endDate: to ? to.toString() : ''
        });

		overview = {
			paymentLinks: payment,
			subaccounts: subacccount,
			products: product,
			settlements: settlement,
			chargebacks: chargeback,
			refunds: refund,
			transactions: transaction,
			wallet: {
				...wallet,
				graph: waGraph
			},
			invoices: invoices
		}

	}

	res.status(200).json({
		error: false,
		errors: [],
		data: overview,
		message: 'successful',
		status: 200
	})

})

/**
 * @name getGraphData
 * @description Get a reource from database
 * @route POST /vace/v1/users/graph
 */
export const getGraphData = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const { startDate, endDate } = req.body;

	const user = await User.findOne({ _id: req.user._id });
	let graph: IGraphData = {};
	
	if(user){

		const wallet = await WalletService.getGraphData({ user, startDate, endDate  });
        
		graph = {
			wallet
		};

	}

	res.status(200).json({
		error: false,
		errors: [],
		data: graph,
		message: 'successful',
		status: 200
	})

})


