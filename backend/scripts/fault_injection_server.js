require('dotenv').config();
const express = require('express');
const logger = require('../config/logger');
const { Client } = require('pg');

const app = express();
const PORT = process.env.FAULT_PORT ? Number(process.env.FAULT_PORT) : 3999;
const ENABLED = (process.env.ENABLE_FAULT_ENDPOINTS || 'false').toLowerCase() === 'true';

// 簡單守門：未啟用時回 403
app.use((req, res, next) => {
  if (!ENABLED) {
    return res.status(403).json({
      error: 'Fault injection disabled',
      hint: 'Set ENABLE_FAULT_ENDPOINTS=true to enable',
    });
  }
  next();
});

// 基礎健康檢查
app.get('/health', (req, res) => {
  res.json({ status: 'OK', name: 'fault-injection-server', port: PORT });
});

// 1) 高延遲: 依 delayMs 延遲後回應 200
// GET /api/fault/latency?delayMs=3000
app.get('/api/fault/latency', async (req, res) => {
  const maxMs = 60_000; // 上限 60s，避免誤用
  const delayMs = Math.min(Math.max(parseInt(req.query.delayMs || '2000', 10) || 2000, 0), maxMs);
  logger.info('[fault] latency', { delayMs });
  setTimeout(() => {
    res.status(200).json({ ok: true, type: 'latency', delayMs });
  }, delayMs);
});

// 2) 逾時: 保持連線不回應，或超長延遲
// GET /api/fault/timeout?timeoutMs=15000&never=true
app.get('/api/fault/timeout', async (req, res) => {
  const maxMs = 10 * 60_000; // 上限 10 分鐘
  const timeoutMs = Math.min(Math.max(parseInt(req.query.timeoutMs || '15000', 10) || 15000, 0), maxMs);
  const never = String(req.query.never || 'false').toLowerCase() === 'true';
  logger.warn('[fault] timeout', { timeoutMs, never });

  if (never) {
    // 故意不回應（由客戶端逾時機制處理）
    return; // 不呼叫 res.*
  }

  setTimeout(() => {
    // 逾時視角：大多數客戶端會在這之前就已經超時
    try {
      if (!res.headersSent) {
        res.status(200).json({ ok: true, type: 'timeout_hold', heldMs: timeoutMs });
      }
    } catch (e) {
      logger.error('[fault] timeout respond error', { error: e.message });
    }
  }, timeoutMs + 1000);
});

// 3) 依賴故障: 模擬/真實
// GET /api/fault/dependency?type=db&mode=simulate
// type=db|http|dns (僅 db 提供簡單 real 模式)
// mode=simulate|real
app.get('/api/fault/dependency', async (req, res) => {
  const type = String(req.query.type || 'db');
  const mode = String(req.query.mode || 'simulate');
  logger.error('[fault] dependency failure requested', { type, mode });

  if (mode === 'simulate') {
    // 直接回 503 模擬依賴故障
    return res.status(503).json({ ok: false, type, mode, error: `${type} dependency unavailable (simulated)` });
  }

  // real 模式（目前支援 db）：用錯誤查詢觸發 DB 錯誤
  if (type === 'db') {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return res.status(503).json({ ok: false, type, mode, error: 'DATABASE_URL not set' });
    }

    const client = new Client({ connectionString: databaseUrl, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined });
    try {
      await client.connect();
      // 故意錯誤的 SQL
      await client.query('SELECT * FROM definitely_missing_table_to_fail');
      await client.end();
      return res.status(200).json({ ok: true, type, mode, note: 'Unexpectedly succeeded' });
    } catch (err) {
      try { await client.end(); } catch (_) {}
      logger.error('[fault] db dependency error (real)', { error: err.message });
      return res.status(503).json({ ok: false, type, mode, error: err.message });
    }
  }

  // 其他型別暫以模擬為主
  return res.status(503).json({ ok: false, type, mode, error: `${type} dependency failure (not implemented, simulated)` });
});

