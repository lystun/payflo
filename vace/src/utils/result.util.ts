import { Model } from 'mongoose';
import { Request } from 'express';
import { sortData, isEmptyObject, dateToday, leadingNum } from '@btffamily/vacepay';
import { IGeoSearchQuery, IPagination, IPopulateQuery, ISearchQuery } from '../utils/types.util'

const EARTH_RADIUS_KM = 6378.1;
const EARTH_RADIUS_ML = 3963.2;

const defineRef = (ref: any): string => {
	return ref === 'id' ? '_id' : ref
}

const formatDateRange = (from?: string, to?: string): { start: string, end: string } => {

	let result: { start: string, end: string } = { start: '', end: '' }

	if (from) {
		const ts = dateToday(from.trim());
		result.start = `${ts.year}-${leadingNum(ts.month)}-${leadingNum(ts.date)}`
	}

	if (to) {
		const te = dateToday(to.trim());
		result.end = `${te.year}-${leadingNum(te.month)}-${leadingNum(te.date + 1)}` // add 1 to include the current date
	}

	return result;

}

export const advanced = async (model: Model<any>, populate: Array<any> = [], sortRef: string = '', req: any = {}, ref: any = null, value: any = null, q: any = null, paginate: string = ''): Promise<IPagination> => {

	let query: any;
	let sortList: Array<any> = [];
	let order: number = -1;

	// copy request query
	const reqQuery = { ...req.query };

	// fields to exclude
	const removeFields = ['select', 'sort', 'page', 'limit', 'order', 'from', 'to'];

	// loop over removeFields and delete them from request query
	removeFields.forEach((p) => delete reqQuery[p]);

	// create query string
	let queryStr = JSON.stringify(reqQuery);

	// create operators
	queryStr = queryStr.replace(
		/\b(gt|gte|lt|lte|in)\b/g,
		(match) => `$${match}`
	);

	// capture date range
	const dateRange = formatDateRange(req.query.from, req.query.to)

	// find resource
	if (ref === null && value === null) {

		if (q !== null) {

			if (dateRange.start && !dateRange.end) {
				q.push({ createdAt: { $gte: new Date(dateRange.start) } })
			} else if (dateRange.start && dateRange.end) {
				q.push({ createdAt: { $gte: new Date(dateRange.start), $lte: new Date(dateRange.end) } })
			}

			query = model.find({ $and: q });

		} else {

			if (dateRange.start && !dateRange.end) {
				query = model.find({ createdAt: { $gte: new Date(dateRange.start) } });
			} else if (dateRange.start && dateRange.end) {
				query = model.find({ createdAt: { $gte: new Date(dateRange.start), $lte: new Date(dateRange.end) } });
			} else {
				query = model.find(JSON.parse(queryStr));
			}

		}

	} else {

		if (q !== null) {

			if (dateRange.start && !dateRange.end) {
				q.push({ createdAt: { $gte: new Date(dateRange.start) } })
			} else if (dateRange.start && dateRange.end) {
				q.push({ createdAt: { $gte: new Date(dateRange.start), $lte: new Date(dateRange.end) } })
			}

			query = model.find({ $and: q }).where(defineRef(ref)).equals(value);

		} else {

			if (dateRange.start && !dateRange.end) {
				query = model.find({ createdAt: { $gte: new Date(dateRange.start) } }).where(defineRef(ref)).equals(value);
			} else if (dateRange.start && dateRange.end) {
				query = model.find({ createdAt: { $gte: new Date(dateRange.start), $lte: new Date(dateRange.end) } }).where(defineRef(ref)).equals(value);
			} else {
				query = model.find({}).where(defineRef(ref)).equals(value);
			}

		}

	}

	// select fields
	if (req.query && req.query.select) {
		const fields = req.query.select.toString().split(',').join(' ');
		query = query.select(fields);
	}

	// sort
	if (req.query.order && req.query.order === 'asc') {
		order = 1;
	} else if (req.query.order && req.query.order === 'desc') {
		order = -1;
	}

	if (req.query && req.query.sort) {

		let sobj: object = {};
		const spl: Array<string> = req.query.sort.toString().split(',');

		if (spl.length > 0) {

			/*
				create a list of keys & values based on
				list of sort keys supplied
			*/
			spl.forEach((x) => {
				sortList.push({ k: x, v: order })
			})

			// turn the list into a single object like { k:v, k:v, k:v }
			sobj = sortList.reduce((o, itm) => Object.assign(o, { [itm.k]: itm.v }), {});

			query = query.sort(sobj); // define the sort query
		}


	} else {
		query = query.sort({ createdAt: order });
	}

	// pagination
	const page = parseInt((req.query && req.query.page as string), 10) || 1;
	const limit = parseInt((req.query && req.query.limit as string), 10) || 50;
	const startIndex = (page - 1) * limit;
	const endIndex = page * limit;
	const total = await model.countDocuments();

	query = query.skip(startIndex).limit(limit);

	//populate
	if (populate) {
		query = query.populate(populate);
	}

	// execute query
	const results: any = await query;


	// Pagination result
	const pagination: any = {};

	// return pagination based on total records or referenced records
	if (!paginate || (paginate && paginate === 'absolute')) {

		if (endIndex < total) {
			pagination.next = {
				page: page + 1,
				limit,
			};
		}

		if (startIndex > 0) {
			pagination.prev = {
				page: page - 1,
				limit,
			};
		}

	} else if (paginate && paginate === 'relative') {

		if (endIndex < results.length) {
			pagination.next = {
				page: page + 1,
				limit,
			};
		}

		if (startIndex > 0) {
			pagination.prev = {
				page: page - 1,
				limit,
			};
		}

	}

	const returnData: IPagination = {
		total: total,
		count: results.length,
		pagination: pagination,
		data: results
	}

	return returnData

}

