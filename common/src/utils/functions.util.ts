import crypto from 'crypto'
import mongoose from 'mongoose';
import dayjs from 'dayjs';
import customParse from 'dayjs/plugin/customParseFormat';
import weekParse from 'dayjs/plugin/weekOfYear'
import week2Parse from 'dayjs/plugin/weekYear'
dayjs.extend(customParse);
dayjs.extend(weekParse);
dayjs.extend(week2Parse);


// import https
import https from 'https';
import { DateCompare, IArrayToObject, IBase64ToString, IDateToday, IDatesSplit, IMonthsSplit, IStringToBase64 } from './types.util';
import Random from '../services/random.service';

export const charLen = (data: string): number => {
    return data.length;
};

export const wordLen = (data: string): number => {
    const array = data.trim().split(/\s+/);
    return array.length;
};

export const isObject = (arg: any): boolean => {
    const ty = typeof arg;
    return ty === 'object' ? true : false;
};

export const isString = (arg: any): boolean => {
    const ty = typeof arg;
    return ty === 'string' ? true : false;
};


export const isArray = (arg: any): boolean => {

    let res: boolean = false;
    if (Array.isArray) {
        res = Array.isArray(arg);
    }

    return res;

};

export const strToArray = (arg: string, split: string): Array<string> => {
    return arg.split(split);
};

export const strToArrayEs6 = (arg: string, split: string): Array<string> => {
    return arg.split(split);
};

export const strIncludes = (arg: any, inc: string): boolean => {
    return arg.indexOf(inc) ? true : false;
};

export const strIncludesEs6 = (arg: any, inc: string): boolean => {
    return arg.includes(inc) ? true : false;
}

export const arrayIncludesEs6 = (arr: Array<any>, inc: string): boolean => {
    return arr.includes(inc) ? true : false;
}

export const arrayIncludes = (arr: Array<any>, inc: string): boolean => {

    let flag: boolean = false;

    for (let i = 0; i < arr.length; i++) {
        if (arr[i].toString() === inc.toString()) {
            flag = true;
            break;
        }
    }

    return flag;

}

export const dateToWord = (date: any): string => {
    const theDate = dayjs(date).toString();
    return theDate;
};

export const dateToWordRaw = (): string => {
    const theDate = dayjs().toString();
    return theDate;
};

export const isEmptyObject = (obj: object): boolean => {
    return Object.keys(obj).length === 0;
}

export const isBase64 = (data: string): boolean => {
    let result: boolean = false;

    const mime = data.split(';base64')[0].split(':')[1];

    if (mime && mime !== '') {
        result = true;
    }

    return result;
}

export const getBase64Mime = (data: string): string => {
    let result: string = '';

    if (isBase64(data)) {
        result = data.split(';base64')[0].split(':')[1];
    }

    return result;
}

export const capitalize = (word: string, each: boolean = false): string => {

    let result: string = '';
    let tempList: Array<string> = []

    if (!each) {
        result = word.charAt(0).toUpperCase() + word.slice(1);
    }

    if (each) {

        let split = word.split(' ');

        split.forEach((x) => {
            tempList.push(x.charAt(0).toUpperCase() + x.slice(1))
        });

        result = tempList.join(' ');

    }

    return result;
}

export const convertUrlToBase64 = async (url: string): Promise<any> => {

    let body: any = null;

    return new Promise((resolve, reject) => {

        https.get(url, (resp) => {

            resp.setEncoding('base64');
            body = "data:" + resp.headers["content-type"] + ";base64,";
            resp.on('data', (data) => { body += data });
            resp.on('end', () => {
                try {
                    resolve(body);
                } catch (e: any) {
                    reject(e.message);
                }
            });

        }).on('error', (e) => {
            reject(`Got error: ${e.message}`);
        });

    });

}

export const leadingNum = (val: number, length: number = 2, pad: string = '0'): string => {
    let lead: string = '';

    if (val >= 0) {
        lead = val.toString().padStart(length, pad)
    }

    return lead;
}

