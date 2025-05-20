class KryptosCracker {
    constructor() {
        this.workers = [];
        this.isRunning = false;
        this.startTime = null;
        this.keysTested = 0;
        this.bestResults = [];
        this.maxResults = 10;
        
        this.initElements();
        this.bindEvents();
    }
    
    initElements() {
        this.elements = {
            ciphertext: document.getElementById('ciphertext'),
            keyLength: document.getElementById('keyLength'),
            workers: document.getElementById('workers'),
            startBtn: document.getElementById('startBtn'),
            stopBtn: document.getElementById('stopBtn'),
            results: document.getElementById('results'),
            progress: document.getElementById('progress'),
            speed: document.getElementById('speed')
        };
    }
    
    bindEvents() {
        this.elements.startBtn.addEventListener('click', () => this.start());
        this.elements.stopBtn.addEventListener('click', () => this.stop());
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.startTime = performance.now();
        this.keysTested = 0;
        this.bestResults = [];
        this.updateUI();
        
        this.elements.startBtn.disabled = true;
        this.elements.stopBtn.disabled = false;
        
        const ciphertext = this.elements.ciphertext.value.trim().toUpperCase();
        const keyLength = parseInt(this.elements.keyLength.value);
        const numWorkers = parseInt(this.elements.workers.value);
        
        // Clear previous workers
        this.workers.forEach(w => w.terminate());
        this.workers = [];
        
        // Create new workers
        for (let i = 0; i < numWorkers; i++) {
            const worker = new Worker('worker-ai.js');
            worker.onmessage = (e) => this.handleWorkerMessage(e.data, i);
            worker.postMessage({
                type: 'init',
                ciphertext: ciphertext,
                keyLength: keyLength,
                workerId: i,
                totalWorkers: numWorkers
            });
            
            this.workers.push(worker);
        }
        
        // Start workers
        this.workers.forEach(worker => {
            worker.postMessage({ type: 'start' });
        });
        
        // Start UI updates
        this.updateInterval = setInterval(() => this.updateUI(), 1000);
    }
    
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        this.workers.forEach(w => {
            w.postMessage({ type: 'stop' });
            w.terminate();
        });
        this.workers = [];
        
        clearInterval(this.updateInterval);
        
        this.elements.startBtn.disabled = false;
        this.elements.stopBtn.disabled = true;
    }
    
    handleWorkerMessage(data, workerId) {
        if (!this.isRunning) return;
        
        switch (data.type) {
            case 'progress':
                this.keysTested += data.keysTested;
                break;
                
            case 'result':
                this.addResult(data.key, data.plaintext, data.score);
                break;
        }
    }
    
    addResult(key, plaintext, score) {
        // Check if we already have this result
        const exists = this.bestResults.some(r => r.key === key);
        if (exists) return;
        
        // Add to results
        this.bestResults.push({ key, plaintext, score });
        
        // Sort and keep only top results
        this.bestResults.sort((a, b) => b.score - a.score);
        if (this.bestResults.length > this.maxResults) {
            this.bestResults.pop();
        }
    }
    
    updateUI() {
        // Update progress
        const elapsed = (performance.now() - this.startTime) / 1000;
        const kps = this.keysTested / elapsed;
        
        this.elements.progress.textContent = `Keys tested: ${this.keysTested.toLocaleString()}`;
        this.elements.speed.textContent = `Speed: ${Math.round(kps).toLocaleString()} keys/sec`;
        
        // Update results
        this.elements.results.innerHTML = this.bestResults
            .map(r => `KEY: ${r.key} | SCORE: ${r.score}\n${r.plaintext}\n${'-'.repeat(80)}`)
            .join('\n');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new KryptosCracker();
});
