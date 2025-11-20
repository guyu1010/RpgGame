/**
 * Ollama LLM 整合模組
 * 負責與本地 Ollama API 通訊
 */

class OllamaClient {
    constructor() {
        this.baseUrl = 'http://localhost:11434';
        this.model = 'llama2';
        this.conversationHistory = [];
    }

    /**
     * 設定 Ollama 連線資訊
     * @param {string} url - Ollama API URL
     * @param {string} model - 模型名稱
     */
    configure(url, model) {
        this.baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        this.model = model;
    }

    /**
     * 測試與 Ollama 的連線
     * @returns {Promise<Object>}
     */
    async testConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            return {
                success: true,
                message: '連線成功！',
                models: data.models || []
            };
        } catch (error) {
            console.error('Ollama 連線測試失敗:', error);
            return {
                success: false,
                message: `連線失敗: ${error.message}`,
                error: error
            };
        }
    }

    /**
     * 建立系統提示詞
     * @param {Object} storyData - 故事設定資料
     * @param {string} currentContext - 當前情境
     * @returns {string}
     */
    buildSystemPrompt(storyData, currentContext = '') {
        let prompt = '';

        // 加入故事背景
        if (storyData.worldSetting) {
            prompt += `## 世界設定\n${storyData.worldSetting}\n\n`;
        }

        // 加入角色設定
        if (storyData.characters && storyData.characters.length > 0) {
            prompt += `## 角色設定\n`;
            storyData.characters.forEach(char => {
                prompt += `### ${char.name}\n`;
                if (char.personality) prompt += `性格: ${char.personality}\n`;
                if (char.background) prompt += `背景: ${char.background}\n`;
                if (char.goals) prompt += `目標: ${char.goals}\n`;
                prompt += `\n`;
            });
        }

        // 加入劇情指引
        if (storyData.plotGuidelines) {
            prompt += `## 劇情指引\n${storyData.plotGuidelines}\n\n`;
        }

        // 加入當前情境
        if (currentContext) {
            prompt += `## 當前情境\n${currentContext}\n\n`;
        }

        // 加入寫作風格指引
        prompt += `## 寫作指引\n`;
        prompt += `- 以第二人稱視角描述（使用「你」稱呼玩家）\n`;
        prompt += `- 保持敘述生動且具有畫面感\n`;
        prompt += `- 根據玩家的選擇推進劇情\n`;
        prompt += `- 保持角色性格一致性\n`;
        prompt += `- 每次回應約 100-200 字\n`;

        if (storyData.tone) {
            prompt += `- 整體基調: ${storyData.tone}\n`;
        }

        return prompt;
    }

    /**
     * 生成故事續寫
     * @param {Object} storyData - 故事設定資料
     * @param {string} userChoice - 玩家選擇
     * @param {Array} history - 對話歷史
     * @returns {Promise<string>}
     */
    async generateStory(storyData, userChoice, history = []) {
        try {
            // 建立系統提示詞
            const systemPrompt = this.buildSystemPrompt(storyData, history.join('\n'));

            // 建立使用者提示
            let userPrompt = '';
            if (history.length === 0) {
                userPrompt = '開始這個故事，描述開場場景。';
            } else {
                userPrompt = `玩家選擇: ${userChoice}\n\n請根據這個選擇繼續故事。`;
            }

            // 呼叫 Ollama API
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt: `${systemPrompt}\n\n${userPrompt}`,
                    stream: false,
                    options: {
                        temperature: 0.8,
                        top_p: 0.9,
                        top_k: 40,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data.response || '（無法生成回應）';

        } catch (error) {
            console.error('生成故事失敗:', error);
            throw error;
        }
    }

    /**
     * 生成選項（使用 LLM 生成合適的選項）
     * @param {Object} storyData - 故事設定資料
     * @param {string} currentStory - 當前故事內容
     * @param {number} optionCount - 選項數量
     * @returns {Promise<Array<string>>}
     */
    async generateChoices(storyData, currentStory, optionCount = 3) {
        try {
            const prompt = `根據以下故事內容，生成 ${optionCount} 個合理的選項。

故事內容：
${currentStory}

請只輸出選項，每個選項一行，格式如下：
1. [選項內容]
2. [選項內容]
3. [選項內容]

選項應該：
- 具體且可執行
- 符合角色性格
- 推進劇情發展
- 給予玩家有意義的選擇`;

            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        max_tokens: 200,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const text = data.response || '';

            // 解析選項
            const choices = [];
            const lines = text.split('\n');
            for (const line of lines) {
                // 匹配 "1. xxx" 或 "- xxx" 格式
                const match = line.match(/^[\d\-\*\.]+\s*(.+)$/);
                if (match && match[1]) {
                    choices.push(match[1].trim());
                }
            }

            // 如果解析失敗，返回預設選項
            if (choices.length === 0) {
                return ['繼續前進', '環顧四周', '與人交談'];
            }

            return choices.slice(0, optionCount);

        } catch (error) {
            console.error('生成選項失敗:', error);
            // 返回預設選項
            return ['繼續前進', '環顧四周', '與人交談'];
        }
    }

    /**
     * 使用串流方式生成故事（逐字顯示）
     * @param {Object} storyData - 故事設定資料
     * @param {string} userChoice - 玩家選擇
     * @param {Array} history - 對話歷史
     * @param {Function} onToken - 每個 token 的回調函數
     * @returns {Promise<string>}
     */
    async generateStoryStream(storyData, userChoice, history, onToken) {
        try {
            const systemPrompt = this.buildSystemPrompt(storyData, history.join('\n'));

            let userPrompt = '';
            if (history.length === 0) {
                userPrompt = '開始這個故事，描述開場場景。';
            } else {
                userPrompt = `玩家選擇: ${userChoice}\n\n請根據這個選擇繼續故事。`;
            }

            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt: `${systemPrompt}\n\n${userPrompt}`,
                    stream: true,
                    options: {
                        temperature: 0.8,
                        top_p: 0.9,
                        top_k: 40,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    try {
                        const json = JSON.parse(line);
                        if (json.response) {
                            fullResponse += json.response;
                            if (onToken) {
                                onToken(json.response);
                            }
                        }
                    } catch (e) {
                        // 忽略 JSON 解析錯誤
                    }
                }
            }

            return fullResponse;

        } catch (error) {
            console.error('串流生成故事失敗:', error);
            throw error;
        }
    }

    /**
     * 清除對話歷史
     */
    clearHistory() {
        this.conversationHistory = [];
    }

    /**
     * 獲取對話歷史
     * @returns {Array}
     */
    getHistory() {
        return this.conversationHistory;
    }
}

// 建立全域實例
const ollamaClient = new OllamaClient();
