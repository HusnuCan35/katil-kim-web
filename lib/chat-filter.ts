
// Basic Turkish Profanity Blocklist
const PROFINITY_LIST = [
    'amk', 'aq', 'oç', 'piç', 'yavşak', 'sik', 'siktir', 'yarrak', 'kaşar', 'orospu',
    'göt', 'ibne', 'mal', 'salak', 'gerizekalı', 'aptal', 'amcık', 'ananı', 'bacını',
    'sikerim', 'sokarım', 'kayarım', 'zurna', 'dalyarak', 'taşşak'
];

interface ValidationResult {
    isValid: boolean;
    error?: string;
}

export const validateMessage = (text: string, lastMessageContext?: { content: string; timestamp: number }): ValidationResult => {
    const lowerText = text.toLowerCase();

    // 1. Link Detection
    // Matches common variations of URLs: http, https, www, .com, .net, etc.
    const urlPattern = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9]+\.(com|net|org|io|gov|edu|tr))/i;
    if (urlPattern.test(lowerText)) {
        return { isValid: false, error: 'Link paylaşmak yasaktır.' };
    }

    // 2. Profanity Check
    // Check if any word in the text matches a bad word
    // We split by spaces and punctuation to find whole words, but also check substrings for some short intense ones
    const words = lowerText.split(/[\s,!.?]+/);
    const containsBadWord = words.some(word => PROFINITY_LIST.includes(word));

    // Also check for aggressive embedded patterns (simple check)
    // For safer checking, we rely mainly on word boundaries to avoid Scunthorpe problem, 
    // but strict keywords like 'amk' are almost always bad in this context.
    const strictBadWords = ['amk', 'aq', 'oç', 'piç', 'sik'];
    const containsStrictBadWord = strictBadWords.some(bad => lowerText.includes(bad));

    if (containsBadWord || containsStrictBadWord) {
        return { isValid: false, error: 'Mesajınız uygunsuz içerik barındırıyor.' };
    }

    // 3. Spam Detection
    // a. Repetitive characters (e.g., "saaaaaalk", "hahahahahaha" is roughly ok but "aaaaaaaa" is annoyance)
    // Matches 5 or more identical consecutive characters
    if (/(.)\1{4,}/.test(lowerText)) {
        return { isValid: false, error: 'Lütfen spam yapmayın (tekrarlayan karakterler).' };
    }

    // b. Repetitive Messages (Flooding)
    if (lastMessageContext) {
        const timeDiff = Date.now() - lastMessageContext.timestamp;
        const isIdentical = lastMessageContext.content === text;

        // Prevent identical messages sent within 5 seconds
        if (isIdentical && timeDiff < 5000) {
            return { isValid: false, error: 'Aynı mesajı tekrar tekrar göndermeyin.' };
        }
    }

    return { isValid: true };
};
