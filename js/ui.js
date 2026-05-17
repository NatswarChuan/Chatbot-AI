import * as dom from './dom.js';
import state from './state.js';
import { TRANSLATIONS, MINUTE_TIME_WINDOW, MINUTE_MESSAGE_LIMIT, DAILY_MESSAGE_LIMIT, SUPPORTED_LANGUAGES } from './config.js';
import { getNextDailyResetTimestamp } from './utils.js';

/**
 * Tạo và chèn một Thinking Block vào trước message bubble của AI.
 * @param {HTMLElement} messageBubble - Phần tử .message-bubble của tin nhắn AI.
 * @returns {{ setContent: function, finalize: function }} API để cập nhật nội dung và kết thúc.
 */
export function addThinkingBlock(messageBubble) {
    const t = TRANSLATIONS[state.currentLanguage];

    const wrapper = document.createElement('div');
    wrapper.className = 'thinking-block';

    const header = document.createElement('button');
    header.className = 'thinking-header';
    header.setAttribute('aria-expanded', 'false');
    header.innerHTML = `
        <span class="thinking-spinner"></span>
        <span class="thinking-label">${t.thinkingLabel}</span>
        <svg class="thinking-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
    `;

    const body = document.createElement('div');
    body.className = 'thinking-body';

    const contentEl = document.createElement('div');
    contentEl.className = 'thinking-content';
    body.appendChild(contentEl);
    wrapper.appendChild(header);
    wrapper.appendChild(body);

    // Chèn thinking block trước message-content
    const messageContent = messageBubble.querySelector('.message-content');
    messageBubble.insertBefore(wrapper, messageContent);

    // Toggle mở/đóng
    header.addEventListener('click', () => {
        const isExpanded = header.getAttribute('aria-expanded') === 'true';
        header.setAttribute('aria-expanded', String(!isExpanded));
        body.classList.toggle('thinking-body--open', !isExpanded);
        const labelEl = header.querySelector('.thinking-label');
        if (!isExpanded) {
            labelEl.textContent = TRANSLATIONS[state.currentLanguage].thinkingToggleHide;
        } else {
            const isDone = wrapper.classList.contains('thinking-block--done');
            labelEl.textContent = isDone
                ? TRANSLATIONS[state.currentLanguage].thinkingDoneLabel
                : TRANSLATIONS[state.currentLanguage].thinkingLabel;
        }
    });

    return {
        /**
         * Cập nhật nội dung thinking theo thời gian thực.
         * @param {string} markdownText - Nội dung thinking đầy đủ tính tới hiện tại.
         */
        setContent(markdownText) {
            try {
                contentEl.innerHTML = marked.parse(markdownText);
            } catch(e) {
                contentEl.textContent = markdownText;
            }
        },
        /**
         * Đánh dấu thinking đã kết thúc, đổi sang trạng thái done.
         */
        finalize() {
            wrapper.classList.add('thinking-block--done');
            const spinnerEl = header.querySelector('.thinking-spinner');
            if (spinnerEl) spinnerEl.remove();
            const labelEl = header.querySelector('.thinking-label');
            if (labelEl) labelEl.textContent = TRANSLATIONS[state.currentLanguage].thinkingDoneLabel;
        }
    };
}

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
 * @param {{mimeType: string, data: string}|null} [imageObj=null] - Đối tượng ảnh đính kèm (base64).
 * @returns {HTMLDivElement} The message content element.
 */
