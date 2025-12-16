
export const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Turkish female name endings and common names for gender detection
const femaleNamePatterns = ['a', 'e', 'ı', 'i', 'ay', 'gül', 'nur', 'han', 'can', 'su', 'yıldız'];
const commonFemaleNames = ['ayşe', 'fatma', 'emine', 'hatice', 'zeynep', 'elif', 'meryem', 'şerife', 'zehra', 'sultan', 'hanife', 'merve', 'melek', 'özlem', 'seda', 'esra', 'gizem', 'büşra', 'betül', 'yasemin', 'sevgi', 'derya', 'deniz', 'leyla', 'selin', 'ceren', 'burcu', 'pınar', 'ebru', 'ece', 'defne', 'ada', 'aylin', 'beren', 'cansu', 'dilara', 'gamze', 'ilayda', 'kübra', 'melis', 'naz', 'nehir', 'oya', 'elif', 'sera', 'tuğba', 'yağmur', 'zara', 'aslı', 'mine', 'cemre', 'dila', 'ezgi', 'fulya', 'gonca', 'hande', 'irmak', 'jale', 'lale', 'meltem', 'nisan', 'rana', 'sinem', 'tuba', 'umay', 'vildan'];
const commonMaleNames = ['mehmet', 'mustafa', 'ahmet', 'ali', 'hüseyin', 'hasan', 'ibrahim', 'ismail', 'osman', 'yusuf', 'ömer', 'murat', 'mahmut', 'halil', 'süleyman', 'abdullah', 'recep', 'ramazan', 'salih', 'kemal', 'kadir', 'bekir', 'emre', 'burak', 'can', 'cem', 'deniz', 'efe', 'eren', 'furkan', 'gökhan', 'kaan', 'onur', 'serkan', 'tolga', 'umut', 'yiğit', 'baran', 'arda', 'berkay', 'bora', 'cihan', 'doğan', 'ender', 'ferhat', 'gürkan', 'ilker', 'koray', 'levent', 'mert', 'oğuz', 'polat', 'selim', 'taner', 'uğur', 'volkan', 'yasin', 'zafer', 'atilla', 'barış', 'cemal', 'doruk', 'engin', 'fikret', 'galip', 'hamza', 'ilhan', 'kerem', 'metin', 'necati', 'oktay', 'rıza', 'sinan', 'tarık', 'vedat', 'yavuz', 'zeki'];

export const detectGender = (name: string): 'male' | 'female' => {
    const firstName = name.split(' ')[0].toLowerCase().replace(/[ığüşöç]/g, c =>
        ({ 'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c' }[c] || c)
    );
    const normalizedName = name.split(' ')[0].toLowerCase();

    if (commonFemaleNames.includes(normalizedName)) return 'female';
    if (commonMaleNames.includes(normalizedName)) return 'male';

    // Check name endings as fallback
    for (const pattern of femaleNamePatterns) {
        if (normalizedName.endsWith(pattern)) return 'female';
    }

    return 'male'; // Default to male if uncertain
};

export const getCharacterPhoto = (suspectId: string, suspectName: string, index: number): string => {
    const gender = detectGender(suspectName);
    // Use index (1-5) with gender suffix
    const photoIndex = (index % 5) + 1;
    const suffix = gender === 'female' ? 'f' : 'm';
    return `/suspects/${photoIndex}${suffix}.png`;
};
