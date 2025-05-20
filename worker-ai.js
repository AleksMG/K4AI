// worker-ai.js
class K4AIWorker {
    constructor() {
        this.alphabet = 'ZXWVUQNMLJIHGFEDCBASOTPYRK';
        this.charMap = new Uint8Array(256);
        this.charMap.fill(255);
        for (let i = 0; i < this.alphabet.length; i++) {
            this.charMap[this.alphabet.charCodeAt(i)] = i;
        }

        // Kryptos K4 specific settings
        this.targetPatterns = ['BERLIN', 'CLOCK', 'EAST', 'NORTH', 'WEST', 'SOUTH'];
        this.expectedWords = ['TEMPLE', 'NORTHEAST', 'LATITUDE', 'LONGITUDE'];
        
        // AI settings
        this.strategy = 'hybrid';
        this.keysTested = 0;
        this.lastReport = 0;
        
        self.onmessage = (e) => this.handleMessage(e.data);
    }

    handleMessage(msg) {
        switch (msg.type) {
            case 'init':
                this.ciphertext = msg.ciphertext.toUpperCase();
                this.keyLength = msg.keyLength;
                this.workerId = msg.workerId;
                this.totalWorkers = msg.totalWorkers;
                break;
                
            case 'start':
                this.running = true;
                this.run();
                break;
                
            case 'stop':
                this.running = false;
                break;
        }
    }

    async run() {
        while (this.running) {
            const key = this.generateSmartKey();
            const plaintext = this.decrypt(key);
            const score = this.scoreText(plaintext);
            this.keysTested++;
            
            if (score > 200) {
                self.postMessage({
                    type: 'result',
                    key: key,
                    plaintext: plaintext,
                    score: score
                });
            }
            
            // Report progress every 1000 keys
            if (this.keysTested - this.lastReport >= 1000) {
                self.postMessage({
                    type: 'progress',
                    keysTested: 1000
                });
                this.lastReport = this.keysTested;
            }
            
            // Yield to prevent blocking
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    generateSmartKey() {
        // Hybrid approach combining multiple methods
        if (Math.random() < 0.6) {
            return this.generateByPattern();
        } else if (Math.random() < 0.8) {
            return this.generateByFrequency();
        } else {
            return this.generateByMarkov();
        }
    }

    generateByFrequency() {
        const freqOrder = 'ETAOINSHRDLCUMWFGYPBVKJXQZ';
        let key = '';
        
        for (let i = 0; i < this.keyLength; i++) {
            if (Math.random() < 0.7) {
                key += freqOrder[Math.floor(Math.random() * 10)];
            } else {
                key += this.alphabet[Math.floor(Math.random() * 26)];
            }
        }
        
        return key;
    }

    generateByPattern() {
        // Try to incorporate known Kryptos patterns
        const patterns = this.targetPatterns.filter(p => p.length <= this.keyLength);
        if (patterns.length === 0) return this.generateRandomKey();
        
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        const pos = Math.floor(Math.random() * (this.keyLength - pattern.length + 1));
        
        let key = this.generateRandomKey();
        return key.substring(0, pos) + pattern + key.substring(pos + pattern.length);
    }

    generateByMarkov() {
        // Simple Markov chain for English-like keys
        const transitions = {
            '':  ['E', 'T', 'A', 'O', 'I', 'N', 'S', 'H', 'R', 'D', 'L', 'C', 'U'],
            'E': ['A', 'D', 'E', 'F', 'I', 'L', 'N', 'O', 'R', 'S', 'T', 'V'],
            'T': ['A', 'E', 'H', 'I', 'O', 'R', 'U', 'Y']
        };
        
        let key = '';
        let prev = '';
        
        for (let i = 0; i < this.keyLength; i++) {
            const options = transitions[prev] || this.alphabet;
            const next = options[Math.floor(Math.random() * options.length)];
            key += next;
            prev = next;
        }
        
        return key;
    }

    generateRandomKey() {
        let key = '';
        for (let i = 0; i < this.keyLength; i++) {
            key += this.alphabet[Math.floor(Math.random() * 26)];
        }
        return key;
    }

    decrypt(key) {
        let plaintext = '';
        for (let i = 0; i < this.ciphertext.length; i++) {
            const cipherChar = this.ciphertext.charCodeAt(i);
            const keyChar = key.charCodeAt(i % this.keyLength);
            
            const plainPos = (this.charMap[cipherChar] - this.charMap[keyChar] + 26) % 26;
            plaintext += this.alphabet[plainPos];
        }
        return plaintext;
    }

    scoreText(text) {
        // 1. Check for exact matches with target patterns
        for (const pattern of this.targetPatterns) {
            if (text.includes(pattern)) {
                return pattern.length * 100;
            }
        }
        
        // 2. Check for expected words
        for (const word of this.expectedWords) {
            if (text.includes(word)) {
                return word.length * 80;
            }
        }
        
        // 3. Frequency analysis
        let freqScore = 0;
        const freqMap = {};
        for (const char of text) {
            freqMap[char] = (freqMap[char] || 0) + 1;
        }
        
        // Compare to English letter frequencies
        const englishFreq = [
            ['E', 12.7], ['T', 9.1], ['A', 8.2], ['O', 7.5], ['I', 7.0],
            ['N', 6.7], ['S', 6.3], ['H', 6.1], ['R', 6.0], ['D', 4.3]
        ];
        
        for (const [char, freq] of englishFreq) {
            const actualFreq = (freqMap[char] || 0) / text.length * 100;
            freqScore += Math.max(0, 10 - Math.abs(actualFreq - freq));
        }
        
        // 4. Word boundaries (spaces would be ideal, but Kryptos has none)
        const wordLike = text.match(/[AEIOU]{1,3}|[BCDFGHJKLMNPQRSTVWXYZ]{1,5}/g);
        if (wordLike) {
            freqScore += wordLike.length * 2;
        }
        
        return freqScore;
    }
}

new K4AIWorker();
