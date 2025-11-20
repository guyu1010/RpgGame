# AI 驅動的文字冒險遊戲

基於 Ollama 本地 LLM 的互動式文字冒險遊戲框架。

## 功能特色

- ✨ **AI 驅動故事生成**：整合本地 Ollama LLM，動態生成劇情內容
- 📖 **可自訂故事設定**：透過 JSON 檔案定義世界觀、角色、劇情
- 🎯 **成就系統**：追蹤玩家進度，解鎖成就
- 💾 **存檔功能**：使用 localStorage 保存遊戲進度
- 🖼️ **圖片支援**：特定場景顯示對應圖片
- 🎨 **現代化 UI**：響應式設計，支援桌面和移動裝置

## 專案結構

```
RpgGame/
├── index.html              # 主頁面
├── css/
│   └── style.css          # 樣式檔案
├── js/
│   ├── game.js            # 遊戲核心邏輯
│   ├── llm.js             # Ollama LLM 整合
│   ├── achievement.js     # 成就系統
│   └── storage.js         # 存檔管理
├── data/
│   ├── story.json         # 故事設定（世界觀、角色、劇情）
│   └── achievements.json  # 成就定義
├── images/                # 場景圖片資料夾
└── README.md              # 說明文件
```

## 快速開始

### 1. 安裝 Ollama

首先需要在本地安裝並運行 Ollama：

```bash
# 前往 https://ollama.ai 下載並安裝 Ollama

# 下載模型（例如 llama2）
ollama pull llama2

# 啟動 Ollama 服務
ollama serve
```

### 2. 啟動遊戲

直接用瀏覽器開啟 `index.html` 即可，或使用本地伺服器：

```bash
# 使用 Python 快速啟動 HTTP 伺服器
python -m http.server 8000

# 或使用 Node.js
npx http-server
```

然後在瀏覽器開啟 `http://localhost:8000`

### 3. 配置 LLM 設定

在遊戲側邊欄中：
1. 確認 Ollama URL（預設：`http://localhost:11434`）
2. 選擇要使用的模型（預設：`llama2`）
3. 點擊「測試連線」確認連線成功

### 4. 開始遊戲

點擊「新遊戲」按鈕開始你的冒險！

## 自訂故事內容

### 修改故事設定（data/story.json）

這是最重要的檔案，決定了遊戲的所有內容：

```json
{
  "worldSetting": "你的世界觀設定",
  "tone": "故事基調（例如：黑暗、幽默、懸疑）",
  "plotGuidelines": "主線劇情指引",
  "characters": [
    {
      "name": "角色名稱",
      "personality": "性格描述",
      "background": "背景故事",
      "goals": "目標與動機",
      "relationships": "與玩家的關係"
    }
  ],
  "scenes": [
    {
      "id": "scene_id",
      "keywords": ["關鍵字1", "關鍵字2"],
      "image": "images/your_image.jpg"
    }
  ]
}
```

#### 重要提示

- `worldSetting`：詳細描述你的世界觀，LLM 會根據此生成內容
- `characters`：角色描述越詳細，AI 生成的對話越符合人設
- `scenes.keywords`：當故事中出現這些關鍵字時，會顯示對應圖片
- `narrativeRules`：控制 AI 的寫作風格和規則

### 添加場景圖片

1. 將圖片放入 `images/` 資料夾
2. 在 `story.json` 的 `scenes` 中定義場景
3. 設定觸發關鍵字

```json
{
  "id": "forest",
  "name": "森林",
  "keywords": ["森林", "樹木", "叢林"],
  "image": "images/forest.jpg"
}
```

### 自訂成就（data/achievements.json）

添加新的成就來獎勵玩家的特定行為：

```json
{
  "id": "unique_id",
  "name": "成就名稱",
  "description": "成就描述",
  "condition": {
    "type": "counter",  // counter, flag, choice, story_progress
    "key": "choiceCount",
    "value": 10,
    "operator": "gte"  // eq, gt, gte, lt, lte
  }
}
```

#### 條件類型

- `counter`：計數達到特定值（如：做出 10 次選擇）
- `flag`：檢查特定標記（需在遊戲中設定）
- `choice`：做出特定選擇
- `story_progress`：到達特定場景

