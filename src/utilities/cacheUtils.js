import redis from './redisClient.js';
import logger from '../../logs/logger.js';

/**
 * Clear cache keys by pattern
 * @param {string} pattern - Redis pattern (e.g., 'cache:/v1/api/tour*')
 */
export const clearCache = async (pattern) => {
    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
            logger.info(`Cleared ${keys.length} cache keys matching pattern: ${pattern}`);
        }
    } catch (err) {
        logger.error(`Error clearing cache for pattern ${pattern}:`, err);
    }
};

/**
 * Middleware to clear cache after a successful response
 * @param {string|string[]} patterns - Pattern or array of patterns to clear
 */
export const clearCacheMiddleware = (patterns) => {
    return async (req, res, next) => {
        const originalSend = res.send;
        res.send = function (body) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const patternList = Array.isArray(patterns) ? patterns : [patterns];
                patternList.forEach(pattern => {
                    clearCache(pattern).catch(err => {
                        logger.error(`Failed to clear cache for pattern ${pattern} in middleware:`, err);
                    });
                });
            }
            return originalSend.call(this, body);
        };
        next();
    };
};
