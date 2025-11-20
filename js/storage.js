/**
 * 存檔管理系統
 * 使用 localStorage 保存遊戲進度
 */

class StorageManager {
    constructor() {
        this.SAVE_KEY = 'rpg_game_save';
        this.SETTINGS_KEY = 'rpg_game_settings';
        this.ACHIEVEMENTS_KEY = 'rpg_game_achievements';
    }

    /**
     * 儲存遊戲狀態
     * @param {Object} gameState - 遊戲狀態物件
     */
    saveGame(gameState) {
        try {
            const saveData = {
                timestamp: new Date().toISOString(),
                gameState: gameState
            };
            localStorage.setItem(this.SAVE_KEY, JSON.stringify(saveData));
            return { success: true, message: '遊戲已儲存！' };
        } catch (error) {
            console.error('儲存遊戲失敗:', error);
            return { success: false, message: '儲存失敗: ' + error.message };
        }
    }

    /**
     * 讀取遊戲狀態
     * @returns {Object|null} 遊戲狀態或 null
     */
    loadGame() {
        try {
            const saveData = localStorage.getItem(this.SAVE_KEY);
            if (!saveData) {
                return null;
            }
            const parsed = JSON.parse(saveData);
            return parsed.gameState;
        } catch (error) {
            console.error('讀取遊戲失敗:', error);
            return null;
        }
    }

    /**
     * 檢查是否有存檔
     * @returns {boolean}
     */
    hasSave() {
        return localStorage.getItem(this.SAVE_KEY) !== null;
    }

    /**
     * 獲取存檔資訊
     * @returns {Object|null}
     */
    getSaveInfo() {
        try {
            const saveData = localStorage.getItem(this.SAVE_KEY);
            if (!saveData) {
                return null;
            }
            const parsed = JSON.parse(saveData);
            return {
                timestamp: parsed.timestamp,
                turnCount: parsed.gameState.turnCount || 0,
                choiceCount: parsed.gameState.choiceCount || 0
            };
        } catch (error) {
            console.error('獲取存檔資訊失敗:', error);
            return null;
        }
    }

    /**
     * 刪除存檔
     */
    deleteSave() {
        try {
            localStorage.removeItem(this.SAVE_KEY);
            return { success: true, message: '存檔已刪除！' };
        } catch (error) {
            console.error('刪除存檔失敗:', error);
            return { success: false, message: '刪除失敗: ' + error.message };
        }
    }

    /**
     * 儲存設定
     * @param {Object} settings - 設定物件
     */
    saveSettings(settings) {
        try {
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
            return { success: true };
        } catch (error) {
            console.error('儲存設定失敗:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * 讀取設定
     * @returns {Object} 設定物件
     */
    loadSettings() {
        try {
            const settings = localStorage.getItem(this.SETTINGS_KEY);
            if (!settings) {
                // 預設設定
                return {
                    ollamaUrl: 'http://localhost:11434',
                    modelName: 'llama2'
                };
            }
            return JSON.parse(settings);
        } catch (error) {
            console.error('讀取設定失敗:', error);
            return {
                ollamaUrl: 'http://localhost:11434',
                modelName: 'llama2'
            };
        }
    }

    /**
     * 儲存成就進度
     * @param {Object} achievements - 成就物件
     */
    saveAchievements(achievements) {
        try {
            localStorage.setItem(this.ACHIEVEMENTS_KEY, JSON.stringify(achievements));
            return { success: true };
        } catch (error) {
            console.error('儲存成就失敗:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * 讀取成就進度
     * @returns {Object|null}
     */
    loadAchievements() {
        try {
            const achievements = localStorage.getItem(this.ACHIEVEMENTS_KEY);
            if (!achievements) {
                return null;
            }
            return JSON.parse(achievements);
        } catch (error) {
            console.error('讀取成就失敗:', error);
            return null;
        }
    }

    /**
     * 重置所有資料
     */
    resetAll() {
        try {
            localStorage.removeItem(this.SAVE_KEY);
            localStorage.removeItem(this.ACHIEVEMENTS_KEY);
            return { success: true, message: '所有資料已重置！' };
        } catch (error) {
            console.error('重置失敗:', error);
            return { success: false, message: '重置失敗: ' + error.message };
        }
    }

    /**
     * 獲取儲存空間使用情況
     * @returns {Object}
     */
    getStorageInfo() {
        try {
            let totalSize = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length + key.length;
                }
            }
            return {
                used: totalSize,
                usedKB: (totalSize / 1024).toFixed(2),
                limit: '5-10MB (瀏覽器限制)'
            };
        } catch (error) {
            console.error('獲取儲存資訊失敗:', error);
            return { error: error.message };
        }
    }
}

// 建立全域實例
const storageManager = new StorageManager();
