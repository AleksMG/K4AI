class AdvancedVigenereCracker {
    constructor() {
        // Оптимизированные структуры данных
        this.alphabet = 'ZXWVUQNMLJIHGFEDCBASOTPYRK';
        this.charMap = new Uint8Array(256);
        this.charMap.fill(255);
        for (let i = 0; i < this.alphabet.length; i++) {
            this.charMap[this.alphabet.charCodeAt(i)] = i;
        }

        // Статистические данные для "умного" взлома
        this.initStatisticalModels();
        
        // Параметры для адаптивного алгоритма
        this.currentStrategy = 'hybrid';
        this.learningRate = 0.1;
        this.strategyWeights = {
            pattern: 0.6,
            frequency: 0.3,
            markov: 0.1
        };
    }

    initStatisticalModels() {
        // 1. N-граммная модель английского языка (триграммы)
        this.ngrams = new Map();
        // ... загрузить частоты N-грамм (можно предрассчитать)
        
        // 2. Модель ключевых слов Kryptos
        this.kryptosPatterns = {
            exact: ['BERLIN', 'CLOCK', 'NORTHEAST'],
            partial: ['TEMP', 'LONG', 'LAT', 'WEST', 'EAST']
        };
        
        // 3. Частотный анализ по позициям в ключе
        this.positionalFreq = Array.from({length: 100}, () => new Map());
    }

    async crack(ciphertext, keyLengthRange = [8, 20]) {
        for (let keyLen = keyLengthRange[0]; keyLen <= keyLengthRange[1]; keyLen++) {
            const result = await this.crackFixedLength(ciphertext, keyLen);
            if (result.score > 500) return result;
        }
        return null;
    }

    async crackFixedLength(ciphertext, keyLength) {
        // 1. Фаза анализа - находим вероятные части ключа
        const keySegments = this.analyzeCiphertext(ciphertext, keyLength);
        
        // 2. Фаза рекомбинации - комбинируем сегменты
        let bestKey = null;
        let bestScore = 0;
        
        for (let i = 0; i < 10000; i++) {
            const key = this.recombineKey(keySegments, keyLength);
            const {plaintext, score} = this.evaluateKey(ciphertext, key);
            
            if (score > bestScore) {
                bestScore = score;
                bestKey = key;
                
                // Адаптивно меняем стратегию
                this.adjustStrategy(score);
                
                if (score > 800) break; // Ранняя остановка
            }
        }
        
        return {key: bestKey, score: bestScore};
    }

    analyzeCiphertext(ciphertext, keyLength) {
        // 1. Анализ повторяющихся последовательностей
        const repeats = this.findRepeatingSequences(ciphertext);
        
        // 2. Частотный анализ по позициям
        const segments = Array(keyLength).fill().map(() => new Set());
        
        for (let i = 0; i < ciphertext.length; i++) {
            const pos = i % keyLength;
            const char = ciphertext[i];
            
            // Используем частотный анализ для каждой позиции ключа
            const probableKeys = this.frequencyAttack(char, pos);
            probableKeys.forEach(k => segments[pos].add(k));
        }
        
        // 3. Поиск известных паттернов Kryptos
        this.kryptosPatterns.exact.forEach(pattern => {
            if (pattern.length <= keyLength) {
                const pos = this.findPatternPosition(ciphertext, pattern);
                if (pos >= 0) {
                    const keyPos = pos % keyLength;
                    const keyPart = this.extractKeyPart(ciphertext, pos, pattern);
                    segments[keyPos].add(keyPart);
                }
            }
        });
        
        return segments;
    }

    recombineKey(segments, keyLength) {
        // Умная рекомбинация с учетом статистики
        let key = '';
        
        for (let i = 0; i < keyLength; i++) {
            if (segments[i].size > 0) {
                // Выбираем самый вероятный вариант
                key += this.chooseBestCandidate(segments[i], i);
            } else {
                // Генерируем по вторичным стратегиям
                key += this.generateSmartChar(i);
            }
        }
        
        return key;
    }

    evaluateKey(ciphertext, key) {
        const plaintext = this.decrypt(ciphertext, key);
        const score = this.scoreText(plaintext);
        return {plaintext, score};
    }

    // Улучшенные вспомогательные методы
    frequencyAttack(cipherChar, position) {
        // Адаптивный частотный анализ с учетом позиции в ключе
        const candidates = [];
        const cipherPos = this.charMap[cipherChar.charCodeAt(0)];
        
        // Топ-5 самых частых букв в английском
        const freqLetters = ['E', 'T', 'A', 'O', 'I'];
        
        freqLetters.forEach(char => {
            const charPos = this.charMap[char.charCodeAt(0)];
            const keyChar = (cipherPos - charPos + 26) % 26;
            candidates.push(this.alphabet[keyChar]);
        });
        
        return candidates;
    }

    scoreText(text) {
        // Усовершенствованная система оценки
        let score = 0;
        
        // 1. Точные совпадения (высокий балл)
        this.kryptosPatterns.exact.forEach(pattern => {
            if (text.includes(pattern)) score += pattern.length * 100;
        });
        
        // 2. Частичные совпадения
        this.kryptosPatterns.partial.forEach(partial => {
            if (text.includes(partial)) score += partial.length * 50;
        });
        
        // 3. N-граммная оценка
        score += this.ngramScore(text);
        
        // 4. Оценка по ключевым словам
        if (text.match(/\b(TEMPLE|LATITUDE|LONGITUDE)\b/)) score += 300;
        
        return score;
    }

    ngramScore(text) {
        // Реализация оценки по N-граммной модели
        let score = 0;
        for (let i = 0; i < text.length - 2; i++) {
            const trigram = text.substr(i, 3);
            score += this.ngrams.get(trigram) || -5;
        }
        return score;
    }
}
