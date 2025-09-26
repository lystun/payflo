import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { arrayIncludes, asyncHandler, dateToday, isObject, isString } from '@btffamily/vacepay'
import slugify from 'slugify'

import dayjs from 'dayjs'
import customparse from 'dayjs/plugin/customParseFormat';
dayjs.extend(customparse);

// models
import User from '../models/User.model'
import Category from '../models/Category.model'
import Post from '../models/Post.model'
import Tag from '../models/Tag.model'
import Comment from '../models/Comment.model'
import { generate } from '../utils/random.util';
import { uploadBase64File, deleteGcFile } from '../utils/google.util';
import redis from '../middleware/redis.mw';
import { CacheKeys, computeKey } from '../utils/cache.util';
import { advanced, search } from '../utils/result.util'
import PostService from '../services/post.service';
import Bracket from '../models/Bracket.model';
import CategoryService from '../services/category.service';
import BracketService from '../services/bracket.service';
import TagService from '../services/tag.service';
import UserService from '../services/user.service';
import { IPagination, IPostDoc, ISearchQuery } from '../utils/types.util';

// @desc      Get all Posts
// @route     GET /blog/v1/posts
// @access    Private
export const getPosts = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	res.status(200).json(res.advancedResults);   
})

// @desc      Get all Posts [published]
// @route     GET /blog/v1/posts/get-posts
// @access    Private
export const getPublishedPosts = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	// const cached = await redis.fetchData(CacheKeys.PublishedPosts);

	// if(cached !== null){

	// 	res.status(200).json({
	// 		error: false,
	// 		errors: [],
	// 		total: cached.data.length,
	// 		message: 'successfull',
	// 		pagination: cached.pagination,
	// 		data: cached.data,
	// 		status: 200
	// 	});

	// }

	const pop = [
		{ path: 'comments' },
		{ path: 'tags' },
		{ path: 'category' },
		{ path: 'bracket' },
		{ path: 'contributors' },
		{ path: 'reactions.user', select: '_id firstName, lastName' },
		{ path: 'author', select: '_id firstName lastName' },
		{ path: 'user', select: '_id firstName, lastName' },
	]

	const _result = await advanced(Post, pop, 'createdAt', req, 'isEnabled', true, null, 'relative');
	const published = _result.data.filter((x: IPostDoc) => x.isPublished === true);

	// save data to cache
	const data = {
		key: computeKey(process.env.NODE_ENV, CacheKeys.PublishedPosts),
		value: { data: _result.data, pagination: _result.pagination }
	}
	
	await redis.keepData(data, parseInt('1800')); // expire in 30 minutes
	
	res.status(200).json({
		error: false,
		errors: [],
		count: published.length,
		total: _result.count, // display count as total
		message: 'successfull',
		pagination: _result.pagination,
		data: published,
		status: 200
	});

})

// @desc      Get all Posts [published]
// @route     GET /blog/v1/posts/latest
// @access    Private
export const getLatestPosts = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const now = new Date(); 
    const l7 = dayjs(now).subtract(7, 'day');
    const l14 = dayjs(now).subtract(14, 'day');
    const l45 = dayjs(now).subtract(45, 'day');

	let list: Array<IPostDoc> = [], onlySix: Array<IPostDoc> = [];

	const pop = [
		{ path: 'comments' },
		{ path: 'tags' },
		{ path: 'category' },
		{ path: 'bracket' },
		{ path: 'contributors' },
		{ path: 'reactions.user', select: '_id firstName, lastName' },
		{ path: 'author', select: '_id firstName lastName' },
		{ path: 'user', select: '_id firstName, lastName' },
	]

	list = await Post.find({ createdAt: { $gte: dateToday(l7).ISO }, isEnabled: true }).populate(pop).sort({ createdAt: -1 });

	if(list.length < 6){

		list = await Post.find({ createdAt: { $gte: dateToday(l14).ISO }, isEnabled: true }).populate(pop).sort({ createdAt: -1 });

		if(list.length < 6){

			list = await Post.find({ createdAt: { $gte: dateToday(l45).ISO }, isEnabled: true }).populate(pop).sort({ createdAt: -1 });
			
		}

	}

	onlySix = list.slice(-6);

	res.status(200).json({
		error: false,
		errors: [],
		data: onlySix,
		message: 'successfull',
		status: 200
	});

})

