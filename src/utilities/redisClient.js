import Redis from 'ioredis';
import dotenv from 'dotenv';
import logger from '../../logs/logger.js';

dotenv.config();

const redisConfig = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
        if (times > 3) {
            // End reconnecting after a few attempts
            return null;
        }
        return Math.min(times * 100, 2000);
    },
    maxRetriesPerRequest: 3,
};

const redis = new Redis(redisConfig);

redis.on('connect', () => {
    logger.info('Redis connected successfully');
});

redis.on('error', (err) => {
    logger.error('Redis connection error:', err);
});

export default redis;
