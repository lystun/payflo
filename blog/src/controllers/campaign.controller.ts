import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { arrayIncludes, asyncHandler, dateToday, isArray, notDefined } from '@btffamily/vacepay'
import TagService from '../services/tag.service';
import mongoose from 'mongoose'
import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html';

import dayjs from 'dayjs'
import customparse from 'dayjs/plugin/customParseFormat';
dayjs.extend(customparse);

// models
import User from '../models/User.model'
import Category from '../models/Category.model'
import Post from '../models/Post.model'
import Tag from '../models/Tag.model'
import { advanced, search } from '../utils/result.util';
import PostService from '../services/post.service';
import CategoryService from '../services/category.service';
import { IPagination, ISearchQuery, ICampaignSection, IUTMParams } from '../utils/types.util';
import Campaign from '../models/Campaign.model';
import CampaignService from '../services/campaign.service';
import SystemService from '../services/system.service';
import { generate } from '../utils/random.util';
import { uploadBase64File } from '../utils/google.util';
import Subscriber from '../models/Subscriber.model';
import SubscriberService from '../services/subscriber.service';
import { sendGrid } from '../utils/email.util';

/**
 * @name getCampaigns
 * @description Get all resource from the database
 * @route GET /blog/v1/campaigns
 * @access Private | superadmin
 * 
 * @returns {Response} client response
 */
export const getCampaigns = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	res.status(200).json(res.advancedResults);   
})

/**
 * @name getCampaign
 * @description Get a resource from the database
 * @route GET /blog/v1/campaigns/:id
 * @access Private | superadmin, admin
 * 
 * @returns {Response} client response
 */
export const getCampaign = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const campaign = await Campaign.findOne({ _id: req.params.id }).populate([
		{ path: 'user' }
	])

	if(!campaign){
		return next(new ErrorResponse('Error', 404, ['campaign does not exist']))
	}

	res.status(200).json({
		error: false,
		errors: [],
		data: campaign,
		message: 'successful',
		status: 200
	})

})

/**
 * @name getCampaignByCode
 * @description Get a resource from the database
 * @route GET /blog/v1/campaigns/get-campaign/:code
 * @access Private | superadmin, admin
 * 
 * @returns {Response} client response
 */
export const getCampaignByCode = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const campaign = await Campaign.findOne({ code: req.params.code }).populate([
		{ path: 'user' }
	])

	if(!campaign){
		return next(new ErrorResponse('Error', 404, ['campaign does not exist']))
	}

	res.status(200).json({
		error: false,
		errors: [],
		data: campaign,
		message: 'successful',
		status: 200
	})

})

/**
 * @name getUserCampaigns
 * @description Get all user's resource from the database
 * @route GET /blog/v1/campaigns/user-campaigns/:id
 * @access Private | superadmin, admin
 * 
 * @returns {Response} client response
 */
export const getUserCampaigns = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const user = await User.findOne({ _id: req.params.id })

	if(!user){
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	const result = await advanced(Campaign, [{ path: 'user' }], '', req, 'user', user._id);

	res.status(200).json({
		error: false,
		errors: [],
		count: result.count,
		total: result.data.length,
		message: 'successfull',
		pagination: result.pagination,
		data: result.data,
		status: 200
	});

})

/**
 * @name seekCampaigns
 * @description Search resource from the database
 * @route POST /blog/v1/campaigns/seek/:id
 * @access Private | superadmin, admin
 * 
 * @returns {Response} client response
 */
export const seekCampaigns = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const { key } = req.body;

	let result: IPagination = {
		count: 0, 
		total: 0, 
		pagination: { next: { page: 1, limit: 1 }, prev: { page: 1, limit: 1 } }, 
		data: []
	};

	const user = await User.findOne({ _id: req.user._id });

	if(!user){
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	if(user.userType === 'superadmin'){

		const query: ISearchQuery = {
			model: Campaign,
			ref: null,
			value: null,
			data: [
				{ title: { $regex: key, $options: 'i' } }
			],
			query: null,
			queryParam: req.query,
			populate: [
				{ path: 'user' }
			],
			operator: 'or'
		}
	
		result = await search(query); // search from DB
	}
	
	if(user.userType === 'admin'){

		const query: ISearchQuery = {
			model: Campaign,
			ref: 'user',
			value: user._id,
			data: [
				{ title: { $regex: key, $options: 'i' } }
			],
			query: null,
			queryParam: req.query,
			populate: [
				{ path: 'user' }
			],
			operator: 'or'
		}
	
		result = await search(query); // search from DB
	}

	res.status(200).json({
		error: false,
		errors: [],
		count: result.count,
		total: result.total,
		data: result.data,
		pagination: result.pagination,
		message: 'successful',
		status: 200
	})

})