// @desc      Get user posts
// @route     GET /blog/v1/posts/get-user-posts/:id
// @access    Private
export const getUserPosts = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const user = await User.findOne({ _id: req.params.id })

	if(!user){
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	const populate = [

		{ path: 'comments' },
		{ path: 'tags' },
		{ path: 'category' },
		{ path: 'bracket' },
		{ path: 'contributors' },
		{ path: 'reactions.user', select: '_id firstName, lastName' },
		{ path: 'author', select: '_id firstName lastName' },
		{ path: 'user', select: '_id firstName, lastName' },

	]

	const result = await advanced(Post, populate, '', req, 'author', user._id);

	res.status(200).json({
		error: false,
		errors: [],
		total: result.data.length,
		message: 'successfull',
		pagination: result.pagination,
		data: result.data,
		status: 200
	});

})

// @desc      Get a Post
// @route     GET /blog/v1/posts/:id
// @access    Private
export const getPost = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const post = await Post.findOne({ _id: req.params.id }).populate([
		{ path: 'comments' },
		{ path: 'tags' },
		{ path: 'category' },
		{ path: 'bracket' },
		{ path: 'contributors' },
		{ path: 'reactions.user', select: '_id firstName, lastName' },
		{ path: 'author', select: '_id firstName lastName' },
		{ path: 'user', select: '_id firstName, lastName' },
	]);

	if(!post){
		return next(new ErrorResponse('Error', 404, ['post does not exist']))
	}

	res.status(200).json({
		error: false,
		errors: [],
		data: post,
		message: 'successful',
		status: 200
	})

})

// @desc      Get all Posts
// @route     GET /blog/v1/posts/get-post/:slug
// @access    Private
export const getPostBySlug = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const { preview } = req.query;
	
	const post = await Post.findOne({ slug: req.params.slug }).populate([
		{ path: 'comments' },
		{ path: 'tags' },
		{ path: 'category' },
		{ path: 'contributors' },
		{ path: 'reactions.user', select: '_id firstName, lastName' },
		{ path: 'author', select: '_id firstName lastName' },
		{ path: 'user', select: '_id firstName, lastName' },
	]);

	if(!post){
		return next(new ErrorResponse('Error', 404, ['post does not exist']))
	}

	if(preview && preview.toString() === 'false' && post.isEnabled === false){
		return next(new ErrorResponse('Error', 403, ['post is currently disabled']))
	}

	if(preview && preview.toString() === 'false' && post.isPublished === false){
		return next(new ErrorResponse('Error', 403, ['post is not published yet']))
	}

	if(preview && preview.toString() === 'true' && post.isPublished === true){
		return next(new ErrorResponse('Error', 403, ['post is already published']))
	}

	res.status(200).json({
		error: false,
		errors: [],
		data: post,
		message: 'successful',
		status: 200
	})

})

// @desc      Remove tag from a Post
// @route     POST /blog/v1/posts/search
// @access    Public
export const searchPosts = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const { key } = req.body;

	const query: ISearchQuery = {
		model: Post,
		ref: null,
		value: null,
		data: [
			{ title: { $regex: key, $options: 'i' } }
		],
		query: null,
		queryParam: req.query,
		populate: [
			{ path: 'comments' },
			{ path: 'tags' },
			{ path: 'category' },
			{ path: 'bracket' },
			{ path: 'contributors' },
			{ path: 'reactions.user', select: '_id firstName, lastName' },
			{ path: 'author', select: '_id firstName lastName' },
			{ path: 'user', select: '_id firstName, lastName' },
		],
		operator: 'or'
	}

	const result = await search(query); // search from DB
	const posts = result.data.filter((x: IPostDoc) => {
		if(x.isEnabled === true && x.isPublished === true){
			return x;
		}
	});

	result.count = posts.length;

	res.status(200).json({
		error: false,
		errors: [],
		count: result.count,
		total: result.total,
		data: posts,
		pagination: result.pagination,
		message: 'successful',
		status: 200
	})

})


