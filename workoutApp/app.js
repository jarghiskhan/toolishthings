const PROGRAMS = {
    toolish: {
        label: 'Toolish Gains',
        sessionTitle: 'Select Workout Day',
        sessions: [
            { id: '1', label: 'Day 1' },
            { id: '2', label: 'Day 2' },
            { id: '3', label: 'Day 3' }
        ]
    },
    bodyweight: {
        label: 'Athletic Training',
        sessionTitle: 'Select Session',
        sessions: [
            { id: 'push', label: 'Push' },
            { id: 'pull', label: 'Pull' },
            { id: 'legs', label: 'Legs' },
            { id: 'fullBody', label: 'Full Body' }
        ]
    }
};

let currentProgram = localStorage.getItem('workoutProgram') || 'toolish';
let currentSession = localStorage.getItem('workoutSession') || '1';
let selectedWarmupId = localStorage.getItem('bodyweightWarmupChoice') || 'jump-rope';

let workoutHistory = JSON.parse(localStorage.getItem('workoutHistory')) || {};
let personalRecords = JSON.parse(localStorage.getItem('personalRecords')) || {};
let workoutDates = migrateWorkoutDates(JSON.parse(localStorage.getItem('workoutDates')) || null);

const setTimerInstances = new WeakMap();
let warmupTimer = null;
let audioContext = null;

const workoutContainer = document.getElementById('workout-container');
const exerciseTemplate = document.getElementById('exercise-template');
const setTemplate = document.getElementById('set-template');
const timedSetTemplate = document.getElementById('timed-set-template');

function migrateWorkoutDates(stored) {
    if (stored && stored.toolish) return stored;
    const migrated = {
        toolish: { day1: [], day2: [], day3: [] },
        bodyweight: { push: [], pull: [], legs: [], fullBody: [] }
    };
    if (stored) {
        ['day1', 'day2', 'day3'].forEach((key) => {
            if (stored[key]) migrated.toolish[key] = stored[key];
        });
    }
    return migrated;
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function isBodyweightProgram() {
    return currentProgram === 'bodyweight';
}

function getExerciseKey(bodyPart, exerciseName) {
    if (currentProgram === 'toolish') {
        return `toolish-day${currentSession}-${bodyPart}-${exerciseName}`;
    }
    return `bodyweight-${currentSession}-${bodyPart}-${exerciseName}`;
}

function getLegacyKeyFromExerciseKey(exerciseKey) {
    const match = exerciseKey.match(/^toolish-day(\d+)-(.+)-(.+)$/);
    if (match) return `day${match[1]}-${match[2]}-${match[3]}`;
    return null;
}

function lookupHistory(exerciseKey) {
    if (workoutHistory[exerciseKey]) return workoutHistory[exerciseKey];
    const legacy = getLegacyKeyFromExerciseKey(exerciseKey);
    return legacy && workoutHistory[legacy] ? workoutHistory[legacy] : null;
}

function lookupPR(exerciseKey) {
    const empty = { bestWeight: 0, bestReps: 0, lastCompleted: null };
    if (personalRecords[exerciseKey]) return personalRecords[exerciseKey];
    const legacy = getLegacyKeyFromExerciseKey(exerciseKey);
    return legacy && personalRecords[legacy] ? personalRecords[legacy] : empty;
}

function getSessionDateKey() {
    if (currentProgram === 'toolish') return `day${currentSession}`;
    return currentSession;
}

function getActiveWorkoutSections() {
    if (currentProgram === 'toolish') {
        return workoutData[`day${currentSession}`];
    }
    const sessionData = athleticTrainingData[currentSession];
    return sessionData ? sessionData.sections : [];
}

function formatSeconds(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function initAudioContext() {
    if (audioContext) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.warn('Audio context not supported:', e);
    }
}

function playTimerAlarm() {
    initAudioContext();
    if (!audioContext) return;
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.type = 'sine';
        oscillator.frequency.value = 600;
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.15);
        setTimeout(() => {
            const o2 = audioContext.createOscillator();
            const g2 = audioContext.createGain();
            o2.connect(g2);
            g2.connect(audioContext.destination);
            o2.type = 'sine';
            o2.frequency.value = 800;
            g2.gain.setValueAtTime(0.2, audioContext.currentTime);
            g2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            o2.start();
            o2.stop(audioContext.currentTime + 0.2);
        }, 200);
    } catch (e) {
        console.warn('Could not play alarm:', e);
    }
}