/**
 * @name addCampaign
 * @description Add a resource to the database
 * @route POST /blog/v1/campaigns
 * @access Private | superadmin, admin
 * 
 * @returns {Response} client response
 */
export const addCampaign = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const { title, headline, description, callback } = req.body;
	const sections = req.body.sections as Array<ICampaignSection>

	const user = await User.findOne({ _id: req.user._id });

	if(!user){
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	if(!callback){
		return next(new ErrorResponse('Error', 400, ['callback url is required']))
	}

	if(!title){
		return next(new ErrorResponse('Error', 400, ['title is required']))
	}

	if(!headline){
		return next(new ErrorResponse('Error', 400, ['headline is required']))
	}

	if(sections && typeof(sections) !== 'object'){
		return next(new ErrorResponse('Error', 403, ['sections is required to be an array']))
	}

	if(sections){

		const validate = await CampaignService.validateSections(sections);

		if(validate.error){
			return next(new ErrorResponse('Error', 403, [`${validate.message}`]))
		}

	}

	const exist = await Campaign.findOne({ title : title });

	if(exist){
		return next(new ErrorResponse('Error', 400, ['campaign already exist. use another title']))
	}

	const code = await SystemService.generateCode(6,true);

	const campaign = await Campaign.create({
		title: title,
		headline: headline,
		description: description,
		isEnabled: false,
		status: 'pending',
		user:  user._id,
		code: code.toString()
	})

	campaign.premalink = `${callback}/${code.toString()}`;
	await campaign.save();

	if(sections && sections.length > 0){

		for(let i = 0; i < sections.length; i++){

			const section: ICampaignSection = sections[i];
			let gen = await SystemService.generateCode(6,true);
			let pb: string = '';

			// sanitize and convert the html
			const conv = marked.parse(section.body);
			const mkd = sanitizeHtml(conv, { 
				allowedTags: false,
				allowedAttributes: false,
				allowedSchemes: ['data', 'http', 'https', 'ftp', 'mailto', 'tel'],
				allowedSchemesByTag: { img: ['data'] },
				allowedClasses: {
					'code': [ 'language-*', 'lang-*' ],
					'*': [ 'fancy', 'simple' ]
				}
			});

			// upload thumbnail is available
			if(section.thumbnail){

				const mime = section.thumbnail.split(';base64')[0].split(':')[1];

				const fileData = {
					file: section.thumbnail,
					filename: gen.toString() + '_' + 'thumbnail',
					mimeType: mime
				}

				const gData = await uploadBase64File(fileData);
				pb = gData.publicUrl;

			}

			campaign.sections.push({
				label: `CPM${gen.toString()}`,
				caption: section.caption,
				thumbnail: pb ? pb : '',
				body: section.body,
				marked: mkd,
				url: section.url,
				footnote: section.footnote,
				color: section.color
			});

			await campaign.save();

			pb = '' // clear {pb} variable

		}

	}

	res.status(200).json({
		error: false,
		errors: [],
		data: campaign,
		message: 'successful',
		status: 200
	})

})

/**
 * @name updateCampaign
 * @description Modify resource in the database
 * @route PUT /blog/v1/campaigns/:id
 * @access Private | superadmin, admin
 * 
 * @returns {Response} client response
 */
