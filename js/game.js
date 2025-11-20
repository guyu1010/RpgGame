/**
 * 遊戲核心邏輯
 * 整合所有模組，管理遊戲流程
 */

class Game {
    constructor() {
        this.storyData = null;
        this.gameState = {
            turnCount: 0,
            choiceCount: 0,
            currentStory: '',
            history: [],
            flags: {},
            choices: [],
            currentScene: null,
            currentImage: null
        };
        this.isRunning = false;
    }

    /**
     * 初始化遊戲
     */
    async initialize() {
        console.log('初始化遊戲...');

        // 載入設定
        const settings = storageManager.loadSettings();
        ollamaClient.configure(settings.ollamaUrl, settings.modelName);

        // 更新 UI 設定值
        document.getElementById('ollama-url').value = settings.ollamaUrl;
        document.getElementById('model-name').value = settings.modelName;

        // 載入故事設定
        try {
            const response = await fetch('data/story.json');
            if (response.ok) {
                this.storyData = await response.json();
                console.log('故事設定載入成功');
            } else {
                console.warn('無法載入故事設定，使用預設設定');
                this.storyData = this.getDefaultStoryData();
            }
        } catch (error) {
            console.error('載入故事設定失敗:', error);
            this.storyData = this.getDefaultStoryData();
        }

        // 載入成就
        await achievementManager.loadAchievements();

        // 綁定事件
        this.bindEvents();

        // 檢查是否有存檔
        if (storageManager.hasSave()) {
            const saveInfo = storageManager.getSaveInfo();
            if (saveInfo) {
                console.log('發現存檔:', saveInfo);
            }
        }

        console.log('遊戲初始化完成');
    }

    /**
     * 獲取預設故事設定（當無法載入 story.json 時使用）
     */
    getDefaultStoryData() {
        return {
            worldSetting: "這是一個奇幻世界",
            tone: "冒險、神秘",
            characters: [],
            plotGuidelines: "玩家是一位冒險者，在這個世界探索未知。"
        };
    }

    /**
     * 綁定事件處理器
     */
    bindEvents() {
        // 新遊戲
        document.getElementById('new-game').addEventListener('click', () => {
            this.startNewGame();
        });

        // 儲存遊戲
        document.getElementById('save-game').addEventListener('click', () => {
            this.saveGame();
        });

        // 讀取遊戲
        document.getElementById('load-game').addEventListener('click', () => {
            this.loadGame();
        });

        // 重置遊戲
        document.getElementById('reset-game').addEventListener('click', () => {
            if (confirm('確定要重置所有資料嗎？此操作無法復原！')) {
                this.resetGame();
            }
        });

        // 測試連線
        document.getElementById('test-connection').addEventListener('click', () => {
            this.testOllamaConnection();
        });

        // 設定變更
        document.getElementById('ollama-url').addEventListener('change', (e) => {
            this.updateSettings();
        });

        document.getElementById('model-name').addEventListener('change', (e) => {
            this.updateSettings();
        });
    }

    /**
     * 開始新遊戲
     */
    async startNewGame() {
        if (this.isRunning) {
            alert('遊戲正在進行中，請稍候...');
            return;
        }

        // 重置遊戲狀態
        this.gameState = {
            turnCount: 0,
            choiceCount: 0,
            currentStory: '',
            history: [],
            flags: {},
            choices: [],
            currentScene: 'start',
            currentImage: null
        };

        this.updateStats();
        this.clearChoices();
        this.hideImage();

        // 生成開場故事
        await this.generateNextStory('');
    }

    /**
     * 生成下一段故事
     * @param {string} userChoice - 玩家選擇
     */
    async generateNextStory(userChoice) {
        if (this.isRunning) return;

        this.isRunning = true;
        this.showLoading();
        this.clearChoices();

        try {
            // 記錄玩家選擇
            if (userChoice) {
                this.gameState.choices.push(userChoice);
                this.gameState.choiceCount++;
            }

            // 使用串流方式生成故事
            let storyText = '';
            const storyElement = document.getElementById('story-text');
            storyElement.textContent = '';

            await ollamaClient.generateStoryStream(
                this.storyData,
                userChoice,
                this.gameState.history,
                (token) => {
                    storyText += token;
                    storyElement.textContent = storyText;
                    // 自動滾動到底部
                    storyElement.scrollTop = storyElement.scrollHeight;
                }
            );

            // 更新遊戲狀態
            this.gameState.currentStory = storyText;
            this.gameState.history.push(storyText);
            this.gameState.turnCount++;

            // 檢查是否需要顯示圖片
            this.checkAndShowImage(storyText);

            // 檢查成就
            const newAchievements = achievementManager.checkAchievements(this.gameState);
            if (newAchievements.length > 0) {
                console.log('解鎖新成就:', newAchievements);
            }

            // 生成選項
            await this.generateChoices();

            // 更新統計
            this.updateStats();

        } catch (error) {
            console.error('生成故事失敗:', error);
            alert('生成故事時發生錯誤: ' + error.message);
            this.showError('無法生成故事，請檢查 Ollama 連線');
        } finally {
            this.hideLoading();
            this.isRunning = false;
        }
    }