// @desc      Remove tag from a Post
// @route     POST /blog/v1/posts/seek
// @access    Private
export const seekPosts = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
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

	if(user.userType === 'superadmin' || user.userType === 'admin'){

		const query: ISearchQuery = {
			model: Post,
			ref: null,
			value: null,
			data: [
				{ title: { $regex: key, $options: 'i' } }
			],
			query: null,
			queryParam: req.query,
			populate: [
				{ path: 'comments' },
				{ path: 'tags' },
				{ path: 'category' },
				{ path: 'bracket' },
				{ path: 'contributors' },
				{ path: 'reactions.user', select: '_id firstName, lastName' },
				{ path: 'author', select: '_id firstName lastName' },
				{ path: 'user', select: '_id firstName, lastName' },
			],
			operator: 'or'
		}
	
		result = await search(query); // search from DB
	}
	
	if(user.userType !== 'superadmin' && user.userType !== 'admin'){

		const query: ISearchQuery = {
			model: Post,
			ref: 'author',
			value: user._id,
			data: [
				{ title: { $regex: key, $options: 'i' } }
			],
			query: null,
			queryParam: req.query,
			populate: [
				{ path: 'comments' },
				{ path: 'tags' },
				{ path: 'category' },
				{ path: 'bracket' },
				{ path: 'contributors' },
				{ path: 'reactions.user', select: '_id firstName, lastName' },
				{ path: 'author', select: '_id firstName lastName' },
				{ path: 'user', select: '_id firstName, lastName' },
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


// @desc      Add a new Post
// @route     POST /blog/v1/posts?publish=
// @access    Private
export const addPost = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const loggedInUser = await User.findOne({_id: req.user._id});
	
	const { title, headline, abstract, body, tags, cover, categoryId, bracketId, authorId, callback } = req.body;

	if(!authorId){
		return next(new ErrorResponse('Error', 400, ['author id is required']))
	}

	if(!categoryId){
		return next(new ErrorResponse('Error', 400, ['category id is required']))
	}

	if(!callback){
		return next(new ErrorResponse('Error', 400, ['callback url is required']))
	}

	const user = await User.findOne({ _id: authorId });

	if(!user){
		return next(new ErrorResponse('Error', 404, ['user does not exist']))
	}

	const bracket = await Bracket.findOne({ _id: bracketId });

	if(!bracket){
		return next(new ErrorResponse('Error', 404, ['bracket does not exist']))
	}

	const category = await Category.findOne({ _id: categoryId });

	if(!category){
		return next(new ErrorResponse('Error', 404, ['category does not exist']))
	}
	
	if(cover){
		
		if(!isString(cover)){
			return next(new ErrorResponse(`Error!`, 400, ['post cover image should be a string']));
		}

		const mime = cover.split(';base64')[0].split(':')[1];
    
        if(!mime || mime === '') {
            return next(new ErrorResponse(`invalid format`, 400, ['post cover image is is expected to be base64 string']));
        }

	}

	if(tags && typeof(tags) !== 'object'){
		return next(new ErrorResponse(`Error!`, 400, ['tags is expected to be an array of items']));
	}

	if(tags && typeof(tags) === 'object' && tags.length === 0){
		return next(new ErrorResponse(`Error!`, 400, ['tags list cannot be empty']));
	}

	const exist = await Post.findOne({ title: title });

	if(exist){
		return next(new ErrorResponse(`Error!`, 400, ['post already exists. use another title']));
	}

	const isPub = req.query.publish ? req.query.publish.toString() : '';

	const post = await Post.create({
		title: title,
		headline: headline,
		abstract: abstract ? abstract : '',
		body: body,
		isPublished: isPub === 'true' ? true : false,
		publishedAt: isPub === 'true' ? dateToday(Date.now()).ISO : '',
		status: isPub === 'true' ? 'published' : 'pending',
		category: category._id,
		author: user._id,
		bracket: bracket._id,
		user: loggedInUser?._id.toString() === user._id.toString() ? loggedInUser?._id : user._id,
		isEnabled: false
	});

	// generate premalink
	post.premalink = `${callback}/${post.slug}`;
	post.previewLink = `${callback}/v/${post.slug}`;
	await post.save();

	category.posts.push(post._id);
	await category.save();

	user.posts.push(post._id);
	await user.save();

	bracket.posts.push(post._id)
	await bracket.save()

	if(tags && tags.length > 0){

		for(let i = 0; i < tags.length; i++){

			const _tag = await Tag.findOne({ name: tags[i] });

			if(_tag){

				if(!arrayIncludes(post.tags, _tag._id.toString())){

					post.tags.push(_tag._id);
					await post.save();

					_tag.posts.push(post._id);
					await _tag.save();

				}

			}else{

				const newTag = await Tag.create({
					name: tags[i],
					description: tags[i],
					isEnabled: true,
				})

				user.tags.push(newTag._id);
				await user.save();
	
				post.tags.push(newTag._id);
				await post.save();
	
				newTag.posts.push(post._id);
				newTag.categories.push(post.category);
				newTag.user = user._id;
				await newTag.save();

			}

		}

	}

	if(cover){

		const mime = cover.split(';base64')[0].split(':')[1];

		const gen = generate(8, false);
		// upload file
        const fileData = {
            file: cover,
            filename: gen.toString() + '_' + 'cover',
            mimeType: mime
        }

		const gData = await uploadBase64File(fileData);

		post.cover = gData.publicUrl;
		post.thumbnail = gData.publicUrl;
		await post.save();

	}

	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.PublishedPosts);
	await redis.deleteData(CacheKeys.Posts);

	res.status(200).json({
		error: false,
		errors: [],
		data: post,
		message: 'successful',
		status: 200
	})

})


