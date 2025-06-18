import * as dom from './dom.js';
import state from './state.js';
import { TRANSLATIONS, MINUTE_TIME_WINDOW, MINUTE_MESSAGE_LIMIT, DAILY_MESSAGE_LIMIT, SUPPORTED_LANGUAGES } from './config.js';
import { getNextDailyResetTimestamp } from './utils.js';

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
        addCopyButtons(contentWrapper);
    }

    messageElement.appendChild(contentWrapper);
    dom.chatMessages.appendChild(messageElement);
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
}

export function showTypingIndicator() {
  const bubble = document.createElement('div');
  bubble.classList.add('message-bubble', 'ai-message');
  bubble.id = 'typing-indicator-bubble';

  const content = document.createElement('div');
  content.classList.add('message-content');

  content.innerHTML = `
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;

  bubble.appendChild(content);
  dom.chatMessages.appendChild(bubble);
  dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
}

export function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator-bubble');
  if (indicator) {
    indicator.remove();
  }
}

export function showApiKeyModal() {
    dom.apiKeyModal.classList.remove('hidden');
    dom.apiKeyModal.style.pointerEvents = 'auto';
    dom.apiKeyInput.focus();
}

export function hideApiKeyModal() {
    if (dom.apiKeyModal.classList.contains('hidden')) return;
    dom.apiKeyModal.classList.add('hidden');
    dom.apiKeyModal.style.pointerEvents = 'none';
}

export function handleModalEscapeKey(event) {
    if (event.key === 'Escape' && !dom.apiKeyModal.classList.contains('hidden')) {
        hideApiKeyModal();
    }
}

export function showInputError(messageKey, params = {}) {
    let translatedMessage = TRANSLATIONS[state.currentLanguage][messageKey] || messageKey;
    for (const key in params) {
        translatedMessage = translatedMessage.replace(`{${key}}`, params[key]);
    }
    dom.inputErrorMessage.textContent = translatedMessage;
    dom.inputErrorMessage.style.display = 'block';
    dom.chatInputWrapper.classList.add('chat-input-wrapper-error');
}

export function clearInputError() {
    dom.inputErrorMessage.textContent = '';
    dom.inputErrorMessage.style.display = 'none';
    dom.chatInputWrapper.classList.remove('chat-input-wrapper-error');
}

export function adjustTextareaHeight() {
    dom.chatInput.style.height = 'auto';
    const maxHeight = 150;
    const newHeight = Math.min(dom.chatInput.scrollHeight, maxHeight);
    dom.chatInput.style.height = `${newHeight}px`;
}

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

export function initializeLanguage() {
    const savedLang = localStorage.getItem('language');
    const browserLang = navigator.language.split('-')[0];
    const langToApply = savedLang || (SUPPORTED_LANGUAGES.includes(browserLang) ? browserLang : SUPPORTED_LANGUAGES[0]);

    setLanguage(langToApply);
}