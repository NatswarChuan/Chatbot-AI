import * as dom from './dom.js';
import state from './state.js';
import { TRANSLATIONS, MINUTE_TIME_WINDOW, MINUTE_MESSAGE_LIMIT, DAILY_MESSAGE_LIMIT, SUPPORTED_LANGUAGES } from './config.js';
import { getNextDailyResetTimestamp } from './utils.js';
/**
 * Xử lý sự kiện sao chép mã từ một khối mã.
 * @param {Event} event - Sự kiện click.
 * @param {HTMLElement} codeElement - Phần tử chứa mã cần sao chép.
 * @param {HTMLButtonElement} buttonElement - Nút sao chép.
 */

function handleCopyCode(event, codeElement, buttonElement) {
    event.stopPropagation();
    const codeToCopy = codeElement.innerText;
    navigator.clipboard.writeText(codeToCopy).then(() => {
        buttonElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>${TRANSLATIONS[state.currentLanguage].copyButtonCopiedText}</span>`;
        setTimeout(() => {
            buttonElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>${TRANSLATIONS[state.currentLanguage].copyButtonText}</span>`;
        }, 2000);
    }).catch(err => {
        console.error('Không thể sao chép: ', err);
        buttonElement.innerText = TRANSLATIONS[state.currentLanguage].copyButtonErrorText;
        alert(`${TRANSLATIONS[state.currentLanguage].copyButtonErrorText}: ${err.message}`);
    });
}

/**
 * Thêm nút "Copy" vào tất cả các khối mã (`<pre>`) trong một container.
 * @param {HTMLElement} container - Phần tử DOM chứa các khối mã.
 */
