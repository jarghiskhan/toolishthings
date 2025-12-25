// Rep Counter App
class RepCounter {
    constructor() {
        this.tempo = 150; // BPM
        this.duration = 60; // seconds
        this.totalReps = 0;
        this.currentRep = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.metronomeInterval = null;
        this.timerInterval = null;
        this.startTime = null;
        this.pausedTime = 0;
        this.audioContext = null;
        this.soundType = 'beep';
        this.darkMode = false;

        this.initializeElements();
        this.setupEventListeners();
        this.updateSummary();
    }

    initializeElements() {
        // Input elements
        this.tempoInput = document.getElementById('tempo-input');
        this.tempoNumber = document.getElementById('tempo-number');
        this.tempoDisplay = document.getElementById('tempo-display');
        this.durationValue = document.getElementById('duration-value');
        this.durationUnit = document.getElementById('duration-unit');
        this.durationDisplay = document.getElementById('duration-display');
        this.soundSelect = document.getElementById('sound-select');
        this.darkModeToggle = document.getElementById('dark-mode-toggle');
        
        // Display elements
        this.totalRepsDisplay = document.getElementById('total-reps-display');
        this.startBtn = document.getElementById('start-btn');
        this.inputPanel = document.getElementById('input-panel');
        this.workoutScreen = document.getElementById('workout-screen');
        
        // Workout screen elements
        this.repsCompleted = document.getElementById('reps-completed');
        this.repsRemaining = document.getElementById('reps-remaining');
        this.timeRemaining = document.getElementById('time-remaining');
        this.progressBar = document.getElementById('progress-bar');
        this.beatCircle = document.getElementById('beat-circle');
        this.pauseBtn = document.getElementById('pause-btn');
        this.stopBtn = document.getElementById('stop-btn');
    }

    setupEventListeners() {
        // Tempo slider and number input sync
        this.tempoInput.addEventListener('input', (e) => {
            this.tempo = parseInt(e.target.value);
            this.tempoNumber.value = this.tempo;
            this.tempoDisplay.textContent = this.tempo;
            this.updateSummary();
        });

        this.tempoNumber.addEventListener('input', (e) => {
            let value = parseInt(e.target.value);
            if (value < 60) value = 60;
            if (value > 200) value = 200;
            this.tempo = value;
            this.tempoInput.value = value;
            this.tempoNumber.value = value;
            this.tempoDisplay.textContent = value;
            this.updateSummary();
        });

        // Duration inputs
        this.durationValue.addEventListener('input', () => this.updateDuration());
        this.durationUnit.addEventListener('change', () => this.updateDuration());

        // Sound selector
        this.soundSelect.addEventListener('change', (e) => {
            this.soundType = e.target.value;
        });

        // Dark mode toggle
        this.darkModeToggle.addEventListener('change', (e) => {
            this.darkMode = e.target.checked;
            document.body.classList.toggle('dark-mode', this.darkMode);
            localStorage.setItem('repCounterDarkMode', this.darkMode);
        });

        // Control buttons
        this.startBtn.addEventListener('click', () => this.startSession());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.stopBtn.addEventListener('click', () => this.stopSession());

        // Load saved dark mode preference
        const savedDarkMode = localStorage.getItem('repCounterDarkMode') === 'true';
        if (savedDarkMode) {
            this.darkModeToggle.checked = true;
            this.darkMode = true;
            document.body.classList.add('dark-mode');
        }
    }

    updateDuration() {
        const value = parseFloat(this.durationValue.value) || 1;
        const unit = this.durationUnit.value;
        
        if (unit === 'minutes') {
            this.duration = value * 60;
            this.durationDisplay.textContent = value === 1 ? '1 minute' : `${value} minutes`;
        } else {
            this.duration = value;
            this.durationDisplay.textContent = value === 1 ? '1 second' : `${value} seconds`;
        }
        
        this.updateSummary();
    }

    updateSummary() {
        // Calculate total reps: (tempo / 60) * duration
        this.totalReps = Math.floor((this.tempo / 60) * this.duration);
        this.totalRepsDisplay.textContent = this.totalReps;
    }

    startSession() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.isPaused = false;
        this.currentRep = 0;
        this.startTime = Date.now();
        this.pausedTime = 0;

        // Initialize audio context
        this.initAudioContext();

        // Hide input panel, show workout screen
        this.inputPanel.classList.add('d-none');
        this.workoutScreen.classList.remove('d-none');