## 遊戲功能說明

### 存檔系統

- **儲存遊戲**：保存當前進度（包括對話歷史、統計、成就）
- **讀取遊戲**：恢復上次保存的進度
- **重置遊戲**：清除所有資料（包括存檔和成就）

### 成就系統

- 自動追蹤玩家行為
- 達成條件時自動解鎖
- 顯示解鎖通知
- 側邊欄查看所有成就

### LLM 整合

遊戲使用 Ollama API 生成故事內容：

- **串流生成**：逐字顯示，營造打字效果
- **上下文記憶**：LLM 會記住之前的對話
- **選項生成**：根據當前劇情動態生成選項

## 進階配置

### 調整 LLM 參數

在 `js/llm.js` 中可以調整生成參數：

```javascript
options: {
    temperature: 0.8,  // 創意度（0-1）
    top_p: 0.9,        // 採樣範圍
    top_k: 40,         // 候選詞數量
}
```

- `temperature` 越高，生成內容越有創意但也更隨機
- `temperature` 越低，生成內容越保守但更連貫

### 修改提示詞模板

在 `js/llm.js` 的 `buildSystemPrompt()` 方法中可以調整系統提示詞：

```javascript
buildSystemPrompt(storyData, currentContext = '') {
    // 在這裡自訂提示詞格式
}
```

### 更換 LLM 模型

支援所有 Ollama 相容的模型：

```bash
# 下載其他模型
ollama pull mistral
ollama pull codellama
ollama pull llama2:13b

# 在遊戲設定中選擇對應模型名稱
```

## 疑難排解

### Ollama 連線失敗

1. 確認 Ollama 服務正在運行：`ollama serve`
2. 檢查 URL 是否正確（預設：`http://localhost:11434`）
3. 如果使用其他埠口，需要在設定中修改

### CORS 錯誤

如果遇到跨域問題：

```bash
# 啟動 Ollama 時允許跨域
OLLAMA_ORIGINS="*" ollama serve
```

### 圖片無法顯示

1. 確認圖片路徑正確
2. 圖片檔案名稱區分大小寫
3. 確認 `story.json` 中的路徑與實際檔案一致

### 生成速度慢

1. 使用較小的模型（如 `llama2:7b` 而非 `llama2:13b`）
2. 調整 `max_tokens` 參數限制生成長度
3. 確保電腦有足夠的 RAM

## 開發建議

### 故事設計技巧

1. **詳細的世界觀**：給 LLM 提供足夠的背景資訊
2. **角色性格一致**：詳細描述角色性格，AI 會更好地保持一致性
3. **分支劇情**：使用 flags 和 conditions 創造多條故事線
4. **循序漸進**：從簡單的對話開始，逐步增加複雜度

### 提示詞優化

1. **使用具體例子**：在 story.json 中提供寫作風格範例
2. **設定明確規則**：如對話長度、視角、時態等
3. **測試迭代**：多次測試並調整提示詞直到滿意

### 擴展功能

框架設計為模組化，可以輕鬆添加新功能：

- 添加音效系統
- 實作背包/物品系統
- 添加角色屬性（HP、MP 等）
- 實作戰鬥系統
- 多結局支援

## 技術細節

### 使用技術

- 純 HTML/CSS/JavaScript（無需框架）
- Ollama REST API
- localStorage 本地儲存
- Fetch API 非同步請求

### 瀏覽器支援

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

### 資料儲存

使用 localStorage，限制約 5-10MB，足夠保存：
- 遊戲進度
- 對話歷史
- 成就記錄
- 使用者設定

## 授權與使用

本專案為個人使用框架，你可以：

- ✅ 自由修改所有程式碼
- ✅ 添加自己的故事內容
- ✅ 個人遊玩和測試
- ❌ 不建議用於商業發布
- ❌ 請遵守當地法律法規

## 支援與回饋

如有問題或建議，歡迎：
- 查看程式碼註解
- 檢查瀏覽器控制台的錯誤訊息
- 嘗試不同的 LLM 模型和參數

---

開始創作你的故事吧！🎮✨
