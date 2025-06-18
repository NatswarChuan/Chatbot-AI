/**
 * @fileoverview Chứa các hàm tiện ích cho ứng dụng.
 */

/**
 * Lấy dấu thời gian (timestamp) cho lần reset giới hạn tin nhắn hàng ngày tiếp theo (00:00 ngày hôm sau).
 * @returns {number} Dấu thời gian Unix tính bằng mili giây.
 */
export function getNextDailyResetTimestamp() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
}