function triggerFlashOverlay() {
    const overlay = document.getElementById('timer-flash-overlay');
    overlay.classList.add('active');
    setTimeout(() => overlay.classList.remove('active'), 2500);
}

function onTimerComplete() {
    playTimerAlarm();
    triggerFlashOverlay();
}

class CountdownTimer {
    constructor(displayEl, durationSeconds, onComplete, startBtn) {
        this.displayEl = displayEl;
        this.totalSeconds = durationSeconds;
        this.remaining = durationSeconds;
        this.onComplete = onComplete;
        this.startBtn = startBtn;
        this.intervalId = null;
        this.isRunning = false;
        this.updateDisplay();
    }

    updateDisplay() {
        if (this.displayEl) {
            this.displayEl.textContent = formatSeconds(this.remaining);
        }
    }

    start() {
        if (this.isRunning) return;
        initAudioContext();
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        this.isRunning = true;
        if (this.startBtn) this.startBtn.textContent = 'Pause';
        this.intervalId = setInterval(() => {
            this.remaining -= 1;
            this.updateDisplay();
            if (this.remaining <= 0) {
                this.stop(false);
                if (this.onComplete) this.onComplete();
            }
        }, 1000);
    }

    pause() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.startBtn) this.startBtn.textContent = 'Start';
    }

    stop(resetBtn) {
        this.pause();
        if (resetBtn && this.startBtn) this.startBtn.textContent = 'Start';
    }

    reset() {
        this.stop(true);
        this.remaining = this.totalSeconds;
        this.updateDisplay();
    }

    toggle() {
        if (this.isRunning) this.pause();
        else this.start();
    }

    setDuration(seconds) {
        if (this.isRunning) this.pause();
        this.totalSeconds = seconds;
        this.remaining = seconds;
        this.updateDisplay();
    }
}

function getSelectedWarmup() {
    return athleticTrainingData.warmups.find((w) => w.id === selectedWarmupId)
        || athleticTrainingData.warmups[0];
}

function populateWarmupSelect() {
    const select = document.getElementById('warmup-select');
    if (!select) return;
    select.innerHTML = '';
    athleticTrainingData.warmups.forEach((w) => {
        const opt = document.createElement('option');
        opt.value = w.id;
        opt.textContent = `${w.name} (${w.durationMinutes} min)`;
        select.appendChild(opt);
    });
    select.value = selectedWarmupId;
}

function initWarmupTimer() {
    const warmup = getSelectedWarmup();
    const seconds = warmup.durationMinutes * 60;
    const display = document.getElementById('warmup-timer-display');
    const btn = document.getElementById('warmup-start-btn');
    if (warmupTimer) {
        warmupTimer.setDuration(seconds);
    } else {
        warmupTimer = new CountdownTimer(display, seconds, () => {
            onTimerComplete();
            btn.textContent = 'Start';
        }, btn);
    }
}

function onWarmupChange() {
    const select = document.getElementById('warmup-select');
    selectedWarmupId = select.value;
    localStorage.setItem('bodyweightWarmupChoice', selectedWarmupId);
    resetWarmupTimer();
}

function toggleWarmupTimer() {
    if (!warmupTimer) initWarmupTimer();
    warmupTimer.toggle();
}

function resetWarmupTimer() {
    if (warmupTimer) warmupTimer.reset();
    else initWarmupTimer();
    document.getElementById('warmup-start-btn').textContent = 'Start';
}