export const daysOfWeek = (): Array<{ id: number, name: string }> => {

    let result: Array<{ id: number, name: string }> = [
        { id: 0, name: 'sunday' },
        { id: 1, name: 'monday' },
        { id: 2, name: 'tuesday' },
        { id: 3, name: 'wednesday' },
        { id: 4, name: 'thursday' },
        { id: 5, name: 'friday' },
        { id: 6, name: 'saturday' },
    ]

    return result;

}

export const monthsOfYear = (): Array<{ id: number, name: string }> => {

    let result: Array<{ id: number, name: string }> = [
        { id: 0, name: 'january' },
        { id: 1, name: 'february' },
        { id: 2, name: 'march' },
        { id: 3, name: 'april' },
        { id: 4, name: 'may' },
        { id: 5, name: 'june' },
        { id: 6, name: 'july' },
        { id: 7, name: 'august' },
        { id: 8, name: 'september' },
        { id: 9, name: 'october' },
        { id: 10, name: 'november' },
        { id: 11, name: 'december' },
    ]

    return result;

}

export const dateToday = (d: any = null): IDateToday => {

    const today = d !== null && d !== undefined && d !== '' ? new Date(d) : new Date();
    const _dayjs = d !== null && d !== undefined && d !== '' ? dayjs(d) : dayjs();

    const daysOfWeek: Array<{ id: number, name: string }> = [
        { id: 0, name: 'sunday' },
        { id: 1, name: 'monday' },
        { id: 2, name: 'tuesday' },
        { id: 3, name: 'wednesday' },
        { id: 4, name: 'thursday' },
        { id: 5, name: 'friday' },
        { id: 6, name: 'saturday' },
    ]

    const monthsOfYear: Array<{ id: number, name: string }> = [
        { id: 0, name: 'january' },
        { id: 1, name: 'february' },
        { id: 2, name: 'march' },
        { id: 3, name: 'april' },
        { id: 4, name: 'may' },
        { id: 5, name: 'june' },
        { id: 6, name: 'july' },
        { id: 7, name: 'august' },
        { id: 8, name: 'september' },
        { id: 9, name: 'october' },
        { id: 10, name: 'november' },
        { id: 11, name: 'december' },
    ]

    const date = today.getDate()
    const _d = today.getDay();
    const day = today.getDay() + 1;
    const dayName = daysOfWeek.find((d) => d.id === _d)?.name;
    const _m = today.getMonth();
    const month = today.getMonth() + 1;
    const monthName = monthsOfYear.find((m) => m.id === _m)?.name;
    const year = today.getFullYear();
    const week = _dayjs.week();
    const hour = today.getHours();
    const min = today.getMinutes();
    const sec = today.getSeconds();
    const milli = today.getMilliseconds();

    const iso = today.toISOString();
    const timestamp = today.getTime();

    return { year: year, month: month, monthName: monthName, date: date, week: week, day: day, dayName: dayName, hour: hour, min: min, sec: sec, milli: milli, ISO: iso, dayjs: today, dateTime: timestamp }

}

export const sortData = (data: Array<any>, prop: string = ''): Array<any> => {

    let sorted: Array<any> = [];

    if (prop !== '') {

        sorted = data.sort((a, b) => {
            if (a[prop].toString() < b[prop].toString()) { return -1 }
            else if (a[prop].toString() > b[prop].toString()) { return 1 }
            else { return 0 }
        })

    }

    if (prop === '') {

        sorted = data.sort((a, b) => {
            if (a.toString() < b.toString()) { return -1 }
            else if (a.toString() > b.toString()) { return 1 }
            else { return 0 }
        })

    }

    return sorted;
}

export const rearrangeArray = (from: number, to: number, arr: Array<any>): Array<any> => {

    let result: Array<any> = [];
    let temp: Array<any> = [];

    // save array temporarily
    temp = [...arr];

    // remove the item at the 'from' index in the array
    // get that item and save it in variable 'item'
    const item = arr.splice(from, 1)[0];

    if (item && item !== undefined && item !== null) {

        // copy the remaining items in the array into 'result'
        result = [...arr];

        // add the item removed above to the 'result' array but to a new index
        result.splice(to, 0, item);

    } else {

        result = [...temp]

    }

    return result;

}