        // Update display
        this.repsCompleted.textContent = '0';
        this.repsRemaining.textContent = this.totalReps;
        this.progressBar.style.width = '100%';

        // Start metronome
        this.startMetronome();

        // Start timer
        this.startTimer();
    }

    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Audio context not supported:', e);
        }
    }

    startMetronome() {
        const intervalMs = (60 / this.tempo) * 1000; // Convert BPM to milliseconds

        this.metronomeInterval = setInterval(() => {
            if (!this.isPaused && this.isRunning) {
                this.playBeat();
                this.animateBeat();
                this.incrementRep();
            }
        }, intervalMs);

        // Play first beat immediately
        this.playBeat();
        this.animateBeat();
    }

    playBeat() {
        if (!this.audioContext || this.soundType === 'none') return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // Configure sound based on type
            switch (this.soundType) {
                case 'click':
                    oscillator.type = 'square';
                    oscillator.frequency.value = 800;
                    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
                    oscillator.start();
                    oscillator.stop(this.audioContext.currentTime + 0.1);
                    break;
                case 'beep':
                    oscillator.type = 'sine';
                    oscillator.frequency.value = 600;
                    gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
                    oscillator.start();
                    oscillator.stop(this.audioContext.currentTime + 0.15);
                    break;
                case 'woodblock':
                    oscillator.type = 'sine';
                    oscillator.frequency.value = 400;
                    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
                    oscillator.start();
                    oscillator.stop(this.audioContext.currentTime + 0.2);
                    break;
                case 'tick':
                    oscillator.type = 'square';
                    oscillator.frequency.value = 1000;
                    gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
                    oscillator.start();
                    oscillator.stop(this.audioContext.currentTime + 0.05);
                    break;
            }
        } catch (e) {
            console.warn('Error playing beat:', e);
        }
    }

    animateBeat() {
        this.beatCircle.classList.add('pulse');
        setTimeout(() => {
            this.beatCircle.classList.remove('pulse');
        }, 200);
    }

    incrementRep() {
        if (this.currentRep < this.totalReps) {
            this.currentRep++;
            this.repsCompleted.textContent = this.currentRep;
            this.repsRemaining.textContent = this.totalReps - this.currentRep;
        }
    }

    startTimer() {
        const totalDuration = this.duration * 1000; // Convert to milliseconds

        this.timerInterval = setInterval(() => {
            if (!this.isRunning) return;

            if (!this.isPaused) {
                const now = Date.now();
                const elapsed = now - this.startTime - this.pausedTime;

                if (elapsed >= totalDuration) {
                    this.completeSession();
                    return;
                }

                const remaining = totalDuration - elapsed;
                const remainingSeconds = Math.ceil(remaining / 1000);
                const minutes = Math.floor(remainingSeconds / 60);
                const seconds = remainingSeconds % 60;

                this.timeRemaining.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

                // Update progress bar
                const progress = ((totalDuration - remaining) / totalDuration) * 100;
                this.progressBar.style.width = `${progress}%`;
            }
        }, 100);
    }

    togglePause() {
        if (!this.isRunning) return;

        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            this.pauseBtn.innerHTML = '<i class="fas fa-play me-2"></i>Resume';
            this.pauseBtn.classList.remove('btn-success');
            this.pauseBtn.classList.add('btn-warning');
            this.pauseStartTime = Date.now();
        } else {
            this.pauseBtn.innerHTML = '<i class="fas fa-pause me-2"></i>Pause';
            this.pauseBtn.classList.remove('btn-warning');
            this.pauseBtn.classList.add('btn-success');
            if (this.pauseStartTime) {
                this.pausedTime += Date.now() - this.pauseStartTime;
                this.pauseStartTime = null;
            }
        }
    }

    stopSession() {
        this.isRunning = false;
        this.isPaused = false;
        this.currentRep = 0;

        // Clear intervals
        if (this.metronomeInterval) {
            clearInterval(this.metronomeInterval);
            this.metronomeInterval = null;
        }

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Reset pause tracking
        this.pauseStartTime = null;
        this.pausedTime = 0;

        // Show input panel, hide workout screen
        this.inputPanel.classList.remove('d-none');
        this.workoutScreen.classList.add('d-none');

        // Reset button
        this.pauseBtn.innerHTML = '<i class="fas fa-pause me-2"></i>Pause';
        this.pauseBtn.classList.remove('btn-warning');
        this.pauseBtn.classList.add('btn-success');
    }

    completeSession() {
        this.stopSession();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RepCounter();
});