export const populate = async (q: IPopulateQuery): Promise<IPagination> => {

	let query: any;
	let sortList: Array<any> = [];
	let order: number = -1;
    let fields: any = '';
    let sort: any = {};
    let dataPop: Array<any> = [];
    let dateQuery: any = {}

	// copy request query
	const reqQuery = { ...q.queryParam };

	// fields to exclude
	const removeFields = ['select', 'sort', 'page', 'limit', 'order', 'from', 'to'];

	// loop over removeFields and delete them from request query
	removeFields.forEach((p) => delete reqQuery[p]);

	// create query string
	let queryStr = JSON.stringify(reqQuery);

	// create operators
	queryStr = queryStr.replace(
		/\b(gt|gte|lt|lte|in)\b/g,
		(match) => `$${match}`
	);

	// capture date range
	const dateRange = formatDateRange(q.queryParam.from, q.queryParam.to)

	// find resource

	if (dateRange.start && !dateRange.end) {
        dateQuery = { createdAt: { $gte: new Date(dateRange.start) } }
    } else if (dateRange.start && dateRange.end) {
        dateQuery = { createdAt: { $gte: new Date(dateRange.start), $lte: new Date(dateRange.end) } }
    }

	// select fields
	if (q.queryParam && q.queryParam.select) {
		fields = q.queryParam.select.toString().split(',').join(' ');
	}

	// sort
	if (q.queryParam.order && q.queryParam.order === 'asc') {
		order = 1;
	} else if (q.queryParam.order && q.queryParam.order === 'desc') {
		order = -1;
	}

	if (q.queryParam && q.queryParam.sort) {

		const spl: Array<string> = q.queryParam.sort.toString().split(',');

		if (spl.length > 0) {

			/*
				create a list of keys & values based on
				list of sort keys supplied
			*/
			spl.forEach((x) => {
				sortList.push({ k: x, v: order })
			})

			// turn the list into a single object like { k:v, k:v, k:v }
			sort = sortList.reduce((o, itm) => Object.assign(o, { [itm.k]: itm.v }), {});
		}


	} else {
        sort = { createdAt: order };
	}

	// pagination
	const page = parseInt((q.queryParam && q.queryParam.page as string), 10) || 1;
	const limit = parseInt((q.queryParam && q.queryParam.limit as string), 10) || 50;
	const startIndex = (page - 1) * limit;
	const endIndex = page * limit;
	const total = await q.submodel.countDocuments();

	//populate
	if (q.populate) {
		dataPop = q.populate;
	}

    // define the reference
    const refValue = defineRef(q.ref);
    query = q.model.find(dateQuery).where(refValue).equals(q.value).populate([
        {
            path: q.path,
            select: fields,
            options: {
                limit: limit,
                skip: startIndex,
                sort: sort,
                populate: dataPop,
            },
        }
    ])

	// execute query
	const results: any = await query;

	// Pagination result
	const pagination: any = {};

	// return pagination based on total records or referenced records
	if (!q.paginate || (q.paginate && q.paginate === 'absolute')) {

		if (endIndex < total) {
			pagination.next = {
				page: page + 1,
				limit,
			};
		}

		if (startIndex > 0) {
			pagination.prev = {
				page: page - 1,
				limit,
			};
		}

	} else if (q.paginate && q.paginate === 'relative') {

		if (endIndex < results.length) {
			pagination.next = {
				page: page + 1,
				limit,
			};
		}

		if (startIndex > 0) {
			pagination.prev = {
				page: page - 1,
				limit,
			};
		}

	}

	const returnData: IPagination = {
		total: total,
		count: results.length,
		pagination: pagination,
		data: results
	}

	return returnData

}

