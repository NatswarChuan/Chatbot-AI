import * as dom from './dom.js';
import state from './state.js';
import { TRANSLATIONS, SUPPORTED_LANGUAGES } from './config.js';
import { getAIResponse, sendInitialPingToAI } from './api.js';
import { 
    addMessage, showApiKeyModal, hideApiKeyModal, handleModalEscapeKey, 
    clearInputError, checkRateLimitsAndToggleButtonState, setLanguage, 
    initializeLanguage, showInputError 
} from './ui.js';

function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.body.classList.toggle('dark-theme', isDark);
    dom.menuThemeIconLight.classList.toggle('hidden', isDark);
    dom.menuThemeIconDark.classList.toggle('hidden', !isDark);
}

function toggleTheme() {
    const newTheme = document.body.classList.contains('dark-theme') ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(savedTheme || (systemPrefersDark ? 'dark' : 'light'));
}

function handleSendMessage() {
    if (state.isApiCallInProgress) {
        console.log("Yêu cầu trước đó đang được xử lý. Vui lòng đợi.");
        return;
    }
    const message = dom.chatInput.value.trim();
    if (!message) {
        showInputError("inputErrorEmpty");
        return;
    }
    clearInputError();
    addMessage(message, 'user');
    const now = Date.now();
    state.messageLimits.minuteTimestamps.push(now);
    state.messageLimits.dailyTimestamps.push(now);
    localStorage.setItem('messageLimits', JSON.stringify(state.messageLimits));
    getAIResponse(message);
    dom.chatInput.value = '';
    checkRateLimitsAndToggleButtonState();
}

function handleSaveApiKey() {
    const key = dom.apiKeyInput.value.trim();
    if (key && key !== "null" && key !== "undefined") {
        localStorage.setItem('googleApiKey', key);
        state.currentApiKey = key;
        hideApiKeyModal();
        clearInputError();
        addMessage("apiKeySavedMessage", 'ai');
        dom.apiKeyInput.value = '';
    } else {
        alert(TRANSLATIONS[state.currentLanguage].apiKeyInvalidMessage);
    }
    checkRateLimitsAndToggleButtonState();
}

function initializeApiKey() {
    const storedApiKey = localStorage.getItem('googleApiKey');
    const trimmedKey = storedApiKey ? storedApiKey.trim() : null;

    if (trimmedKey && trimmedKey !== "null" && trimmedKey !== "undefined") {
        state.currentApiKey = trimmedKey;
        addMessage("welcomeMessageWithKey", 'ai');
    } else {
        state.currentApiKey = null;
        if (storedApiKey) localStorage.removeItem('googleApiKey');
        addMessage("welcomeMessageNoKey", 'ai');
        showApiKeyModal();
    }
    checkRateLimitsAndToggleButtonState();
}

function loadMessageLimits() {
    const storedLimits = localStorage.getItem('messageLimits');
    if (storedLimits) {
        state.messageLimits = JSON.parse(storedLimits);
    }
}

function toggleSettingsMenu() {
    dom.settingsDropdown.classList.toggle('hidden');
}

function closeSettingsMenuOnClickOutside(event) {
    if (!dom.settingsMenuButton.contains(event.target) && !dom.settingsDropdown.contains(event.target)) {
        dom.settingsDropdown.classList.add('hidden');
    }
}

// Event Listeners
dom.settingsMenuButton.addEventListener('click', toggleSettingsMenu);
document.addEventListener('click', closeSettingsMenuOnClickOutside);

dom.menuThemeToggle.addEventListener('click', toggleTheme);
dom.menuApiKey.addEventListener('click', showApiKeyModal);
dom.menuLanguageToggle.addEventListener('click', () => {
    const currentIndex = SUPPORTED_LANGUAGES.indexOf(state.currentLanguage);
    const nextIndex = (currentIndex + 1) % SUPPORTED_LANGUAGES.length;
    setLanguage(SUPPORTED_LANGUAGES[nextIndex]);
});

dom.sendButton.addEventListener('click', handleSendMessage);
dom.chatInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSendMessage();
    }
});
dom.chatInput.addEventListener('input', checkRateLimitsAndToggleButtonState);
dom.saveApiKeyButton.addEventListener('click', handleSaveApiKey);
dom.closeApiKeyModalButton.addEventListener('click', hideApiKeyModal);
dom.apiKeyModal.addEventListener('click', (event) => {
    if (event.target === dom.apiKeyModal) hideApiKeyModal();
});
document.addEventListener('keydown', (event) => {
    handleModalEscapeKey(event);
    if (event.key === 'Escape' && !dom.settingsDropdown.classList.contains('hidden')) {
        toggleSettingsMenu();
    }
});

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initializeApiKey();
    initializeTheme();
    loadMessageLimits();
    initializeLanguage();
    sendInitialPingToAI();
});