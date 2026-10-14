export default async function handler(req, res) {
    res.status(200).json({
        kvUrl: !!process.env.KV_REST_API_URL,
        kvToken: !!process.env.KV_REST_API_TOKEN,
        redisUrl: !!process.env.KV_REDIS_URL,
        redisToken: !!process.env.KV_REDIS_TOKEN,
        upstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
        allEnvKeys: Object.keys(process.env).filter(k => k.includes('KV') || k.includes('REDIS'))
    });
}
