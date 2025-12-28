import redis from '../utilities/redisClient.js';
import logger from '../../logs/logger.js';

const cacheMiddleware = (duration) => {
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const key = `cache:${req.originalUrl || req.url}`;

        try {
            const cachedResponse = await redis.get(key);

            if (cachedResponse) {
                logger.info(`Cache hit for key: ${key}`);
                const { body, contentType } = JSON.parse(cachedResponse);
                res.set('Content-Type', contentType);
                return res.send(body);
            }

            logger.info(`Cache miss for key: ${key}`);

            // Patch res.send to cache the response
            const originalSend = res.send;
            res.send = function (body) {
                if (res.statusCode === 200) {
                    const cacheData = JSON.stringify({
                        body,
                        contentType: res.get('Content-Type')
                    });

                    const ttl = duration || process.env.CACHE_TTL || 3600;
                    redis.set(key, cacheData, 'EX', ttl).catch(err => {
                        logger.error(`Redis set error for key ${key}:`, err);
                    });
                }
                return originalSend.call(this, body);
            };

            next();
        } catch (err) {
            logger.error(`Cache middleware error for key ${key}:`, err);
            next();
        }
    };
};

export default cacheMiddleware;
