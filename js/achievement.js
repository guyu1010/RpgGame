/**
 * 成就系統
 * 追蹤玩家成就並提供解鎖功能
 */

class AchievementManager {
    constructor() {
        this.achievements = [];
        this.unlockedAchievements = new Set();
        this.listeners = [];
    }

    /**
     * 初始化成就系統
     * @param {Array} achievementDefinitions - 成就定義列表
     */
    async initialize(achievementDefinitions) {
        this.achievements = achievementDefinitions;

        // 載入已解鎖的成就
        const saved = storageManager.loadAchievements();
        if (saved && saved.unlocked) {
            this.unlockedAchievements = new Set(saved.unlocked);
        }

        this.updateUI();
    }

    /**
     * 載入成就定義檔案
     * @param {string} url - 成就定義檔案 URL
     */
    async loadAchievements(url = 'data/achievements.json') {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`無法載入成就定義: ${response.status}`);
            }
            const data = await response.json();
            await this.initialize(data.achievements || []);
            return { success: true };
        } catch (error) {
            console.error('載入成就失敗:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 檢查並解鎖成就
     * @param {Object} gameState - 當前遊戲狀態
     */
    checkAchievements(gameState) {
        let newUnlocks = [];

        for (const achievement of this.achievements) {
            // 跳過已解鎖的成就
            if (this.unlockedAchievements.has(achievement.id)) {
                continue;
            }

            // 檢查條件
            if (this.checkCondition(achievement.condition, gameState)) {
                this.unlock(achievement.id);
                newUnlocks.push(achievement);
            }
        }

        return newUnlocks;
    }

    /**
     * 檢查成就條件
     * @param {Object} condition - 條件物件
     * @param {Object} gameState - 遊戲狀態
     * @returns {boolean}
     */
    checkCondition(condition, gameState) {
        if (!condition) return false;

        const { type, key, value, operator = 'gte' } = condition;

        switch (type) {
            case 'counter':
                return this.compareValues(gameState[key] || 0, value, operator);

            case 'flag':
                return gameState.flags && gameState.flags[key] === true;

            case 'choice':
                return gameState.choices && gameState.choices.includes(value);

            case 'story_progress':
                return gameState.currentScene === value;

            default:
                return false;
        }
    }

    /**
     * 比較數值
     * @param {number} actual - 實際值
     * @param {number} target - 目標值
     * @param {string} operator - 運算子
     * @returns {boolean}
     */
    compareValues(actual, target, operator) {
        switch (operator) {
            case 'eq': return actual === target;
            case 'gt': return actual > target;
            case 'gte': return actual >= target;
            case 'lt': return actual < target;
            case 'lte': return actual <= target;
            default: return false;
        }
    }

    /**
     * 解鎖成就
     * @param {string} achievementId - 成就 ID
     */
    unlock(achievementId) {
        if (this.unlockedAchievements.has(achievementId)) {
            return false;
        }

        this.unlockedAchievements.add(achievementId);

        // 儲存到 localStorage
        storageManager.saveAchievements({
            unlocked: Array.from(this.unlockedAchievements)
        });

        // 觸發事件
        this.notifyListeners('unlock', achievementId);

        // 更新 UI
        this.updateUI();

        // 顯示通知
        const achievement = this.achievements.find(a => a.id === achievementId);
        if (achievement) {
            this.showUnlockNotification(achievement);
        }

        return true;
    }

    /**
     * 顯示解鎖通知
     * @param {Object} achievement - 成就物件
     */
    showUnlockNotification(achievement) {
        // 建立通知元素
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-notification-content">
                <div class="achievement-notification-icon">🏆</div>
                <div class="achievement-notification-text">
                    <div class="achievement-notification-title">成就解鎖！</div>
                    <div class="achievement-notification-name">${achievement.name}</div>
                    <div class="achievement-notification-desc">${achievement.description}</div>
                </div>
            </div>
        `;

        // 加入 CSS（如果尚未加入）
        if (!document.getElementById('achievement-notification-style')) {
            const style = document.createElement('style');
            style.id = 'achievement-notification-style';
            style.textContent = `
                .achievement-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 20px;
                    border-radius: 10px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                    z-index: 10000;
                    animation: slideIn 0.5s ease, slideOut 0.5s ease 3.5s;
                }
                .achievement-notification-content {
                    display: flex;
                    gap: 15px;
                    align-items: center;
                }
                .achievement-notification-icon {
                    font-size: 40px;
                }
                .achievement-notification-title {
                    font-weight: bold;
                    font-size: 16px;
                    margin-bottom: 5px;
                }
                .achievement-notification-name {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 3px;
                }
                .achievement-notification-desc {
                    font-size: 14px;
                    opacity: 0.9;
                }
                @keyframes slideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // 4 秒後移除
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }

    /**
     * 更新 UI
     */
    updateUI() {
        const listElement = document.getElementById('achievements-list');
        const countElement = document.getElementById('achievement-count');

        if (!listElement) return;

        // 清空列表
        listElement.innerHTML = '';

        // 更新計數
        const unlockedCount = this.unlockedAchievements.size;
        const totalCount = this.achievements.length;
        if (countElement) {
            countElement.textContent = `${unlockedCount}/${totalCount}`;
        }

        // 建立成就項目
        for (const achievement of this.achievements) {
            const isUnlocked = this.unlockedAchievements.has(achievement.id);
            const item = document.createElement('div');
            item.className = `achievement-item ${isUnlocked ? 'unlocked' : ''}`;
            item.innerHTML = `
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.description}</div>
                <div class="achievement-status">${isUnlocked ? '✓ 已解鎖' : '🔒 未解鎖'}</div>
            `;
            listElement.appendChild(item);
        }
    }

    /**
     * 註冊事件監聽器
     * @param {Function} callback - 回調函數
     */
    addListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * 通知監聽器
     * @param {string} event - 事件類型
     * @param {any} data - 事件資料
     */
    notifyListeners(event, data) {
        for (const listener of this.listeners) {
            listener(event, data);
        }
    }

    /**
     * 獲取成就統計
     * @returns {Object}
     */
    getStats() {
        return {
            total: this.achievements.length,
            unlocked: this.unlockedAchievements.size,
            percentage: this.achievements.length > 0
                ? Math.round((this.unlockedAchievements.size / this.achievements.length) * 100)
                : 0
        };
    }

    /**
     * 重置所有成就
     */
    reset() {
        this.unlockedAchievements.clear();
        storageManager.saveAchievements({ unlocked: [] });
        this.updateUI();
    }
}

// 建立全域實例
const achievementManager = new AchievementManager();
