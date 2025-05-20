class KryptosApp {
    constructor() {
        this.workers = [];
        this.isRunning = false;
        this.keysTested = 0;
        this.startTime = 0;
        
        // Элементы UI
        this.elements = {
            ciphertext: document.getElementById('ciphertext'),
            keyLength: document.getElementById('keyLength'),
            workers: document.getElementById('workers'),
            startBtn: document.getElementById('startBtn'),
            stopBtn: document.getElementById('stopBtn'),
            results: document.getElementById('results'),
            status: document.getElementById('status')
        };
        
        // Обработчики событий
        this.elements.startBtn.addEventListener('click', () => this.start());
        this.elements.stopBtn.addEventListener('click', () => this.stop());
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.keysTested = 0;
        this.startTime = performance.now();
        
        // Очистка предыдущих результатов
        this.elements.results.innerHTML = '';
        this.elements.status.textContent = 'Running...';
        
        // Настройка кнопок
        this.elements.startBtn.disabled = true;
        this.elements.stopBtn.disabled = false;
        
        // Создание workers
        const ciphertext = this.elements.ciphertext.value.trim();
        const keyLength = parseInt(this.elements.keyLength.value);
        const numWorkers = parseInt(this.elements.workers.value);
        
        this.workers = [];
        for (let i = 0; i < numWorkers; i++) {
            const worker = new Worker('worker.js');
            worker.onmessage = (e) => this.handleWorkerMessage(e.data);
            worker.postMessage({
                type: 'init',
                ciphertext: ciphertext,
                keyLength: keyLength,
                workerId: i
            });
            this.workers.push(worker);
        }
        
        // Запуск workers
        this.workers.forEach(w => w.postMessage({ type: 'start' }));
        
        // Обновление UI
        this.updateInterval = setInterval(() => this.updateStatus(), 1000);
    }
    
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        clearInterval(this.updateInterval);
        
        this.workers.forEach(w => {
            w.postMessage({ type: 'stop' });
            w.terminate();
        });
        
        this.elements.startBtn.disabled = false;
        this.elements.stopBtn.disabled = true;
        this.updateStatus();
    }
    
    handleWorkerMessage(data) {
        if (data.type === 'result') {
            this.elements.results.innerHTML += 
                `Key: ${data.key} | Score: ${data.score}\n` +
                `Text: ${data.plaintext}\n` +
                '----------------\n';
        }
        else if (data.type === 'progress') {
            this.keysTested += data.keysTested;
        }
    }
    
    updateStatus() {
        const elapsed = (performance.now() - this.startTime) / 1000;
        const kps = Math.round(this.keysTested / elapsed);
        this.elements.status.textContent = 
            `Keys tested: ${this.keysTested.toLocaleString()} | ` +
            `Speed: ${kps.toLocaleString()} keys/sec`;
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    window.app = new KryptosApp();
});
