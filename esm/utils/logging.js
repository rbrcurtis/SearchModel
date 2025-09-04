const RESET = '\x1b[0m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
function getCentralTime() {
    const now = new Date();
    const centralTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(now);
    return centralTime.replace(',', '');
}
function getDebugTags() {
    const tags = process.env.DEBUG_TAGS || '';
    return new Set(tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0));
}
export function log(message, ...args) {
    if (process.env.TESTING === 'true') {
        debug('test', message, ...args);
        return;
    }
    const timestamp = getCentralTime();
    console.log(`[${timestamp}] ${message}`, ...args);
}
export function logError(message, ...args) {
    const timestamp = getCentralTime();
    const hasError = args.some((arg) => arg instanceof Error);
    console.error(`[${timestamp}] ${message}`, ...args);
    if (!hasError) {
        const trace = new Error('trace');
        console.error(trace.stack);
    }
}
export function logWarn(message, ...args) {
    const timestamp = getCentralTime();
    console.log(`[${timestamp}] ${YELLOW}${message}${RESET}`, ...args);
}
export function debug(tags, message, ...args) {
    const debugTags = getDebugTags();
    if (debugTags.size === 0) {
        return;
    }
    if (debugTags.has('*')) {
        const timestamp = getCentralTime();
        console.log(`[${timestamp}] ${CYAN}${message}${RESET}`, ...args);
        return;
    }
    const tagArray = Array.isArray(tags) ? tags : [tags];
    const shouldLog = tagArray.some((tag) => debugTags.has(tag));
    if (shouldLog) {
        const timestamp = getCentralTime();
        console.log(`[${timestamp}] ${CYAN}${message}${RESET}`, ...args);
    }
}
//# sourceMappingURL=logging.js.map