export const search = async (q: ISearchQuery): Promise<IPagination> => {

	let query: any;
	let resultArray: any, results: Array<any>;
	let sortList: Array<any> = []; let order: number = -1;

	// copy request query
	const reqQuery = { ...q.queryParam };

	// fields to exclude
	const removeFields = ['select', 'sort', 'page', 'limit', 'order'];

	// loop over removeFields and delete them from request query
	removeFields.forEach((p) => delete reqQuery[p]);

	// create query string
	let queryStr = JSON.stringify(reqQuery);

	// create operators
	queryStr = queryStr.replace(
		/\b(gt|gte|lt|lte|in)\b/g,
		(match) => `$${match}`
	);

	// capture date range
	const dateRange = formatDateRange(q.queryParam.from, q.queryParam.to)

	// find resource using the $and operator
	// check if there is a conditional reference
	if ((!q.ref || q.ref === undefined || q.ref === null) && (!q.value || q.value === undefined || q.value === null)) {

		if (dateRange.start && !dateRange.end) {
			q.data.push({ createdAt: { $gte: new Date(dateRange.start) } })
		} else if (dateRange.start && dateRange.end) {
			q.data.push({ createdAt: { $gte: new Date(dateRange.start), $lte: new Date(dateRange.end) } })
		}

        if (q.operator === 'in') {
			query = q.model.find(q.data)
			resultArray = q.model.find(q.data);
		}

		else if (q.operator === 'or') {
			query = q.model.find({ $or: q.data })
			resultArray = q.model.find({ $or: q.data });
		}

		else if (q.operator === 'and') {
			query = q.model.find({ $and: q.data })
			resultArray = q.model.find({ $and: q.data });
		}

		else if (q.operator === 'andor') {
			query = q.model.find({
				$and: [
					{ $or: q.query },
					{ $or: q.data }
				]
			})
			resultArray = q.model.find({
				$and: [
					{ $or: q.query },
					{ $or: q.data }
				]
			});
		}

		else if (q.operator === 'orand') {
			query = q.model.find({
				$or: [
					{ $and: q.query },
					{ $and: q.data }
				]
			})
			resultArray = q.model.find({
				$or: [
					{ $and: q.query },
					{ $and: q.data }
				]
			});
		}

		else if (!q.operator && q.data) {
			query = q.model.find(q.data)
			resultArray = q.model.find(q.data);
		}

		else if (!q.operator && (!q.data || q.data.length === 0 || isEmptyObject(q.data))) {

			if (dateRange.start && !dateRange.end) {

				query = q.model.find({ createdAt: { $gte: new Date(dateRange.start) } })
				resultArray = q.model.find({ createdAt: { $gte: new Date(dateRange.start) } });

			} else if (dateRange.start && dateRange.end) {

				query = q.model.find({ createdAt: { $gte: new Date(dateRange.start), $lte: new Date(dateRange.end) } })
				resultArray = q.model.find({ createdAt: { $gte: new Date(dateRange.start), $lte: new Date(dateRange.end) } });

			} else {

				query = q.model.find({})
				resultArray = q.model.find({});

			}

		}

		else {

			if (dateRange.start && !dateRange.end) {

				query = q.model.find({ createdAt: { $gte: new Date(dateRange.start) } })
				resultArray = q.model.find({ createdAt: { $gte: new Date(dateRange.start) } });

			} else if (dateRange.start && dateRange.end) {

				query = q.model.find({ createdAt: { $gte: new Date(dateRange.start), $lte: new Date(dateRange.end) } })
				resultArray = q.model.find({ createdAt: { $gte: new Date(dateRange.start), $lte: new Date(dateRange.end) } });

			} else {

				query = q.model.find({})
				resultArray = q.model.find({});

			}

		}


	} else {

		if (dateRange.start && !dateRange.end) {
			q.data.push({ createdAt: { $gte: new Date(dateRange.start) } })
		} else if (dateRange.start && dateRange.end) {
			q.data.push({ createdAt: { $gte: new Date(dateRange.start), $lte: new Date(dateRange.end) } })
		}

        if (q.operator === 'in') {
			query = q.model.find(q.data).where(defineRef(q.ref)).equals(q.value)
			resultArray = q.model.find(q.data).where(defineRef(q.ref)).equals(q.value)
		}

		else if (q.operator === 'or') {
			query = q.model.find({ $or: q.data }).where(defineRef(q.ref)).equals(q.value)
			resultArray = q.model.find({ $or: q.data }).where(defineRef(q.ref)).equals(q.value)
		}

		else if (q.operator === 'and') {
			query = q.model.find({ $and: q.data }).where(defineRef(q.ref)).equals(q.value)
			resultArray = q.model.find({ $and: q.data }).where(defineRef(q.ref)).equals(q.value)
		}

		else if (q.operator === 'andor') {
			query = q.model.find({
				$and: [
					{ $or: q.query },
					q.data
				]
			}).where(defineRef(q.ref)).equals(q.value)
			resultArray = q.model.find({
				$and: [
					{ $or: q.query },
					q.data
				]
			}).where(defineRef(q.ref)).equals(q.value)
		}

		else if (!q.operator && q.data) {
			query = q.model.find(q.data).where(defineRef(q.ref)).equals(q.value)
			resultArray = q.model.find(q.data).where(defineRef(q.ref)).equals(q.value)
		}

		else if (!q.operator && (!q.data || q.data.length === 0 || isEmptyObject(q.data))) {

			if (dateRange.start && !dateRange.end) {

				query = q.model.find({ createdAt: { $gte: new Date(dateRange.start) } }).where(defineRef(q.ref)).equals(q.value)
				resultArray = q.model.find({ createdAt: { $gte: new Date(dateRange.start) } }).where(defineRef(q.ref)).equals(q.value)

			} else if (dateRange.start && dateRange.end) {

				query = q.model.find({ createdAt: { $gte: new Date(dateRange.start), $lte: new Date(dateRange.end) } }).where(defineRef(q.ref)).equals(q.value)
				resultArray = q.model.find({ createdAt: { $gte: new Date(dateRange.start), $lte: new Date(dateRange.end) } }).where(defineRef(q.ref)).equals(q.value)

			} else {

				query = q.model.find({}).where(defineRef(q.ref)).equals(q.value)
				resultArray = q.model.find({}).where(defineRef(q.ref)).equals(q.value)

			}

		}

		else {

			if (dateRange.start && !dateRange.end) {

				query = q.model.find({ createdAt: { $gte: new Date(dateRange.start) } }).where(defineRef(q.ref)).equals(q.value)
				resultArray = q.model.find({ createdAt: { $gte: new Date(dateRange.start) } }).where(defineRef(q.ref)).equals(q.value)

			} else if (dateRange.start && dateRange.end) {

				query = q.model.find({ createdAt: { $gte: new Date(dateRange.start), $lte: new Date(dateRange.end) } }).where(defineRef(q.ref)).equals(q.value)
				resultArray = q.model.find({ createdAt: { $gte: new Date(dateRange.start), $lte: new Date(dateRange.end) } }).where(defineRef(q.ref)).equals(q.value)

			} else {

				query = q.model.find({}).where(defineRef(q.ref)).equals(q.value)
				resultArray = q.model.find({}).where(defineRef(q.ref)).equals(q.value)

			}

		}

	}

	// select fields
	if (q.queryParam.select) {

		const fields = q.queryParam.select.toString().split(',').join(' ');
		resultArray = resultArray.select(fields)
		query = query.select(fields);

	}

	// sort
	if (q.queryParam.order && q.queryParam.order === 'asc') {
		order = 1;
	} else if (q.queryParam.order && q.queryParam.order === 'desc') {
		order = -1;
	}

	if (q.queryParam.sort) {

		let sobj: object = {};
		const spl: Array<string> = q.queryParam.sort.toString().split(',');

		if (spl.length > 0) {

			/*
				create a list of keys & values based on
				list of sort keys supplied
			*/
			spl.forEach((x) => {
				sortList.push({ k: x, v: order })
			})

			// turn the list into a single object like { k:v, k:v, k:v }
			sobj = sortList.reduce((o, itm) => Object.assign(o, { [itm.k]: itm.v }), {});

			resultArray = resultArray.sort(sobj);
			query = query.sort(sobj); // define the sort query
		}

	} else {

		resultArray = resultArray.sort({ createdAt: order });
		query = query.sort({ createdAt: order });
	}

	// pagination
	const page = q.queryParam.page ? parseInt(q.queryParam.page.toString(), 10) : 1;
	const limit = q.queryParam.limit ? parseInt(q.queryParam.limit.toString(), 10) : 50;
	const startIndex = (page - 1) * limit;
	const endIndex = page * limit;

	query = query.skip(startIndex).limit(limit);

	//populate
	if (q.populate) {
		query = query.populate(q.populate);
	}

	// execute query
	results = await query;

	// get the total document records
	const totalRec = await q.model.countDocuments();

	// Pagination result
	const pagination: any = {};

	// return pagination based on total records or referenced records
	if (!q.queryParam.paginate || (q.queryParam.paginate && q.queryParam.paginate === 'absolute')) {


		if (endIndex < totalRec) {
			pagination.next = {
				page: page + 1,
				limit,
			};
		}

		if (startIndex > 0) {
			pagination.prev = {
				page: page - 1,
				limit,
			};
		}


	} else if (q.queryParam.paginate && q.queryParam.paginate === 'relative') {

		if (endIndex < results.length) {
			pagination.next = {
				page: page + 1,
				limit,
			};
		}

		if (startIndex > 0) {
			pagination.prev = {
				page: page - 1,
				limit,
			};
		}

	}

	const result: IPagination = {
		total: totalRec,
		count: results.length,
		pagination: pagination,
		data: results,
	};

	return result;

}