function getSetTimer(setRow) {
    return setTimerInstances.get(setRow);
}

function createSetTimer(setRow, durationSeconds) {
    const display = setRow.querySelector('.timer-countdown');
    const btn = setRow.querySelector('.timer-start-btn');
    const timer = new CountdownTimer(display, durationSeconds, () => {
        onTimerComplete();
        setRow.classList.add('completed');
        btn.textContent = 'Start';
        markSetCompleteFromRow(setRow, false);
    }, btn);
    setTimerInstances.set(setRow, timer);
    return timer;
}

function toggleSetTimer(button) {
    const setRow = button.closest('.timed-set-row');
    let timer = getSetTimer(setRow);
    if (!timer) {
        const duration = parseInt(setRow.dataset.durationSeconds, 10) || 60;
        timer = createSetTimer(setRow, duration);
    }
    timer.toggle();
}

function resetSetTimer(button) {
    const setRow = button.closest('.timed-set-row');
    const timer = getSetTimer(setRow);
    if (timer) timer.reset();
    setRow.classList.remove('completed');
    saveWorkout(false);
}

function buildSessionButtons() {
    const container = document.getElementById('session-buttons');
    const config = PROGRAMS[currentProgram];
    container.innerHTML = '';
    config.sessions.forEach((session) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-outline-primary';
        btn.textContent = session.label;
        btn.dataset.session = session.id;
        btn.onclick = () => selectSession(session.id);
        container.appendChild(btn);
    });
}

function selectProgram(program) {
    currentProgram = program;
    localStorage.setItem('workoutProgram', program);

    document.querySelectorAll('#program-tabs .nav-link').forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.program === program);
    });

    const config = PROGRAMS[program];
    document.getElementById('session-card-title').textContent = config.sessionTitle;
    document.getElementById('warmup-card').classList.toggle('d-none', program !== 'bodyweight');

    buildSessionButtons();

    const defaultSession = config.sessions[0].id;
    const saved = localStorage.getItem(`workoutSession_${program}`);
    selectSession(saved || defaultSession);
}

function selectSession(sessionId) {
    currentSession = sessionId;
    localStorage.setItem('workoutSession', sessionId);
    localStorage.setItem(`workoutSession_${currentProgram}`, sessionId);

    document.querySelectorAll('#session-buttons .btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.session === String(sessionId));
    });

    if (isBodyweightProgram()) {
        populateWarmupSelect();
        initWarmupTimer();
    }

    renderWorkout();
}

function getRepPlaceholder(repRange) {
    if (repRange === 'Failure') return 'Reps (to failure)';
    if (repRange.includes('each direction')) return 'Reps (each direction)';
    return 'Reps';
}

function renderWorkout() {
    workoutContainer.innerHTML = '';
    const sections = getActiveWorkoutSections();
    if (!sections) return;

    sections.forEach((section) => {
        const bodyPartHeader = document.createElement('h4');
        bodyPartHeader.className = 'mt-4 mb-3';
        bodyPartHeader.textContent = section.bodyPart;
        workoutContainer.appendChild(bodyPartHeader);

        section.exercises.forEach((exercise) => {
            if (exercise.type === 'timed') {
                renderTimedExercise(section, exercise);
            } else {
                renderRepExercise(section, exercise);
            }
        });
    });

    const allExercises = workoutContainer.querySelectorAll('.exercise-item');
    if (allExercises.length > 0) {
        const lastButton = allExercises[allExercises.length - 1].querySelector('.next-exercise-btn');
        if (lastButton) {
            lastButton.innerHTML = '<i class="fas fa-check"></i> Complete Workout';
        }
    }
}

