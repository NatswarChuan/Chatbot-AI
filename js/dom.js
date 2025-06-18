/**
 * @fileoverview Tập hợp các tham chiếu đến các phần tử DOM quan trọng trong ứng dụng.
 */

/** @type {HTMLTextAreaElement} Phần tử textarea nhập liệu chat. */
export const chatInput = document.getElementById('chatInput');
/** @type {HTMLButtonElement} Nút gửi tin nhắn. */
export const sendButton = document.getElementById('sendButton');
/** @type {HTMLButtonElement} Nút ngừng tạo phản hồi. */
export const stopGeneratingButton = document.getElementById('stopGeneratingButton');
/** @type {HTMLDivElement} Vùng hiển thị các tin nhắn chat. */
export const chatMessages = document.getElementById('chatMessages');
/** @type {HTMLDivElement} Modal nhập API key. */
export const apiKeyModal = document.getElementById('apiKeyModal');
/** @type {HTMLInputElement} Trường nhập API key. */
export const apiKeyInput = document.getElementById('apiKeyInput');
/** @type {HTMLDivElement} Wrapper cho ô nhập liệu chat, dùng để hiển thị lỗi. */
export const chatInputWrapper = document.getElementById('chatInputWrapper');
/** @type {HTMLDivElement} Phần tử hiển thị thông báo lỗi cho ô nhập liệu. */
export const inputErrorMessage = document.getElementById('inputErrorMessage');
/** @type {HTMLSpanElement} Phần tử hiển thị bộ đếm ký tự. */
export const charCounter = document.getElementById('charCounter');
/** @type {HTMLButtonElement} Nút lưu API key trong modal. */
export const saveApiKeyButton = document.getElementById('saveApiKeyButton');
/** @type {HTMLButtonElement} Nút đóng modal API key. */
export const closeApiKeyModalButton = document.getElementById('closeApiKeyModalButton');
/** @type {HTMLHeadingElement} Tiêu đề của khung chat. */
export const chatHeaderTitle = document.querySelector('.chat-header h1');
/** @type {HTMLButtonElement} Nút mở menu cài đặt. */
export const settingsMenuButton = document.getElementById('settingsMenuButton');
/** @type {HTMLDivElement} Menu dropdown cài đặt. */
export const settingsDropdown = document.getElementById('settingsDropdown');
/** @type {HTMLButtonElement} Nút chuyển đổi giao diện trong menu. */
export const menuThemeToggle = document.getElementById('menuThemeToggle');
/** @type {HTMLButtonElement} Nút mở modal API key từ menu. */
export const menuApiKey = document.getElementById('menuApiKey');
/** @type {HTMLButtonElement} Nút chuyển đổi ngôn ngữ trong menu. */
export const menuLanguageToggle = document.getElementById('menuLanguageToggle');
/** @type {HTMLSpanElement} Chỉ báo ngôn ngữ hiện tại trong menu. */
export const menuLanguageIndicator = document.getElementById('menuLanguageIndicator');
/** @type {HTMLElement} Icon giao diện sáng trong menu. */
export const menuThemeIconLight = document.getElementById('menuThemeIconLight');
/** @type {HTMLElement} Icon giao diện tối trong menu. */
export const menuThemeIconDark = document.getElementById('menuThemeIconDark');