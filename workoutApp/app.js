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

let workoutHistory = loadStoredJson('workoutHistory', {});
let personalRecords = loadStoredJson('personalRecords', {});
let workoutDates = migrateWorkoutDates(loadStoredJson('workoutDates', null));
let completedSessions = loadStoredJson('completedSessions', []);
if (!Array.isArray(completedSessions)) completedSessions = [];

const setTimerInstances = new WeakMap();
let warmupTimer = null;
let audioContext = null;

const workoutContainer = document.getElementById('workout-container');
const exerciseTemplate = document.getElementById('exercise-template');
const setTemplate = document.getElementById('set-template');
const timedSetTemplate = document.getElementById('timed-set-template');

function loadStoredJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return parsed == null ? fallback : parsed;
    } catch (e) {
        return fallback;
    }
}

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

function exerciseKeyFor(program, session, bodyPart, exerciseName) {
    if (program === 'toolish') {
        return `toolish-day${session}-${bodyPart}-${exerciseName}`;
    }
    return `bodyweight-${session}-${bodyPart}-${exerciseName}`;
}

function getExerciseKey(bodyPart, exerciseName) {
    return exerciseKeyFor(currentProgram, currentSession, bodyPart, exerciseName);
}

function laterDate(a, b) {
    if (!a) return b || null;
    if (!b) return a;
    return a >= b ? a : b;
}

function formatDisplayDate(isoDate) {
    if (!isoDate) return 'Never';
    const match = String(isoDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return 'Never';
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).toLocaleDateString();
}

function sessionLabel(program, sessionId) {
    const match = PROGRAMS[program]?.sessions.find((session) => session.id === String(sessionId));
    return match ? match.label : String(sessionId);
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
    document.querySelectorAll('#program-tabs .nav-link').forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.program === program);
    });

    const workoutLayout = document.getElementById('workout-layout');
    const dashboardView = document.getElementById('dashboard-view');

    if (program === 'dashboard') {
        localStorage.setItem('workoutView', 'dashboard');
        workoutLayout.classList.add('d-none');
        dashboardView.classList.remove('d-none');
        renderDashboard();
        return;
    }

    localStorage.setItem('workoutView', 'workout');
    dashboardView.classList.add('d-none');
    workoutLayout.classList.remove('d-none');

    currentProgram = program;
    localStorage.setItem('workoutProgram', program);

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

function applyVariant(exerciseElement, variant) {
    if (!variant) return;
    const variantSelect = exerciseElement.querySelector('.exercise-variant');
    if (!variantSelect) return;
    const hasOption = Array.from(variantSelect.options).some((opt) => opt.value === variant);
    if (!hasOption) {
        const option = document.createElement('option');
        option.value = variant;
        option.textContent = variant;
        variantSelect.appendChild(option);
    }
    variantSelect.value = variant;
}

function ensureSetRowCount(setsContainer, count) {
    const existing = setsContainer.querySelectorAll('.set-row').length;
    if (count <= existing) return;
    const placeholder = setsContainer.querySelector('.reps-input')?.placeholder || 'Reps';
    for (let i = existing; i < count; i++) {
        setsContainer.appendChild(createSetRow(i + 1, placeholder));
    }
}

