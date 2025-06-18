import { GoogleGenAI } from 'https://cdn.jsdelivr.net/npm/@google/genai@1.5.1/+esm';
import state from './state.js';
import { API_ENDPOINT_BASE, AI_MODEL_NAME, SUB_PROMPT, PING_PROMPT, MAX_REQUEST_TOKENS, TRANSLATIONS } from './config.js';
import { addMessage, showApiKeyModal, checkRateLimitsAndToggleButtonState, showTypingIndicator, removeTypingIndicator } from './ui.js';
/**
 * Lấy tên đầy đủ của ngôn ngữ hiện tại dựa trên mã ngôn ngữ.
 * @returns {string} Tên đầy đủ của ngôn ngữ hiện tại.
 */
function getCurrentFullLanguageName() {
    return TRANSLATIONS[state.currentLanguage]?.fullLanguageName || state.currentLanguage;
}
/**
 * Gửi yêu cầu đến API của AI và hiển thị phản hồi.
 * @async
 * @param {string} userPromptContent - Nội dung prompt từ người dùng.
 */

export async function getAIResponse(userPromptContent) {
    if (!state.currentApiKey) {
        addMessage("inputErrorApiKey", 'ai');
        showApiKeyModal();
        return;
    }

    state.isApiCallInProgress = true;
    showTypingIndicator();
    checkRateLimitsAndToggleButtonState();

    const fullLanguageName = getCurrentFullLanguageName();
    const completePromptText = userPromptContent + SUB_PROMPT + fullLanguageName;

    try {
        const genAI = new GoogleGenAI({ apiKey: state.currentApiKey });
        const countResponse = await genAI.models.countTokens({ model: AI_MODEL_NAME, contents: completePromptText });
        const { totalTokens } = countResponse;

        if (totalTokens > (MAX_REQUEST_TOKENS / 2)) {
            addMessage("inputErrorTooLongTokens", 'ai', { maxTokens: (MAX_REQUEST_TOKENS / 2), currentTokens: totalTokens });
            return;
        }

        const response = await fetch(`${API_ENDPOINT_BASE}${AI_MODEL_NAME}:generateContent?key=${state.currentApiKey}`, {
            method: 'POST',
            signal: AbortSignal.timeout(30000),
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: completePromptText }] }],
                generationConfig: { maxOutputTokens: MAX_REQUEST_TOKENS - totalTokens, temperature: 0.7 }
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
        addMessage(`**${TRANSLATIONS[state.currentLanguage].errorAIGeneric.replace('{errorMessage}', error.message)}**`, 'ai');
        alert(TRANSLATIONS[state.currentLanguage].errorAIGeneric.replace('{errorMessage}', error.message));
    } finally {
        state.isApiCallInProgress = false;
        removeTypingIndicator();
        checkRateLimitsAndToggleButtonState();
    }
}

/**
 * Gửi một yêu cầu "ping" ban đầu đến AI để khởi động hoặc kiểm tra kết nối.
 * @async
 */
export async function sendInitialPingToAI() {
    if (!state.currentApiKey || state.isApiCallInProgress) return;

    state.isApiCallInProgress = true;
    const fullLanguageName = getCurrentFullLanguageName();
    const initialPrompt = PING_PROMPT + fullLanguageName;

    try {
        await fetch(`${API_ENDPOINT_BASE}${AI_MODEL_NAME}:generateContent?key=${state.currentApiKey}`, {
            method: 'POST',
            signal: AbortSignal.timeout(15000),
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: initialPrompt }] }] })
        });
    } catch (error) {
        console.warn(`Lỗi khi gửi ping đến AI: ${error.message}`);
    } finally {
        state.isApiCallInProgress = false;
    }
}