function renderRepExercise(section, exercise) {
    const exerciseElement = exerciseTemplate.content.cloneNode(true);
    const root = exerciseElement.querySelector('.exercise-item');
    root.dataset.exerciseType = 'reps';

    exerciseElement.querySelector('.exercise-name').textContent = exercise.name;
    exerciseElement.querySelector('.exercise-details').textContent =
        `${exercise.sets} sets | ${exercise.repRange}`;

    const variantSelect = exerciseElement.querySelector('.exercise-variant');
    exercise.options.forEach((option) => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        variantSelect.appendChild(optionElement);
    });

    const setsContainer = exerciseElement.querySelector('.sets-container');
    const repsPlaceholder = getRepPlaceholder(exercise.repRange);

    if (isBodyweightProgram()) {
        exerciseElement.querySelectorAll('.weight-col').forEach((el) => el.classList.add('d-none'));
        exerciseElement.querySelector('.pr-weight-row').classList.add('d-none');
    }

    for (let i = 0; i < exercise.sets; i++) {
        const setRow = createSetRow(i + 1, repsPlaceholder);
        setsContainer.appendChild(setRow);
    }

    applyExerciseHistory(exerciseElement, section.bodyPart, exercise.name, setsContainer, false);
    workoutContainer.appendChild(exerciseElement);
}

function renderTimedExercise(section, exercise) {
    const exerciseElement = exerciseTemplate.content.cloneNode(true);
    const root = exerciseElement.querySelector('.exercise-item');
    root.dataset.exerciseType = 'timed';

    exerciseElement.querySelector('.exercise-name').textContent = exercise.name;
    exerciseElement.querySelector('.exercise-details').textContent =
        `${exercise.sets} sets | ${exercise.repRange}`;

    const variantSelect = exerciseElement.querySelector('.exercise-variant');
    exercise.options.forEach((option) => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        variantSelect.appendChild(optionElement);
    });

    exerciseElement.querySelector('.add-set-row').classList.add('d-none');
    exerciseElement.querySelectorAll('.weight-col').forEach((el) => el.classList.add('d-none'));
    exerciseElement.querySelector('.pr-weight-row').classList.add('d-none');

    const setsContainer = exerciseElement.querySelector('.sets-container');
    setsContainer.innerHTML = '';

    for (let i = 0; i < exercise.sets; i++) {
        setsContainer.appendChild(createTimedSetRow(i + 1, exercise.durationSeconds));
    }

    applyExerciseHistory(exerciseElement, section.bodyPart, exercise.name, setsContainer, true);
    workoutContainer.appendChild(exerciseElement);
}

function applyExerciseHistory(exerciseElement, bodyPart, exerciseName, setsContainer, isTimed) {
    const exerciseKey = getExerciseKey(bodyPart, exerciseName);
    const prs = lookupPR(exerciseKey);
    const prElement = exerciseElement.querySelector('.personal-records');
    prElement.querySelector('.best-weight').textContent = prs.bestWeight ? `${prs.bestWeight}kg` : 'None';
    prElement.querySelector('.best-reps').textContent = prs.bestReps ? `${prs.bestReps} reps` : 'None';

    const previousData = lookupHistory(exerciseKey);
    const hasCompletedSetInHistory = previousData?.sets?.some((set) => set.completed);
    prElement.querySelector('.last-done').textContent =
        hasCompletedSetInHistory && prs.lastCompleted
            ? new Date(prs.lastCompleted).toLocaleDateString()
            : 'Never';

    if (!previousData) return;

    exerciseElement.querySelector('.soreness-rating').value = previousData.soreness || '0';
    exerciseElement.querySelector('.exertion-rating').value = previousData.exertion || '3';
    if (previousData.variant) {
        exerciseElement.querySelector('.exercise-variant').value = previousData.variant;
    }

    if (!previousData.sets) return;

    const setRows = setsContainer.querySelectorAll('.set-row');
    previousData.sets.forEach((set, index) => {
        const row = setRows[index];
        if (!row) return;
        if (set.completed) {
            row.classList.add('completed');
            row.querySelector('.complete-set').textContent = '✓';
        }
        if (isTimed) return;
        const weightInput = row.querySelector('.weight-input');
        const repsInput = row.querySelector('.reps-input');
        if (weightInput) weightInput.value = set.weight || '';
        if (repsInput) repsInput.value = set.reps || '';
    });
}