export const geoSearch = async (q: IGeoSearchQuery): Promise<any> => {

	let query: any;
	let resultArray: any, results: Array<any>;
	let sortList: Array<any> = []; let order: number = -1;

	// copy request query
	const reqQuery = { ...q.queryParam };

	// fields to exclude
	const removeFields = ['select', 'sort', 'page', 'limit', 'order'];

	// loop over removeFields and delete them from request query
	removeFields.forEach((p) => delete reqQuery[p]);

	// create query string
	let queryStr = JSON.stringify(reqQuery);

	// create operators
	queryStr = queryStr.replace(
		/\b(gt|gte|lt|lte|in)\b/g,
		(match) => `$${match}`
	);

	// find resource using the $and operator
	// check if there is a conditional reference
	if ((!q.ref || q.ref === undefined || q.ref === null) && (!q.value || q.value === undefined || q.value === null)) {

		if (q.operator === 'center') {

			query = q.model.find(isEmptyObject(q.data) === false ? q.data : {
				location: {
					$geoWithin: {
						$center: [
							[q.query.geoData.longitude, q.query.geoData.latitude],
							q.query.radius
						]
					}
				}
			})

			resultArray = q.model.find(isEmptyObject(q.data) === false ? q.data : {
				location: {
					$geoWithin: {
						$center: [
							[q.query.geoData.longitude, q.query.geoData.latitude],
							q.query.radius
						]
					}
				}
			})

		}

		if (q.operator === 'centersphere') {

			const calcRadius = q.query.radiusUnit === 'km' ? (q.query.radius / EARTH_RADIUS_KM) : (q.query.radius / EARTH_RADIUS_ML)

			query = q.model.find(isEmptyObject(q.data) === false ? q.data : {
				location: {
					$geoWithin: {
						$centerSphere: [
							[q.query.geoData.longitude, q.query.geoData.latitude],
							calcRadius
						]
					}
				}
			})

			resultArray = q.model.find(isEmptyObject(q.data) === false ? q.data : {
				location: {
					$geoWithin: {
						$centerSphere: [
							[q.query.geoData.longitude, q.query.geoData.latitude],
							calcRadius
						]
					}
				}
			})

		}

		if (q.operator === 'range') {

			query = q.model.find(isEmptyObject(q.data) === false ? q.data : {

				location: {

					$near: {

						$geometry: { type: 'Point', coordinates: [q.query.geoData.longitude, q.query.geoData.latitude] },
						$minDistance: q.query.minDistance,
						$maxDistance: q.query.minDistance

					}

				}

			})

			resultArray = q.model.find(isEmptyObject(q.data) === false ? q.data : {

				location: {

					$near: {

						$geometry: { type: 'Point', coordinates: [q.query.geoData.longitude, q.query.geoData.latitude] },
						$minDistance: q.query.minDistance,
						$maxDistance: q.query.minDistance

					}

				}

			})

		}

		if (q.operator === 'within-poly') {

			query = q.model.find(isEmptyObject(q.data) === false ? q.data : {

				location: {

					$geoWithin: {
						$geometry: { type: 'Polygon', coordinates: [q.query.coordinates] }
					}

				}

			})

			resultArray = q.model.find(isEmptyObject(q.data) === false ? q.data : {

				location: {

					$geoWithin: {
						$geometry: { type: 'Polygon', coordinates: [q.query.coordinates] }
					}

				}

			})

		}

	} else {

		if (q.operator === 'center') {

			query = q.model.find(isEmptyObject(q.data) === false ? q.data : {
				location: {
					$geoWithin: {
						$center: [
							[q.query.geoData.longitude, q.query.geoData.latitude],
							q.query.radius
						]
					}
				}
			}).where(defineRef(q.ref)).equals(q.value)

			resultArray = q.model.find(isEmptyObject(q.data) === false ? q.data : {
				location: {
					$geoWithin: {
						$center: [
							[q.query.geoData.longitude, q.query.geoData.latitude],
							q.query.radius
						]
					}
				}
			}).where(defineRef(q.ref)).equals(q.value)
		}

		if (q.operator === 'centersphere') {

			const calcRadius = q.query.radiusUnit === 'km' ? (q.query.radius / EARTH_RADIUS_KM) : (q.query.radius / EARTH_RADIUS_ML)

			query = q.model.find(isEmptyObject(q.data) === false ? q.data : {
				location: {
					$geoWithin: {
						$centerSphere: [
							[q.query.geoData.longitude, q.query.geoData.latitude],
							calcRadius
						]
					}
				}
			}).where(defineRef(q.ref)).equals(q.value)

			resultArray = q.model.find(isEmptyObject(q.data) === false ? q.data : {
				location: {
					$geoWithin: {
						$centerSphere: [
							[q.query.geoData.longitude, q.query.geoData.latitude],
							calcRadius
						]
					}
				}
			}).where(defineRef(q.ref)).equals(q.value)

		}

		if (q.operator === 'range') {

			query = q.model.find(isEmptyObject(q.data) === false ? q.data : {

				location: {

					$near: {

						$geometry: { type: 'Point', coordinates: [q.query.geoData.longitude, q.query.geoData.latitude] },
						$minDistance: q.query.minDistance,
						$maxDistance: q.query.minDistance

					}

				}

			}).where(defineRef(q.ref)).equals(q.value)

			resultArray = q.model.find(isEmptyObject(q.data) === false ? q.data : {

				location: {

					$near: {

						$geometry: { type: 'Point', coordinates: [q.query.geoData.longitude, q.query.geoData.latitude] },
						$minDistance: q.query.minDistance,
						$maxDistance: q.query.minDistance

					}

				}

			}).where(defineRef(q.ref)).equals(q.value)

		}

		if (q.operator === 'within-poly') {

			query = q.model.find(isEmptyObject(q.data) === false ? q.data : {

				location: {

					$geoWithin: {
						$geometry: { type: 'Polygon', coordinates: [q.query.coordinates] }
					}

				}

			}).where(defineRef(q.ref)).equals(q.value)

			resultArray = q.model.find(isEmptyObject(q.data) === false ? q.data : {

				location: {

					$geoWithin: {
						$geometry: { type: 'Polygon', coordinates: [q.query.coordinates] }
					}

				}

			}).where(defineRef(q.ref)).equals(q.value)

		}

	}


	// select fields
	if (q.queryParam.select) {

		const fields = q.queryParam.select.toString().split(',').join(' ');

		resultArray = resultArray.select(fields)
		query = query.select(fields);

	}

	// sort
	if (q.queryParam.order && q.queryParam.order === 'asc') {
		order = 1;
	} else if (q.queryParam.order && q.queryParam.order === 'desc') {
		order = -1;
	}

	if (q.queryParam.sort) {

		let sobj: object = {};
		const spl: Array<string> = q.queryParam.sort.toString().split(',');

		if (spl.length > 0) {

			/*
				create a list of keys & values based on
				list of sort keys supplied
			*/
			spl.forEach((x) => {
				sortList.push({ k: x, v: order })
			})

			// turn the list into a single object like { k:v, k:v, k:v }
			sobj = sortList.reduce((o, itm) => Object.assign(o, { [itm.k]: itm.v }), {});

			resultArray = resultArray.sort(sobj);
			query = query.sort(sobj); // define the sort query
		}

	} else {
		resultArray = resultArray.sort({ createdAt: order });
		query = query.sort({ createdAt: order });
	}

	// pagination
	const page = q.queryParam.page ? parseInt(q.queryParam.page.toString(), 10) : 1;
	const limit = q.queryParam.limit ? parseInt(q.queryParam.limit.toString(), 10) : 50;
	const startIndex = (page - 1) * limit;
	const endIndex = page * limit;

	query = query.skip(startIndex).limit(limit);

	//populate
	if (q.populate) {
		query = query.populate(q.populate);
	}

	// execute query
	results = await query;

	// get the total document records
	const totalRec = await q.model.countDocuments();

	// Pagination result
	const pagination: any = {};

	// return pagination based on total records or referenced records
	if (!q.queryParam.paginate || (q.queryParam.paginate && q.queryParam.paginate === 'absolute')) {


		if (endIndex < totalRec) {
			pagination.next = {
				page: page + 1,
				limit,
			};
		}

		if (startIndex > 0) {
			pagination.prev = {
				page: page - 1,
				limit,
			};
		}


	} else if (q.queryParam.paginate && q.queryParam.paginate === 'relative') {

		if (endIndex < results.length) {
			pagination.next = {
				page: page + 1,
				limit,
			};
		}

		if (startIndex > 0) {
			pagination.prev = {
				page: page - 1,
				limit,
			};
		}

	}

	const result: IPagination | any = {
		total: totalRec,
		count: results.length,
		pagination: pagination,
		data: results,
	};

	return result;

}
