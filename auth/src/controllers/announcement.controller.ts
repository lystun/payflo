import crypto from 'crypto';
import mongoose, { ObjectId } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error.util';
import { systemLogger } from '../config/wiston.config';
import { asyncHandler, sortData, rearrangeArray, notDefined } from '@btffamily/vacepay'
import { generate } from '../utils/random.util';
import { uploadBase64File } from '../utils/google.util'
import redis from '../middleware/redis.mw'
import { CacheKeys, computeKey } from '../utils/cache.util'
import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html';

import dayjs from 'dayjs'
import customparse from 'dayjs/plugin/customParseFormat';
dayjs.extend(customparse);

// models
import User from '../models/User.model'
import Announcement from '../models/Announcement.model'
import StorageService from '../services/storage.service';
import { CreateAnnouncementDTO, FilterAnnouncementDTO, UpdateAnnouncementDTO } from '../dtos/announcement.dto';
import UserService from '../services/user.service';
import { ISearchQuery, IUserDoc } from '../utils/types.util';
import announcementService from '../services/announcement.service';
import { search } from '../utils/result.util';

// @desc    Get all Announcements
// @route   GET /identity/v1/announcements/
// @access  Private
export const getAnnouncements = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json(res.advancedResults);
});


// @desc    Get an Announcements
// @route   GET /identity/v1/announcements/:id
// @access  Private
export const getAnnouncement = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const ann = await Announcement.findOne({ _id: req.params.id });

    if (!ann) {
        return next(new ErrorResponse('Error', 404, ['announcement does not exist']));
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: ann,
        message: 'successful',
        statusCode: 200
    })

});

/**
 * @name filterAnnouncements
 * @description Get a reource from database
 * @route POST /identity/v1/announcements/filter
 * @access Superadmin | Admin
 */
export const filterAnnouncements = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const body = req.body as FilterAnnouncementDTO;

    const announcement = await Announcement.findOne({ _id: req.params.id })

    if (!announcement) {
        return next(new ErrorResponse('Error', 404, ['announcement link does not exist']))
    }

    const filters = announcementService.defineFilterQuery(body);

    const query: ISearchQuery = {
        model: Announcement,
        ref: null,
        value: null,
        data: filters,
        query: null,
        queryParam: req.query,
        populate: [],
        operator: 'and'
    }

    const result = await search(query); // search from DB

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
 * @name searchAnnouncements
 * @description Get a reource from database
 * @route POST //identity/v1/announcements/search
 * @access Superadmin | Admin
 */
export const searchAnnouncements = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { key } = req.body;

    if (!key) {
        return next(new ErrorResponse('Error', 400, [`search key is required`]))
    }

    const pop = [
        { path: 'business', select: '_id name email officialEmail phoneNumber phoneCode' },
    ]

    const query: ISearchQuery = {
        model: Announcement,
        ref: null,
        value: null,
        data: [
            { title: { $regex: key, $options: 'i' } },
            { code: { $regex: key, $options: 'i' } },
            { "mail.subject": { $regex: key, $options: 'i' } },
            { "web.title": { $regex: key, $options: 'i' } },
            { "mobile.title": { $regex: key, $options: 'i' } }
        ],
        query: null,
        queryParam: req.query,
        populate: pop,
        operator: 'or'
    }

    const result = await search(query); // search from DB

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

// @desc    Add an Announcement
// @route   POST /identity/v1/announcements
// @access  Private
export const addAnnouncement = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const { title, avatar, description, mail, mobile, url, web } = req.body as CreateAnnouncementDTO;

    const validate = await announcementService.validateCreateAnnouncement(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', validate.code!, [`${validate.message}`]))
    }

    const loggedIn = await UserService.getLoggedInUser({ req, isAdmin: true })

    if (loggedIn.error) {
        return next(new ErrorResponse('Error', 500, [`${loggedIn.message}`]))
    }

    const user: IUserDoc = loggedIn.data.user;

    const create = await announcementService.createAnnouncement({
        title,
        avatar,
        description,
        url,
        user: user,
        mail: mail,
        mobile: mobile,
        web: web
    })

    if (create.error) {
        return next(new ErrorResponse('Error', 500, [`${create.message}`]))
    }

    res.status(200).json({
        error: false,
        errors: [],
        data: create.data,
        message: 'successful',
        statusCode: 200
    })

});

