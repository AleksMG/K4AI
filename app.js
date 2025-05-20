import { K4CrackerWorker } from './worker.js';

class K4CrackerApp {
    constructor() {
        this.workers = [];
        this.results = [];
        this.isRunning = false;
        
        this.initElements();
        this.initEvents();
    }
    
    initElements() {
        this.elements = {
            startBtn: document.getElementById('startBtn'),
            stopBtn: document.getElementById('stopBtn'),
            ciphertext: document.getElementById('ciphertext'),
            plaintext: document.getElementById('plaintext'),
            alphabet: document.getElementById('alphabet'),
            keyLength: document.getElementById('keyLength'),
            workers: document.getElementById('workers'),
            progress: document.getElementById('progress'),
            bestKey: document.getElementById('bestKey'),
            output: document.getElementById('output')
        };
    }
    
    initEvents() {
        this.elements.startBtn.addEventListener('click', () => this.start());
        this.elements.stopBtn.addEventListener('click', () => this.stop());
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.elements.startBtn.disabled = true;
        this.elements.stopBtn.disabled = false;
        this.results = [];
        this.elements.output.textContent = '';
        
        const config = {
            ciphertext: this.elements.ciphertext.value.trim().toUpperCase(),
            knownTexts: [this.elements.plaintext.value.trim().toUpperCase()],
            alphabet: this.elements.alphabet.value.trim().toUpperCase(),
            keyLength: parseInt(this.elements.keyLength.value),
            totalWorkers: parseInt(this.elements.workers.value)
        };
        
        this.createWorkers(config);
    }
    
    createWorkers(config) {
        this.workers = [];
        const keysPerWorker = Math.ceil(26 ** config.keyLength / config.totalWorkers);
        
        for (let i = 0; i < config.totalWorkers; i++) {
            const worker = new K4CrackerWorker();
            
            worker.onmessage = (e) => {
                switch (e.data.type) {
                    case 'progress':
                        this.updateProgress(e.data);
                        break;
                    case 'result':
                        this.handleResult(e.data);
                        break;
                    case 'completed':
                        this.workerCompleted();
                        break;
                }
            };
            
            worker.postMessage({
                type: 'init',
                ...config,
                workerId: i,
                startKey: i * keysPerWorker,
                endKey: (i + 1) * keysPerWorker
            });
            
            this.workers.push(worker);
        }
        
        this.workers.forEach(w => w.postMessage({ type: 'start' }));
        this.elements.progress.textContent = `Запущено ${config.totalWorkers} воркеров...`;
    }
    
    updateProgress(data) {
        this.elements.progress.textContent = 
            `Проверено ключей: ${data.totalTested} | Лучший счет: ${data.bestScore}`;
        
        if (data.bestKey) {
            this.elements.bestKey.textContent = `Лучший ключ: ${data.bestKey}`;
            this.elements.output.textContent = data.bestPlaintext;
        }
    }
    
    handleResult(data) {
        this.results.push(data);
        this.results.sort((a, b) => b.score - a.score);
        
        if (this.results[0]) {
            const best = this.results[0];
            this.elements.bestKey.textContent = `Найден ключ: ${best.key} (счет: ${best.score})`;
            this.elements.output.textContent = best.plaintext;
        }
    }
    
    workerCompleted() {
        if (this.workers.every(w => w.terminated)) {
            this.stop();
        }
    }
    
    stop() {
        this.isRunning = false;
        this.workers.forEach(w => {
            w.terminate();
        });
        this.elements.startBtn.disabled = false;
        this.elements.stopBtn.disabled = true;
        this.elements.progress.textContent += " | Анализ завершен";
    }
}

new K4CrackerApp();