export const isObjectId = (val: string): boolean => {

    let flag: boolean = false;

    if (mongoose.Types.ObjectId.isValid(val) && (String)(new mongoose.Types.ObjectId(val)) === val) {
        flag = true;
    } else {
        flag === false;
    }

    return flag;

}

export const isPos = (val: number): boolean => {

    let flag: boolean = false;

    if (!Number.isNaN(val) && val >= 0) {
        flag = true;
    } else {
        flag = false;
    }

    return flag;

}

export const isNeg = (val: number): boolean => {

    let flag: boolean = false;

    if (!Number.isNaN(val) && val < 0) {
        flag = true;
    } else {
        flag = false;
    }

    return flag;

}

export const isNumber = (val: any): boolean => {

    let flag: boolean = false;

    if (!Number.isNaN(val) && typeof (val) === 'number') {
        flag = true;
    } else {
        flag = false;
    }

    return flag;

}

export const isZero = (val: any): boolean => {

    let flag: boolean = false;

    if (isNumber(val)) {

        if (val === 0) {
            flag = true;
        } else {
            flag = false;
        }

    }

    return flag;

}

export const checkDateFormat = (date: string): boolean => {

    let flag: boolean = false;

    if (!strIncludesEs6(date, '-') && !strIncludesEs6(date, '/')) {
        flag = false;
    } else {

        if (strIncludesEs6(date, '-')) {

            const split = date.split('-');
            const y: string = split[0]; const m: string = split[1]; const d: string = split[2];

            if (y.length !== 4) {
                flag = false;
            } else if (m.length !== 2) {
                flag = false;
            } else if (d.length !== 2) {
                flag = false;
            } else {
                flag = true;
            }

        }

        if (strIncludesEs6(date, '/')) {

            const split = date.split('/');
            const y: string = split[0]; const m: string = split[1]; const d: string = split[2];

            if (y.length !== 4) {
                flag = false;
            } else if (m.length !== 2) {
                flag = false;
            } else if (d.length !== 2) {
                flag = false;
            } else {
                flag = true;
            }

        }

    }

    return flag

}

export const checkTimeFormat = (time: string): boolean => {

    let flag: boolean = false;

    if (!strIncludesEs6(time, ':')) {
        flag = false;
    } else {

        const split = time.split(':');
        const h: string = split[0]; const m: string = split[1];

        if (h.length !== 2) {
            flag = false;
        } else if (m.length !== 2) {
            flag = false;
        } else {
            flag = true;
        }

    }

    return flag

}

export const dateIsToday = (date: string): boolean => {

    let flag: boolean = false;

    const today = Date.now();

    const conv = dateToday(today);
    const dc = dateToday(date);

    const format = `${conv.year}-${leadingNum(conv.month)}-${leadingNum(conv.date)}`
    const check = `${dc.year}-${leadingNum(dc.month)}-${leadingNum(dc.date)}`

    if (format.toString() === check.toString()) {
        flag = true;
    } else {
        flag = false;
    }

    return flag

}

export const dateIsYesterday = (date: string): boolean => {

    let flag: boolean = false;

    const today = Date.now();

    const conv = dateToday(today);
    const dc = dateToday(date);

    const diffDate = conv.date - 1;

    if (dc.date === diffDate) {
        flag = true;
    } else {
        flag = false;
    }

    return flag

}

export const dateIsEqual = (fDate: string, lDate: string): boolean => {

    let flag: boolean = false;

    const fConv = dateToday(fDate);
    const lConv = dateToday(lDate);

    const format = `${fConv.year}-${leadingNum(fConv.month)}-${leadingNum(fConv.date)}`
    const check = `${lConv.year}-${leadingNum(lConv.month)}-${leadingNum(lConv.date)}`

    if (format.toString() === check.toString()) {
        flag = true;
    } else {
        flag = false;
    }

    return flag

}

