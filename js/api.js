import { GoogleGenAI } from 'https://cdn.jsdelivr.net/npm/@google/genai@1.5.1/+esm';
import state from './state.js';
import { AI_MODEL_NAME, SUB_PROMPT, PING_PROMPT, TRANSLATIONS } from './config.js';
import { addMessage, addThinkingBlock, showApiKeyModal, checkRateLimitsAndToggleButtonState, addCopyButtons, addCopyMessageButton } from './ui.js';
import * as dom from './dom.js';

/** @const {number} Số lượt hội thoại gần nhất gửi kèm để AI hiểu context (mỗi lượt gồm 1 user + 1 model). */
const CONTEXT_TURNS = 5;

/**
 * Lấy tên đầy đủ của ngôn ngữ hiện tại dựa trên mã ngôn ngữ.
 * @returns {string} Tên đầy đủ của ngôn ngữ hiện tại.
 */
function getCurrentFullLanguageName() {
    return TRANSLATIONS[state.currentLanguage]?.fullLanguageName || state.currentLanguage;
}

/**
 * Gửi yêu cầu đến API của AI và hiển thị phản hồi.
 * Tự động phát hiện chunk có cờ `thought: true` để hiển thị thinking block riêng biệt.
 * @async
 * @param {string} userPromptContent - Nội dung prompt từ người dùng.
 */
export async function getAIResponse(userPromptContent, showThinking = true) {
    if (!state.currentApiKey) {
        addMessage("inputErrorApiKey", 'ai');
        showApiKeyModal();
        return;
    }

    state.isApiCallInProgress = true;
    state.stopGeneration = false;
    checkRateLimitsAndToggleButtonState();

    const fullLanguageName = getCurrentFullLanguageName();
    const completePromptText = userPromptContent + SUB_PROMPT + fullLanguageName;
    const aiMessageContent = addMessage("", 'ai');
    const messageBubble = aiMessageContent.parentElement;

    // --- Xây dựng contents kèm lịch sử hội thoại (multi-turn context) ---
    // Lấy tối đa CONTEXT_TURNS lượt gần nhất (mỗi lượt = 2 phần tử: user + model)
    const historySlice = state.conversationHistory.slice(-(CONTEXT_TURNS * 2));
    const contents = [
        ...historySlice,
        { role: "user", parts: [{ text: completePromptText }] }
    ];

    // --- Thinking block setup (bỏ qua nếu showThinking = false) ---
    let thinkingController = null;
    let fullThinkingText = "";
    let hasThinkingContent = false;

    // --- Main response stream ---
    let textQueue = "";
    let fullResponseText = "";
    let streamFinished = false;
    let lastCharTypedTime = Date.now();
    const PAUSE_BEFORE_BLINK_MS = 600;
    const CURSOR_CHAR = '▋';

    function renderLoop(currentTime) {
        const chatBox = dom.chatMessages;
        const scrollThreshold = 50;
        const isScrolledToBottom = chatBox.scrollHeight - chatBox.clientHeight <= chatBox.scrollTop + scrollThreshold;
        const timeSinceLastChar = Date.now() - lastCharTypedTime;

        if (textQueue.length > 0) {
            fullResponseText += textQueue.substring(0, 1);
            textQueue = textQueue.substring(1);
            lastCharTypedTime = Date.now();
        }

        let cursorVisible = true;
        if (timeSinceLastChar > PAUSE_BEFORE_BLINK_MS) {
            const BLINK_CYCLE_MS = 1000;
            cursorVisible = (currentTime % BLINK_CYCLE_MS) < (BLINK_CYCLE_MS / 2);
        }
        const currentCursor = cursorVisible ? CURSOR_CHAR : '';
        const CURSOR_HTML = `<span class="streaming-cursor">${currentCursor}</span>`;

        try {
            let html = marked.parse(fullResponseText + CURSOR_HTML);
            aiMessageContent.innerHTML = html;
        } catch (e) {
            console.error("Lỗi khi render nội dung:", e);
        }

        if (isScrolledToBottom) {
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        if (!streamFinished || textQueue.length > 0) {
            requestAnimationFrame(renderLoop);
        } else {
            aiMessageContent.innerHTML = marked.parse(fullResponseText);
            addCopyButtons(aiMessageContent);
            if (messageBubble) {
                addCopyMessageButton(messageBubble);
            }
            aiMessageContent.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
            if (isScrolledToBottom) {
                chatBox.scrollTop = chatBox.scrollHeight;
            }
        }
    }

    requestAnimationFrame(renderLoop);

    try {
        const genAI = new GoogleGenAI({ apiKey: state.currentApiKey });
        const stream = await genAI.models.generateContentStream({
            model: AI_MODEL_NAME,
            contents,
            generationConfig: { temperature: 0.7 }
        });

        for await (const chunk of stream) {
            if (state.stopGeneration) {
                break;
            }

            const parts = chunk.candidates?.[0]?.content?.parts;
            if (!parts) continue;

            for (const part of parts) {
                const isThought = part.thought === true;
                const text = part.text || "";

                if (isThought && text) {
                    // Khởi tạo thinking block lần đầu tiên (chỉ khi showThinking = true)
                    if (showThinking && !hasThinkingContent && messageBubble) {
                        thinkingController = addThinkingBlock(messageBubble);
                        hasThinkingContent = true;
                    }
                    // Cập nhật nội dung thinking realtime
                    if (thinkingController) {
                        fullThinkingText += text;
                        thinkingController.setContent(fullThinkingText);
                        // Scroll theo nếu đang ở bottom
                        const chatBox = dom.chatMessages;
                        const isAtBottom = chatBox.scrollHeight - chatBox.clientHeight <= chatBox.scrollTop + 50;
                        if (isAtBottom) chatBox.scrollTop = chatBox.scrollHeight;
                    }
                } else if (!isThought && text) {
                    // Khi nhận chunk response thật: finalize thinking block (1 lần)
                    if (hasThinkingContent && thinkingController) {
                        thinkingController.finalize();
                        thinkingController = null; // Đánh dấu đã finalize
                    }
                    textQueue += text;
                }
            }
        }
    } catch (error) {
        console.error('Lỗi API:', error);
        textQueue += `\n\n**${TRANSLATIONS[state.currentLanguage].errorAIGeneric.replace('{errorMessage}', error.message)}**`;
        alert(TRANSLATIONS[state.currentLanguage].errorAIGeneric.replace('{errorMessage}', error.message));
    } finally {
        // Nếu AI chỉ có thinking mà không có response (hiếm), cũng finalize
        if (hasThinkingContent && thinkingController) {
            thinkingController.finalize();
        }
        // Lưu lượt hội thoại vào history (chỉ khi có response và không phải ping)
        if (showThinking && fullResponseText.trim()) {
            state.conversationHistory = [
                ...state.conversationHistory,
                { role: "user",  parts: [{ text: completePromptText }] },
                { role: "model", parts: [{ text: fullResponseText }] }
            ];
        }
        streamFinished = true;
        state.isApiCallInProgress = false;
        state.stopGeneration = false;
        checkRateLimitsAndToggleButtonState();
    }
}

/**
 * Gửi một yêu cầu "ping" ban đầu đến AI để khởi động hoặc kiểm tra kết nối.
 * @async
 */
export async function sendInitialPingToAI() {
    state.isApiCallInProgress = true;
    getAIResponse(PING_PROMPT, false); // Bỏ qua thinking block cho câu chào giới thiệu
}