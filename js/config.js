/**
 * @fileoverview Chứa các hằng số cấu hình cho ứng dụng chatbot.
 */

/** @const {string} URL cơ sở cho API của Google Generative Language. */
export const API_ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';

/** @const {string} Tên model AI được sử dụng. */
export const AI_MODEL_NAME = 'gemma-3n-e4b-it';

/** @const {string} Phần prompt phụ được thêm vào cuối mỗi yêu cầu của người dùng để hướng dẫn AI về ngôn ngữ trả lời. */
export const SUB_PROMPT = `\n***LƯU Ý QUAN TRỌNG***: Chỉ trả lời bằng ngôn ngữ `;

/** @const {string} Prompt được sử dụng để "ping" AI, đảm bảo AI nhận thức được giới hạn token. */
export const PING_PROMPT = `Xin chào, hãy giới thiệu bản thân như một Chat Bot AI được tạo ra bởi NatswarChuan.`;

/** @const {number} Giới hạn số lượng tin nhắn người dùng có thể gửi trong một phút. */
export const MINUTE_MESSAGE_LIMIT = 30;

/** @const {number} Khoảng thời gian (tính bằng mili giây) cho giới hạn tin nhắn mỗi phút. */
export const MINUTE_TIME_WINDOW = 60 * 1000;

/** @const {number} Giới hạn số lượng tin nhắn người dùng có thể gửi trong một ngày. */
export const DAILY_MESSAGE_LIMIT = 14400;

/** @const {string[]} Danh sách các mã ngôn ngữ được hỗ trợ. */
export const SUPPORTED_LANGUAGES = ['vi', 'en'];

/**
 * @const {Object.<string, Object.<string, string>>} Đối tượng chứa các bản dịch chuỗi giao diện người dùng cho các ngôn ngữ được hỗ trợ.
 */
export const TRANSLATIONS = {
    'vi': {
      'fullLanguageName': 'tiếng Việt',
      'pageTitle': 'Chatbot AI - Trò chuyện và Hỏi đáp',
      'chatTitle': 'Chatbot AI',
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
      'errorAIGeneric': 'Đã có lỗi xảy ra: {errorMessage}',
      'errorAINoContent': 'AI không trả về nội dung.',
      'copyButtonText': 'Copy',
      'copyButtonCopiedText': 'Đã chép!',
      'copyButtonErrorText': 'Lỗi',
      'menuChangeTheme': 'Đổi giao diện',
      'menuSetApiKey': 'Nhập API Key',
      'menuLanguage': 'Ngôn ngữ:',
    },
    'en': {
      'fullLanguageName': 'English',
      'pageTitle': 'Chatbot AI - Chat and Q&A',
      'chatTitle': 'Chatbot AI',
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
      'errorAIGeneric': 'An error occurred: {errorMessage}',
      'errorAINoContent': 'AI did not return any content.',
      'copyButtonText': 'Copy',
      'copyButtonCopiedText': 'Copied!',
      'copyButtonErrorText': 'Error',
      'menuChangeTheme': 'Toggle theme',
      'menuSetApiKey': 'Set API Key',
      'menuLanguage': 'Language:',
    }
  };