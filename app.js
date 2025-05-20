class KryptosCracker {
    constructor() {
        this.worker = null;
        this.isRunning = false;
        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        this.elements = {
            ciphertext: document.getElementById('ciphertext'),
            knownText: document.getElementById('knownText'),
            alphabet: document.getElementById('alphabet'),
            minKeyLength: document.getElementById('minKeyLength'),
            analyzeBtn: document.getElementById('analyzeBtn'),
            stopBtn: document.getElementById('stopBtn'),
            progressBar: document.getElementById('progressBar'),
            progressText: document.getElementById('progressText'),
            progressContainer: document.getElementById('progressContainer'),
            resultsGrid: document.getElementById('resultsGrid'),
            template: document.querySelector('.template')
        };
    }

    initEventListeners() {
        this.elements.analyzeBtn.addEventListener('click', () => this.startAnalysis());
        this.elements.stopBtn.addEventListener('click', () => this.stopAnalysis());
    }

    startAnalysis() {
        if (this.isRunning) return;
        
        const ciphertext = this.elements.ciphertext.value.trim().toUpperCase();
        const knownText = this.elements.knownText.value.trim().toUpperCase();
        const alphabet = this.elements.alphabet.value.trim().toUpperCase();
        const minKeyLength = parseInt(this.elements.minKeyLength.value);

        if (!ciphertext || !knownText || !alphabet) {
            alert('Please fill in all required fields');
            return;
        }

        if (knownText.length < 3) {
            alert('Known text should be at least 3 characters long');
            return;
        }

        this.elements.resultsGrid.innerHTML = '';
        this.elements.progressBar.value = 0;
        this.elements.progressText.textContent = '0%';
        this.elements.progressContainer.style.display = 'flex';

        this.isRunning = true;
        this.elements.analyzeBtn.disabled = true;
        this.elements.stopBtn.disabled = false;

        this.worker = new Worker('worker-ai.js');

        this.worker.postMessage({
            type: 'start',
            ciphertext,
            knownText,
            alphabet,
            minKeyLength
        });

        this.worker.onmessage = (e) => {
            const { type, data } = e.data;

            switch (type) {
                case 'progress':
                    this.updateProgress(data);
                    break;
                case 'result':
                    this.addResult(data);
                    break;
                case 'complete':
                    this.analysisComplete();
                    break;
                case 'error':
                    this.handleError(data);
                    break;
            }
        };

        this.worker.onerror = (error) => {
            console.error('Worker error:', error);
            this.handleError(error.message);
            this.stopAnalysis();
        };
    }

    stopAnalysis() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.isRunning = false;
        this.elements.analyzeBtn.disabled = false;
        this.elements.stopBtn.disabled = true;
    }

    updateProgress(percent) {
        this.elements.progressBar.value = percent;
        this.elements.progressText.textContent = `${percent}%`;
    }

    addResult(result) {
        const template = this.elements.template;
        const clone = template.cloneNode(true);
        clone.classList.remove('template');
        
        clone.querySelector('.key').textContent = result.key;
        clone.querySelector('.positions span').textContent = result.positions.join(', ');
        clone.querySelector('.decrypted span').textContent = result.decryptedSample;
        clone.querySelector('.score span').textContent = result.score.toFixed(2);
        clone.querySelector('.key-length').textContent = result.keyLength;
        
        const exportBtn = clone.querySelector('.export-btn');
        exportBtn.addEventListener('click', () => this.exportResult(result));
        
        this.elements.resultsGrid.appendChild(clone);
    }

    exportResult(result) {
        const data = {
            key: result.key,
            keyLength: result.keyLength,
            positions: result.positions,
            decryptedSample: result.decryptedSample,
            score: result.score,
            alphabet: this.elements.alphabet.value,
            ciphertext: this.elements.ciphertext.value,
            knownText: this.elements.knownText.value
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `kryptos-key-${result.key}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    analysisComplete() {
        this.stopAnalysis();
        this.elements.progressText.textContent = 'Analysis complete';
    }

    handleError(error) {
        this.stopAnalysis();
        alert(`Error: ${error}`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new KryptosCracker();
});