// @desc      Update a Post
// @route     PUT /blog/v1/posts/:id
// @access    Private
export const updatePost = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const { title, headline, abstract, body, categoryId, bracketId, callback, cover, thumbnail, tags } = req.body;

	if(!callback){
		return next(new ErrorResponse('Error', 400, ['callback url is required']))
	}

	const post = await Post.findOne({ _id: req.params.id });

	if(!post){
		return next(new ErrorResponse('Error', 404, ['post does not exist']))
	}

	const user = await User.findOne({ _id: post.author });

	if(!user){
		return next(new ErrorResponse('Error', 404, ['user[author] does not exist']))
	}

	if(tags && typeof(tags) !== 'object'){
		return next(new ErrorResponse(`Error!`, 400, ['tags is expected to be an array of items']));
	}

	if(categoryId && categoryId !== ''){

		const category = await Category.findOne({ _id: categoryId });

		if(!category){
			return next(new ErrorResponse('Error', 404, ['category does not exist']))
		}

		if(category._id.toString() !== post.category.toString()){

			const prevCategory = await Category.findOne({ _id: post.category });

			await CategoryService.attachPost(category, post)

			post.category = category._id;
			await post.save();

			if(prevCategory){
				await CategoryService.detachPost(prevCategory, post)
			}

		}

	}

	if(bracketId && bracketId !== ''){

		const bracket = await Bracket.findOne({ _id: bracketId });

		if(!bracket){
			return next(new ErrorResponse('Error', 404, ['bracket does not exist']))
		}

		if(bracket._id.toString() !== post.bracket.toString()){

			const prevBracket = await Bracket.findOne({ _id: post.bracket });

			await BracketService.attachPost(bracket, post);

			post.bracket = bracket._id;
			await post.save();

			if(prevBracket){
				await BracketService.detachPost(prevBracket, post)
			}
			
		}

	}

	if(title && title !== ''){

		const existing = await Post.findOne({ title: title });

		if(existing){
			return next(new ErrorResponse('Error', 400, ['title already exists']))
		}

		post.title = title;
		await post.save();

		const ns = slugify(post.title, { lower: true, strict: true });

		// generate premalink & previewlink
		post.premalink = `${callback}/${ns}`;
		post.previewLink = `${callback}/v/${ns}`;
		await post.save();

	}else{

		post.previewLink = `${callback}/v/${post.slug}`;
		post.premalink = `${callback}/${post.slug}`;
		await post.save();

	}

	post.body = body ? body : post.body;
	post.abstract = abstract ? abstract : post.abstract;
	post.headline = headline ? headline : post.headline;
	await post.save();


	if(cover){
		
		if(!isString(cover)){
			return next(new ErrorResponse(`Error!`, 400, ['post cover image should be a string']));
		}

		const mime = cover.split(';base64')[0].split(':')[1];
    
        if(!mime || mime === '') {
            return next(new ErrorResponse(`invalid format`, 400, ['post cover image is is expected to be base64 string']));
        }

		const gen = generate(8, false);
		// upload file
        const fileData = {
            file: cover,
            filename: gen.toString() + '_' + 'cover',
            mimeType: mime
        }

		// delete the prev file if it exists
		if(post.cover){

			const splitted = post.cover.split('/');
			const _name = splitted[splitted.length - 1]
			await deleteGcFile(_name);

		}

		const gData = await uploadBase64File(fileData);

		post.cover = gData.publicUrl;
		await post.save();

	}

	if(thumbnail){
		
		if(!isString(thumbnail)){
			return next(new ErrorResponse(`Error!`, 400, ['post thumbnail image should be a string']));
		}

		const mime = thumbnail.split(';base64')[0].split(':')[1];
    
        if(!mime || mime === '') {
            return next(new ErrorResponse(`invalid format`, 400, ['post thumbnail image is is expected to be base64 string']));
        }

		const gen = generate(8, false);

		// upload file
        const fileData = {
            file: thumbnail,
            filename: gen.toString() + '_' + 'thumbnail',
            mimeType: mime
        }

		const gData = await uploadBase64File(fileData);

		post.thumbnail = gData.publicUrl;
		await post.save();

	}

	if(tags && tags.length > 0){

		for(let i = 0; i < tags.length; i++){

			const _tag = await Tag.findOne({ name: tags[i] });

			if(_tag){

				if(!arrayIncludes(post.tags, _tag._id.toString())){

					post.tags.push(_tag._id);
					await post.save();

					_tag.posts.push(post._id);
					await _tag.save();

				}

			}else{

				const newTag = await Tag.create({
					name: tags[i],
					description: tags[i],
					isEnabled: true,
				})

				user.tags.push(newTag._id);
				await user.save();
	
				post.tags.push(newTag._id);
				await post.save();
	
				newTag.posts.push(post._id);
				newTag.categories.push(post.category);
				newTag.user = user._id;
				await newTag.save();

			}

		}

	}
	
	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.PublishedPosts);
	await redis.deleteData(CacheKeys.Posts);

	res.status(200).json({
		error: false,
		errors: [],
		data: post,
		message: 'successful',
		status: 200
	})

})