function applyExerciseHistory(exerciseElement, bodyPart, exerciseName, setsContainer, isTimed) {
    const exerciseKey = getExerciseKey(bodyPart, exerciseName);
    const prs = lookupPR(exerciseKey);
    const prElement = exerciseElement.querySelector('.personal-records');
    prElement.querySelector('.best-weight').textContent = prs.bestWeight ? `${prs.bestWeight}kg` : 'None';
    prElement.querySelector('.best-reps').textContent = prs.bestReps ? `${prs.bestReps} reps` : 'None';

    const previousData = lookupHistory(exerciseKey);
    prElement.querySelector('.last-done').textContent = formatDisplayDate(
        laterDate(prs.lastCompleted, previousData?.date)
    );

    if (!previousData) return;

    exerciseElement.querySelector('.soreness-rating').value = previousData.soreness || '0';
    exerciseElement.querySelector('.exertion-rating').value = previousData.exertion || '3';
    applyVariant(exerciseElement, previousData.variant);

    if (!previousData.sets) return;

    if (!isTimed) {
        ensureSetRowCount(setsContainer, previousData.sets.length);
        if (isBodyweightProgram()) {
            setsContainer.querySelectorAll('.weight-col').forEach((el) => el.classList.add('d-none'));
        }
    }

    const restoreChecks = previousData.inProgress !== false;
    const setRows = setsContainer.querySelectorAll('.set-row');
    previousData.sets.forEach((set, index) => {
        const row = setRows[index];
        if (!row) return;
        if (restoreChecks && set.completed) {
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

function storedLastDoneLabel(exerciseEl) {
    const bodyPart = getBodyPartForExercise(exerciseEl);
    const name = exerciseEl.querySelector('.exercise-name').textContent;
    const exerciseKey = getExerciseKey(bodyPart, name);
    const previous = lookupHistory(exerciseKey);
    return formatDisplayDate(laterDate(lookupPR(exerciseKey).lastCompleted, previous?.date));
}

function markSetCompleteFromRow(setRow, doSave = true) {
    const exerciseItem = setRow.closest('.exercise-item');
    const hasCompletedSet = exerciseItem.querySelector('.set-row.completed') !== null;
    const lastDoneSpan = exerciseItem.querySelector('.last-done');
    lastDoneSpan.textContent = hasCompletedSet
        ? new Date().toLocaleDateString()
        : storedLastDoneLabel(exerciseItem);
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

function dayIsComplete(exerciseEls) {
    return exerciseEls.length > 0 && exerciseEls.every((exercise) =>
        exercise.querySelector('.set-row.completed')
    );
}

function recordWorkoutDate(workoutDate) {
    const dateKey = getSessionDateKey();
    const programDates = workoutDates[currentProgram] || {};
    if (!programDates[dateKey]) programDates[dateKey] = [];
    if (!programDates[dateKey].includes(workoutDate)) {
        programDates[dateKey].push(workoutDate);
        workoutDates[currentProgram] = programDates;
        localStorage.setItem('workoutDates', JSON.stringify(workoutDates));
    }
}

function persistCompletedSessions() {
    localStorage.setItem('completedSessions', JSON.stringify(completedSessions));
}

function upsertCompletedSession(workoutDate, exercises) {
    const session = {
        id: `${currentProgram}-${currentSession}-${workoutDate}`,
        date: workoutDate,
        program: currentProgram,
        session: String(currentSession),
        exercises
    };
    const index = completedSessions.findIndex((existing) => existing.id === session.id);
    if (index >= 0) completedSessions[index] = session;
    else completedSessions.push(session);
    persistCompletedSessions();
}

function saveWorkout(showAlert = true) {
    const workoutDate = getTodayDate();
    const exerciseEls = [...workoutContainer.querySelectorAll('.exercise-item')];
    const complete = dayIsComplete(exerciseEls);
    const sessionExercises = [];

    exerciseEls.forEach((exercise) => {
        const exerciseName = exercise.querySelector('.exercise-name').textContent;
        const bodyPart = getBodyPartForExercise(exercise);
        if (!bodyPart) return;

        const sets = collectSetsFromExercise(exercise);
        const isTimed = exercise.dataset.exerciseType === 'timed';
        const record = {
            bodyPart,
            name: exerciseName,
            variant: exercise.querySelector('.exercise-variant').value,
            soreness: exercise.querySelector('.soreness-rating').value,
            exertion: exercise.querySelector('.exertion-rating').value,
            type: isTimed ? 'timed' : 'reps',
            sets
        };
        sessionExercises.push(record);

        workoutHistory[getExerciseKey(bodyPart, exerciseName)] = {
            date: workoutDate,
            variant: record.variant,
            soreness: record.soreness,
            exertion: record.exertion,
            sets,
            inProgress: !complete
        };

        if (!isTimed) {
            updatePersonalRecords(getExerciseKey(bodyPart, exerciseName), sets, isBodyweightProgram());
        }
    });

    if (complete) {
        recordWorkoutDate(workoutDate);
        upsertCompletedSession(workoutDate, sessionExercises);
    }

    localStorage.setItem('workoutHistory', JSON.stringify(workoutHistory));
    if (showAlert) alert('Workout progress saved!');
    return complete;
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
        exercise.querySelector('.last-done').textContent = storedLastDoneLabel(exercise);
    });

    saveWorkout(false);
    alert('All checkmarks cleared! You can now do the exercises again.');
}

function exportData() {
    if (!completedSessions.length) {
        alert('No completed days to export yet. Finish every exercise in a day first.');
        return;
    }

    const dataStr = JSON.stringify(
        {
            version: 1,
            exportedAt: new Date().toISOString(),
            completedSessions: [...completedSessions].sort((a, b) =>
                String(a.date || '').localeCompare(String(b.date || ''))
            )
        },
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

function findExerciseInSections(sections, rest) {
    if (!sections || !rest) return null;
    const sorted = [...sections].sort((a, b) => b.bodyPart.length - a.bodyPart.length);
    for (const section of sorted) {
        const prefix = `${section.bodyPart}-`;
        if (!rest.startsWith(prefix)) continue;
        const name = rest.slice(prefix.length);
        const exercise = section.exercises.find((item) => item.name === name);
        if (!exercise) continue;
        return {
            bodyPart: section.bodyPart,
            name: exercise.name,
            type: exercise.type === 'timed' ? 'timed' : 'reps'
        };
    }
    return null;
}

function parseExerciseKey(exerciseKey) {
    let match = exerciseKey.match(/^toolish-day(\d+)-([\s\S]+)$/);
    if (match) {
        const found = findExerciseInSections(workoutData[`day${match[1]}`], match[2]);
        if (found) return { program: 'toolish', session: match[1], ...found };
    }

    match = exerciseKey.match(/^day(\d+)-([\s\S]+)$/);
    if (match) {
        const found = findExerciseInSections(workoutData[`day${match[1]}`], match[2]);
        if (found) return { program: 'toolish', session: match[1], ...found };
    }

    match = exerciseKey.match(/^bodyweight-(push|pull|legs|fullBody)-([\s\S]+)$/);
    if (match) {
        const sections = athleticTrainingData[match[1]]?.sections;
        const found = findExerciseInSections(sections, match[2]);
        if (found) return { program: 'bodyweight', session: match[1], ...found };
    }

    return null;
}

function isCompletedSession(session) {
    return Boolean(
        session
        && typeof session.id === 'string'
        && typeof session.program === 'string'
        && session.session != null
        && Array.isArray(session.exercises)
    );
}

function sessionsFromLegacyHistory(history) {
    const grouped = {};
    Object.entries(history || {}).forEach(([key, entry]) => {
        const parsed = parseExerciseKey(key);
        if (!parsed || !entry || typeof entry !== 'object') return;
        const date = typeof entry.date === 'string' && entry.date ? entry.date : 'undated';
        const id = `${parsed.program}-${parsed.session}-${date}`;
        if (!grouped[id]) {
            grouped[id] = {
                id,
                date: date === 'undated' ? getTodayDate() : date,
                program: parsed.program,
                session: String(parsed.session),
                exercises: []
            };
        }
        grouped[id].exercises.push({
            bodyPart: parsed.bodyPart,
            name: parsed.name,
            variant: entry.variant || parsed.name,
            soreness: entry.soreness || '0',
            exertion: entry.exertion || '3',
            type: parsed.type,
            sets: Array.isArray(entry.sets) ? entry.sets : []
        });
    });
    return Object.values(grouped);
}

function sessionsFromImport(data) {
    if (Array.isArray(data)) return data.filter(isCompletedSession);
    if (!data || typeof data !== 'object') return null;
    if (Array.isArray(data.completedSessions)) return data.completedSessions.filter(isCompletedSession);
    if (data.workoutHistory && typeof data.workoutHistory === 'object') {
        return sessionsFromLegacyHistory(data.workoutHistory);
    }
    return null;
}

function mergeImportedRecords(personalRecordsFromFile) {
    if (!personalRecordsFromFile || typeof personalRecordsFromFile !== 'object') return;
    Object.entries(personalRecordsFromFile).forEach(([key, record]) => {
        if (!record || typeof record !== 'object') return;
        const current = lookupPR(key);
        personalRecords[key] = {
            bestWeight: Math.max(current.bestWeight || 0, Number(record.bestWeight) || 0),
            bestReps: Math.max(current.bestReps || 0, Number(record.bestReps) || 0),
            lastCompleted: laterDate(current.lastCompleted, record.lastCompleted || null)
        };
    });
}

function considerPersonalRecord(exerciseKey, sets, repsOnly, date) {
    let bestWeight = 0;
    let bestReps = 0;
    (sets || []).forEach((set) => {
        const weight = parseFloat(set.weight) || 0;
        const reps = parseInt(set.reps, 10) || 0;
        if (!repsOnly && weight > bestWeight) bestWeight = weight;
        if (reps > bestReps) bestReps = reps;
    });
    const current = lookupPR(exerciseKey);
    personalRecords[exerciseKey] = {
        bestWeight: repsOnly ? 0 : Math.max(bestWeight, current.bestWeight || 0),
        bestReps: Math.max(bestReps, current.bestReps || 0),
        lastCompleted: laterDate(current.lastCompleted, date)
    };
}

function applyCompletedSessionsToLatest() {
    const newest = new Map();
    completedSessions.forEach((session) => {
        (session.exercises || []).forEach((exercise) => {
            const key = exerciseKeyFor(session.program, session.session, exercise.bodyPart, exercise.name);
            const prev = newest.get(key);
            if (!prev || String(session.date || '') >= String(prev.date || '')) {
                newest.set(key, { date: session.date, exercise });
            }
            if (exercise.type !== 'timed') {
                considerPersonalRecord(
                    key,
                    exercise.sets,
                    session.program === 'bodyweight',
                    session.date
                );
            }
        });
    });

    newest.forEach((value, key) => {
        const exercise = value.exercise;
        workoutHistory[key] = {
            date: value.date,
            variant: exercise.variant,
            soreness: exercise.soreness,
            exertion: exercise.exertion,
            sets: exercise.sets || [],
            inProgress: false
        };
    });

    localStorage.setItem('workoutHistory', JSON.stringify(workoutHistory));
    localStorage.setItem('personalRecords', JSON.stringify(personalRecords));
}

function mergeCompletedSessions(incoming) {
    incoming.forEach((session) => {
        const normalized = {
            ...session,
            session: String(session.session)
        };
        const index = completedSessions.findIndex((existing) => existing.id === normalized.id);
        if (index >= 0) completedSessions[index] = normalized;
        else completedSessions.push(normalized);
    });
    persistCompletedSessions();
}

function importData(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            const incoming = sessionsFromImport(data);
            if (!incoming) {
                alert('That file is not a workout export.');
                return;
            }
            if (!incoming.length) {
                alert('That file has no completed workouts.');
                return;
            }
            mergeCompletedSessions(incoming);
            applyCompletedSessionsToLatest();
            if (data && typeof data === 'object' && !Array.isArray(data)) {
                mergeImportedRecords(data.personalRecords);
                localStorage.setItem('personalRecords', JSON.stringify(personalRecords));
            }
            renderWorkout();
            const count = incoming.length;
            alert(`Imported ${count} workout day${count === 1 ? '' : 's'}. Last reps are filled in for those days.`);
        } catch (e) {
            alert('Could not read that file. Choose a JSON export.');
        }
    };
    reader.readAsText(file);
}

function formatHistorySet(set, index, type) {
    const label = `Set ${index + 1}`;
    if (type === 'timed') {
        return `${label}: ${set.completed ? 'Completed' : 'Not completed'}`;
    }
    const parts = [];
    if (set.weight !== '' && set.weight != null) parts.push(`${set.weight} kg`);
    if (set.reps !== '' && set.reps != null) parts.push(`${set.reps} reps`);
    const detail = parts.length ? parts.join(' × ') : 'No weight or reps';
    return set.completed ? `${label}: ${detail}` : `${label}: ${detail} (not completed)`;
}

function renderHistorySession(session) {
    const wrap = document.createElement('section');
    wrap.className = 'history-session';

    const heading = document.createElement('h6');
    heading.className = 'history-session-title mb-1';
    const programLabel = PROGRAMS[session.program]?.label || session.program;
    heading.textContent = `${formatDisplayDate(session.date)} · ${programLabel} · ${sessionLabel(session.program, session.session)}`;
    wrap.appendChild(heading);

    (session.exercises || []).forEach((exercise) => {
        const block = document.createElement('div');
        block.className = 'history-exercise';

        const name = document.createElement('div');
        name.className = 'fw-semibold';
        const variant = exercise.variant && exercise.variant !== exercise.name
            ? ` (${exercise.variant})`
            : '';
        name.textContent = `${exercise.name}${variant}`;
        block.appendChild(name);

        if (exercise.bodyPart) {
            const part = document.createElement('div');
            part.className = 'small text-muted';
            part.textContent = exercise.bodyPart;
            block.appendChild(part);
        }

        const list = document.createElement('ul');
        list.className = 'history-set-list';
        const sets = exercise.sets || [];
        if (!sets.length) {
            const item = document.createElement('li');
            item.textContent = 'No sets recorded';
            list.appendChild(item);
        } else {
            sets.forEach((set, index) => {
                const item = document.createElement('li');
                item.textContent = formatHistorySet(set, index, exercise.type);
                list.appendChild(item);
            });
        }
        block.appendChild(list);
        wrap.appendChild(block);
    });

    return wrap;
}

function openHistory() {
    const body = document.getElementById('history-modal-body');
    body.innerHTML = '';
    const sessions = [...completedSessions].sort((a, b) =>
        String(b.date || '').localeCompare(String(a.date || ''))
    );

    if (!sessions.length) {
        const empty = document.createElement('p');
        empty.className = 'text-muted mb-0';
        empty.textContent = 'No finished workouts yet. Complete every exercise in a day to save it here.';
        body.appendChild(empty);
    } else {
        sessions.forEach((session) => body.appendChild(renderHistorySession(session)));
    }

    bootstrap.Modal.getOrCreateInstance(document.getElementById('history-modal')).show();
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
        const complete = saveWorkout(false);
        if (complete) {
            alert('Great job completing your workout! This day has been saved.');
        } else {
            alert('Mark at least one set complete on every exercise to save this day.');
        }
        workoutContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

const MUSCLE_CATEGORIES = [
    { id: 'chest', label: 'Chest' },
    { id: 'back', label: 'Back' },
    { id: 'quads', label: 'Quads' },
    { id: 'hamstrings', label: 'Hamstrings' },
    { id: 'glutes', label: 'Glutes' },
    { id: 'shoulders', label: 'Shoulders' },
    { id: 'biceps', label: 'Biceps' },
    { id: 'triceps', label: 'Triceps' },
    { id: 'calves', label: 'Calves' }
];

const EXERCISE_CLASSIFICATION = {
    'horizontal push': { muscle: 'chest', direction: 'push' },
    'incline push': { muscle: 'chest', direction: 'push' },
    'vertical pull': { muscle: 'back', direction: 'pull' },
    'horizontal pull': { muscle: 'back', direction: 'pull' },
    'normal curl': { muscle: 'biceps', direction: 'pull' },
    'peak focused curl': { muscle: 'biceps', direction: 'pull' },
    'brachialis & brachioradialis curl': { muscle: 'biceps', direction: 'pull' },
    'lateral raise': { muscle: 'shoulders', direction: 'push' },
    'rear delt movement': { muscle: 'shoulders', direction: 'pull' },
    'overhead press': { muscle: 'shoulders', direction: 'push' },
    'overhead extension': { muscle: 'triceps', direction: 'push' },
    'lateral head isolation': { muscle: 'triceps', direction: 'push' },
    'squat': { muscle: 'quads', direction: 'push' },
    'leg isolation': { muscle: 'quads', direction: 'push' },
    'lunges': { muscle: 'quads', direction: 'push' },
    'hip hinge movement': { muscle: 'hamstrings', direction: 'push' },
    'hamstring curl': { muscle: 'hamstrings', direction: 'pull' },
    'hip thrust': { muscle: 'glutes', direction: 'push' },
    'calf raise': { muscle: 'calves', direction: 'push' },
    'dips': { muscle: 'chest', direction: 'push' },
    'lizard crawl': { muscle: 'chest', direction: 'push' },
    'push ups': { muscle: 'chest', direction: 'push' },
    'pike push ups': { muscle: 'shoulders', direction: 'push' },
    'kettlebell halos': { muscle: 'shoulders', direction: 'push' },
    'bodyweight rows': { muscle: 'back', direction: 'pull' },
    'tactical pull ups': { muscle: 'back', direction: 'pull' },
    'goblet curls': { muscle: 'biceps', direction: 'pull' },
    'multi-directional lunge': { muscle: 'quads', direction: 'push' },
    'squat walks': { muscle: 'quads', direction: 'push' },
    'precision broad jumps': { muscle: 'quads', direction: 'push' },
    'kettlebell swing': { muscle: 'hamstrings', direction: 'push' },
    'ab roll out': { muscle: 'core', direction: 'pull' },
    'hollow body hold': { muscle: 'core', direction: 'pull' }
};

const HISTORY_BODY_PARTS = [
    'PUSH DAY', 'PULL DAY', 'LEG DAY', 'FULL BODY',
    'SHOULDERS', 'TRICEPS', 'BICEPS', 'CHEST', 'BACK', 'LEGS'
];

const MUSCLE_BUBBLE_SIZE = 150;
const CORE_BUBBLE_SIZE = 104;
const MUSCLE_FULL_SETS = 12;
const MUSCLE_BURST_AFTER = 15;
const CORE_FULL_SETS = 6;

function toLocalIso(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getCurrentWeekRange() {
    const now = new Date();
    const local = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sunday = new Date(local);
    sunday.setDate(local.getDate() - local.getDay());
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    return {
        start: toLocalIso(sunday),
        end: toLocalIso(saturday),
        sunday,
        saturday
    };
}

function formatWeekHeading(sunday, saturday) {
    const opts = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${sunday.toLocaleDateString(undefined, opts)} - ${saturday.toLocaleDateString(undefined, opts)}`;
}

function classifyExercise(exercise) {
    const name = String(exercise.name || '').trim().toLowerCase();
    const variant = String(exercise.variant || '').trim().toLowerCase();
    if (name === 'lunges' && variant.includes('kickback')) {
        return { muscle: 'glutes', direction: 'push' };
    }
    return EXERCISE_CLASSIFICATION[name] || null;
}

function parseHistoryKey(exerciseKey) {
    let program;
    let session;
    let rest;
    const toolish = String(exerciseKey).match(/^toolish-day(\d+)-([\s\S]+)$/);
    const bodyweight = String(exerciseKey).match(/^bodyweight-(push|pull|legs|fullBody)-([\s\S]+)$/);
    const legacy = String(exerciseKey).match(/^day(\d+)-([\s\S]+)$/);
    if (toolish) {
        program = 'toolish';
        session = toolish[1];
        rest = toolish[2];
    } else if (bodyweight) {
        program = 'bodyweight';
        session = bodyweight[1];
        rest = bodyweight[2];
    } else if (legacy) {
        program = 'toolish';
        session = legacy[1];
        rest = legacy[2];
    } else {
        return null;
    }

    const bodyPart = HISTORY_BODY_PARTS.find((part) => rest.startsWith(`${part}-`));
    if (!bodyPart) return null;
    return {
        program,
        session,
        bodyPart,
        name: rest.slice(bodyPart.length + 1)
    };
}

function exercisesForCurrentWeek(start, end) {
    const byExerciseDate = new Map();

    completedSessions.forEach((session) => {
        const date = String(session.date || '');
        if (date < start || date > end) return;
        (session.exercises || []).forEach((exercise) => {
            const canonical = exerciseKeyFor(session.program, session.session, exercise.bodyPart, exercise.name);
            byExerciseDate.set(`${canonical}|${date}`, exercise);
        });
    });

    Object.entries(workoutHistory)
        .sort(([a], [b]) => {
            const rank = (key) => (key.startsWith('toolish-') || key.startsWith('bodyweight-') ? 1 : 0);
            return rank(a) - rank(b);
        })
        .forEach(([historyKey, record]) => {
            if (!record || typeof record !== 'object') return;
            const date = String(record.date || '');
            if (date < start || date > end) return;
            const parsed = parseHistoryKey(historyKey);
            if (!parsed) return;
            const canonical = exerciseKeyFor(parsed.program, parsed.session, parsed.bodyPart, parsed.name);
            byExerciseDate.set(`${canonical}|${date}`, {
                name: parsed.name,
                bodyPart: parsed.bodyPart,
                variant: record.variant,
                sets: record.sets
            });
        });

    return [...byExerciseDate.values()];
}

function tallyWeekSets(exercises) {
    const totals = { core: { push: 0, pull: 0 } };
    MUSCLE_CATEGORIES.forEach((category) => {
        totals[category.id] = { push: 0, pull: 0 };
    });

    exercises.forEach((exercise) => {
        const classified = classifyExercise(exercise);
        if (!classified || !totals[classified.muscle]) return;
        const completed = (exercise.sets || []).filter((set) => set && set.completed).length;
        totals[classified.muscle][classified.direction] += completed;
    });

    return totals;
}

function hexPoints(count, step) {
    const rowH = step * Math.sqrt(3) / 2;
    const candidates = [];
    for (let row = -8; row <= 8; row++) {
        for (let col = -8; col <= 8; col++) {
            const x = col * step + (Math.abs(row) % 2 ? step / 2 : 0);
            const y = row * rowH;
            candidates.push({ x, y, d: x * x + y * y });
        }
    }
    candidates.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
    return candidates.slice(0, count);
}

function packExtent(count, step, diameter) {
    return hexPoints(count, step).reduce((max, point) => Math.max(max, Math.hypot(point.x, point.y)), 0) + diameter / 2;
}

function layoutSetDots(count, size, fullCount) {
    const inner = size - 4;
    const center = inner / 2;
    const limit = center - 2;
    if (count <= 0) return { diameter: 0, positions: [] };

    let diameter = fullCount <= 6 ? inner * 0.3 : inner * 0.2;
    let step = diameter * 1.12;
    const fullExtent = packExtent(fullCount, step, diameter);
    if (fullExtent > 0) {
        const scale = limit / fullExtent;
        diameter *= scale;
        step *= scale;
    }

    if (count > fullCount) {
        const extent = packExtent(count, step, diameter);
        if (extent > limit) {
            const fitScale = limit / extent;
            diameter *= fitScale;
            step *= fitScale;
        }
    }

    return {
        diameter,
        positions: hexPoints(count, step).map((point) => ({
            x: center + point.x,
            y: center + point.y
        }))
    };
}

function appendSparkles(frame, size) {
    const count = 8;
    const radius = size / 2 + 6;
    const center = size / 2;
    for (let i = 0; i < count; i++) {
        const theta = ((2 * Math.PI * i) / count) - (Math.PI / 2);
        const spark = document.createElement('span');
        spark.className = 'sparkle';
        spark.style.left = `${center + radius * Math.cos(theta)}px`;
        spark.style.top = `${center + radius * Math.sin(theta)}px`;
        spark.style.animationDelay = `${(i * 0.18).toFixed(2)}s`;
        frame.appendChild(spark);
    }
}

function renderSetBubble(parent, label, counts, options) {
    const push = counts.push || 0;
    const pull = counts.pull || 0;
    const total = push + pull;
    const burst = options.burstAt != null && total > options.burstAt;

    const stat = document.createElement('div');
    stat.className = 'muscle-stat' + (options.core ? ' muscle-stat-core' : '');
    stat.dataset.muscle = options.id;
    stat.dataset.total = String(total);
    stat.dataset.burst = burst ? 'true' : 'false';

    const balanced = !options.core && push >= 6 && pull >= 6;
    const reachedTarget = !options.core && total >= MUSCLE_FULL_SETS;
    const sparkly = balanced && !burst;
    const gold = reachedTarget && !balanced && !burst;

    const countsEl = document.createElement('div');
    countsEl.className = 'muscle-counts';
    const pushEl = document.createElement('span');
    pushEl.className = 'push-count';
    pushEl.textContent = String(push);
    const pullEl = document.createElement('span');
    pullEl.className = 'pull-count';
    pullEl.textContent = String(pull);
    const targetEl = document.createElement('span');
    targetEl.className = 'set-target';
    targetEl.textContent = String(options.fullCount);
    targetEl.title = 'Target sets';
    countsEl.append(pushEl, pullEl, targetEl);

    const frame = document.createElement('div');
    frame.className = 'bubble-frame' + (burst ? ' is-burst' : '') + (sparkly ? ' is-sparkly' : '');

    const bubble = document.createElement('div');
    bubble.className = 'muscle-bubble'
        + (options.core ? ' is-core' : '')
        + (burst ? ' is-burst' : '')
        + (gold || sparkly ? ' is-gold' : '')
        + (sparkly ? ' is-sparkly' : '');
    stat.dataset.gold = gold || sparkly ? 'true' : 'false';
    stat.dataset.sparkly = sparkly ? 'true' : 'false';
    const burstNote = burst ? ', you might be overdoing it' : '';
    const goalNote = sparkly ? ', balanced' : (gold ? ', target reached' : '');
    bubble.setAttribute('role', 'img');
    bubble.setAttribute('aria-label', `${label}, ${push} push, ${pull} pull, target ${options.fullCount}${goalNote}${burstNote}`);

    if (burst) {
        const pile = document.createElement('div');
        pile.className = 'dot-pile';
        for (let i = 0; i < push; i++) {
            const dot = document.createElement('span');
            dot.className = 'pile-dot push';
            pile.appendChild(dot);
        }
        for (let i = 0; i < pull; i++) {
            const dot = document.createElement('span');
            dot.className = 'pile-dot pull';
            pile.appendChild(dot);
        }
        bubble.appendChild(pile);
        const warning = document.createElement('p');
        warning.className = 'bubble-warning';
        warning.textContent = 'You might be overdoing it.';
        frame.append(bubble, warning);
    } else {
        bubble.style.width = `${options.size}px`;
        bubble.style.height = `${options.size}px`;
        const layout = layoutSetDots(total, options.size, options.fullCount);
        const directions = [...Array(push).fill('push'), ...Array(pull).fill('pull')];
        directions.forEach((direction, index) => {
            const dot = document.createElement('span');
            dot.className = `set-dot ${direction}`;
            const pos = layout.positions[index];
            dot.style.width = `${layout.diameter}px`;
            dot.style.height = `${layout.diameter}px`;
            dot.style.left = `${pos.x}px`;
            dot.style.top = `${pos.y}px`;
            bubble.appendChild(dot);
        });
        frame.appendChild(bubble);
        if (sparkly) appendSparkles(frame, options.size);
    }

    const name = document.createElement('div');
    name.className = 'muscle-label';
    name.textContent = label;

    stat.append(countsEl, frame, name);
    parent.appendChild(stat);
}

function renderDashboard() {
    const range = getCurrentWeekRange();
    document.getElementById('dashboard-week').textContent = formatWeekHeading(range.sunday, range.saturday);

    const totals = tallyWeekSets(exercisesForCurrentWeek(range.start, range.end));
    const muscleGrid = document.getElementById('dashboard-muscles');
    const coreHost = document.getElementById('dashboard-core');
    muscleGrid.innerHTML = '';
    coreHost.innerHTML = '';

    MUSCLE_CATEGORIES.forEach((category) => {
        renderSetBubble(muscleGrid, category.label, totals[category.id], {
            id: category.id,
            size: MUSCLE_BUBBLE_SIZE,
            fullCount: MUSCLE_FULL_SETS,
            burstAt: MUSCLE_BURST_AFTER
        });
    });

    renderSetBubble(coreHost, 'Core', totals.core, {
        id: 'core',
        size: CORE_BUBBLE_SIZE,
        fullCount: CORE_FULL_SETS,
        burstAt: null,
        core: true
    });
}

if (!PROGRAMS[currentProgram]) currentProgram = 'toolish';
selectProgram('dashboard');
