# StoryBooks

> Create public and private stories from your life

使用 Node.js / Express / MongoDB，搭配 Google OAuth 進行第三方登入的小型故事分享應用。

---

## 目錄

- [技術棧](#技術棧)
- [快速開始（本機）](#快速開始本機)
- [雲端設定教學](#雲端設定教學)
  - [一、MongoDB Atlas（雲端資料庫）](#一mongodb-atlas雲端資料庫)
  - [二、Google Cloud OAuth（第三方登入）](#二google-cloud-oauth第三方登入)
- [環境變數說明](#環境變數說明)
- [啟動專案](#啟動專案)
- [部署到正式環境](#部署到正式環境)
- [常見問題](#常見問題)

---

## 技術棧

- Node.js / Express 4
- MongoDB（Atlas）/ Mongoose 7
- Passport + Google OAuth 2.0
- express-handlebars 視圖引擎
- connect-mongo（Session Store）

---

## 快速開始（本機）

需求：Node.js 18+、npm、一個可連線的 MongoDB（建議使用 Atlas 雲端）。

```bash
git clone <your-fork-url> storybooks
cd storybooks
npm install
```

`postinstall` 會嘗試自動從 `.env.example` 建立 `.env`。若未建立，請手動複製：

```bash
cp .env.example .env
```

接著填入下方 [環境變數](#環境變數說明) 中的四個值，再執行：

```bash
npm run dev
```

開啟 <http://localhost:3000> 即可看到登入畫面。

---

## 雲端設定教學

完整流程分兩段：先在 **MongoDB Atlas** 建立雲端資料庫，再到 **Google Cloud Console** 建立 OAuth 憑證。

### 一、MongoDB Atlas（雲端資料庫）

#### 1. 註冊與建立 Cluster

1. 前往 <https://cloud.mongodb.com> 註冊或登入。
2. 建立 **Organization → Project → Cluster**。
3. 免費方案選 **M0 Free**，雲端供應商（AWS / GCP / Azure）擇一，Region 建議選最靠近自己的（例：AWS `ap-northeast-1` 東京）。
4. 等待約 1–3 分鐘，Cluster 完成佈署。

#### 2. 建立資料庫使用者

1. 左側選單 → **Database Access** → **Add New Database User**。
2. Authentication Method 選 **Password**。
3. 設定帳號（例：`appuser`）與**強密碼**（避免使用 `@ : / ?` 等字元，否則需 URL encode）。
4. Database User Privileges 選 **Read and write to any database**（之後可改 least privilege）。
5. 按 **Add User**。

#### 3. 設定網路存取（Network Access）

1. 左側選單 → **Network Access** → **Add IP Address**。
2. 開發階段可選 **Allow Access from Anywhere**（`0.0.0.0/0`）。
3. 正式環境請改為部署平台的固定出口 IP，或使用 Atlas Private Endpoint / Peering。

#### 4. 取得連線字串（Connection String）

1. 左側選單 → **Database** → 在 Cluster 上按 **Connect**。
2. 選 **Drivers** → Driver 選 **Node.js**、Version 選 **5.5 or later**。
3. 複製格式如下的 SRV 連線字串：

   ```text
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

4. 將 `<username>` `<password>` 替換為剛才建立的帳密，並在 `mongodb.net/` 後加上資料庫名稱 `storybooks`：

   ```env
   MONGO_URI=mongodb+srv://appuser:YourStrongPwd@cluster0.xxxxx.mongodb.net/storybooks?retryWrites=true&w=majority
   ```

> 密碼中若含特殊字元，必須做 URL encode（例：`@` → `%40`）。

---

### 二、Google Cloud OAuth（第三方登入）

#### 1. 建立 / 選擇專案

1. 前往 <https://console.cloud.google.com>。
2. 上方專案選單 → **New Project**，命名為 `storybooks`（或沿用既有專案）。

#### 2. 設定 OAuth 同意畫面（Consent Screen）

1. 左側選單 → **APIs & Services** → **OAuth consent screen**。
2. User Type 選 **External** → **Create**。
3. 填寫：
   - App name：`StoryBooks`
   - User support email：你的 Email
   - Developer contact：你的 Email
4. **Scopes** 步驟：點 **Add or Remove Scopes**，勾選：
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
5. **Test users** 步驟：把要測試的 Google 帳號加入。
6. 完成後狀態會是 **Testing**。正式上線時再按 **Publish App**。

#### 3. 建立 OAuth 2.0 Client ID

1. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**。
2. Application type 選 **Web application**。
3. 設定：
   - **Authorized JavaScript origins**
     - `http://localhost:3000`
     - `https://your-production-domain.com`（正式網域）
   - **Authorized redirect URIs**
     - `http://localhost:3000/auth/google/callback`
     - `https://your-production-domain.com/auth/google/callback`
4. 按 **Create**，記下 **Client ID** 與 **Client Secret**。

> Redirect URI **必須完全一致**（含 http/https、port、路徑、結尾斜線），否則回呼會失敗。

---

## 環境變數說明

在專案根目錄建立 `.env`：

```env
PORT=3000
MONGO_URI=mongodb+srv://appuser:YourStrongPwd@cluster0.xxxxx.mongodb.net/storybooks?retryWrites=true&w=majority
GOOGLE_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxx
```

| 變數 | 必填 | 說明 |
| --- | --- | --- |
| `PORT` | 否 | 伺服器埠號，預設 `3000` |
| `MONGO_URI` | 是 | MongoDB Atlas 連線字串，含資料庫名稱 |
| `GOOGLE_CLIENT_ID` | 是 | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | 是 | Google OAuth Client Secret |

> `.env` 已列入 `.gitignore`，**請勿** commit 任何含真實憑證的檔案。

---

## 啟動專案

```bash
# 開發模式（nodemon 熱重載）
npm run dev

# 生產模式
npm start
```

預設網址：<http://localhost:3000>

---

## 部署到正式環境

可選平台：Render、Railway、Fly.io、Heroku、自有 VPS。共通注意事項：

1. **環境變數**：在平台後台設定 `MONGO_URI`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`，不要寫進 repo。
2. **PORT**：多數平台會注入 `PORT`，無需自訂；本專案 `app.js` 已使用 `process.env.PORT`。
3. **回呼網址**：到 Google Cloud Console 將正式網域的 `https://<domain>/auth/google/callback` 加入 **Authorized redirect URIs**。
4. **MongoDB Network Access**：在 Atlas 加入部署平台的出口 IP，或維持 `0.0.0.0/0`（不建議用於正式）。
5. **NODE_ENV**：`npm start` 已設為 `production`，平台若會覆寫請保持 `production`。

### Render 範例

- Build Command：`npm install`
- Start Command：`npm start`
- Environment：新增上述三個變數
- Health Check Path：`/`

---

## 常見問題

**Q1. `MongooseServerSelectionError: Could not connect to any servers`**
→ 檢查 `MONGO_URI` 帳密、密碼是否需 URL encode；Atlas Network Access 是否放行當前 IP。

**Q2. Google 登入後跳 `redirect_uri_mismatch`**
→ Google Cloud Console 的 **Authorized redirect URIs** 必須與實際請求網址完全一致（http/https、port、路徑都要對）。

**Q3. 登入後一直被導回 `/`，session 失效**
→ 確認 `MONGO_URI` 能成功連線（session 儲存在 MongoDB），並檢查瀏覽器 Cookie 沒被擋。

**Q4. 正式環境想撤換已外洩的密鑰怎麼辦？**
→ MongoDB Atlas → Database Access 重設使用者密碼；Google Cloud → Credentials 砍掉舊 Client Secret 並建立新的，部署平台同步更新環境變數。

---

## References

[bradtraversy/storybooks](https://github.com/bradtraversy/storybooks)  

## License

MIT
