// Scoring function - evaluates how "meaningful" a key might be
function scoreKey(key, alphabet) {
    // English letter frequency (approximate)
    const englishFreq = {
        'E': 12.7, 'T': 9.1, 'A': 8.2, 'O': 7.5, 'I': 7.0,
        'N': 6.7, 'S': 6.3, 'H': 6.1, 'R': 6.0, 'D': 4.3,
        'L': 4.0, 'C': 2.8, 'U': 2.8, 'M': 2.4, 'W': 2.4,
        'F': 2.2, 'G': 2.0, 'Y': 2.0, 'P': 1.9, 'B': 1.5,
        'V': 1.0, 'K': 0.8, 'J': 0.2, 'X': 0.2, 'Q': 0.1,
        'Z': 0.1
    };

    let score = 0;
    const keyUpper = key.toUpperCase();
    
    // Score based on letter frequency
    for (const char of keyUpper) {
        const normalizedChar = char in englishFreq ? char : char.toUpperCase();
        score += englishFreq[normalizedChar] || 0;
    }
    
    // Normalize score by key length
    score = score / key.length;
    
    // Bonus for repeating patterns (potential key repetitions)
    if (key.length >= 6) {
        const half1 = key.substring(0, Math.floor(key.length / 2));
        const half2 = key.substring(Math.floor(key.length / 2));
        if (half1 === half2) {
            score *= 1.5; // Significant boost for repeating keys
        }
    }
    
    return score;
}

function findKeyPositions(ciphertext, knownText, alphabet) {
    const positions = [];
    const n = alphabet.length;
    const knownLength = knownText.length;
    
    for (let i = 0; i <= ciphertext.length - knownLength; i++) {
        let valid = true;
        let potentialKey = '';
        
        for (let j = 0; j < knownLength; j++) {
            const cipherChar = ciphertext[i + j];
            const knownChar = knownText[j];
            
            const cipherIndex = alphabet.indexOf(cipherChar);
            const knownIndex = alphabet.indexOf(knownChar);
            
            if (cipherIndex === -1 || knownIndex === -1) {
                valid = false;
                break;
            }
            
            const keyIndex = (cipherIndex - knownIndex + n) % n;
            potentialKey += alphabet[keyIndex];
        }
        
        if (valid) {
            positions.push({
                position: i,
                key: potentialKey
            });
        }
    }
    
    return positions;
}

function analyzeCiphertext(ciphertext, knownText, alphabet, minKeyLength) {
    const n = alphabet.length;
    const knownLength = knownText.length;
    const totalPositions = ciphertext.length - knownLength + 1;
    const keyMap = new Map();
    const results = [];
    
    // Find all possible key positions
    const keyPositions = findKeyPositions(ciphertext, knownText, alphabet);
    
    // Group keys by their value
    for (const {position, key} of keyPositions) {
        if (!keyMap.has(key)) {
            keyMap.set(key, []);
        }
        keyMap.get(key).push(position);
    }
    
    // Process each unique key
    let processed = 0;
    const totalKeys = keyMap.size;
    
    for (const [key, positions] of keyMap.entries()) {
        if (key.length < minKeyLength) continue;
        
        // Calculate score for this key
        const keyScore = scoreKey(key, alphabet);
        
        // Decrypt a sample with this key
        let decryptedSample = '';
        const samplePosition = positions[0];
        const sampleLength = Math.min(20, ciphertext.length - samplePosition);
        
        for (let i = 0; i < sampleLength; i++) {
            const cipherChar = ciphertext[samplePosition + i];
            const keyChar = key[i % key.length];
            
            const cipherIndex = alphabet.indexOf(cipherChar);
            const keyIndex = alphabet.indexOf(keyChar);
            
            if (cipherIndex === -1 || keyIndex === -1) {
                decryptedSample += '?';
            } else {
                const plainIndex = (cipherIndex - keyIndex + n) % n;
                decryptedSample += alphabet[plainIndex];
            }
        }
        
        results.push({
            key,
            positions,
            decryptedSample,
            score: keyScore
        });
        
        // Update progress
        processed++;
        const progress = Math.floor((processed / totalKeys) * 100);
        self.postMessage({
            type: 'progress',
            data: progress
        });
    }
    
    // Sort results by score (highest first)
    results.sort((a, b) => b.score - a.score);
    
    return results;
}

self.onmessage = function(e) {
    const { type, ciphertext, knownText, alphabet, minKeyLength } = e.data;
    
    if (type === 'start') {
        try {
            const results = analyzeCiphertext(ciphertext, knownText, alphabet, minKeyLength);
            
            // Send results back
            for (const result of results) {
                self.postMessage({
                    type: 'result',
                    data: result
                });
            }
            
            self.postMessage({
                type: 'complete'
            });
        } catch (error) {
            self.postMessage({
                type: 'error',
                data: error.message
            });
        }
    }
};
