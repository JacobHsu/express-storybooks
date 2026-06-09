# 部署指南（Render）

將 StoryBooks 部署到 Render 的步驟。本機已可正常運作，這裡只記錄上雲流程。

---

## 目錄

- [前置作業](#前置作業)
- [步驟 1：建立 Render 服務](#步驟-1建立-render-服務)
- [步驟 2：設定環境變數](#步驟-2設定環境變數)
- [步驟 3：補 Google OAuth Redirect URI](#步驟-3補-google-oauth-redirect-uri)
- [步驟 4：MongoDB Atlas 放行 Render](#步驟-4mongodb-atlas-放行-render)
- [步驟 5：驗證部署](#步驟-5驗證部署)
- [踩過的雷](#踩過的雷)

---

## 前置作業

1. **GitHub repo** 已 push 最新程式
2. **MongoDB Atlas** 連線字串可用，Network Access 已放 `0.0.0.0/0`
3. **Google OAuth Client ID** 已建立（待會回頭補正式網域的 redirect URI）

---

## 步驟 1：建立 Render 服務

1. <https://dashboard.render.com> → **New +** → **Web Service**
2. 連接 GitHub，選 `storybooks` repo
3. 設定：

   | 欄位 | 值 |
   |---|---|
   | Name | `express-storybooks` |
   | Region | Singapore |
   | Branch | `main` |
   | Runtime | Node |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Instance Type | Free |

---

## 步驟 2：設定環境變數

| Key | Value |
|---|---|
| `MONGO_URI` | Atlas 連線字串 |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `SESSION_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` 產生 |

> `PORT` 不用設，Render 自動注入。
> `NODE_ENV` 不用設，`npm start` 已用 `cross-env` 設成 `production`。
> 本機與 Render 的 `SESSION_SECRET` 用不同值。

---

## 步驟 3：補 Google OAuth Redirect URI

Render 部署完成後會拿到網址，例如 `https://express-storybooks.onrender.com`。

到 **Google Cloud Console → APIs & Services → Credentials → 你的 OAuth Client**：

**Authorized redirect URIs**：

```text
https://express-storybooks.onrender.com/auth/google/callback
```

**Authorized JavaScript origins**：

```text
https://express-storybooks.onrender.com
```

> `config/passport.js` 用相對路徑 `/auth/google/callback`，配合 `app.js` 的
> `app.set('trust proxy', 1)`，Passport 會在 production 自動組出 `https://` 開頭的 callback URL。

---

## 步驟 4：MongoDB Atlas 放行 Render

Render 免費方案出口 IP 不固定：

- Atlas → Network Access → **Allow Access from Anywhere** (`0.0.0.0/0`)

升級到付費方案才會給固定 IP，屆時再收斂白名單。

---

## 步驟 5：驗證部署

開 `https://express-storybooks.onrender.com`：

1. 首頁顯示 Login with Google
2. 點按鈕 → Google 授權 → 回到 dashboard
3. 試新增 story

Render Dashboard → **Logs** 應該看到：

```text
Server running in production mode on port 10000
MongoDB Connected: ...
```

---

## 踩過的雷

### 1. `exphbs is not a function`

`express-handlebars` v6+ 改成具名匯出。`app.js` 已改：

```js
const { engine: exphbs } = require('express-handlebars');
```

### 2. Session secret 寫死

原本 `app.js` 寫死 `'keyboard cat'`，已改成讀 `SESSION_SECRET`，沒設就 throw。本機與 Render 環境變數都必須補。

### 3. Google OAuth `redirect_uri_mismatch`

Render 在前面終止 TLS，Express 收到的是 HTTP，Passport 組出的 callback 變成 `http://...`，與 Console 註冊的 `https://...` 不一致。

`app.js` 已加：

```js
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
```

讓 `req.protocol` 依 `X-Forwarded-Proto` 回傳 `https`。

### 4. Free plan 會睡眠

15 分鐘無流量會 sleep，下次喚醒約 30 秒冷啟動。可用 UptimeRobot 每 10 分鐘 ping 避免。