function createSetRow(setNumber, repsPlaceholder) {
    const setElement = setTemplate.content.cloneNode(true);
    setElement.querySelector('.set-label').textContent = `Set ${setNumber}:`;
    const repsInput = setElement.querySelector('.reps-input');
    if (repsPlaceholder) repsInput.placeholder = repsPlaceholder;
    return setElement;
}

function createTimedSetRow(setNumber, durationSeconds) {
    const setElement = timedSetTemplate.content.cloneNode(true);
    const row = setElement.querySelector('.timed-set-row');
    row.dataset.durationSeconds = durationSeconds;
    setElement.querySelector('.set-label').textContent = `Set ${setNumber}:`;
    setElement.querySelector('.timer-countdown').textContent = formatSeconds(durationSeconds);
    return setElement;
}

function addSetToExercise(button) {
    const exerciseItem = button.closest('.exercise-item');
    if (exerciseItem.dataset.exerciseType === 'timed') return;
    const setsContainer = exerciseItem.querySelector('.sets-container');
    const currentSets = setsContainer.querySelectorAll('.set-row').length;
    const repsInput = exerciseItem.querySelector('.reps-input');
    const placeholder = repsInput ? repsInput.placeholder : 'Reps';
    setsContainer.appendChild(createSetRow(currentSets + 1, placeholder));
}

function markSetCompleteFromRow(setRow, doSave = true) {
    const exerciseItem = setRow.closest('.exercise-item');
    const hasCompletedSet = exerciseItem.querySelector('.set-row.completed') !== null;
    const lastDoneSpan = exerciseItem.querySelector('.last-done');
    lastDoneSpan.textContent = hasCompletedSet ? new Date().toLocaleDateString() : 'Never';
    if (doSave) saveWorkout(false);
}

function markSetComplete(button) {
    const setRow = button.closest('.set-row');
    setRow.classList.toggle('completed');
    markSetCompleteFromRow(setRow);
}

function collectSetsFromExercise(exerciseEl) {
    const isTimed = exerciseEl.dataset.exerciseType === 'timed';
    const sets = [];
    exerciseEl.querySelectorAll('.set-row').forEach((setRow) => {
        if (isTimed) {
            sets.push({ completed: setRow.classList.contains('completed') });
        } else {
            const weightInput = setRow.querySelector('.weight-input');
            sets.push({
                weight: weightInput ? weightInput.value : '',
                reps: setRow.querySelector('.reps-input').value,
                completed: setRow.classList.contains('completed')
            });
        }
    });
    return sets;
}

function getBodyPartForExercise(exerciseEl) {
    let currentElement = exerciseEl;
    while (currentElement) {
        currentElement = currentElement.previousElementSibling;
        if (currentElement && currentElement.tagName === 'H4') {
            return currentElement.textContent;
        }
    }
    return '';
}

function updatePersonalRecords(exerciseKey, sets, repsOnly) {
    let bestWeight = 0;
    let bestReps = 0;

    sets.forEach((set) => {
        const weight = parseFloat(set.weight) || 0;
        const reps = parseInt(set.reps, 10) || 0;
        if (!repsOnly && weight > bestWeight) bestWeight = weight;
        if (reps > bestReps) bestReps = reps;
    });

    const currentPR = lookupPR(exerciseKey);
    personalRecords[exerciseKey] = {
        bestWeight: repsOnly ? 0 : Math.max(bestWeight, currentPR.bestWeight || 0),
        bestReps: Math.max(bestReps, currentPR.bestReps || 0),
        lastCompleted: getTodayDate()
    };
    localStorage.setItem('personalRecords', JSON.stringify(personalRecords));
}