// @desc      Publish a post //
// @route     PUT /blog/v1/posts/publish/:id
// @access    Private
export const publishPost = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const { author } = req.body;

	const post = await Post.findOne({ _id: req.params.id });

	if(!post){
		return next(new ErrorResponse('Error', 404, ['post does not exist']))
	}

	const user = await User.findOne({ _id: author });

	if(!user){
		return next(new ErrorResponse('Error', 404, ['author[user] does not exist']))
	}

	if(user.userType !== 'superadmin' && user.userType !== 'admin' && !arrayIncludes(user.posts, post._id.toString())){
		return next(new ErrorResponse('Error', 400, ['author[user] does not own post']))
	}

	if(post.isPublished === false && post.status === 'pending'){
		post.isPublished = true;
		post.status = 'published';
		post.isEnabled = true;
		await post.save();
	}

	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.PublishedPosts);
	await redis.deleteData(CacheKeys.Posts);

	res.status(200).json({
		error: false,
		errors: [],
		data: post,
		message: 'successful',
		status: 200
	})

})

// @desc      Unpublish a post
// @route     PUT /blog/v1/posts/un-publish/:id
// @access    Private
export const unPublishPost = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const { author } = req.body;

	const post = await Post.findOne({ _id: req.params.id });

	if(!post){
		return next(new ErrorResponse('Error', 404, ['post does not exist']))
	}

	const user = await User.findOne({ _id: author });

	if(!user){
		return next(new ErrorResponse('Error', 404, ['author[user] does not exist']))
	}

	if(user.userType !== 'superadmin' && user.userType !== 'admin' && !arrayIncludes(user.posts, post._id.toString())){
		return next(new ErrorResponse('Error', 400, ['author[user] does not own post']))
	}

	if(post.isPublished === true && post.status === 'published'){
		post.isPublished = false;
		post.status = 'pending'
		await post.save();
	}

	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.PublishedPosts);
	await redis.deleteData(CacheKeys.Posts);

	res.status(200).json({
		error: false,
		errors: [],
		data: post,
		message: 'successful',
		status: 200
	})

})