export const dateIsPast = (today: string, date: string): boolean => {

    let flag: boolean = false;

    const tDate = dateToday(today);
    const cDate = dateToday(date);

    const yearEq = (tDate.year === cDate.year) || (tDate.year > cDate.year);
    const monthEq = (tDate.month === cDate.month) || (tDate.month > cDate.month)
    let dateEq: boolean = false;

    if (tDate.month > cDate.month) {
        dateEq = true;
    } else if (tDate.month === cDate.month && tDate.date > cDate.date) {
        dateEq = true;
    }

    if (yearEq && monthEq && dateEq) {
        flag = true;
    } else {
        flag = false;
    }

    return flag

}

export const dateIsFuture = (today: string, date: string): boolean => {

    let flag: boolean = false;

    const tDate = dateToday(today);
    const cDate = dateToday(date);

    const yearFq = (cDate.year === tDate.year) || (cDate.year > tDate.year);
    const monthFq = (cDate.month === tDate.month) || (cDate.month > tDate.month)
    const dateFq = cDate.date > tDate.date

    if (yearFq && monthFq && dateFq) {
        flag = true;
    } else {
        flag = false;
    }

    return flag

}

export const yesterdayFromDate = (date: string): string => {

    const today = dateToday(date);
    const formatted = `${today.year}-${leadingNum(today.month)}-${leadingNum(today.date - 1)}`;
    const yesterday = dateToday(formatted);

    return yesterday.ISO

}

export const generate = (size: number, options: { type: 'code' | 'alpha' | 'num', alpha: boolean }) => {

    let result: string = '';

    if (options.type === 'code') {
        result = Random.randomCode(size, options.alpha);
    }

    if (options.type === 'alpha') {
        result = Random.randomAlpha(size);
    }

    if (options.type === 'num') {
        result = Random.randomNum(size);
    }

    return result;

}

export const notDefined = (val: any, truthy: boolean = false): boolean => {

    let result: boolean = false;

    if (!truthy) {
        if (val === undefined || val === null || val.toString() === '') {
            result = true
        }
    }

    if (truthy) {

        if (val.toString() !== 'true' && val.toString() !== 'false') {
            result = true
        } else if (val === undefined || val === null || val.toString() === '') {
            result = true
        }

    }

    return result;

}

export const isDefined = (val: any, truthy: boolean = false): boolean => {

    let result: boolean = false;

    if (!truthy) {
        if (val !== undefined && val !== null && val.toString() !== '') {
            result = true
        }
    }

    if (truthy) {

        if (val.toString() === 'true' || val.toString() === 'false') {
            result = true
        } else if (val !== undefined && val !== null && val.toString() !== '') {
            result = true
        }

    }

    return result;

}

export const isPrecise = (data: { value: number | string, length: number }): boolean => {

    let result: boolean = false;
    const { value, length } = data;

    const converted = value.toString();

    if (strIncludesEs6(converted, '.')) {

        const split = converted.split('.');
        const deci = split[1].length;

        if (deci <= length) {
            result = true;
        }

    }

    return result;

}

export const hasDecimal = (value: number | string): boolean => {

    let result: boolean = false;

    const converted = value.toString();

    if (strIncludesEs6(converted, '.')) {

        const split = converted.split('.');
        if (split.length > 1) {
            result = true;
        }

    }

    return result;

}

export const toDecimal = (value: number, places: number): number => {

    let result: number = value;

    const converted = value.toFixed(places);
    result = parseFloat(converted);

    return result;

}

export const UIID = (batch: number = 0) => {

    let result: string = '';

    const uid = crypto.randomUUID();
    const split = uid.split('-')

    if (batch === 0) {
        result = uid;
    } else {

        if (batch === 1) {
            result = split[0]
        } else if (batch === 2) {
            result = `${split[0]}-${split[1]}${split[2]}`;
        } else if (batch === 3) {
            result = `${split[0]}-${split[1]}${split[2]}-${split[split.length - 1]}`;
        } else {
            result = uid
        }

    }

    return result;

}