function saveWorkout(showAlert = true) {
    const workoutDate = getTodayDate();
    const exercises = workoutContainer.querySelectorAll('.exercise-item');

    let allExercisesHaveCompletedSet = exercises.length > 0;
    exercises.forEach((exercise) => {
        if (!exercise.querySelector('.set-row.completed')) {
            allExercisesHaveCompletedSet = false;
        }
    });

    if (allExercisesHaveCompletedSet) {
        const dateKey = getSessionDateKey();
        const programDates = workoutDates[currentProgram] || {};
        if (!programDates[dateKey]) programDates[dateKey] = [];
        if (!programDates[dateKey].includes(workoutDate)) {
            programDates[dateKey].push(workoutDate);
            if (programDates[dateKey].length > 10) {
                programDates[dateKey] = programDates[dateKey]
                    .sort((a, b) => new Date(b) - new Date(a))
                    .slice(0, 10);
            }
            workoutDates[currentProgram] = programDates;
            localStorage.setItem('workoutDates', JSON.stringify(workoutDates));
        }
    }

    exercises.forEach((exercise) => {
        const exerciseName = exercise.querySelector('.exercise-name').textContent;
        const bodyPart = getBodyPartForExercise(exercise);
        if (!bodyPart) return;

        const exerciseKey = getExerciseKey(bodyPart, exerciseName);
        const sets = collectSetsFromExercise(exercise);
        const repsOnly = isBodyweightProgram();

        workoutHistory[exerciseKey] = {
            date: workoutDate,
            variant: exercise.querySelector('.exercise-variant').value,
            soreness: exercise.querySelector('.soreness-rating').value,
            exertion: exercise.querySelector('.exertion-rating').value,
            sets
        };

        if (exercise.dataset.exerciseType !== 'timed') {
            updatePersonalRecords(exerciseKey, sets, repsOnly);
        }
    });

    localStorage.setItem('workoutHistory', JSON.stringify(workoutHistory));
    if (showAlert) alert('Workout progress saved!');
}

function clearAllChecks() {
    const completedSets = workoutContainer.querySelectorAll('.set-row.completed');
    if (completedSets.length === 0) {
        alert('No completed sets to clear!');
        return;
    }

    completedSets.forEach((setRow) => {
        setRow.classList.remove('completed');
        const checkButton = setRow.querySelector('.complete-set');
        if (checkButton) checkButton.textContent = '✓';
        const timer = getSetTimer(setRow);
        if (timer) timer.reset();
    });

    workoutContainer.querySelectorAll('.exercise-item').forEach((exercise) => {
        const hasCompletedSet = exercise.querySelector('.set-row.completed') !== null;
        exercise.querySelector('.last-done').textContent = hasCompletedSet
            ? new Date().toLocaleDateString()
            : 'Never';
    });

    saveWorkout(false);
    alert('All checkmarks cleared! You can now do the exercises again.');
}

function exportData() {
    const dataStr = JSON.stringify(
        { workoutHistory, personalRecords, workoutDates },
        null,
        2
    );
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workout-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function goToNextExercise(button) {
    const currentExercise = button.closest('.exercise-item');
    let nextExercise = currentExercise.nextElementSibling;

    while (nextExercise && !nextExercise.classList.contains('exercise-item')) {
        nextExercise = nextExercise.nextElementSibling;
    }

    if (nextExercise && nextExercise.classList.contains('exercise-item')) {
        nextExercise.scrollIntoView({ behavior: 'smooth', block: 'start' });
        nextExercise.style.transition = 'all 0.3s ease';
        nextExercise.style.transform = 'scale(1.02)';
        nextExercise.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
        setTimeout(() => {
            nextExercise.style.transform = 'scale(1)';
            nextExercise.style.boxShadow = '';
        }, 1000);
    } else {
        alert('This is the last exercise! Great job completing your workout!');
        workoutContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

selectProgram(currentProgram);