// @desc      Update a Post [cover/thumbnail image]
// @route     PUT /blog/v1/posts/update-images/:id
// @access    Private
export const updateImages = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const { cover, thumbnail } = req.body;

	const post = await Post.findOne({ _id: req.params.id });

	if(!post){
		return next(new ErrorResponse('Error', 404, ['post does not exist']))
	}

	if(!cover && !thumbnail){
		return next(new ErrorResponse('Error', 400, ['either of cover or thumbnail is required']))
	}

	if(cover){
		
		if(!isString(cover)){
			return next(new ErrorResponse(`Error!`, 400, ['post cover image should be a string']));
		}

		const mime = cover.split(';base64')[0].split(':')[1];
    
        if(!mime || mime === '') {
            return next(new ErrorResponse(`invalid format`, 400, ['post cover image is is expected to be base64 string']));
        }

		const gen = generate(8, false);
		// upload file
        const fileData = {
            file: cover,
            filename: gen.toString() + '_' + 'cover',
            mimeType: mime
        }

		// delete the prev file if it exists
		if(post.cover){

			const splitted = post.cover.split('/');
			const _name = splitted[splitted.length - 1]
			await deleteGcFile(_name);

		}

		const gData = await uploadBase64File(fileData);

		post.cover = gData.publicUrl;
		await post.save();

	}

	if(thumbnail){
		
		if(!isString(thumbnail)){
			return next(new ErrorResponse(`Error!`, 400, ['post thumbnail image should be a string']));
		}

		const mime = thumbnail.split(';base64')[0].split(':')[1];
    
        if(!mime || mime === '') {
            return next(new ErrorResponse(`invalid format`, 400, ['post thumbnail image is is expected to be base64 string']));
        }

		const gen = generate(8, false);

		// delete the prev file if it exists
		// if(post.thumbnail){

		// 	const splitted = post.thumbnail.split('/');
		// 	const _name = splitted[splitted.length - 1]
		// 	await deleteGcFile(_name);

		// }

		// upload file
        const fileData = {
            file: thumbnail,
            filename: gen.toString() + '_' + 'thumbnail',
            mimeType: mime
        }

		const gData = await uploadBase64File(fileData);

		post.thumbnail = gData.publicUrl;
		await post.save();

	}

	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.PublishedPosts);
	await redis.deleteData(CacheKeys.Posts);

	res.status(200).json({
		error: false,
		errors: [],
		data: post,
		message: 'successful',
		status: 200
	})

})


// @desc      Add tags to a Post
// @route     PUT /blog/v1/posts/add-tags/:id
// @access    Private
export const addTags = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const { tags } = req.body;

	const post = await Post.findOne({ _id: req.params.id });

	if(!post){
		return next(new ErrorResponse('Error', 404, ['post does not exist']))
	}

	if(!tags){
		return next(new ErrorResponse('Error', 400, ['tags is required']))
	}

	if(!isObject(tags)){
		return next(new ErrorResponse('Error', 400, ['tags is required to be an array of tag names']))
	}

	if(tags && tags.length > 0){

		for(let i = 0; i < tags.length; i++){

			const _tag = await Tag.findOne({ name: tags[i] });

			if(_tag){

				if(!arrayIncludes(post.tags, _tag._id.toString())){

					post.tags.push(_tag._id);
					await post.save();

					_tag.posts.push(post._id);
					await _tag.save();

				}

			}else{

				const newTag = await Tag.create({
					name: tags[i],
					description: tags[i],
					isEnabled: true,
				})
	
				post.tags.push(newTag._id);
				await post.save();
	
				newTag.posts.push(post._id);
				newTag.categories.push(post.category);
				newTag.user = post.user;
				await newTag.save();

			}

		}

	}

	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.PublishedPosts);
	await redis.deleteData(CacheKeys.Posts);

	res.status(200).json({
		error: false,
		errors: [],
		data: post,
		message: 'successful',
		status: 200
	})

})

// @desc      Remove tag from a Post
// @route     PUT /blog/v1/posts/remove-tag/:id
// @access    Private
export const removeTag = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const { name } = req.body;

	const post = await Post.findOne({ _id: req.params.id });

	if(!post){
		return next(new ErrorResponse('Error', 404, ['post does not exist']))
	}

	if(!name){
		return next(new ErrorResponse('Error', 400, ['tag name is required']))
	}

	const tag = await Tag.findOne({ name: name });

	if(!tag){
		return next(new ErrorResponse('Error', 404, ['tag does not exist']))
	}

	if(arrayIncludes(post.tags, tag._id.toString())){
		const index = post.tags.findIndex((t) => t.toString() === tag._id.toString());
		post.tags.splice(index, 1);
		await post.save();
	}

	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.PublishedPosts);
	await redis.deleteData(CacheKeys.Posts);

	res.status(200).json({
		error: false,
		errors: [],
		data: post,
		message: 'successful',
		status: 200
	})

})


