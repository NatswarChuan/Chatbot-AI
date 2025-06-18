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
  const chatInputWrapper = document.getElementById('chatInputWrapper');
  const inputErrorMessage = document.getElementById('inputErrorMessage');
  const charCounter = document.getElementById('charCounter');
  const saveApiKeyButton = document.getElementById('saveApiKeyButton');
  const closeApiKeyModalButton = document.getElementById('closeApiKeyModalButton');

  const showApiKeyModalButton = document.getElementById('showApiKeyModalButton');


  const API_ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
  const AI_MODEL_NAME = 'gemini-1.5-flash-latest';
  const SUB_PROMPT = `\n***LƯU Ý QUAN TRỌNG***: đảm bảo gói gọn tất cả câu trả lời từ bây giờ trong 8192 token.`;


  let currentApiKey = null;
  const MINUTE_MESSAGE_LIMIT = 30;
  const MINUTE_TIME_WINDOW = 60 * 1000;
  const DAILY_MESSAGE_LIMIT = 14400;
  let messageLimits = { minuteTimestamps: [], dailyTimestamps: [], dailyResetTimestamp: getNextDailyResetTimestamp() };
  const PROMPT_CHARACTER_LIMIT = 2048;

  /**
   * Áp dụng giao diện (theme) được chỉ định.
   * @param {'light' | 'dark'} theme - Tên của theme ('light' hoặc 'dark').
   */
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

  /**
   * Chuyển đổi giữa giao diện sáng và tối.
   */
  function toggleTheme() {
    const isDark = document.body.classList.contains('dark-theme');
    const newTheme = isDark ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  }

  /**
   * Khởi tạo giao diện dựa trên lựa chọn đã lưu hoặc cài đặt hệ thống.
   */
  function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const themeToApply = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    applyTheme(themeToApply);
  }

  /**
   * Lấy thời điểm 00:00:00 của ngày tiếp theo.
   * @returns {number} Timestamp của thời điểm reset hàng ngày tiếp theo.
   */
  function getNextDailyResetTimestamp() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  /**
   * Tải thông tin giới hạn tin nhắn từ localStorage.
   */
  function loadMessageLimits() {
    const storedLimits = localStorage.getItem('messageLimits');
    if (storedLimits) messageLimits = JSON.parse(storedLimits);
  }

  /**
   * Hiển thị modal nhập API key.
   */
  function showApiKeyModal() {
    apiKeyModal.style.display = 'flex';
    apiKeyModal.style.pointerEvents = 'auto';
    apiKeyInput.focus();
    document.addEventListener('keydown', handleModalEscapeKey);
  }

  /**
   * Ẩn modal nhập API key.
   */
  function hideApiKeyModal() {
    if (apiKeyModal.style.display === 'none') return;
    apiKeyModal.style.display = 'none';
    apiKeyModal.style.pointerEvents = 'none';
    document.removeEventListener('keydown', handleModalEscapeKey);
  }

  /**
   * Xử lý sự kiện nhấn phím Escape để đóng modal.
   * @param {KeyboardEvent} event
   */
  function handleModalEscapeKey(event) {
    if (event.key === 'Escape') {
      if (apiKeyModal.style.display === 'flex') {
        hideApiKeyModal();
      }
    }
  }
  /**
   * Hiển thị thông báo lỗi dưới ô nhập liệu.
   * @param {string} message - Nội dung thông báo lỗi.
   */
  function showInputError(message) {
    inputErrorMessage.textContent = message;
    inputErrorMessage.style.display = 'block';
    chatInputWrapper.classList.add('chat-input-wrapper-error');
  }

  /**
   * Xóa thông báo lỗi dưới ô nhập liệu.
   */
  function clearInputError() {
    inputErrorMessage.textContent = '';
    inputErrorMessage.style.display = 'none';
    chatInputWrapper.classList.remove('chat-input-wrapper-error');
  }

  /**
   * Kiểm tra giới hạn tin nhắn, độ dài văn bản và trạng thái của nút gửi/ô nhập liệu.
   */
  function checkRateLimitsAndToggleButtonState() {
    const currentTime = Date.now();
    const currentLength = chatInput.value.length;
    const maxChars = PROMPT_CHARACTER_LIMIT;

    charCounter.textContent = `${currentLength}/${maxChars}`;
    charCounter.classList.toggle('error', currentLength > maxChars);

    if (currentTime >= messageLimits.dailyResetTimestamp) {
      messageLimits.dailyTimestamps = [];
      messageLimits.dailyResetTimestamp = getNextDailyResetTimestamp();
      localStorage.setItem('messageLimits', JSON.stringify(messageLimits));
    }
    messageLimits.minuteTimestamps = messageLimits.minuteTimestamps.filter(ts => currentTime - ts < MINUTE_TIME_WINDOW);
    const minuteCount = messageLimits.minuteTimestamps.length;
    const dailyCount = messageLimits.dailyTimestamps.length;
    const isInputEmpty = chatInput.value.trim() === '';

    const isRateLimited = minuteCount >= MINUTE_MESSAGE_LIMIT || dailyCount >= DAILY_MESSAGE_LIMIT;

    sendButton.disabled = isInputEmpty || currentLength > maxChars || isRateLimited || !currentApiKey;
    chatInput.disabled = isRateLimited || !currentApiKey;

    if (!currentApiKey) {
      showInputError("Vui lòng cung cấp API Key để gửi tin nhắn.");
    } else if (isRateLimited) {
      showInputError("Bạn đã đạt giới hạn gửi tin nhắn. Vui lòng thử lại sau.");
    } else if (currentLength <= maxChars) {
      clearInputError();
    }

    adjustTextareaHeight();
  }


  /**
   * Cấu hình thư viện Marked.js để phân tích Markdown.
   */
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
   * Xử lý sự kiện sao chép mã từ một khối mã.
   */
  function handleCopyCode(event, codeElement, buttonElement) {
    event.stopPropagation();
    const codeToCopy = codeElement.innerText;
    navigator.clipboard.writeText(codeToCopy).then(() => {
      buttonElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Đã chép!</span>`;
      setTimeout(() => {
        buttonElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>Copy</span>`;
      }, 2000);
    }).catch(err => {
      console.error('Không thể sao chép: ', err);
      buttonElement.innerText = 'Lỗi';
      alert(`Không thể sao chép: ${err.message}`);
    });
  }

  /**
   * Thêm nút "Copy" vào các khối mã.
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

      copyButton.addEventListener('click', (e) => handleCopyCode(e, codeElement, copyButton));
    });
  }

  /**
   * Thêm tin nhắn vào giao diện chat.
   */
  function addMessage(message, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message-bubble', `${sender}-message`);

    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('message-content');

    if (sender === 'user') {
      contentWrapper.textContent = message;
    } else {
      contentWrapper.innerHTML = marked.parse(message);
      addCopyButtons(contentWrapper);
    }

    messageElement.appendChild(contentWrapper);
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  /**
   * Gửi yêu cầu đến API của Google AI và xử lý phản hồi.
   */
  async function getAIResponse(prompt) {
    if (!currentApiKey) {
      addMessage("API Key không hợp lệ hoặc chưa được cung cấp.", 'ai');
      showApiKeyModal();
      return;
    }
    loadingIndicator.style.display = 'flex';
    sendButton.disabled = true;

    if (prompt.length > PROMPT_CHARACTER_LIMIT) {
      loadingIndicator.style.display = 'none';
      addMessage(`**Lỗi:** Nội dung tin nhắn quá dài (tối đa ${PROMPT_CHARACTER_LIMIT} ký tự). Vui lòng rút ngắn.`, 'ai');
      checkRateLimitsAndToggleButtonState();
      return;
    }

    try {
      const response = await fetch(`${API_ENDPOINT_BASE}${AI_MODEL_NAME}:generateContent?key=${currentApiKey}`, {
        method: 'POST',
        signal: AbortSignal.timeout(30000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Không thể phân tích phản hồi lỗi từ API.' } }));
        throw new Error(errorData?.error?.message || `Lỗi API: ${response.status} ${response.statusText}`);
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
      const displayErrorMessage = `Đã có lỗi xảy ra: ${error.message}`;
      addMessage(`**${displayErrorMessage}**`, 'ai');
      alert(displayErrorMessage);
    } finally {
      loadingIndicator.style.display = 'none';
      checkRateLimitsAndToggleButtonState();
    }
  }

  /**
   * Xử lý hành động gửi tin nhắn từ người dùng.
   */
  function handleSendMessage() {
    const message = chatInput.value.trim();
    if (!message || sendButton.disabled) return;

    clearInputError();
    addMessage(message, 'user');

    const now = Date.now();
    messageLimits.minuteTimestamps.push(now);
    messageLimits.dailyTimestamps.push(now);
    localStorage.setItem('messageLimits', JSON.stringify(messageLimits));

    getAIResponse(message);
    chatInput.value = '';
    checkRateLimitsAndToggleButtonState();
  }

  /**
   * Xử lý hành động lưu API key do người dùng nhập.
   */
  function handleSaveApiKey() {
    const key = apiKeyInput.value.trim();
    if (key) {
      localStorage.setItem('googleApiKey', key);
      currentApiKey = key;
      hideApiKeyModal();
      clearInputError();
      addMessage("Đã lưu API Key. Bây giờ bạn có thể bắt đầu chat!", 'ai');
      apiKeyInput.value = '';
    } else {
      alert("Vui lòng nhập API Key hợp lệ.");
    }
    checkRateLimitsAndToggleButtonState();
  }

  /**
   * Khởi tạo và kiểm tra API key khi trang được tải lần đầu.
   */
  function initializeApiKey() {
    currentApiKey = localStorage.getItem('googleApiKey');
    if (!currentApiKey) {
      addMessage("Xin chào! Vui lòng cung cấp API Key của Google AI để bắt đầu.", 'ai');
      showApiKeyModal();
    } else {
      addMessage("Xin chào! Tôi có thể giúp gì cho bạn?", 'ai');
    }
    checkRateLimitsAndToggleButtonState();
  }

  /**
   * Tự động điều chỉnh chiều cao của textarea dựa trên nội dung.
   */
  function adjustTextareaHeight() {
    chatInput.style.height = 'auto';
    const maxHeight = 150;
    const newHeight = Math.min(chatInput.scrollHeight, maxHeight);
    chatInput.style.height = `${newHeight}px`;
  }


  themeToggleButton.addEventListener('click', toggleTheme);
  sendButton.addEventListener('click', handleSendMessage);
  chatInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  });
  chatInput.addEventListener('input', checkRateLimitsAndToggleButtonState);
  saveApiKeyButton.addEventListener('click', handleSaveApiKey);
  closeApiKeyModalButton.addEventListener('click', hideApiKeyModal);


  showApiKeyModalButton.addEventListener('click', showApiKeyModal);

  apiKeyModal.addEventListener('click', (event) => {
    if (event.target === apiKeyModal) {
      hideApiKeyModal();
    }
  });


  initializeTheme();
  loadMessageLimits();
  initializeApiKey();
});