app.listen(PORT, () => {
  logger.info(`🧪 Fault Injection Server running on http://localhost:${PORT}`);
  if (!ENABLED) {
    logger.warn('Fault injection is DISABLED. Set ENABLE_FAULT_ENDPOINTS=true to enable responses.');
  }
  logger.info('Endpoints:');
  logger.info(`- GET /health`);
  logger.info(`- GET /api/fault/latency?delayMs=3000`);
  logger.info(`- GET /api/fault/timeout?timeoutMs=15000&never=true`);
  logger.info(`- GET /api/fault/dependency?type=db&mode=simulate|real`);
  logger.info(`- GET /api/fault/random?errorRate=0.3`);
  logger.info(`- GET /api/fault/cpu-spike?durationMs=5000`);
  logger.info(`- GET /api/fault/memory-pressure?mb=200&durationMs=10000`);
  logger.info(`- GET /api/fault/http-dependency?status=500&delayMs=1000`);
  logger.info(`- GET /api/fault/dns-failure?hostname=invalid.local`);
});

// 4) 隨機錯誤: 依 errorRate 機率回 500
// GET /api/fault/random?errorRate=0.3
app.get('/api/fault/random', (req, res) => {
  const errorRate = Math.min(Math.max(parseFloat(String(req.query.errorRate || '0.3')), 0), 1);
  const r = Math.random();
  const willFail = r < errorRate;
  logger.warn('[fault] random', { errorRate, r, willFail });
  if (willFail) {
    return res.status(500).json({ ok: false, type: 'random', errorRate });
  }
  return res.status(200).json({ ok: true, type: 'random', errorRate });
});

// 5) CPU 尖峰: 進行忙迴圈一段時間
// GET /api/fault/cpu-spike?durationMs=5000
app.get('/api/fault/cpu-spike', (req, res) => {
  const maxMs = 60_000;
  const durationMs = Math.min(Math.max(parseInt(String(req.query.durationMs || '5000'), 10) || 5000, 0), maxMs);
  logger.warn('[fault] cpu-spike start', { durationMs });
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    // busy work
    Math.sqrt(Math.random() * 1000);
  }
  logger.warn('[fault] cpu-spike end');
  res.status(200).json({ ok: true, type: 'cpu-spike', durationMs });
});

// 6) 記憶體壓力: 分配指定記憶體後保留一段時間
// GET /api/fault/memory-pressure?mb=200&durationMs=10000
app.get('/api/fault/memory-pressure', async (req, res) => {
  const maxMb = 1024; // 1GB 上限
  const mb = Math.min(Math.max(parseInt(String(req.query.mb || '200'), 10) || 200, 1), maxMb);
  const maxMs = 60_000;
  const durationMs = Math.min(Math.max(parseInt(String(req.query.durationMs || '10000'), 10) || 10000, 0), maxMs);
  logger.warn('[fault] memory-pressure start', { mb, durationMs });
  try {
    const arr = Buffer.alloc(mb * 1024 * 1024, 1); // allocate
    setTimeout(() => {
      // 釋放（讓 GC 接管）
      // eslint-disable-next-line no-unused-vars
      // arr = null; // 不能重新賦值 const；依作用域離開釋放
      logger.warn('[fault] memory-pressure end');
    }, durationMs);
    res.status(200).json({ ok: true, type: 'memory-pressure', mb, durationMs });
  } catch (e) {
    logger.error('[fault] memory-pressure error', { error: e.message });
    res.status(500).json({ ok: false, type: 'memory-pressure', error: e.message });
  }
});

// 7) 外部 HTTP 依賴失敗: 回傳指定狀態碼並可延遲
// GET /api/fault/http-dependency?status=500&delayMs=1000
app.get('/api/fault/http-dependency', (req, res) => {
  const status = Math.min(Math.max(parseInt(String(req.query.status || '500'), 10) || 500, 100), 599);
  const delayMs = Math.min(Math.max(parseInt(String(req.query.delayMs || '0'), 10) || 0, 0), 60_000);
  logger.error('[fault] http-dependency', { status, delayMs });
  setTimeout(() => {
    res.status(status).json({ ok: false, type: 'http-dependency', status });
  }, delayMs);
});

// 8) DNS 故障模擬: 嘗試解析錯誤主機名並回傳 503
// GET /api/fault/dns-failure?hostname=invalid.local
const dns = require('dns');
app.get('/api/fault/dns-failure', (req, res) => {
  const hostname = String(req.query.hostname || 'invalid.local');
  logger.error('[fault] dns-failure', { hostname });
  dns.lookup(hostname, (err) => {
    if (err) {
      return res.status(503).json({ ok: false, type: 'dns-failure', hostname, error: err.code || err.message });
    }
    // 若意外成功，仍回 200 表示可解析
    return res.status(200).json({ ok: true, type: 'dns-failure', hostname, note: 'resolved unexpectedly' });
  });
});
