import rateLimit from 'express-rate-limit'

export const limitRequests = rateLimit({

    // define window size
    windowMs: 24 * 60 * 60 * 1000, // 24h hrs in milliseconds

    // maximum allowed requests
    max: 30000,
    
    // response message
    message: 'You have exceeded the number of requests in 24 hrs limit!',

    // status code
    statusCode: 429,

    // header property
    headers: true

});