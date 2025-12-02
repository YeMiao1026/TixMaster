# 👥 Crash API 團隊使用指南

## 🎯 目的

本文件說明如何讓其他工程師安全地使用 crash API 來測試監控系統。

---

## 🔑 方案 1: 共享環境變數（最簡單）⭐

### 概念

所有工程師使用相同的 `ENABLE_CRASH_API` 環境變數。

### 設定方式

#### Railway Dashboard

1. 前往 Railway → Your Project → **Settings** → **Members**
2. 加入團隊成員（給予適當權限）
3. 團隊成員可以透過 Dashboard 臨時啟用：

```
變更前:
ENABLE_CRASH_API = false

臨時測試:
ENABLE_CRASH_API = true  (測試 10 分鐘)

測試完畢:
ENABLE_CRASH_API = false  (立即改回)
```

### 優點
- ✅ 設定簡單
- ✅ 透過 Railway 權限控管
- ✅ 有 audit log（誰改了環境變數）

### 缺點
- ⚠️ 需要重新部署才能生效（約 30 秒）
- ⚠️ 影響所有實例

---

## 🔐 方案 2: 個人化 Token（推薦用於生產環境）⭐⭐⭐

### 概念

每個工程師有自己的 crash token，可以獨立授權和撤銷。

### 實作步驟

#### 1. 修改 crash API

建立 `backend/routes/crash.js` 並修改實作：

```javascript
const express = require('express');
const router = express.Router();
const logger = require('../config/logger');

// 允許的 Token 清單
const VALID_TOKENS = (process.env.CRASH_API_TOKENS || '').split(',').map(t => t.trim());

// Token 認證 middleware
function authenticateToken(req, res, next) {
    const token = req.headers['x-crash-token'];

    if (!token) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'X-Crash-Token header is required'
        });
    }

    if (!VALID_TOKENS.includes(token)) {
        logger.warn('Invalid crash token attempt', {
            tokenPrefix: token.substring(0, 4) + '***',
            ip: req.ip
        });

        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid crash token'
        });
    }

    // 記錄誰觸發了（透過 token 識別）
    req.crashTokenUsed = token;
    next();
}

router.post('/', authenticateToken, (req, res) => {
    logger.error('💥 CRASH API called', {
        token: req.crashTokenUsed.substring(0, 8) + '***',
        ip: req.ip
    });

    setTimeout(() => {
        process.exit(1);
    }, 100);

    res.status(200).json({
        message: 'Server crashing...'
    });
});

module.exports = router;
```

#### 2. 設定環境變數

```bash
# Railway Dashboard 或 .env
CRASH_API_TOKENS=alice-token-123,bob-token-456,charlie-token-789

# 每個工程師有自己的 token
```

#### 3. 分發 Token 給團隊

建立一個內部文件 `TEAM_CRASH_TOKENS.md`（不要 commit 到 Git！）：

```markdown
# Crash API Tokens

| 工程師 | Token | 狀態 |
|--------|-------|------|
| Alice | alice-token-123 | ✅ 啟用 |
| Bob | bob-token-456 | ✅ 啟用 |
| Charlie | charlie-token-789 | ❌ 已撤銷 |

## 使用方式

curl -X POST https://your-app.railway.app/api/crash \
  -H "X-Crash-Token: your-token-here"
```

#### 4. 團隊成員使用

```bash
# Alice 的使用方式
export MY_CRASH_TOKEN="alice-token-123"

curl -X POST https://your-app.railway.app/api/crash \
  -H "X-Crash-Token: $MY_CRASH_TOKEN"
```

### 優點
- ✅ 個人化授權
- ✅ 可以單獨撤銷某人的權限
- ✅ 日誌可以追蹤誰觸發
- ✅ 不需要重新部署（即時生效）

### 缺點
- ⚠️ 需要額外實作
- ⚠️ Token 管理需要紀律

---

## 🎫 方案 3: 臨時授權碼（最安全）⭐⭐⭐⭐

### 概念

使用一次性的授權碼，用完即失效。

### 實作步驟

#### 1. 建立授權碼生成器

