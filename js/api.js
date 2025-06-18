import { GoogleGenAI } from 'https://cdn.jsdelivr.net/npm/@google/genai@1.5.1/+esm';
import state from './state.js';
import { AI_MODEL_NAME, SUB_PROMPT, PING_PROMPT, TRANSLATIONS } from './config.js';
import { addMessage, showApiKeyModal, checkRateLimitsAndToggleButtonState, addCopyButtons } from './ui.js';
import * as dom from './dom.js';

/**
 * Lấy tên đầy đủ của ngôn ngữ hiện tại dựa trên mã ngôn ngữ.
 * @returns {string} Tên đầy đủ của ngôn ngữ hiện tại.
 */
function getCurrentFullLanguageName() {
    return TRANSLATIONS[state.currentLanguage]?.fullLanguageName || state.currentLanguage;
}

/**
 * Gửi yêu cầu đến API của AI và hiển thị phản hồi dưới dạng luồng.
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
    checkRateLimitsAndToggleButtonState();

    const fullLanguageName = getCurrentFullLanguageName();
    const completePromptText = userPromptContent + SUB_PROMPT + fullLanguageName;

    const aiMessageContent = addMessage("", 'ai');
    let fullResponse = "";

    try {
        const genAI = new GoogleGenAI({ apiKey: state.currentApiKey });
        
        const stream = await genAI.models.generateContentStream({
            model: AI_MODEL_NAME,
            contents: [{ role: "user", parts: [{ text: completePromptText }] }],
            generationConfig: { temperature: 0.7 }
        });

        for await (const chunk of stream) {
            const chunkText = chunk.candidates?.[0]?.content?.parts?.[0]?.text || "";
            fullResponse += chunkText;
            aiMessageContent.innerHTML = marked.parse(fullResponse);
            dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
        }
        
        addCopyButtons(aiMessageContent);
        aiMessageContent.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });

    } catch (error) {
        console.error('Lỗi API:', error);
        const errorMessage = `**${TRANSLATIONS[state.currentLanguage].errorAIGeneric.replace('{errorMessage}', error.message)}**`;
        if (fullResponse) {
             aiMessageContent.innerHTML = marked.parse(fullResponse + '\n\n' + errorMessage);
        } else {
            aiMessageContent.innerHTML = marked.parse(errorMessage);
        }
        alert(TRANSLATIONS[state.currentLanguage].errorAIGeneric.replace('{errorMessage}', error.message));
    } finally {
        state.isApiCallInProgress = false;
        checkRateLimitsAndToggleButtonState();
        dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
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
        const genAI = new GoogleGenAI({ apiKey: state.currentApiKey });
        await genAI.models.generateContent({
             model: AI_MODEL_NAME,
             contents: [{ role: "user", parts: [{ text: initialPrompt }] }]
        });
    } catch (error) {
        console.warn(`Lỗi khi gửi ping đến AI: ${error.message}`);
    } finally {
        state.isApiCallInProgress = false;
    }
}