export const updateCampaign = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const { title, headline, description, callback } = req.body;
	const sections = req.body.sections as Array<ICampaignSection>

	const user = await User.findOne({ _id: req.user._id });

	if(!user){
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	const campaign = await Campaign.findOne({ _id: req.params.id });

	if(!campaign){
		return next(new ErrorResponse('Error', 404, ['campaign does not exist']))
	}

	if(!callback){
		return next(new ErrorResponse('Error', 400, ['callback url is required']))
	}

	if(user.userType !== 'superadmin' && campaign.status === 'published'){
		return next(new ErrorResponse('Error', 403, ['user is not authorized to modify campaign']))
	}

	if(sections && typeof(sections) !== 'object'){
		return next(new ErrorResponse('Error', 403, ['sections is required to be an array']))
	}

	if(title){

		const exist = await Campaign.findOne({ title : title });

		if(exist){
			return next(new ErrorResponse('Error', 400, ['campaign already exist. use another title']))
		}

		campaign.title = title;
		await campaign.save();

	}

	campaign.description = description ? description : campaign.description;
	campaign.headline = headline ? headline : campaign.headline;
	campaign.status = 'pending';
	await campaign.save()

	if(sections && sections.length > 0){

		const currList = campaign.sections;

		for(let i = 0; i < sections.length; i++){

			const itm = currList.find((x) => x.label === sections[i].label)
			const itmx = currList.findIndex((x) => x.label === sections[i].label)

			if(itm && itmx >= 0){

				// sanitize and convert the html
				let pb: string = '';
				const conv = marked.parse(sections[i].body);
				const mkd = sanitizeHtml(conv, { 
					allowedTags: false,
					allowedAttributes: false,
					allowedSchemes: ['data', 'http', 'https', 'ftp', 'mailto', 'tel'],
					allowedSchemesByTag: { img: ['data'] },
					allowedClasses: {
						'code': [ 'language-*', 'lang-*' ],
						'*': [ 'fancy', 'simple' ]
					}
				});

				// upload thumbnail is available
				if(sections[i].thumbnail && sections[i].thumbnail !== itm.thumbnail){

					let gen = await SystemService.generateCode(6,true);
					const mime = sections[i].thumbnail.split(';base64')[0].split(':')[1];

					const fileData = {
						file: sections[i].thumbnail,
						filename: gen.toString() + '_' + 'thumbnail',
						mimeType: mime
					}

					const gData = await uploadBase64File(fileData);
					pb = gData.publicUrl;

				}

				itm.caption = sections[i].caption ? sections[i].caption : itm.caption;
				itm.thumbnail = pb ? pb : itm.thumbnail;
				itm.body = sections[i].body ? sections[i].body : itm.body;
				itm.marked = sections[i].body ? mkd : itm.marked;
				itm.url = sections[i].url ? sections[i].url : itm.url;
				itm.footnote = sections[i].footnote ? sections[i].footnote : itm.footnote;
				itm.color = sections[i].color ? sections[i].color : itm.color;

				currList.splice(itmx, 1, itm);
				campaign.sections = currList;
				await campaign.save();

				pb = '' // clear {pb} variable

			} else {

				const section: ICampaignSection = sections[i];
				let gen = await SystemService.generateCode(6,true);
				let pb: string = '';

				// sanitize and convert the html
				const conv = marked.parse(section.body);
				const mkd = sanitizeHtml(conv, { 
					allowedTags: false,
					allowedAttributes: false,
					allowedSchemes: ['data', 'http', 'https', 'ftp', 'mailto', 'tel'],
					allowedSchemesByTag: { img: ['data'] },
					allowedClasses: {
						'code': [ 'language-*', 'lang-*' ],
						'*': [ 'fancy', 'simple' ]
					}
				});

				// upload thumbnail is available
				if(section.thumbnail){

					const mime = section.thumbnail.split(';base64')[0].split(':')[1];

					const fileData = {
						file: section.thumbnail,
						filename: gen.toString() + '_' + 'thumbnail',
						mimeType: mime
					}

					const gData = await uploadBase64File(fileData);
					pb = gData.publicUrl;

				}

				campaign.sections.push({
					label: `CPM${gen.toString()}`,
					caption: section.caption,
					thumbnail: pb ? pb : '',
					body: section.body,
					marked: mkd,
					url: `${section.url}`,
					footnote: section.footnote,
					color: section.color
				});

				await campaign.save();
				pb = '' // clear {pb} variable

			}

		}

	}

	res.status(200).json({
		error: false,
		errors: [],
		data: campaign,
		message: 'successful',
		status: 200
	})

})

/**
 * @name enableCampaign
 * @description Modify resource in the database
 * @route PUT /blog/v1/campaigns/enable/:id
 * @access Private | superadmin, admin
 * 
 * @returns {Response} client response
 */
export const enableCampaign = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const campaign = await Campaign.findOne({ _id: req.params.id });

	if(!campaign){
		return next(new ErrorResponse('Error', 404, ['campaign does not exist']))
	}

	if(campaign.isEnabled === false){

		campaign.isEnabled = true;
		await campaign.save();

	}

	res.status(200).json({
		error: false,
		errors: [],
		data: campaign,
		message: 'successful',
		status: 200
	})

})

/**
 * @name disableCampaign
 * @description Modify resource in the database
 * @route PUT /blog/v1/campaigns/disable/:id
 * @access Private | superadmin, admin
 * 
 * @returns {Response} client response
 */
export const disableCampaign = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const campaign = await Campaign.findOne({ _id: req.params.id });

	if(!campaign){
		return next(new ErrorResponse('Error', 404, ['campaign does not exist']))
	}

	if(campaign.isEnabled === true){
		campaign.isEnabled = false;
		await campaign.save();
	}

	res.status(200).json({
		error: false,
		errors: [],
		data: campaign,
		message: 'successful',
		status: 200
	})

})