export function addCopyButtons(container) {
    const codeBlocks = container.querySelectorAll('pre');
    codeBlocks.forEach(preElement => {
        if (preElement.querySelector('.copy-code-button')) return;
        const codeElement = preElement.querySelector('code');
        if (!codeElement) return;

        const copyButton = document.createElement('button');
        copyButton.className = 'copy-code-button';
        copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>${TRANSLATIONS[state.currentLanguage].copyButtonText}</span>`;
        preElement.appendChild(copyButton);

        copyButton.addEventListener('click', (e) => handleCopyCode(e, codeElement, copyButton));
    });
}

/**
 * Thêm một tin nhắn vào giao diện chat.
 * @param {string} messageOrKey - Nội dung tin nhắn hoặc khóa dịch thuật cho tin nhắn.
 * @param {'user' | 'ai'} sender - Người gửi tin nhắn ('user' hoặc 'ai').
 * @param {Object.<string, string>} [params={}] - Các tham số để thay thế trong chuỗi dịch (nếu có).
 * @returns {HTMLDivElement} The message content element.
 */
export function addMessage(messageOrKey, sender, params = {}) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message-bubble', `${sender}-message`);

    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('message-content');

    let messageText = messageOrKey;
    if (sender === 'ai' && TRANSLATIONS[state.currentLanguage][messageOrKey]) {
        messageText = TRANSLATIONS[state.currentLanguage][messageOrKey];
    }

    if (sender === 'user') {
        contentWrapper.textContent = messageText;
    } else {
        contentWrapper.innerHTML = marked.parse(messageText);
        if (messageText) {
            addCopyButtons(contentWrapper);
        }
    }

    messageElement.appendChild(contentWrapper);
    dom.chatMessages.appendChild(messageElement);
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
    
    return contentWrapper;
}

/**
 * Hiển thị modal nhập API key.
 */
export function showApiKeyModal() {
    dom.apiKeyModal.classList.remove('hidden');
    dom.apiKeyModal.style.pointerEvents = 'auto';
    dom.apiKeyInput.focus();
}

/**
 * Ẩn modal nhập API key.
 */
export function hideApiKeyModal() {
    if (dom.apiKeyModal.classList.contains('hidden')) return;
    dom.apiKeyModal.classList.add('hidden');
    dom.apiKeyModal.style.pointerEvents = 'none';
}

/**
 * Xử lý sự kiện nhấn phím Escape để đóng modal.
 * @param {KeyboardEvent} event - Sự kiện bàn phím.
 */
export function handleModalEscapeKey(event) {
    if (event.key === 'Escape' && !dom.apiKeyModal.classList.contains('hidden')) {
        hideApiKeyModal();
    }
}

/**
 * Hiển thị thông báo lỗi cho ô nhập liệu chat.
 * @param {string} messageKey - Khóa dịch thuật cho thông báo lỗi.
 * @param {Object.<string, string|number>} [params={}] - Các tham số để thay thế trong chuỗi dịch.
 */
export function showInputError(messageKey, params = {}) {
    let translatedMessage = TRANSLATIONS[state.currentLanguage][messageKey] || messageKey;
    for (const key in params) {
        translatedMessage = translatedMessage.replace(`{${key}}`, params[key]);
    }
    dom.inputErrorMessage.textContent = translatedMessage;
    dom.inputErrorMessage.style.display = 'block';
    dom.chatInputWrapper.classList.add('chat-input-wrapper-error');
}

/**
 * Xóa thông báo lỗi khỏi ô nhập liệu chat.
 */
export function clearInputError() {
    dom.inputErrorMessage.textContent = '';
    dom.inputErrorMessage.style.display = 'none';
    dom.chatInputWrapper.classList.remove('chat-input-wrapper-error');
}

/**
 * Điều chỉnh chiều cao của textarea nhập liệu chat cho vừa với nội dung.
 */
export function adjustTextareaHeight() {
    dom.chatInput.style.height = 'auto';
    const maxHeight = 150;
    const newHeight = Math.min(dom.chatInput.scrollHeight, maxHeight);
    dom.chatInput.style.height = `${newHeight}px`;
}

/**
 * Kiểm tra giới hạn tin nhắn và cập nhật trạng thái của nút gửi và ô nhập liệu.
 */
export function checkRateLimitsAndToggleButtonState() {
    const currentTime = Date.now();
    const currentLength = dom.chatInput.value.length;

    dom.charCounter.textContent = currentLength.toString();

    if (currentTime >= state.messageLimits.dailyResetTimestamp) {
        state.messageLimits.dailyTimestamps = [];
        state.messageLimits.dailyResetTimestamp = getNextDailyResetTimestamp();
        localStorage.setItem('messageLimits', JSON.stringify(state.messageLimits));
    }
    state.messageLimits.minuteTimestamps = state.messageLimits.minuteTimestamps.filter(ts => currentTime - ts < MINUTE_TIME_WINDOW);
    const minuteCount = state.messageLimits.minuteTimestamps.length;
    const dailyCount = state.messageLimits.dailyTimestamps.length;
    const isInputEmpty = dom.chatInput.value.trim() === '';
    const isRateLimited = minuteCount >= MINUTE_MESSAGE_LIMIT || dailyCount >= DAILY_MESSAGE_LIMIT;

    dom.sendButton.disabled = isInputEmpty || isRateLimited || !state.currentApiKey || state.isApiCallInProgress;
    dom.chatInput.disabled = isRateLimited || !state.currentApiKey || state.isApiCallInProgress;

    if (!state.currentApiKey) {
        showInputError("inputErrorApiKey");
    } else if (isRateLimited) {
        showInputError("inputErrorRateLimit");
    } else {
        clearInputError();
    }

    adjustTextareaHeight();
}

/**
 * Thiết lập ngôn ngữ cho ứng dụng.
 * @param {string} lang - Mã ngôn ngữ (ví dụ: 'vi', 'en').
 */
export function setLanguage(lang) {
    if (!TRANSLATIONS[lang]) {
        lang = SUPPORTED_LANGUAGES[0];
    }
    state.currentLanguage = lang;
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;

    const t = TRANSLATIONS[lang];
    
    document.querySelectorAll('[data-translation-key]').forEach(el => {
        const key = el.dataset.translationKey;
        if (t[key]) {
            if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
                el.placeholder = t[key];
            } else if (el.tagName === 'P' && key === 'apiKeyModalDescription') {
                 el.innerHTML = t[key];
            }
            else {
                el.textContent = t[key];
            }
        }
    });

    dom.menuLanguageIndicator.textContent = lang.toUpperCase();
    document.title = t.pageTitle;
    
    checkRateLimitsAndToggleButtonState();
}

/**
 * Khởi tạo ngôn ngữ cho ứng dụng dựa trên lựa chọn đã lưu hoặc ngôn ngữ trình duyệt.
 */
export function initializeLanguage() {
    const savedLang = localStorage.getItem('language');
    const browserLang = navigator.language.split('-')[0];
    const langToApply = savedLang || (SUPPORTED_LANGUAGES.includes(browserLang) ? browserLang : SUPPORTED_LANGUAGES[0]);

    setLanguage(langToApply);
}