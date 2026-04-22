import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    maxRetriesPerRequest: null,
});

const _contentSyncQueue = new Queue('content-sync', { connection });
const _tokenRefreshQueue = new Queue('token-refresh', { connection });

const _contentSyncWorker = new Worker(
    'content-sync',
    async (job) => {
        console.log(`Processing content sync for artist: ${job.data.artistId}`);
    },
    { connection }
);

const _tokenRefreshWorker = new Worker(
    'token-refresh',
    async (job) => {
        console.log(`Refreshing token for connection: ${job.data.connectionId}`);
    },
    { connection }
);

console.log('Queue service started');