/**
 * @name publishCampaign
 * @description Modify resource in the database
 * @route PUT /blog/v1/campaigns/publish/:id
 * @access Private | superadmin, admin
 * 
 * @returns {Response} client response
 */
export const publishCampaign = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const campaign = await Campaign.findOne({ _id: req.params.id });

	if(!campaign){
		return next(new ErrorResponse('Error', 404, ['campaign does not exist']))
	}

	if(campaign.isEnabled === false){
		return next(new ErrorResponse('Error', 403, ['campaign is currently disabled']))
	}

	if(campaign.status === 'pending'){

		campaign.isEnabled = false;
		campaign.status = 'published';
		await campaign.save();

		// TODO: come back here to test Node streams
		// process the sending of emails to all subscribers

		await CampaignService.processCampaignBlast({ campaign, type: 'send-campaign' });

	}

	res.status(200).json({
		error: false,
		errors: [],
		data: campaign,
		message: 'successful',
		status: 200
	})

})

/**
 * @name publishTestCampaign
 * @description Modify resource in the database
 * @route POST /blog/v1/campaigns/publish-test/:id
 * @access Private | superadmin, admin
 * 
 * @returns {Response} client response
 */
export const publishTestCampaign = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const guests = req.body.guests as Array<string>;

	if(notDefined(guests)){
		return next(new ErrorResponse('Error', 400, ['guest [email] list is required']))
	}

	if(!isArray(guests)){
		return next(new ErrorResponse('Error', 400, ['guest list is required to be an array of eamils']))
	}

	if(guests.length <= 0){
		return next(new ErrorResponse('Error', 400, ['at least one email is required']))
	}

	if(guests.length > 10){
		return next(new ErrorResponse('Error', 400, ['emails cannot be more than 10 at a time']))
	}

	const campaign = await Campaign.findOne({ _id: req.params.id });

	if(!campaign){
		return next(new ErrorResponse('Error', 404, ['campaign does not exist']))
	}

	await CampaignService.processCampaignBlast({ campaign, guests, type: 'test-campaign' });

	res.status(200).json({
		error: false,
		errors: [],
		data: {
			code: campaign.code,
			title: campaign.title
		},
		message: 'successful',
		status: 200
	})

})

/**
 * @name trackCampaign
 * @description Modify resource in the database
 * @route PUT /blog/v1/campaigns/track
 * @access Private | superadmin, admin
 * 
 * @returns {Response} client response
 */
export const trackCampaign = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const allowed = ['btn0', 'btn1', 'btn2', 'btn3'];
	const utm = req.body.utm as IUTMParams;

	if(utm.medium && utm.medium === 'email' && utm.source){

		const campaign = await Campaign.findOne({ code: utm.campaign })
		const subscriber = await Subscriber.findOne({ code: utm.content })

		if(arrayIncludes(allowed, utm.source) && campaign && subscriber){

			await CampaignService.trackClicks(campaign, subscriber, utm)
			// await SubscriberService.trackClicks(campaign, subscriber, utm);

		}

	}

	res.status(200).json({
		error: false,
		errors: [],
		data: {},
		message: 'successful',
		status: 200
	})

})

/**
 * @name detachSection
 * @description Modify resource in the database
 * @route PUT /blog/v1/campaigns/detach/:id
 * @access Private | superadmin, admin
 * 
 * @returns {Response} client response
 */
export const detachSection = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const { label } = req.body; 

	if(!label){
		return next(new ErrorResponse('Error', 404, ['label is required']))
	}

	const campaign = await Campaign.findOne({ _id: req.params.id })

	if(!campaign){
		return next(new ErrorResponse('Error', 404, ['campaign does not exist']))
	}

	if(campaign.sections.length > 0){

		const sections = campaign.sections;

		const itm = sections.find((x) => x.label === label);
		const itmx = sections.findIndex((x) => x.label === label);

		if(itm && itmx >= 0){
			sections.splice(itmx, 1);
			campaign.sections = sections;
			await campaign.save();
		}

	}

	res.status(200).json({
		error: false,
		errors: [],
		data: {},
		message: 'successful',
		status: 200
	})

})

/**
 * @name deleteCampaign
 * @description Delete resource from the database
 * @route DELETE /blog/v1/campaigns/:id
 * @access Private | superadmin, admin
 * 
 * @returns {Response} client response
 */
export const deleteCampaign = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const campaign = await Campaign.findOne({ _id: req.params.id });

	if(!campaign){
		return next(new ErrorResponse('Error', 404, ['campaign does not exist']))
	}

	await Campaign.deleteMany({ _id: campaign._id });

	res.status(200).json({
		error: false,
		errors: [],
		data: {},
		message: 'successful',
		status: 200
	})

})


