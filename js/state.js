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
};

export default state;