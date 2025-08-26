// State management
let currentDay = null;
let workoutHistory = JSON.parse(localStorage.getItem('workoutHistory')) || {};
let personalRecords = JSON.parse(localStorage.getItem('personalRecords')) || {};
let workoutDates = JSON.parse(localStorage.getItem('workoutDates')) || {
    day1: [],
    day2: [],
    day3: []
};

// Helper function to get today's date in YYYY-MM-DD format
function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// DOM Elements
const workoutContainer = document.getElementById('workout-container');
const exerciseTemplate = document.getElementById('exercise-template');
const setTemplate = document.getElementById('set-template');

function formatWorkoutDates(dates) {
    if (!dates || dates.length === 0) return 'Never';
    
    // Sort dates in descending order
    const sortedDates = [...dates].sort((a, b) => new Date(b) - new Date(a));
    
    // Get the last 3 dates
    const recentDates = sortedDates.slice(0, 3);
    
    // Format dates
    return recentDates.map(date => new Date(date).toLocaleDateString()).join(', ');
}

function updateLastCompletedDate() {
    const lastCompletedSpan = document.getElementById('last-completed-date');
    const dayDates = workoutDates[`day${currentDay}`] || [];
    lastCompletedSpan.textContent = formatWorkoutDates(dayDates);
}

function getPersonalRecords(exerciseKey) {
    if (!personalRecords[exerciseKey]) {
        return { bestWeight: 0, bestReps: 0, lastCompleted: null };
    }
    return personalRecords[exerciseKey];
}

function updatePersonalRecords(exerciseKey, sets) {
    let bestWeight = 0;
    let bestReps = 0;
    
    sets.forEach(set => {
        const weight = parseFloat(set.weight) || 0;
        const reps = parseInt(set.reps) || 0;
        
        if (weight > bestWeight) bestWeight = weight;
        if (reps > bestReps) bestReps = reps;
    });

    const currentPR = personalRecords[exerciseKey] || { bestWeight: 0, bestReps: 0 };
    
    personalRecords[exerciseKey] = {
        bestWeight: Math.max(bestWeight, currentPR.bestWeight),
        bestReps: Math.max(bestReps, currentPR.bestReps),
        lastCompleted: getTodayDate()
    };
    
    localStorage.setItem('personalRecords', JSON.stringify(personalRecords));
}

function selectDay(day) {
    currentDay = day;
    renderWorkout();
    updateLastCompletedDate();
    
    // Update active button state
    document.querySelectorAll('.btn-group .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.btn-group .btn:nth-child(${day})`).classList.add('active');
}

function renderWorkout() {
    workoutContainer.innerHTML = '';
    const dayData = workoutData[`day${currentDay}`];
    
    dayData.forEach(section => {
        // Add body part header
        const bodyPartHeader = document.createElement('h4');
        bodyPartHeader.className = 'mt-4 mb-3';
        bodyPartHeader.textContent = section.bodyPart;
        workoutContainer.appendChild(bodyPartHeader);

        // Render exercises
        section.exercises.forEach(exercise => {
            const exerciseElement = exerciseTemplate.content.cloneNode(true);
            
            // Set exercise name and details
            exerciseElement.querySelector('.exercise-name').textContent = exercise.name;
            exerciseElement.querySelector('.exercise-details').textContent = 
                `${exercise.sets} sets | ${exercise.repRange} reps`;
            
            // Populate exercise variants dropdown
            const variantSelect = exerciseElement.querySelector('.exercise-variant');
            exercise.options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option;
                optionElement.textContent = option;
                variantSelect.appendChild(optionElement);
            });
            
            // Add initial set inputs
            const setsContainer = exerciseElement.querySelector('.sets-container');
            for (let i = 0; i < exercise.sets; i++) {
                setsContainer.appendChild(createSetRow(i + 1));
            }

            // Generate exercise key for both PRs and history
            const exerciseKey = `day${currentDay}-${section.bodyPart}-${exercise.name}`;
            
            // Load PRs
            const prs = getPersonalRecords(exerciseKey);
            const prElement = exerciseElement.querySelector('.personal-records');
            prElement.querySelector('.best-weight').textContent = prs.bestWeight ? `${prs.bestWeight}kg` : 'None';
            prElement.querySelector('.best-reps').textContent = prs.bestReps ? `${prs.bestReps} reps` : 'None';
            
            // Only show last completed date if there's a completed set in the history
            const previousData = workoutHistory[exerciseKey];
            const hasCompletedSetInHistory = previousData && previousData.sets && 
                previousData.sets.some(set => set.completed);
            prElement.querySelector('.last-done').textContent = 
                (hasCompletedSetInHistory && prs.lastCompleted) ? 
                new Date(prs.lastCompleted).toLocaleDateString() : 'Never';

            // Load previous workout data if exists
            if (previousData) {
                const soreness = exerciseElement.querySelector('.soreness-rating');
                const exertion = exerciseElement.querySelector('.exertion-rating');
                const variant = exerciseElement.querySelector('.exercise-variant');
                soreness.value = previousData.soreness || '0';
                exertion.value = previousData.exertion || '3';
                if (previousData.variant) {
                    variant.value = previousData.variant;
                }

                if (previousData.sets) {
                    const setRows = setsContainer.querySelectorAll('.set-row');
                    previousData.sets.forEach((set, index) => {
                        if (setRows[index]) {
                            const weightInput = setRows[index].querySelector('.weight-input');
                            const repsInput = setRows[index].querySelector('.reps-input');
                            if (set.completed) {
                                setRows[index].classList.add('completed');
                                setRows[index].querySelector('.complete-set').textContent = '✓';
                            }
                            weightInput.value = set.weight || '';
                            repsInput.value = set.reps || '';
                        }
                    });
                }
            }

            workoutContainer.appendChild(exerciseElement);
        });
    });
}

