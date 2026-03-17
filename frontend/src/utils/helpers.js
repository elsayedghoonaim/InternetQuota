/**
 * Formats a UTC date string into a human-readable "time ago" string.
 */
export function getTimeAgo(dateStr) {
    if (!dateStr) return 'Never';

    const utcDateStr = dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`;
    const date = new Date(utcDateStr);
    const now = new Date();

    const diffInSeconds = Math.max(0, Math.floor((now - date) / 1000));

    if (diffInSeconds < 60) return 'Just now';

    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
}

/**
 * Returns month name from month number (1-12).
 */
export function getMonthName(month) {
    const names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return names[month] || '';
}



/**
 * Returns a trend arrow and label comparing two values.
 */
export function getTrend(current, previous) {
    if (previous === null || previous === undefined) return { arrow: '', label: 'No prior data', color: 'text-gray-400' };
    const diff = current - previous;
    const pct = previous > 0 ? ((diff / previous) * 100).toFixed(0) : 0;
    if (diff > 0) return { arrow: '↑', label: `+${pct}%`, color: 'text-red-500' };
    if (diff < 0) return { arrow: '↓', label: `${pct}%`, color: 'text-emerald-500' };
    return { arrow: '→', label: '0%', color: 'text-gray-400' };
}
