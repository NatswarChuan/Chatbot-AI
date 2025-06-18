import { getNextDailyResetTimestamp } from './utils.js';
import { SUPPORTED_LANGUAGES } from './config.js';

let currentApiKey = null;
let messageLimits = { minuteTimestamps: [], dailyTimestamps: [], dailyResetTimestamp: getNextDailyResetTimestamp() };
let currentLanguage = SUPPORTED_LANGUAGES[0];
let isApiCallInProgress = false; 

const state = {
    get currentApiKey() { return currentApiKey; },
    set currentApiKey(key) { currentApiKey = key; },

    get messageLimits() { return messageLimits; },
    set messageLimits(limits) { messageLimits = limits; },
    
    get currentLanguage() { return currentLanguage; },
    set currentLanguage(lang) { currentLanguage = lang; },

    get isApiCallInProgress() { return isApiCallInProgress; },
    set isApiCallInProgress(status) { isApiCallInProgress = status; },
};

export default state;