function createSetRow(setNumber) {
    const setElement = setTemplate.content.cloneNode(true);
    setElement.querySelector('.col-form-label-sm').textContent = `Set ${setNumber}:`;
    return setElement;
}

function addSetToExercise(button) {
    const exerciseItem = button.closest('.exercise-item');
    const setsContainer = exerciseItem.querySelector('.sets-container');
    const currentSets = setsContainer.querySelectorAll('.set-row').length;
    const newSetNumber = currentSets + 1;
    
    setsContainer.appendChild(createSetRow(newSetNumber));
}

function markSetComplete(button) {
    const setRow = button.closest('.set-row');
    const exerciseItem = button.closest('.exercise-item');
    const wasCompleted = setRow.classList.contains('completed');
    
    setRow.classList.toggle('completed');
    button.textContent = !wasCompleted ? '✓' : '✓';

    // Only update last completed date if at least one set is completed
    const hasCompletedSet = exerciseItem.querySelector('.set-row.completed') !== null;
    const lastDoneSpan = exerciseItem.querySelector('.last-done');
    if (hasCompletedSet) {
        const today = new Date().toLocaleDateString();
        lastDoneSpan.textContent = today;
    } else {
        lastDoneSpan.textContent = 'Never';
    }
}

function saveWorkout() {
    const workoutDate = getTodayDate();

    // Get all exercises
    const exercises = workoutContainer.querySelectorAll('.exercise-item');
    
    // Check if all exercises have at least one completed set
    let allExercisesHaveCompletedSet = true;
    exercises.forEach(exercise => {
        const hasCompletedSet = exercise.querySelector('.set-row.completed') !== null;
        if (!hasCompletedSet) {
            allExercisesHaveCompletedSet = false;
        }
    });

    // Only update the workout dates if all exercises have at least one completed set
    if (allExercisesHaveCompletedSet) {
        const dayKey = `day${currentDay}`;
        if (!workoutDates[dayKey].includes(workoutDate)) {
            workoutDates[dayKey].push(workoutDate);
            // Keep only the last 10 dates
            if (workoutDates[dayKey].length > 10) {
                workoutDates[dayKey] = workoutDates[dayKey].sort((a, b) => new Date(b) - new Date(a)).slice(0, 10);
            }
            localStorage.setItem('workoutDates', JSON.stringify(workoutDates));
            updateLastCompletedDate(); // Update the display immediately
        }
    }
    exercises.forEach(exercise => {
        const exerciseName = exercise.querySelector('.exercise-name').textContent;
        // Find the body part header by walking up the DOM tree
        let currentElement = exercise;
        let bodyPartHeader = null;
        while (currentElement && !bodyPartHeader) {
            currentElement = currentElement.previousElementSibling;
            if (currentElement && currentElement.tagName === 'H4') {
                bodyPartHeader = currentElement;
            }
        }
        const bodyPart = bodyPartHeader ? bodyPartHeader.textContent : '';
        if (!bodyPart) {
            console.error('Could not find body part header for exercise:', exerciseName);
            return;
        }
        const exerciseKey = `day${currentDay}-${bodyPart}-${exerciseName}`;
        
        const sets = [];
        exercise.querySelectorAll('.set-row').forEach(setRow => {
            sets.push({
                weight: setRow.querySelector('.weight-input').value,
                reps: setRow.querySelector('.reps-input').value,
                completed: setRow.classList.contains('completed')
            });
        });

        workoutHistory[exerciseKey] = {
            date: workoutDate,
            variant: exercise.querySelector('.exercise-variant').value,
            soreness: exercise.querySelector('.soreness-rating').value,
            exertion: exercise.querySelector('.exertion-rating').value,
            sets: sets
        };

        // Update PRs
        updatePersonalRecords(exerciseKey, sets);
    });

    localStorage.setItem('workoutHistory', JSON.stringify(workoutHistory));
    alert('Workout progress saved!');
}

function exportData() {
    const dataStr = JSON.stringify(workoutHistory, null, 2);
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

// Initialize with Day 1
selectDay(1);