```javascript
// utils/crashAuthCode.js
const crypto = require('crypto');

class CrashAuthCodeManager {
    constructor() {
        this.validCodes = new Map(); // code -> { expires, usedBy }
    }

    // 生成 6 位數授權碼，有效期 5 分鐘
    generateCode(requester) {
        const code = Math.random().toString().substring(2, 8); // 6位數字
        const expires = Date.now() + 5 * 60 * 1000; // 5 分鐘

        this.validCodes.set(code, {
            expires,
            requester,
            used: false
        });

        // 自動清理過期的 code
        setTimeout(() => {
            this.validCodes.delete(code);
        }, 5 * 60 * 1000);

        return code;
    }

    // 驗證並使用授權碼（一次性）
    useCode(code) {
        const codeData = this.validCodes.get(code);

        if (!codeData) {
            return { valid: false, reason: 'Code not found' };
        }

        if (codeData.used) {
            return { valid: false, reason: 'Code already used' };
        }

        if (Date.now() > codeData.expires) {
            this.validCodes.delete(code);
            return { valid: false, reason: 'Code expired' };
        }

        // 標記為已使用
        codeData.used = true;

        return {
            valid: true,
            requester: codeData.requester
        };
    }
}

const manager = new CrashAuthCodeManager();
module.exports = manager;
```

#### 2. 建立授權碼 API

```javascript
// routes/crash.js
const authCodeManager = require('../utils/crashAuthCode');

// 生成授權碼（需要管理員權限）
router.post('/request-code', requireAdmin, (req, res) => {
    const code = authCodeManager.generateCode(req.user.email);

    logger.info('Crash auth code generated', {
        requester: req.user.email,
        code: code.substring(0, 2) + '****'
    });

    res.json({
        code: code,
        expiresIn: '5 minutes',
        usage: `curl -X POST /api/crash -H "X-Crash-Code: ${code}"`
    });
});

// 使用授權碼觸發 crash
router.post('/', (req, res) => {
    const code = req.headers['x-crash-code'];

    const result = authCodeManager.useCode(code);

    if (!result.valid) {
        return res.status(401).json({
            error: 'Unauthorized',
            reason: result.reason
        });
    }

    logger.error('💥 CRASH API called', {
        requester: result.requester,
        ip: req.ip
    });

    setTimeout(() => {
        process.exit(1);
    }, 100);

    res.json({ message: 'Server crashing...' });
});
```

#### 3. 使用流程

```bash
# 步驟 1: Alice 請求授權碼（需要登入）
curl -X POST https://your-app.com/api/crash/request-code \
  -H "Authorization: Bearer alice-jwt-token"

# 回應：
{
  "code": "123456",
  "expiresIn": "5 minutes",
  "usage": "curl -X POST /api/crash -H \"X-Crash-Code: 123456\""
}

# 步驟 2: 使用授權碼觸發 crash
curl -X POST https://your-app.com/api/crash \
  -H "X-Crash-Code: 123456"

# 步驟 3: 再次使用（會失敗）
curl -X POST https://your-app.com/api/crash \
  -H "X-Crash-Code: 123456"

# 回應：
{
  "error": "Unauthorized",
  "reason": "Code already used"
}
```

### 優點
- ✅ 最安全（一次性授權碼）
- ✅ 完整的 audit trail
- ✅ 不需要長期保存 token
- ✅ 自動過期機制

### 缺點
- ⚠️ 實作較複雜
- ⚠️ 需要額外的授權碼管理系統

---

## 📋 方案 4: Slack Bot 整合（企業級）⭐⭐⭐⭐⭐

### 概念

透過 Slack 指令觸發，所有操作都在 Slack 中記錄。

### 實作概要

```javascript
// slack-bot.js
const { WebClient } = require('@slack/web-api');

slack.command('/crash-test', async ({ command, ack, respond }) => {
    await ack();

    // 生成一次性 token
    const token = generateOneTimeToken(command.user_name);

    await respond({
        text: `授權碼已生成（5 分鐘有效）`,
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*授權碼*: \`${token}\`\n*使用方式*:\n\`\`\`\ncurl -X POST https://your-app.com/api/crash -H "X-Crash-Code: ${token}"\n\`\`\``
                }
            },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: `請求者: @${command.user_name} | 時間: ${new Date().toISOString()}`
                    }
                ]
            }
        ]
    });

    // 通知 #monitoring 頻道
    await slack.postMessage({
        channel: '#monitoring',
        text: `🧪 @${command.user_name} 請求了 crash test 授權碼`
    });
});
```

### 優點
- ✅ 完全透明（團隊都看得到）
- ✅ 整合到現有工作流程
- ✅ 不需要記住 token
- ✅ 自動通知相關人員

---

## 🎯 各方案比較

| 方案 | 安全性 | 易用性 | 追蹤性 | 實作難度 | 建議使用時機 |
|------|-------|-------|-------|---------|------------|
| **共享環境變數** | 🟡 中 | 🟢 高 | 🟡 中 | 🟢 低 | 小團隊（< 5人） |
| **個人化 Token** | 🟢 高 | 🟢 高 | 🟢 高 | 🟡 中 | 中型團隊（5-20人） |
| **臨時授權碼** | 🟢 高 | 🟡 中 | 🟢 高 | 🟠 高 | 安全要求高 |
| **Slack Bot** | 🟢 高 | 🟢 高 | 🟢 高 | 🟠 高 | 企業團隊（>20人） |

---

## 📝 使用規範（團隊協議）

### 必須遵守的規則

1. **時段限制**
   - ✅ 允許：凌晨 2-4 點（低流量時段）
   - ❌ 禁止：中午 12-2 點、晚上 6-9 點（高峰時段）

2. **通知義務**
   ```
   觸發前 30 分鐘在 #monitoring 頻道通知：

   "🧪 我將在 01:00 AM 觸發 crash test，預計影響 5 秒，
   用於驗證新的 Prometheus 警報規則。"
   ```

3. **頻率限制**
   - 每人每週最多 1 次
   - 團隊每天最多 1 次

4. **記錄義務**
   - 必須記錄觸發原因
   - 必須記錄恢復時間
   - 必須更新 Post-Mortem（如有異常）

### 觸發檢查清單

```markdown
觸發 crash test 前必須確認：

