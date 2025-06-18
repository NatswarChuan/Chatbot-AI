document.addEventListener('DOMContentLoaded', () => {
    const themeToggleButton = document.getElementById('themeToggle');
    const themeIconLight = document.getElementById('themeIconLight');
    const themeIconDark = document.getElementById('themeIconDark');
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendButton');
    const chatMessages = document.getElementById('chatMessages');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const apiKeyModal = document.getElementById('apiKeyModal');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveApiKeyButton = document.getElementById('saveApiKeyButton');

    let currentApiKey = null;
    const MINUTE_MESSAGE_LIMIT = 30;
    const MINUTE_TIME_WINDOW = 60 * 1000;
    const DAILY_MESSAGE_LIMIT = 14400;
    let messageLimits = { minuteTimestamps: [], dailyTimestamps: [], dailyResetTimestamp: getNextDailyResetTimestamp() };
    
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
            themeIconLight.style.display = 'none';
            themeIconDark.style.display = 'block';
        } else {
            document.body.classList.remove('dark-theme');
            themeIconLight.style.display = 'block';
            themeIconDark.style.display = 'none';
        }
    }

    function toggleTheme() {
        const isDark = document.body.classList.contains('dark-theme');
        const newTheme = isDark ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    }

    function initializeTheme() {
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const themeToApply = savedTheme || (systemPrefersDark ? 'dark' : 'light');
        applyTheme(themeToApply);
    }
    
    function getNextDailyResetTimestamp() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.getTime();
    }

    function loadMessageLimits() {
        const storedLimits = localStorage.getItem('messageLimits');
        if (storedLimits) messageLimits = JSON.parse(storedLimits);
    }
    
    function showApiKeyModal() {
        apiKeyModal.style.display = 'flex';
        apiKeyModal.style.pointerEvents = 'auto';
        apiKeyInput.focus();
    }

    function hideApiKeyModal() {
        apiKeyModal.style.display = 'none';
        apiKeyModal.style.pointerEvents = 'none';
    }

    function checkRateLimitsAndToggleButtonState() {
        const currentTime = Date.now();
        if (currentTime >= messageLimits.dailyResetTimestamp) {
            messageLimits.dailyTimestamps = [];
            messageLimits.dailyResetTimestamp = getNextDailyResetTimestamp();
            localStorage.setItem('messageLimits', JSON.stringify(messageLimits));
        }
        messageLimits.minuteTimestamps = messageLimits.minuteTimestamps.filter(ts => currentTime - ts < MINUTE_TIME_WINDOW);
        const minuteCount = messageLimits.minuteTimestamps.length;
        const dailyCount = messageLimits.dailyTimestamps.length;
        const isInputEmpty = chatInput.value.trim() === '';
        sendButton.disabled = isInputEmpty || minuteCount >= MINUTE_MESSAGE_LIMIT || dailyCount >= DAILY_MESSAGE_LIMIT || !currentApiKey;
        chatInput.disabled = !currentApiKey || minuteCount >= MINUTE_MESSAGE_LIMIT || dailyCount >= DAILY_MESSAGE_LIMIT;
    }

    function loadAndPromptApiKey() {
        currentApiKey = localStorage.getItem('googleApiKey');
        if (!currentApiKey) {
            addMessage("Vui lòng cung cấp API Key của Google AI để tiếp tục.", 'ai');
            showApiKeyModal();
        }
        checkRateLimitsAndToggleButtonState();
    }

    // Cấu hình Marked.js để phân tích Markdown
    marked.setOptions({
        highlight: (code, lang) => {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        langPrefix: 'hljs language-',
        gfm: true,
        breaks: true,
    });

    /**
     * Thêm nút "Copy" vào các khối mã.
     * @param {HTMLElement} container - Element chứa các khối mã.
     */
    function addCopyButtons(container) {
        const codeBlocks = container.querySelectorAll('pre');
        codeBlocks.forEach(preElement => {
            if (preElement.querySelector('.copy-code-button')) return;
            const codeElement = preElement.querySelector('code');
            if (!codeElement) return;

            const copyButton = document.createElement('button');
            copyButton.className = 'copy-code-button';
            copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>Copy</span>`;
            preElement.appendChild(copyButton);

            copyButton.addEventListener('click', (e) => {
                e.stopPropagation();
                const codeToCopy = codeElement.innerText;
                const textArea = document.createElement('textarea');
                textArea.value = codeToCopy;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Đã chép!</span>`;
                } catch (err) {
                    console.error('Không thể sao chép: ', err);
                    copyButton.innerText = 'Lỗi';
                }
                document.body.removeChild(textArea);
                setTimeout(() => {
                    copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>Copy</span>`;
                }, 2000);
            });
        });
    }

    /**
     * Thêm tin nhắn vào giao diện chat.
     * @param {string} message - Nội dung tin nhắn.
     * @param {'user' | 'ai'} sender - Người gửi.
     */
    function addMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message-bubble', `${sender}-message`);

        const contentWrapper = document.createElement('div');
        contentWrapper.classList.add('message-content');
        messageElement.appendChild(contentWrapper);
        
        if (sender === 'user') {
            contentWrapper.textContent = message;
        } else {
            contentWrapper.innerHTML = marked.parse(message);
            addCopyButtons(contentWrapper);
        }
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * Gửi yêu cầu đến API của Google AI và xử lý phản hồi.
     * @param {string} prompt - Tin nhắn của người dùng.
     */
    async function getAIResponse(prompt) {
        if (!currentApiKey) {
            addMessage("API Key không hợp lệ hoặc chưa được cung cấp.", 'ai');
            showApiKeyModal();
            return;
        }
        loadingIndicator.style.display = 'flex';
        sendButton.disabled = true;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemma-3n-e4b-it:generateContent?key=${currentApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
            });

            if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData?.error?.message || 'Lỗi không xác định');
            }

            const result = await response.json();
            const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (aiText) {
                addMessage(aiText, 'ai');
            } else {
                addMessage("AI không trả về nội dung.", 'ai');
            }

        } catch (error) {
            console.error('Lỗi API:', error);
            addMessage(`**Đã có lỗi xảy ra:** ${error.message}`, 'ai');
        } finally {
            loadingIndicator.style.display = 'none';
            checkRateLimitsAndToggleButtonState();
        }
    }

    /**
     * Xử lý việc gửi tin nhắn của người dùng.
     */
    function handleSendMessage() {
        const message = chatInput.value.trim();
        if (message && !sendButton.disabled) {
            addMessage(message, 'user');
            const now = Date.now();
            messageLimits.minuteTimestamps.push(now);
            messageLimits.dailyTimestamps.push(now);
            localStorage.setItem('messageLimits', JSON.stringify(messageLimits));
            getAIResponse(message);
            chatInput.value = '';
        }
        checkRateLimitsAndToggleButtonState();
    }
    
    themeToggleButton.addEventListener('click', toggleTheme);
    sendButton.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keypress', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } });
    chatInput.addEventListener('input', checkRateLimitsAndToggleButtonState);
    saveApiKeyButton.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem('googleApiKey', key);
            currentApiKey = key;
            hideApiKeyModal();
            addMessage("Đã lưu API Key. Bây giờ bạn có thể bắt đầu chat!", 'ai');
            apiKeyInput.value = '';
        }
        checkRateLimitsAndToggleButtonState();
    });

    initializeTheme();
    loadMessageLimits();
    loadAndPromptApiKey();
});