export function addMessage(messageOrKey, sender, params = {}, imageObj = null) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message-bubble', `${sender}-message`);

    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('message-content');

    let messageText = messageOrKey;
    if (sender === 'ai' && TRANSLATIONS[state.currentLanguage][messageOrKey]) {
        messageText = TRANSLATIONS[state.currentLanguage][messageOrKey];
    }

    if (sender === 'user') {
        if (imageObj) {
            // Render ảnh gửi kèm
            const imgEl = document.createElement('img');
            imgEl.className = 'chat-message-image';
            imgEl.src = `data:${imageObj.mimeType};base64,${imageObj.data}`;
            imgEl.alt = "Uploaded Image";
            imgEl.addEventListener('click', () => {
                const w = window.open();
                if (w) {
                    w.document.write(`<img src="${imgEl.src}" style="max-width:100%; max-height:100%; display:block; margin:auto;" />`);
                }
            });
            contentWrapper.appendChild(imgEl);

            // Render văn bản nếu có
            if (messageText) {
                const textEl = document.createElement('div');
                textEl.textContent = messageText;
                contentWrapper.appendChild(textEl);
            }
        } else {
            contentWrapper.textContent = messageText;
        }
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

    if (state.isApiCallInProgress) {
        dom.sendButton.classList.add('hidden');
        dom.stopGeneratingButton.classList.remove('hidden');
        dom.stopGeneratingButton.disabled = false;
        dom.chatInput.disabled = true;
    } else {
        dom.sendButton.classList.remove('hidden');
        dom.stopGeneratingButton.classList.add('hidden');
        dom.sendButton.disabled = isInputEmpty || isRateLimited || !state.currentApiKey;
        dom.chatInput.disabled = isRateLimited || !state.currentApiKey;
    }

    if (!state.currentApiKey && !state.isApiCallInProgress) {
        showInputError("inputErrorApiKey");
    } else if (isRateLimited && !state.isApiCallInProgress) {
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

/**
 * Thêm nút "Sao chép" vào bong bóng tin nhắn của AI để sao chép toàn bộ nội dung.
 * @param {HTMLElement} messageElement - Phần tử .message-bubble của tin nhắn AI.
 */
export function addCopyMessageButton(messageElement) {
    const contentElement = messageElement.querySelector('.message-content');
    if (!contentElement || messageElement.querySelector('.copy-message-button')) {
        return;
    }

    const copyButton = document.createElement('button');
    copyButton.className = 'copy-message-button';
    copyButton.title = 'Sao chép nội dung';
    copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;

    copyButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const textToCopy = contentElement.innerText;
        navigator.clipboard.writeText(textToCopy).then(() => {
            copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            setTimeout(() => {
                copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
            }, 2000);
        }).catch(err => {
            console.error('Không thể sao chép tin nhắn:', err);
        });
    });

    messageElement.appendChild(copyButton);
}

// ==================== XỬ LÝ HÌNH ẢNH NÂNG CAO ====================

/**
 * Xử lý khi người dùng chọn một tệp hình ảnh.
 * Đọc file dưới dạng base64, cập nhật preview UI và state.
 * @param {File} file - Tệp tin hình ảnh được chọn.
 */
export function handleImageSelect(file) {
    if (!file) return;

    // Kiểm tra định dạng file
    if (!file.type.startsWith('image/')) {
        alert(TRANSLATIONS[state.currentLanguage].imageUploadFormatError);
        return;
    }

    // Kiểm tra dung lượng (giới hạn 4MB)
    const MAX_SIZE = 4 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        alert(TRANSLATIONS[state.currentLanguage].imageUploadSizeLimit);
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Data = e.target.result.split(',')[1];
        const mimeType = file.type;

        // Lưu vào state
        state.currentSelectedImage = {
            mimeType: mimeType,
            data: base64Data
        };

        // Cập nhật UI Preview
        dom.imagePreview.src = e.target.result;
        dom.imagePreviewContainer.classList.remove('hidden');
        dom.chatInput.focus();

        // Cập nhật nút gửi (cho dù input trống vẫn cho gửi nếu có ảnh)
        checkRateLimitsAndToggleButtonState();
    };
    reader.readAsDataURL(file);
}

/**
 * Xóa hình ảnh đang chọn, ẩn vùng preview UI và cập nhật state.
 */
export function clearSelectedImage() {
    state.currentSelectedImage = null;
    dom.imagePreview.src = '';
    dom.imagePreviewContainer.classList.add('hidden');
    dom.imageInput.value = '';
    
    // Cập nhật lại nút gửi
    checkRateLimitsAndToggleButtonState();
}

/**
 * Khởi tạo kéo thả (Drag & Drop) và dán ảnh (Paste) cho ô chat.
 */
export function initializeDragDropAndPaste() {
    const chatInput = dom.chatInput;

    // --- Xử lý sự kiện dán (Paste) từ Clipboard (Ctrl + V) ---
    chatInput.addEventListener('paste', (event) => {
        const items = (event.clipboardData || event.originalEvent.clipboardData).items;
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                handleImageSelect(file);
                event.preventDefault(); // Ngăn dán chuỗi nhị phân text của ảnh
                break;
            }
        }
    });

    // --- Xử lý sự kiện Kéo thả (Drag & Drop) ---
    const preventDefaults = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Tạo hiệu ứng dragover trực quan
    const chatContainer = document.querySelector('.chat-container');
    
    chatContainer.addEventListener('dragenter', () => {
        chatContainer.style.borderColor = '#168AFE';
        chatContainer.style.boxShadow = '0 8px 30px rgba(22, 138, 254, 0.2)';
    }, false);

    chatContainer.addEventListener('dragleave', (e) => {
        // Kiểm tra xem chuột đã thực sự rời container chưa
        if (!chatContainer.contains(e.relatedTarget)) {
            chatContainer.style.borderColor = 'var(--border-color)';
            chatContainer.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.1)';
        }
    }, false);

    chatContainer.addEventListener('drop', (e) => {
        chatContainer.style.borderColor = 'var(--border-color)';
        chatContainer.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.1)';
        
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files && files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                handleImageSelect(file);
            }
        }
    }, false);
}