- [ ] ✅ 選擇低流量時段
- [ ] ✅ 在 Slack 提前通知
- [ ] ✅ 確認監控系統正常
- [ ] ✅ 確認有自動重啟機制
- [ ] ✅ 準備好觀察 Grafana Dashboard
- [ ] ✅ 有其他工程師待命（可選）

觸發後必須：

- [ ] ✅ 記錄實際恢復時間
- [ ] ✅ 在 Slack 回報結果
- [ ] ✅ 檢查是否有異常日誌
- [ ] ✅ 更新測試文件
```

---

## 🛠️ 快速設定：推薦方案

### 小團隊（< 5 人）：使用方案 1

```bash
# 1. Railway Dashboard 加入團隊成員
# 2. 給予 "Collaborator" 權限
# 3. 教育團隊如何臨時啟用 ENABLE_CRASH_API

# 完成！團隊成員可以自行測試
```

### 中型團隊（5-20 人）：使用方案 2

```bash
# 1. 實作 token 認證（參考上方程式碼）
# 2. 生成 token
openssl rand -base64 32  # 為每個人生成

# 3. 設定環境變數
CRASH_API_TOKENS=alice-abc123,bob-def456,charlie-ghi789

# 4. 分發 token（透過 1Password/LastPass）
```

### 大型團隊（> 20 人）：使用方案 4

```bash
# 1. 設定 Slack App
# 2. 實作 /crash-test 指令
# 3. 整合一次性授權碼系統

# 好處：完全透明、自動記錄
```

---

## 📊 追蹤與審計

### 日誌格式

```json
{
  "level": "error",
  "message": "💥 CRASH API called",
  "timestamp": "2025-11-30T02:00:00Z",
  "requester": "alice@company.com",
  "method": "token",  // token, auth-code, slack-bot
  "tokenId": "alice-***",
  "ip": "192.168.1.100",
  "reason": "Testing new Prometheus alerts"
}
```

### 月度報告

建立自動化腳本統計：

```bash
# 統計本月 crash test 次數
cat combined.log | \
  jq 'select(.message | contains("CRASH API called"))' | \
  jq -s 'length'

# 統計各工程師使用次數
cat combined.log | \
  jq -r 'select(.message | contains("CRASH API called")) | .requester' | \
  sort | uniq -c
```

---

## 🎯 建議實作順序

### 第1週：基礎保護

- [x] ✅ 實作 NODE_ENV 檢查（已完成）
- [ ] ⏳ 在 Railway 設定環境變數
- [ ] ⏳ 測試保護機制

### 第2週：個人化授權

- [ ] ⏳ 實作 Token 認證
- [ ] ⏳ 分發 Token 給團隊
- [ ] ⏳ 建立使用文件

### 第3週：進階功能

- [ ] ⏳ 加入使用統計
- [ ] ⏳ 實作 Rate Limiting
- [ ] ⏳ 整合 Slack 通知

### 長期：企業級

- [ ] ⏳ Slack Bot 整合
- [ ] ⏳ 一次性授權碼
- [ ] ⏳ 自動化報告

---

## 📚 相關文件

- [CRASH_API_PROTECTION_SUMMARY.md](CRASH_API_PROTECTION_SUMMARY.md) - 保護機制總結
- [DEPLOYMENT_ENV_GUIDE.md](DEPLOYMENT_ENV_GUIDE.md) - 部署指南
- [CRASH_API_IMPACT_ANALYSIS.md](CRASH_API_IMPACT_ANALYSIS.md) - 影響分析
- [RUNBOOK.md](RUNBOOK.md) - 故障排除手冊

---

**文件版本**: 1.0
**最後更新**: 2025-11-30
**維護者**: TixMaster DevOps Team