// @desc      Add contributors to a Post
// @route     PUT /blog/v1/posts/add-contributors/:id
// @access    Private
export const addContributors = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const { list } = req.body;

	const post = await Post.findOne({ _id: req.params.id });

	if(!post){
		return next(new ErrorResponse('Error', 404, ['post does not exist']))
	}

	if(!list){
		return next(new ErrorResponse('Error', 400, ['list is required']))
	}

	if(!isObject(list)){
		return next(new ErrorResponse('Error', 400, ['list is required to be an array of user ids']))
	}

	for(let i = 0; i < list.length; i++){

		const user = await User.findOne({ _id: list[i] });

		if (user) {
			
			if (!arrayIncludes(post.contributors, user._id.toString())) {
				
				post.contributors.push(user._id);
				await post.save();
	
				user.posts.push(post._id);
				await user.save();
			}
			

		}

	}

	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.PublishedPosts);
	await redis.deleteData(CacheKeys.Posts);

	res.status(200).json({
		error: false,
		errors: [],
		data: post,
		message: 'successful',
		status: 200
	})

})

// @desc      Enable a Post
// @route     PUT /blog/v1/posts/enable/:id
// @access    Private
export const enablePost = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const post = await Post.findOne({ _id: req.params.id });

	if(!post){
		return next(new ErrorResponse('Error', 404, ['post does not exist']))
	}

	if(post.isEnabled === false){
		post.isEnabled = true;
		await post.save();
	}

	res.status(200).json({
		error: false,
		errors: [],
		data: post,
		message: 'successful',
		status: 200
	})

})

// @desc      Diable a Post
// @route     PUT /blog/v1/posts/disable/:id
// @access    Private
export const disablePost = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

	const post = await Post.findOne({ _id: req.params.id });

	if(!post){
		return next(new ErrorResponse('Error', 404, ['post does not exist']))
	}

	if(post.isEnabled === true){
		post.isEnabled = false;
		await post.save();
	}

	res.status(200).json({
		error: false,
		errors: [],
		data: post,
		message: 'successful',
		status: 200
	})

})

// @desc      Remove post from DB
// @route     DELETE /blog/v1/posts/:id
// @access    Private
export const deletePost = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {
	
	const user = await User.findOne({ _id: req.user._id });

	if(!user){
		return next(new ErrorResponse('Error', 403, ['user does not exist']))
	}

	const post = await Post.findOne({ _id: req.params.id });

	if(!post){
		return next(new ErrorResponse('Error', 404, ['post does not exist']))
	}

	if(user.userType === 'superadmin' || user.userType === 'admin'){

		await BracketService.detachPostFromAll(post);
		await CategoryService.detachPostFromAll(post);
		await TagService.detachPostFromAll(post);
		await PostService.deleteAllComments(post);

		await Post.deleteOne({ _id: post._id });

	}

	if(user.userType !== 'superadmin' && user.userType !== 'admin'){

		if(UserService.hasPost(user, post)){

			await BracketService.detachPostFromAll(post);
			await CategoryService.detachPostFromAll(post);
			await TagService.detachPostFromAll(post);
			await PostService.deleteAllComments(post);

			await Post.deleteOne({ _id: post._id });

		}

	}

	// delete the cached data to make room for fresh data
	await redis.deleteData(CacheKeys.PublishedPosts);
	await redis.deleteData(CacheKeys.Posts);

	res.status(200).json({
		error: false,
		errors: [],
		data: {
			_id: post._id,
			title: post.title,
			comments: post.comments.length
		},
		message: 'successful',
		status: 200
	})

})

/** 
 * snippet
 * **/

// @desc        Login user (with verification)
// @route       POST /identity/v1/auth/login
// @access      Public
// export const funcd = asyncHandler(async (req: Request, res:Response, next: NextFunction) => {

// })