// @desc    Add an Announcement
// @route   PUT /identity/v1/announcements/:id
// @access  Private
export const updateAnnouncement = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    let conv: any = null, mkd: any = null;
    const { title, avatar, description, mail, mobile, url, web } = req.body as UpdateAnnouncementDTO;

    const validate = await announcementService.validateCreateAnnouncement(req.body);

    if (validate.error) {
        return next(new ErrorResponse('Error', validate.code!, [`${validate.message}`]))
    }

    const announcement = await Announcement.findOne({ _id: req.params.id });

    if (!announcement) {
        return next(new ErrorResponse('Error', 404, [`announcement does not exist`]))
    }

    if (title) {

        const exist = await Announcement.findOne({ title });

        if (exist) {
            return next(new ErrorResponse('Error', 400, [`announcement with title ${title} already exists`]))
        }

    }

    announcement.title = title ? title : announcement.title;
    announcement.url = url ? url : announcement.url;
    announcement.description = description ? description : announcement.description;

    if (mail) {

        if (mail.message) {

            conv = await marked.parse(mail.message);
            mkd = sanitizeHtml(conv, {
                allowedTags: false,
                allowedAttributes: false,
                allowedSchemes: ['data', 'http', 'https', 'ftp', 'mailto', 'tel'],
                allowedSchemesByTag: { img: ['data'] },
                allowedClasses: {
                    'code': ['language-*', 'lang-*'],
                    '*': ['fancy', 'simple']
                }
            });

        }else{
            mkd = announcement.mail.marked;
        }

        announcement.mail = {
            message: mail.message ? mail.message : announcement.mail.message,
            marked: mkd,
            subject: mail.subject ? mail.subject : announcement.mail.subject
        }

    }

    if(mobile){

        announcement.mobile = {
            message: mobile.message ? mobile.message : announcement.mobile.message,
            title: mobile.title ? mobile.title : announcement.mobile.title,
            sms: !notDefined(mobile.sms) ? mobile.sms : announcement.mobile.sms,
            push: !notDefined(mobile.push) ? mobile.push : announcement.mobile.push
        }

    }

    if(web){

        announcement.web = {
            message: web.message ? web.message : announcement.web.message,
            title: web.title ? web.title : announcement.web.title,
            dashboard: !notDefined(web.dashboard) ? web.dashboard : announcement.web.dashboard,
            isPublic: !notDefined(web.isPublic) ? web.isPublic : announcement.web.isPublic
        }

    }

    if(avatar){

        const filename = `annt-${announcement.code.toLowerCase()}-avatar`;
        const upload = await StorageService.uploadGcpFile(avatar, filename, 'base64');

        if (!upload.error && upload.data) {
            announcement.avatar = upload.data.publicUrl;
        }

    }

    await announcement.save();

    res.status(200).json({
        error: false,
        errors: [],
        data: announcement,
        message: 'successful',
        statusCode: 200
    })

});

// @desc    Delete an Announcement
// @route   DELETE /identity/v1/announcements/:id
// @access  Private
export const removeAnnouncement = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    const ann = await Announcement.findOne({ _id: req.params.id });

    if (!ann) {
        return next(new ErrorResponse('Error', 404, ['announcement does not exist']))
    }

    await Announcement.deleteOne({ _id: ann._id });
    await redis.deleteData(CacheKeys.Anns); // delete cache

    res.status(200).json({
        error: false,
        errors: [],
        data: null,
        message: 'successful',
        statusCode: 200
    })

});
