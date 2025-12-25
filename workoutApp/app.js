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
    if (!lastCompletedSpan) return; // Element may not exist in current UI
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
    
    // Update the last exercise button text
    const allExercises = workoutContainer.querySelectorAll('.exercise-item');
    if (allExercises.length > 0) {
        const lastExercise = allExercises[allExercises.length - 1];
        const lastButton = lastExercise.querySelector('.next-exercise-btn');
        if (lastButton) {
            lastButton.innerHTML = '<i class="fas fa-check"></i> Complete Workout';
        }
    }
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

    // Auto-save when a set is checkmarked
    saveWorkout(false);
}

function saveWorkout(showAlert = true) {
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
    
    // Only show alert if explicitly requested
    if (showAlert) {
        alert('Workout progress saved!');
    }
}

function clearAllChecks() {
    // Get all completed set rows
    const completedSets = workoutContainer.querySelectorAll('.set-row.completed');
    
    if (completedSets.length === 0) {
        alert('No completed sets to clear!');
        return;
    }
    
    // Clear all completed states
    completedSets.forEach(setRow => {
        setRow.classList.remove('completed');
        const checkButton = setRow.querySelector('.complete-set');
        checkButton.textContent = '✓';
    });
    
    // Update last completed dates for all exercises
    const exercises = workoutContainer.querySelectorAll('.exercise-item');
    exercises.forEach(exercise => {
        const hasCompletedSet = exercise.querySelector('.set-row.completed') !== null;
        const lastDoneSpan = exercise.querySelector('.last-done');
        if (!hasCompletedSet) {
            lastDoneSpan.textContent = 'Never';
        }
    });
    
    // Save the cleared state
    saveWorkout(false);
    
    alert('All checkmarks cleared! You can now do the exercises again.');
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

// Settings functionality
function showSettings() {
    const settings = [
        'Clear all workout data',
        'Export all data',
        'Reset personal records',
        'About this app'
    ];
    
    const choice = prompt(`Settings:\n\n${settings.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nEnter a number (1-4):`);
    
    switch(choice) {
        case '1':
            if (confirm('Are you sure you want to clear all workout data? This cannot be undone.')) {
                localStorage.removeItem('workoutHistory');
                localStorage.removeItem('personalRecords');
                localStorage.removeItem('workoutDates');
                alert('All workout data cleared!');
                location.reload();
            }
            break;
        case '2':
            exportData();
            break;
        case '3':
            if (confirm('Are you sure you want to reset all personal records? This cannot be undone.')) {
                localStorage.removeItem('personalRecords');
                alert('Personal records reset!');
                location.reload();
            }
            break;
        case '4':
            alert('Toolish Gains\nVersion 1.0\n\nA simple, mobile-friendly workout tracking app.');
            break;
        default:
            alert('Invalid choice.');
    }
}

function goToNextExercise(button) {
    const currentExercise = button.closest('.exercise-item');
    let nextExercise = currentExercise.nextElementSibling;
    
    // Skip over any non-exercise elements (like body part headers)
    while (nextExercise && !nextExercise.classList.contains('exercise-item')) {
        nextExercise = nextExercise.nextElementSibling;
    }
    
    if (nextExercise && nextExercise.classList.contains('exercise-item')) {
        // Scroll to the next exercise and position it at the top of the view
        nextExercise.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
        
        // Add a subtle highlight effect to the next exercise
        nextExercise.style.transition = 'all 0.3s ease';
        nextExercise.style.transform = 'scale(1.02)';
        nextExercise.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
        
        // Remove the highlight effect after a short delay
        setTimeout(() => {
            nextExercise.style.transform = 'scale(1)';
            nextExercise.style.boxShadow = '';
        }, 1000);
    } else {
        // If there's no next exercise, show a message or scroll to the top
        alert('This is the last exercise! Great job completing your workout! 💪');
        // Optionally scroll to the top of the workout container
        document.getElementById('workout-container').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
}

// Initialize with Day 1
selectDay(1);
