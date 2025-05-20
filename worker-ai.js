export class K4CrackerWorker extends Worker {
    constructor() {
        super(URL.createObjectURL(new Blob([`(${workerFunction.toString()})()`], 
            { type: 'text/javascript' })));
    }
}

function workerFunction() {
    class K4Cracker {
        constructor() {
            this.alphabet = '';
            this.charMap = new Uint8Array(256);
            this.knownTexts = [];
            this.ciphertext = '';
            this.keyLength = 0;
            this.workerId = 0;
            this.totalWorkers = 1;
            this.startKey = 0;
            this.endKey = 0;
            this.keysTested = 0;
            this.bestScore = -Infinity;
            this.bestKey = '';
            this.bestPlaintext = '';
            
            self.onmessage = (e) => this.handleMessage(e.data);
        }
        
        handleMessage(msg) {
            switch (msg.type) {
                case 'init':
                    this.init(msg);
                    break;
                case 'start':
                    this.start();
                    break;
            }
        }
        
        init(config) {
            this.alphabet = config.alphabet;
            this.charMap.fill(255);
            for (let i = 0; i < this.alphabet.length; i++) {
                this.charMap[this.alphabet.charCodeAt(i)] = i;
            }
            
            this.knownTexts = config.knownTexts;
            this.ciphertext = config.ciphertext;
            this.keyLength = config.keyLength;
            this.workerId = config.workerId;
            this.totalWorkers = config.totalWorkers;
            this.startKey = config.startKey;
            this.endKey = config.endKey;
        }
        
        async start() {
            for (let keyNum = this.startKey; keyNum < this.endKey; keyNum++) {
                const key = this.generateKey(keyNum);
                const plaintext = this.decrypt(key);
                const score = this.evaluate(plaintext);
                this.keysTested++;
                
                if (score > this.bestScore) {
                    this.bestScore = score;
                    this.bestKey = key;
                    this.bestPlaintext = plaintext;
                    
                    self.postMessage({
                        type: 'result',
                        key,
                        plaintext,
                        score
                    });
                }
                
                if (this.keysTested % 1000 === 0) {
                    self.postMessage({
                        type: 'progress',
                        totalTested: this.keysTested,
                        bestScore: this.bestScore,
                        bestKey: this.bestKey,
                        bestPlaintext: this.bestPlaintext
                    });
                }
            }
            
            self.postMessage({ type: 'completed' });
        }
        
        generateKey(num) {
            const key = [];
            for (let i = 0; i < this.keyLength; i++) {
                key.push(this.alphabet[num % this.alphabet.length]);
                num = Math.floor(num / this.alphabet.length);
            }
            return key.join('');
        }
        
        decrypt(key) {
            let plaintext = '';
            for (let i = 0; i < this.ciphertext.length; i++) {
                const p = (this.charMap[this.ciphertext.charCodeAt(i)] - 
                          this.charMap[key.charCodeAt(i % key.length)] + 
                          this.alphabet.length) % this.alphabet.length;
                plaintext += this.alphabet[p];
            }
            return plaintext;
        }
        
        evaluate(plaintext) {
            let score = 0;
            
            // Проверка известных текстов
            for (const text of this.knownTexts) {
                if (plaintext.includes(text)) {
                    score += text.length * 100;
                }
            }
            
            // Проверка читаемости
            const englishTrigrams = ['THE', 'AND', 'ING', 'ION', 'ENT'];
            for (const trigram of englishTrigrams) {
                if (plaintext.includes(trigram)) score += 10;
            }
            
            return score;
        }
    }
    
    new K4Cracker();
}
