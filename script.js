import { GoogleGenAI } from 'https://cdn.jsdelivr.net/npm/@google/genai@1.5.1/+esm';
document.addEventListener('DOMContentLoaded', () => {


  /** @type {HTMLButtonElement} Nút chuyển đổi giao diện. */
  const themeToggleButton = document.getElementById('themeToggle');
  /** @type {HTMLElement} Biểu tượng giao diện sáng. */
  const themeIconLight = document.getElementById('themeIconLight');
  /** @type {HTMLElement} Biểu tượng giao diện tối. */
  const themeIconDark = document.getElementById('themeIconDark');
  /** @type {HTMLTextAreaElement} Ô nhập liệu chat. */
  const chatInput = document.getElementById('chatInput');
  /** @type {HTMLButtonElement} Nút gửi tin nhắn. */
  const sendButton = document.getElementById('sendButton');
  /** @type {HTMLDivElement} Khu vực hiển thị tin nhắn chat. */
  const chatMessages = document.getElementById('chatMessages');
  /** @type {HTMLDivElement} Chỉ báo tải. */
  const loadingIndicator = document.getElementById('loadingIndicator');
  /** @type {HTMLDivElement} Modal nhập API key. */
  const apiKeyModal = document.getElementById('apiKeyModal');
  /** @type {HTMLInputElement} Ô nhập API key. */
  const apiKeyInput = document.getElementById('apiKeyInput');
  /** @type {HTMLDivElement} Wrapper của ô nhập liệu chat. */
  const chatInputWrapper = document.getElementById('chatInputWrapper');
  /** @type {HTMLDivElement} Khu vực hiển thị thông báo lỗi của ô nhập liệu. */
  const inputErrorMessage = document.getElementById('inputErrorMessage');
  /** @type {HTMLSpanElement} Bộ đếm ký tự. */
  const charCounter = document.getElementById('charCounter');
  /** @type {HTMLButtonElement} Nút lưu API key. */
  const saveApiKeyButton = document.getElementById('saveApiKeyButton');
  /** @type {HTMLButtonElement} Nút đóng modal API key. */
  const closeApiKeyModalButton = document.getElementById('closeApiKeyModalButton');
  /** @type {HTMLButtonElement} Nút hiển thị modal API key. */
  const showApiKeyModalButton = document.getElementById('showApiKeyModalButton');
  /** @type {HTMLButtonElement} Nút chuyển đổi ngôn ngữ. */
  const languageToggleButton = document.getElementById('languageToggleButton');
  /** @type {HTMLDivElement} Lớp phủ hiển thị trạng thái "Đang kết nối". */
  const pingOverlay = document.getElementById('pingOverlay');
  /** @type {HTMLSpanElement} Chỉ báo ngôn ngữ hiện tại. */
  const languageIndicator = document.getElementById('languageIndicator');
  /** @type {HTMLHeadingElement} Tiêu đề của header chat. */
  const chatHeaderTitle = document.querySelector('.chat-header h1');


  /** @const {string} URL cơ sở của API endpoint. */
  const API_ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
  /** @const {string} Tên model AI sử dụng. */
  const AI_MODEL_NAME = 'gemma-3n-e4b-it';
  /** @const {string} Phần prompt phụ được thêm vào mỗi yêu cầu, bao gồm yêu cầu về giới hạn token và ngôn ngữ. */
  const SUB_PROMPT = `\n***LƯU Ý QUAN TRỌNG***: Chỉ trả lời bằng ngôn ngữ `;
  /** @const {string} Phần prompt được gửi đi để kiểm tra và đảm bảo chỉ được phép trả về 32768 token. */
  const PING_PROMPT = `***LƯU Ý QUAN TRỌNG***: Đảm bảo gói gọn tất cả các yêu cầu đều có tổng cửa sổ ngữ cảnh là 32,768 (32K) token.`;
  /** @const {number} Giới hạn token tối đa cho một request gửi đến API. */
  const MAX_REQUEST_TOKENS = 32768;


  /** @type {string|null} API key hiện tại của người dùng. */
  let currentApiKey = null;
  /** @const {number} Giới hạn số tin nhắn mỗi phút. */
  const MINUTE_MESSAGE_LIMIT = 30;
  /** @const {number} Khoảng thời gian (ms) cho giới hạn tin nhắn mỗi phút. */
  const MINUTE_TIME_WINDOW = 60 * 1000;
  /** @const {number} Giới hạn số tin nhắn mỗi ngày. */
  const DAILY_MESSAGE_LIMIT = 14400;
  /**
   * @typedef {Object} MessageLimits
   * @property {number[]} minuteTimestamps - Mảng các timestamp của tin nhắn trong khoảng thời gian giới hạn mỗi phút.
   * @property {number[]} dailyTimestamps - Mảng các timestamp của tin nhắn trong khoảng thời gian giới hạn mỗi ngày.
   * @property {number} dailyResetTimestamp - Timestamp của thời điểm reset giới hạn hàng ngày tiếp theo.
   */
  /** @type {MessageLimits} Đối tượng lưu trữ thông tin giới hạn tin nhắn. */
  let messageLimits = { minuteTimestamps: [], dailyTimestamps: [], dailyResetTimestamp: getNextDailyResetTimestamp() };
  /** @type {string} Ngôn ngữ hiện tại của giao diện. */
  let currentLanguage = 'vi';
  const supportedLanguages = ['vi', 'en'];

  /**
   * Hiển thị lớp phủ "Đang kết nối".
   */
  function showPingOverlay() {
    pingOverlay.style.display = 'flex';
  }

  /**
   * Ẩn lớp phủ "Đang kết nối".
   */
  function hidePingOverlay() {
    pingOverlay.style.display = 'none';
  }

  /**
   * @type {Object.<string, Object.<string, string>>} Đối tượng chứa các chuỗi dịch cho các ngôn ngữ được hỗ trợ.
   */
  const translations = {
    'vi': {
      'fullLanguageName': 'tiếng Việt',
      'pageTitle': 'Chatbot AI - Trò chuyện và Hỏi đáp',
      'chatTitle': 'Chatbot AI',
      'languageToggleButtonTitle': 'Đổi ngôn ngữ (Change Language)',
      'apiKeyButtonTitle': 'Nhập API Key',
      'themeToggleButtonTitle': 'Chuyển đổi theme',
      'aiReplying': 'AI đang trả lời...',
      'chatInputPlaceholder': 'Nhắn tin cho AI...',
      'inputErrorEmpty': 'Nội dung tin nhắn không được để trống.',
      'inputErrorApiKey': 'Vui lòng cung cấp API Key để gửi tin nhắn.',
      'inputErrorRateLimit': 'Bạn đã đạt giới hạn gửi tin nhắn. Vui lòng thử lại sau.',
      'inputErrorGeneral': 'Không thể gửi tin nhắn. Vui lòng kiểm tra lại.',
      'apiKeyModalTitle': 'Nhập API Key của Google AI',
      'apiKeyModalDescription': 'Để sử dụng chatbot, bạn cần cung cấp API Key. Bạn có thể lấy API Key từ <a href="https://aistudio.google.com/app/apikey" target="_blank" class="font-medium">Google AI Studio</a>.',
      'apiKeyModalInputPlaceholder': 'API Key của bạn',
      'apiKeyModalSaveButton': 'Lưu Key',
      'apiKeyModalCloseButtonAriaLabel': 'Đóng modal',
      'apiKeySavedMessage': 'Đã lưu API Key. Bây giờ bạn có thể bắt đầu chat!',
      'apiKeyInvalidMessage': 'Vui lòng nhập API Key hợp lệ.',
      'welcomeMessageNoKey': 'Xin chào! Vui lòng cung cấp API Key của Google AI để bắt đầu.',
      'welcomeMessageWithKey': 'Xin chào! Tôi có thể giúp gì cho bạn?',
      'errorAIGeneric': 'Đã có lỗi xảy ra: {errorMessage}',
      'inputErrorTooLongTokens': 'Nội dung prompt quá dài. Giới hạn token cho phép là {maxTokens}, prompt hiện tại có {currentTokens} token.',
      'errorAINoContent': 'AI không trả về nội dung.',
      'copyButtonText': 'Copy',
      'copyButtonCopiedText': 'Đã chép!',
      'copyButtonErrorText': 'Lỗi',
    },
    'en': {
      'fullLanguageName': 'English',
      'pageTitle': 'Chatbot AI - Chat and Q&A',
      'chatTitle': 'Chatbot AI',
      'languageToggleButtonTitle': 'Change Language (Đổi ngôn ngữ)',
      'apiKeyButtonTitle': 'Enter API Key',
      'themeToggleButtonTitle': 'Toggle theme',
      'aiReplying': 'AI is replying...',
      'chatInputPlaceholder': 'Message AI...',
      'inputErrorEmpty': 'Message content cannot be empty.',
      'inputErrorApiKey': 'Please provide an API Key to send messages.',
      'inputErrorRateLimit': 'You have reached the message limit. Please try again later.',
      'inputErrorGeneral': 'Cannot send message. Please check again.',
      'apiKeyModalTitle': 'Enter Google AI API Key',
      'apiKeyModalDescription': 'To use the chatbot, you need to provide an API Key. You can get your API Key from <a href="https://aistudio.google.com/app/apikey" target="_blank" class="font-medium">Google AI Studio</a>.',
      'apiKeyModalInputPlaceholder': 'Your API Key',
      'apiKeyModalSaveButton': 'Save Key',
      'apiKeyModalCloseButtonAriaLabel': 'Close modal',
      'apiKeySavedMessage': 'API Key saved. You can now start chatting!',
      'apiKeyInvalidMessage': 'Please enter a valid API Key.',
      'welcomeMessageNoKey': 'Hello! Please provide your Google AI API Key to begin.',
      'welcomeMessageWithKey': 'Hello! How can I help you today?',
      'errorAIGeneric': 'An error occurred: {errorMessage}',
      'inputErrorTooLongTokens': 'Prompt content is too long. The allowed token limit is {maxTokens}, current prompt has {currentTokens} tokens.',
      'errorAINoContent': 'AI did not return any content.',
      'copyButtonText': 'Copy',
      'copyButtonCopiedText': 'Copied!',
      'copyButtonErrorText': 'Error',
    }
  };

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
   * Áp dụng ngôn ngữ được chỉ định cho giao diện.
   * @param {string} lang - Mã ngôn ngữ (ví dụ: 'vi', 'en').
   */
  function setLanguage(lang) {
    if (!translations[lang]) {
      console.warn(`Ngôn ngữ không được hỗ trợ: ${lang}. Sử dụng ngôn ngữ mặc định.`);
      lang = supportedLanguages[0];
    }
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;

    languageIndicator.textContent = lang.toUpperCase();
    const t = translations[lang];
    document.title = t.pageTitle;
    chatHeaderTitle.textContent = t.chatTitle;
    languageToggleButton.title = t.languageToggleButtonTitle;
    showApiKeyModalButton.title = t.apiKeyButtonTitle;
    themeToggleButton.title = t.themeToggleButtonTitle;
    loadingIndicator.querySelector('span').textContent = t.aiReplying;
    chatInput.placeholder = t.chatInputPlaceholder;
    apiKeyModal.querySelector('h2').textContent = t.apiKeyModalTitle;
    apiKeyModal.querySelector('p').innerHTML = t.apiKeyModalDescription;
    apiKeyInput.placeholder = t.apiKeyModalInputPlaceholder;
    saveApiKeyButton.textContent = t.apiKeyModalSaveButton;
    closeApiKeyModalButton.setAttribute('aria-label', t.apiKeyModalCloseButtonAriaLabel);

    checkRateLimitsAndToggleButtonState();
  }

  function initializeLanguage() {
    const savedLang = localStorage.getItem('language');
    const browserLang = navigator.language.split('-')[0];
    const langToApply = savedLang || (supportedLanguages.includes(browserLang) ? browserLang : supportedLanguages[0]);
    languageIndicator.textContent = langToApply.toUpperCase();
    setLanguage(langToApply);
  }
  /**
   * Lấy tên đầy đủ của ngôn ngữ hiện tại.
   * @returns {string} Tên đầy đủ của ngôn ngữ.
   */
  function getCurrentFullLanguageName() {
    if (translations[currentLanguage] && translations[currentLanguage].fullLanguageName) {
      return translations[currentLanguage].fullLanguageName;
    }
    return currentLanguage;
  }

  /**
   * Tính toán và trả về timestamp của thời điểm 00:00:00 ngày tiếp theo.
   * Được sử dụng để xác định thời điểm reset giới hạn tin nhắn hàng ngày.
   *
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
   * Tải thông tin giới hạn tin nhắn đã lưu từ localStorage.
   * Tải thông tin giới hạn tin nhắn từ localStorage.
   */
  function loadMessageLimits() {
    const storedLimits = localStorage.getItem('messageLimits');
    if (storedLimits) messageLimits = JSON.parse(storedLimits);
  }

  /**
   * Hiển thị modal cho phép người dùng nhập API key.
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
   * Ẩn modal nhập API key.
   */
  function hideApiKeyModal() {
    if (apiKeyModal.style.display === 'none') return;
    apiKeyModal.style.display = 'none';
    apiKeyModal.style.pointerEvents = 'none';
    document.removeEventListener('keydown', handleModalEscapeKey);
  }

  /**
   * Xử lý sự kiện nhấn phím Escape khi modal đang hiển thị để đóng modal.
   * Xử lý sự kiện nhấn phím Escape để đóng modal.
   * @param {KeyboardEvent} event - Đối tượng sự kiện bàn phím.
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
   * @param {string} messageKey - Khóa của chuỗi dịch thông báo lỗi.
   * @param {Object.<string, string|number>} [params={}] - Các tham số để thay thế trong chuỗi dịch (ví dụ: {maxChars: 200}).
   */
  function showInputError(messageKey, params = {}) {
    let translatedMessage = translations[currentLanguage][messageKey] || messageKey;
    for (const key in params) {
      translatedMessage = translatedMessage.replace(`{${key}}`, params[key]);
    }
    inputErrorMessage.textContent = translatedMessage;
    inputErrorMessage.style.display = 'block';
    chatInputWrapper.classList.add('chat-input-wrapper-error');
  }

  /**
   * Xóa thông báo lỗi đang hiển thị dưới ô nhập liệu.
   * Xóa thông báo lỗi dưới ô nhập liệu.
   */
  function clearInputError() {
    inputErrorMessage.textContent = '';
    inputErrorMessage.style.display = 'none';
    chatInputWrapper.classList.remove('chat-input-wrapper-error');
  }

  /**
   * Kiểm tra các giới hạn gửi tin nhắn (theo phút và theo ngày),
   * kiểm tra độ dài văn bản nhập vào và cập nhật trạng thái của nút gửi cũng như ô nhập liệu.
   * Kiểm tra giới hạn tin nhắn, độ dài văn bản và trạng thái của nút gửi/ô nhập liệu.
   */
  function checkRateLimitsAndToggleButtonState() {
    const currentTime = Date.now();
    const currentLength = chatInput.value.length;

    charCounter.textContent = currentLength.toString();


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

    sendButton.disabled = isInputEmpty || isRateLimited || !currentApiKey;
    chatInput.disabled = isRateLimited || !currentApiKey;


    if (!currentApiKey) {
      showInputError("inputErrorApiKey");
    } else if (isRateLimited) {
      showInputError("inputErrorRateLimit");
    } else {
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
   * Xử lý sự kiện khi người dùng nhấn nút "Copy" trên một khối mã.
   * Xử lý sự kiện sao chép mã từ một khối mã.
   */
  function handleCopyCode(event, codeElement, buttonElement) {
    event.stopPropagation();
    const codeToCopy = codeElement.innerText;
    navigator.clipboard.writeText(codeToCopy).then(() => {
      buttonElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>${translations[currentLanguage].copyButtonCopiedText}</span>`;
      setTimeout(() => {
        buttonElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>${translations[currentLanguage].copyButtonText}</span>`;
      }, 2000);
    }).catch(err => {
      console.error('Không thể sao chép: ', err);
      buttonElement.innerText = translations[currentLanguage].copyButtonErrorText;
      alert(`${translations[currentLanguage].copyButtonErrorText}: ${err.message}`);
    });
  }

  /**
   * Tự động thêm nút "Copy" vào tất cả các khối mã (`<pre><code>`) trong một container được chỉ định.
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
      copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>${translations[currentLanguage].copyButtonText}</span>`;
      preElement.appendChild(copyButton);

      copyButton.addEventListener('click', (e) => handleCopyCode(e, codeElement, copyButton));
    });
  }

  /**
   * Thêm một tin nhắn mới vào giao diện chat.
   * Thêm tin nhắn vào giao diện chat.
   * @param {string} messageOrKey - Nội dung tin nhắn hoặc khóa của chuỗi dịch (nếu là tin nhắn từ AI).
   * @param {'user' | 'ai'} sender - Người gửi tin nhắn ('user' hoặc 'ai').
   * @param {Object.<string, string|number>} [params={}] - Các tham số để thay thế nếu messageOrKey là một khóa dịch.
   */
  function addMessage(messageOrKey, sender, params = {}) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message-bubble', `${sender}-message`);

    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('message-content');

    let messageText = messageOrKey;
    if (sender === 'ai' && translations[currentLanguage][messageOrKey]) {
      messageText = translations[currentLanguage][messageOrKey];
    }

    if (sender === 'user') {
      contentWrapper.textContent = messageText;
    } else {
      contentWrapper.innerHTML = marked.parse(messageText);
      addCopyButtons(contentWrapper);
    }

    messageElement.appendChild(contentWrapper);
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  /**
   * Gửi yêu cầu đến API của Google AI để nhận phản hồi dựa trên prompt từ người dùng.
   * Gửi yêu cầu đến API của Google AI và xử lý phản hồi.
   * @param {string} prompt - Nội dung prompt (tin nhắn của người dùng) để gửi đến AI.
   * @param {string} userPromptContent - Nội dung prompt (tin nhắn của người dùng) để gửi đến AI.
   */
  async function getAIResponse(userPromptContent) {
    if (!currentApiKey) {
      addMessage("inputErrorApiKey", 'ai');
      showApiKeyModal();
      return;
    }
    showPingOverlay();
    sendButton.disabled = true;

    const fullLanguageName = getCurrentFullLanguageName();
    const completePromptText = userPromptContent + SUB_PROMPT + fullLanguageName;

    try {

      if (!GoogleGenAI) {
        console.error("Lỗi: GoogleGenAI SDK chưa được tải hoặc không hợp lệ.");
        addMessage("errorAIGeneric", 'ai', { errorMessage: "Thư viện AI chưa sẵn sàng." });
        hidePingOverlay();
        return;
      }


      const genAI = new GoogleGenAI({ apiKey: currentApiKey });

      const countResponse = await genAI.models.countTokens({
        model: AI_MODEL_NAME,
        contents: completePromptText,
      });
      const { totalTokens } = countResponse;

      if (totalTokens > (MAX_REQUEST_TOKENS / 2)) {
        hidePingOverlay();
        addMessage("inputErrorTooLongTokens", 'ai', { maxTokens: (MAX_REQUEST_TOKENS / 2), currentTokens: totalTokens });
        checkRateLimitsAndToggleButtonState();
        return;
      }

      console.log(totalTokens);


      const response = await fetch(`${API_ENDPOINT_BASE}${AI_MODEL_NAME}:generateContent?key=${currentApiKey}`, {
        method: 'POST',
        signal: AbortSignal.timeout(30000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: completePromptText }] }],
          generationConfig: {
            maxOutputTokens: MAX_REQUEST_TOKENS - totalTokens,
            temperature: 0.7,
          }
        })
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
        addMessage("errorAINoContent", 'ai');
      }
    } catch (error) {
      console.error('Lỗi API:', error);
      const errorMessageKey = "errorAIGeneric";
      addMessage(`**${translations[currentLanguage][errorMessageKey].replace('{errorMessage}', error.message)}**`, 'ai');
      alert(translations[currentLanguage][errorMessageKey].replace('{errorMessage}', error.message));
    } finally {
      hidePingOverlay();
      checkRateLimitsAndToggleButtonState();
    }
  }

  /**
   * Gửi một yêu cầu "ping" ban đầu đến AI để khởi động hoặc kiểm tra.
   * Yêu cầu này không hiển thị trực tiếp trên giao diện chat của người dùng nhưng có thể hiển thị lớp phủ "Đang kết nối".
   * @param {string} langToApply - Mã ngôn ngữ sẽ được sử dụng trong prompt ping.
   */
  async function sendInitialPingToAI(langToApply) {
    if (!currentApiKey) {
      console.warn("Không thể gửi ping ban đầu: API Key chưa được cung cấp.");
      return;
    }

    const fullLanguageName = (translations[langToApply] && translations[langToApply].fullLanguageName) ? translations[langToApply].fullLanguageName : langToApply;
    const initialPrompt = PING_PROMPT + fullLanguageName;
    showPingOverlay();

    try {
      const response = await fetch(`${API_ENDPOINT_BASE}${AI_MODEL_NAME}:generateContent?key=${currentApiKey}`, {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: initialPrompt }] }] })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Không thể phân tích phản hồi lỗi từ API ping.' } }));
        console.warn(`Lỗi khi gửi ping đến AI: ${errorData?.error?.message || response.status}`);
        return;
      }

    } catch (error) {
      console.warn(`Lỗi khi gửi ping đến AI: ${error.message}`);
    } finally {
      hidePingOverlay();
    }
  }



  /**
   * Xử lý hành động khi người dùng gửi tin nhắn.
   * Xử lý hành động gửi tin nhắn từ người dùng.
   */
  function handleSendMessage() {
    const message = chatInput.value.trim();

    if (!message) {
      showInputError("inputErrorEmpty");
      return;
    }
    if (sendButton.disabled) return;

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
   * Xử lý hành động khi người dùng lưu API key từ modal.
   * Xử lý hành động lưu API key do người dùng nhập.
   */
  function handleSaveApiKey() {
    const key = apiKeyInput.value.trim();

    if (key && key !== "null" && key !== "undefined") {
      localStorage.setItem('googleApiKey', key);
      currentApiKey = key;
      hideApiKeyModal();
      clearInputError();
      addMessage("apiKeySavedMessage", 'ai');
      apiKeyInput.value = '';
    } else {
      alert(translations[currentLanguage].apiKeyInvalidMessage);
    }
    checkRateLimitsAndToggleButtonState();
  }

  /**
   * Khởi tạo và kiểm tra API key khi trang được tải lần đầu.
   * Khởi tạo và kiểm tra API key khi trang được tải lần đầu.
   */
  function initializeApiKey() {
    const storedApiKey = localStorage.getItem('googleApiKey');
    const trimmedKey = storedApiKey ? storedApiKey.trim() : null;

    if (trimmedKey && trimmedKey !== "null" && trimmedKey !== "undefined") {
      currentApiKey = trimmedKey;
      addMessage("welcomeMessageWithKey", 'ai');
    } else {
      currentApiKey = null;
      if (storedApiKey) {
        localStorage.removeItem('googleApiKey');
      }
      addMessage("welcomeMessageNoKey", 'ai');
      showApiKeyModal();
    }
    checkRateLimitsAndToggleButtonState();
  }

  /**
   * Tự động điều chỉnh chiều cao của ô nhập liệu chat (`textarea`) dựa trên nội dung của nó,
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

  languageToggleButton.addEventListener('click', () => {
    const currentIndex = supportedLanguages.indexOf(currentLanguage);
    const nextIndex = (currentIndex + 1) % supportedLanguages.length;
    setLanguage(supportedLanguages[nextIndex]);
  });

  showApiKeyModalButton.addEventListener('click', showApiKeyModal);


  apiKeyModal.addEventListener('click', (event) => {
    if (event.target === apiKeyModal) {
      hideApiKeyModal();
    }
  });

  initializeApiKey();
  initializeTheme();
  loadMessageLimits();
  initializeLanguage();
  sendInitialPingToAI(currentLanguage);
});
