/**
 * @fileoverview Quản lý trạng thái toàn cục của ứng dụng.
 */
import { getNextDailyResetTimestamp } from './utils.js';
import { SUPPORTED_LANGUAGES } from './config.js';

/** @type {string|null} API key hiện tại của Google AI. */
let currentApiKey = null;
/** * @type {object} Thông tin về giới hạn tin nhắn.
 * @property {number[]} minuteTimestamps - Mảng các dấu thời gian của tin nhắn trong phút hiện tại.
 * @property {number[]} dailyTimestamps - Mảng các dấu thời gian của tin nhắn trong ngày hiện tại.
 * @property {number} dailyResetTimestamp - Dấu thời gian cho lần reset giới hạn hàng ngày tiếp theo.
 */
let messageLimits = { minuteTimestamps: [], dailyTimestamps: [], dailyResetTimestamp: getNextDailyResetTimestamp() };
/** @type {string} Ngôn ngữ hiện tại của ứng dụng. */
let currentLanguage = SUPPORTED_LANGUAGES[0];
/** @type {boolean} Trạng thái cho biết liệu có cuộc gọi API nào đang được thực hiện hay không. */
let isApiCallInProgress = false;
/** @type {boolean} Trạng thái cho biết người dùng có yêu cầu ngừng tạo phản hồi hay không. */
let stopGeneration = false;
/**
 * @type {Array<{role: 'user'|'model', parts: [{text: string}]}>}
 * Lịch sử hội thoại (không bao gồm nội dung thinking của AI).
 * Mỗi phần tử là một turn theo format Gemini multi-turn.
 */
let conversationHistory = [];

// --- Các cấu hình nâng cao mới cho Gemma 4 ---
/** @type {{mimeType: string, data: string}|null} Ảnh đang được chọn để gửi kèm (base64). */
let currentSelectedImage = null;
/** @type {boolean} Trạng thái bật/tắt Google Search. */
let isSearchEnabled = localStorage.getItem('isSearchEnabled') === 'true';
/** @type {boolean} Trạng thái bật/tắt Thinking Mode (suy luận). Mặc định luôn là true. */
const isThinkingEnabled = true;

/**
 * Đối tượng trạng thái toàn cục của ứng dụng.
 * Sử dụng getters và setters để quản lý việc truy cập và cập nhật các thuộc tính trạng thái.
 */
const state = {
    get currentApiKey() { return currentApiKey; },
    set currentApiKey(key) { currentApiKey = key; },
    get messageLimits() { return messageLimits; },
    set messageLimits(limits) { messageLimits = limits; },
    get currentLanguage() { return currentLanguage; },
    set currentLanguage(lang) { currentLanguage = lang; },
    get isApiCallInProgress() { return isApiCallInProgress; },
    set isApiCallInProgress(status) { isApiCallInProgress = status; },
    get stopGeneration() { return stopGeneration; },
    set stopGeneration(value) { stopGeneration = value; },
    get conversationHistory() { return conversationHistory; },
    set conversationHistory(history) { conversationHistory = history; },

    // Getters & Setters cho các thuộc tính nâng cao
    get currentSelectedImage() { return currentSelectedImage; },
    set currentSelectedImage(img) { currentSelectedImage = img; },
    get isSearchEnabled() { return isSearchEnabled; },
    set isSearchEnabled(val) { isSearchEnabled = val; localStorage.setItem('isSearchEnabled', val); },
    get isThinkingEnabled() { return true; },
    set isThinkingEnabled(val) { /* Mặc định luôn là true */ }
};

export default state;