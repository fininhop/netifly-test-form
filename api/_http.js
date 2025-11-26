// api/_http.js - Minimal HTTP helpers for Vercel Node functions (no Express)

const { URL } = require('url');

function augmentRes(res) {
    if (typeof res.status !== 'function') {
        res.status = function (code) {
            res.statusCode = code;
            return res;
        };
    }
    if (typeof res.json !== 'function') {
        res.json = function (obj) {
            if (!res.headersSent) res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify(obj));
        };
    }
    if (typeof res.send !== 'function') {
        res.send = function (body) {
            if (typeof body === 'object') {
                if (!res.headersSent) res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify(body));
            } else {
                res.end(String(body));
            }
        };
    }
}

function ensureQuery(req) {
    if (req.query) return req.query;
    try {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const obj = {};
        url.searchParams.forEach((v, k) => {
            if (obj[k] === undefined) obj[k] = v;
            else if (Array.isArray(obj[k])) obj[k].push(v);
            else obj[k] = [obj[k], v];
        });
        req.query = obj;
    } catch {
        req.query = {};
    }
    return req.query;
}

async function parseBody(req) {
    if (req.body !== undefined) return req.body;
    const method = (req.method || 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD') { req.body = undefined; return req.body; }

    const contentType = (req.headers['content-type'] || '').toLowerCase();
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw) { req.body = undefined; return req.body; }

    if (contentType.includes('application/json')) {
        try { req.body = JSON.parse(raw); }
        catch { req.body = undefined; }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(raw);
        const obj = {};
        for (const [k, v] of params) obj[k] = v;
        req.body = obj;
    } else {
        req.body = raw;
    }
    return req.body;
}

module.exports = { augmentRes, ensureQuery, parseBody };