export const compareISODate = (dateA: string, dateB: string, type: DateCompare): boolean => {

    let result: boolean = false;

    const dt = dateToday(dateA);
    const dn = dateToday(dateB);

    if (type === 'equal') {

        if (dt.year === dn.year && dt.month === dn.month && dt.date === dn.date) {
            result = true;
        } else {
            result = false
        }

    }

    if (type === 'greaterthan') {
        if (dt.dateTime > dn.dateTime) {
            result = true;
        } else {
            result = false
        }
    }

    if (type === 'greaterequal') {
        if (dt.dateTime >= dn.dateTime) {
            result = true;
        } else {
            result = false
        }
    }

    if (type === 'lessthan') {
        if (dt.dateTime < dn.dateTime) {
            result = true;
        } else {
            result = false
        }
    }

    if (type === 'lessequal') {
        if (dt.dateTime <= dn.dateTime) {
            result = true;
        } else {
            result = false
        }
    }

    return result;
}

export const getWeeksDates = (year: number, month: number, data: Array<IMonthsSplit>): Array<IDatesSplit> => {

    let result: Array<IDatesSplit> = []

    if (data.length > 0) {

        for (let i = 0; i < data.length; i++) {

            const week = data[i];

            result.push({
                label: `Week ${i + 1}`,
                start: dateToday(`${year}-${month}-${week.start}`).ISO,
                end: dateToday(`${year}-${month}-${week.end}`).ISO,
                dates: []
            })

            week.dates.forEach((dt) => {
                let p = dateToday(`${year}-${month}-${dt}`);
                result[i].dates.push(p.ISO)
            })

        }

    }

    return result;

}

export const getWeeksInMonth = (year: number, month: number): Array<IMonthsSplit> => {

    let weeks: Array<Array<number>> = [];
    let dwc: number = 0;

    const fd = new Date(year, month, 1); // first date
    const ld = new Date(year, month + 1, 0); // last date
    const nod = ld.getDate(); // number of days

    dwc = fd.getDate(); // init counter ( this always gives 1)

    for (let i = 1; i <= nod; i++) {

        // NB: {i} is the date here

        if (weeks.length === 0) {
            weeks.push([])
        }

        if (weeks[weeks.length - 1].length < 7) {
            weeks[weeks.length - 1].push(i)
        } else {
            weeks.push([])
            weeks[weeks.length - 1].push(i)
        }

        dwc = (dwc + 1) % 7;

    }

    const rs: Array<IMonthsSplit> = weeks.map((w) => ({
        start: w[0],
        end: w[w.length - 1],
        dates: w
    }))

    return rs;
}

export const validateBase64 = (data: string): boolean => {

    const mime = data.split(';base64')[0].split(':')[1];
    return mime && mime !== undefined && mime !== null ? true : false;

}

export const getCodeFromName = (name: string): string => {

    let result: string = '';

    if (name) {

        const split = name.split(' ');

        if (split.length > 1) {

            for (let i = 0; i < split.length; i++) {
                result = result + split[i].substring(0, 1).toUpperCase();
            }

        } else {
            result = name.substring(0, 3).toUpperCase();
        }

    }

    return result;

}

/**
 * @name getDaysFromDates
 * @param prev 
 * @param next 
 * @returns 
 */
export const getDaysFromDates = (then: string, now: string): number => {

    let result: number = 0;

    const thenDate = new Date(then);
    const nowDate = new Date(now);

    const dateThen = dateToday(thenDate);
    const covNow = dateToday(nowDate);
    const dateNow = dayjs(covNow.ISO);

    const diff = dateNow.diff(dateThen.ISO, 'day', true);
    result = Math.floor(diff);

    return result;

}

/**
 * @name firstDayOfMonth
 * @param d 
 * @returns 
 */
