class KryptosWorker {
    constructor() {
        // Инициализация алфавита
        this.alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        this.charMap = new Uint8Array(256).fill(255);
        for (let i = 0; i < this.alphabet.length; i++) {
            this.charMap[this.alphabet.charCodeAt(i)] = i;
        }
        
        // Настройки производительности
        this.BATCH_SIZE = 25000;
        this.MIN_SCORE = 150;
        
        // Частотная таблица английского языка
        this.freqTable = new Uint8Array(26);
        const freqOrder = 'ETAOINSHRDLCUMWFGYPBVKJXQZ';
        for (let i = 0; i < freqOrder.length; i++) {
            this.freqTable[freqOrder.charCodeAt(i) - 65] = 10 - Math.min(i, 10);
        }
        
        // Обработчик сообщений
        self.onmessage = (e) => {
            const msg = e.data;
            if (msg.type === 'init') this.init(msg);
            if (msg.type === 'start') this.start();
            if (msg.type === 'stop') this.stop();
        };
    }
    
    init(msg) {
        this.ciphertext = msg.ciphertext;
        this.keyLength = msg.keyLength;
        this.workerId = msg.workerId;
        
        // Преобразование ciphertext в числовые коды
        this.cipherCodes = new Uint8Array(this.ciphertext.length);
        for (let i = 0; i < this.ciphertext.length; i++) {
            this.cipherCodes[i] = this.charMap[this.ciphertext.charCodeAt(i)];
        }
    }
    
    start() {
        this.running = true;
        this.processBatches();
    }
    
    stop() {
        this.running = false;
    }
    
    async processBatches() {
        while (this.running) {
            const batchStart = performance.now();
            let bestKey = null;
            let bestScore = 0;
            let bestText = '';
            
            // Обработка батча
            for (let i = 0; i < this.BATCH_SIZE; i++) {
                const key = this.generateKey();
                const [text, score] = this.processKey(key);
                
                if (score > bestScore) {
                    bestScore = score;
                    bestKey = key;
                    bestText = text;
                }
            }
            
            // Отправка результатов
            if (bestScore >= this.MIN_SCORE) {
                self.postMessage({
                    type: 'result',
                    key: bestKey,
                    plaintext: bestText,
                    score: bestScore
                });
            }
            
            // Отчет о прогрессе
            self.postMessage({
                type: 'progress',
                keysTested: this.BATCH_SIZE
            });
            
            // Даем браузеру перерыв
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    
    generateKey() {
        const key = new Uint8Array(this.keyLength);
        for (let i = 0; i < this.keyLength; i++) {
            key[i] = Math.floor(Math.random() * 26);
        }
        return key;
    }
    
    processKey(key) {
        let text = '';
        let score = 0;
        
        // Дешифровка и оценка
        for (let i = 0; i < Math.min(32, this.cipherCodes.length); i++) {
            const p = (this.cipherCodes[i] - key[i % this.keyLength] + 26) % 26;
            text += this.alphabet[p];
            score += this.freqTable[p];
        }
        
        // Полная дешифровка только для хороших ключей
        if (score > 50) {
            text = '';
            for (let i = 0; i < this.cipherCodes.length; i++) {
                const p = (this.cipherCodes[i] - key[i % this.keyLength] + 26) % 26;
                text += this.alphabet[p];
            }
            
            // Проверка важных паттернов
            if (text.includes('BERLIN')) score += 100;
            if (text.includes('CLOCK')) score += 80;
        }
        
        return [text, score];
    }
}

new KryptosWorker();