    /**
     * 生成選項
     */
    async generateChoices() {
        try {
            const choices = await ollamaClient.generateChoices(
                this.storyData,
                this.gameState.currentStory,
                3
            );

            this.displayChoices(choices);
        } catch (error) {
            console.error('生成選項失敗:', error);
            // 使用預設選項
            this.displayChoices(['繼續探索', '仔細觀察周圍', '尋找線索']);
        }
    }

    /**
     * 顯示選項
     * @param {Array<string>} choices - 選項列表
     */
    displayChoices(choices) {
        const container = document.getElementById('choices-container');
        container.innerHTML = '';

        choices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.className = 'choice-button';
            button.textContent = `${index + 1}. ${choice}`;
            button.addEventListener('click', () => {
                this.onChoiceSelected(choice);
            });
            container.appendChild(button);
        });
    }

    /**
     * 處理選項選擇
     * @param {string} choice - 選中的選項
     */
    async onChoiceSelected(choice) {
        if (this.isRunning) return;
        await this.generateNextStory(choice);
    }

    /**
     * 檢查並顯示圖片
     * @param {string} storyText - 故事文字
     */
    checkAndShowImage(storyText) {
        // 這裡可以根據故事內容決定是否顯示圖片
        // 你可以在 story.json 中定義關鍵字與圖片的對應關係

        if (!this.storyData.scenes) return;

        for (const scene of this.storyData.scenes) {
            // 檢查是否包含關鍵字
            if (scene.keywords && scene.keywords.some(kw => storyText.includes(kw))) {
                this.showImage(scene.image);
                this.gameState.currentScene = scene.id;
                break;
            }
        }
    }

    /**
     * 顯示圖片
     * @param {string} imagePath - 圖片路徑
     */
    showImage(imagePath) {
        const imageContainer = document.getElementById('scene-image');
        const imageElement = document.getElementById('current-image');

        imageElement.src = imagePath;
        imageContainer.classList.remove('hidden');
        this.gameState.currentImage = imagePath;
    }

    /**
     * 隱藏圖片
     */
    hideImage() {
        const imageContainer = document.getElementById('scene-image');
        imageContainer.classList.add('hidden');
        this.gameState.currentImage = null;
    }

    /**
     * 更新統計資訊
     */
    updateStats() {
        document.getElementById('turn-count').textContent = this.gameState.turnCount;
        document.getElementById('choice-count').textContent = this.gameState.choiceCount;
    }

    /**
     * 顯示載入中
     */
    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
    }

    /**
     * 隱藏載入中
     */
    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
    }

    /**
     * 清除選項
     */
    clearChoices() {
        document.getElementById('choices-container').innerHTML = '';
    }

    /**
     * 顯示錯誤訊息
     * @param {string} message - 錯誤訊息
     */
    showError(message) {
        const storyElement = document.getElementById('story-text');
        storyElement.innerHTML = `<div style="color: #dc3545; padding: 20px; background: #f8d7da; border-radius: 5px;">${message}</div>`;
    }

    /**
     * 儲存遊戲
     */
    saveGame() {
        const result = storageManager.saveGame(this.gameState);
        if (result.success) {
            alert('✓ ' + result.message);
        } else {
            alert('✗ ' + result.message);
        }
    }

    /**
     * 讀取遊戲
     */
    async loadGame() {
        const savedState = storageManager.loadGame();
        if (!savedState) {
            alert('沒有找到存檔！');
            return;
        }

        this.gameState = savedState;

        // 更新 UI
        document.getElementById('story-text').textContent = this.gameState.currentStory;
        this.updateStats();

        // 恢復圖片
        if (this.gameState.currentImage) {
            this.showImage(this.gameState.currentImage);
        } else {
            this.hideImage();
        }

        // 重新生成選項
        await this.generateChoices();

        alert('✓ 遊戲讀取成功！');
    }

    /**
     * 重置遊戲
     */
    resetGame() {
        storageManager.resetAll();
        achievementManager.reset();

        this.gameState = {
            turnCount: 0,
            choiceCount: 0,
            currentStory: '',
            history: [],
            flags: {},
            choices: [],
            currentScene: null,
            currentImage: null
        };

        document.getElementById('story-text').textContent = '';
        this.updateStats();
        this.clearChoices();
        this.hideImage();

        alert('✓ 遊戲已重置！');
    }

    /**
     * 測試 Ollama 連線
     */
    async testOllamaConnection() {
        const statusElement = document.getElementById('connection-status');
        statusElement.textContent = '測試中...';
        statusElement.className = 'status-message';

        const result = await ollamaClient.testConnection();

        if (result.success) {
            statusElement.textContent = '✓ ' + result.message;
            statusElement.className = 'status-message success';

            if (result.models && result.models.length > 0) {
                console.log('可用模型:', result.models.map(m => m.name));
            }
        } else {
            statusElement.textContent = '✗ ' + result.message;
            statusElement.className = 'status-message error';
        }
    }

    /**
     * 更新設定
     */
    updateSettings() {
        const settings = {
            ollamaUrl: document.getElementById('ollama-url').value,
            modelName: document.getElementById('model-name').value
        };

        storageManager.saveSettings(settings);
        ollamaClient.configure(settings.ollamaUrl, settings.modelName);

        console.log('設定已更新:', settings);
    }
}

// 當頁面載入完成時初始化遊戲
let game;
document.addEventListener('DOMContentLoaded', async () => {
    console.log('頁面載入完成，啟動遊戲...');
    game = new Game();
    await game.initialize();
});