export const firstDayOfMonth = (d: string = ''): { date: Date, converted: IDateToday } => {

    const today = d ? new Date(d) : new Date();
    const convToday = dateToday(today);

    const first = new Date(convToday.year, (convToday.month - 1), 1);
    const convFirst = dateToday(first);

    return { date: first, converted: convFirst }

}

/**
 * @name lastDayOfMonth
 * @param d 
 * @returns 
 */
export const lastDayOfMonth = (d: string = ''): { date: Date, converted: IDateToday } => {

    const today = d ? new Date(d) : new Date();
    const convToday = dateToday(today);

    const last = new Date(convToday.year, convToday.month, 1);
    const convLast = dateToday(last);

    return { date: last, converted: convLast }

}

export const formatISO = (ISO: string): { date: string, time: string } => {

    let result: { date: string, time: string } = { date: '', time: '' };

    const split = ISO.split('T');

    if (split.length > 0) {
        result.date = split[0];
        result.time = split[1].split('.')[0];
    }

    return result;

}

export const hasSAC = (value: string): boolean => {

    let result: boolean = false;
    const match = /^[a-zA-Z0-9-_]+$/;

    if (!match.test(value)) {
        result = true;
    }

    return result;

}

export const enumToArray = (data: Object, type: 'all' | 'values-only' | 'keys-only') => {

    let result: Array<any> = [];
    const list = Object.entries(data).map(([key, value]) => ({ key, value }))

    if(type === 'all'){
        result = list;
    }else if(type === 'values-only'){
        result = list.map((x) => x.value)
    }else if(type === 'keys-only'){
        result = list.map((x) => x.key)
    }

    return result;
}

export const objectToArray = (data: Object) => {

    const _keys = Object.keys(data);
    const _values = Object.values(data);
    let hook: Array<{ key: any, value: any, type: any }> = [];

    for (let i = 0; i < _keys.length; i++) {

        if (typeof (_values[i]) === 'object') {
            hook.push({ key: _keys[i], value: JSON.stringify(_values[i]), type: typeof (_values[i]) })
        } else {
            hook.push({ key: _keys[i], value: _values[i], type: typeof (_values[i]) })
        }

    }

    return hook;

}

export const arrayToObject = (data: Array<IArrayToObject>) => {

    let result: any = {};

    for (let i = 0; i < data.length; i++) {

        let item = data[i];

        let value = item.value;
        if (item.type === 'object') {
            value = JSON.parse(item.value)
        }

        let _m: any = {};
        _m[item.key] = value;
        Object.assign(result, _m)

    }

    return result

}

export const stringToBase64 = (data: IStringToBase64) => {

    let result: string = '';
    const { type, payload } = data;

    if(type === 'buffer'){
        const buffered = Buffer.from(payload).toString('base64')
        result = buffered;
    }

    if(type === 'direct'){
        result = payload;
    }

    return result

}

export const base64ToString = (data: IBase64ToString) => {

    let result: string = '';
    const { type, payload } = data;

    if(type === 'buffer'){
        const buffered = Buffer.from(payload, 'base64').toString('ascii')
        result = buffered;
    }

    if(type === 'direct'){
        result = payload;
    }

    return result

}

export const dateFromWeekNumber = (weekNum: number): IDateToday => {

    const dw = dayjs().week(weekNum);
    const weekDate = dateToday(dw);
    return weekDate

}

export const weekStartDate = (date: string): IDateToday => {

    const dx = new Date(date);
    const day = dx.getDay();
    const diff = dx.getDate() - day + (0); // week starts on sunday
    // const diff = dx.getDate() - day + (day === 0 ? 0 : 1); // week starts on monday
    const newDate = new Date(dx.setDate(diff));
    const weekStart = dateToday(newDate);

    return weekStart;

}

export const weekEndDate = (date: string): IDateToday => {

    const startDate = weekStartDate(date);
    const start = new Date(startDate.ISO);

    let first = start.getDate() - start.getDay();
    let last = first + 6;

    const lastDate = new Date(start.setDate(last))
    const weekEnd = dateToday(lastDate);

    return weekEnd;

}