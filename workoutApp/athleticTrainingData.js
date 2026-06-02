const athleticTrainingData = {
    warmups: [
        { id: 'run', name: 'Run', sets: 1, durationMinutes: 15 },
        { id: 'jump-rope', name: 'Jump Rope', sets: 1, durationMinutes: 10 },
        { id: 'shadow-boxing', name: 'Shadow Boxing', sets: 1, durationMinutes: 10 }
    ],
    push: {
        sections: [{
            bodyPart: 'PUSH DAY',
            exercises: [
                { name: 'Dips', sets: 3, type: 'reps', repRange: 'Failure', options: ['Dips'] },
                { name: 'Lizard Crawl', sets: 3, type: 'timed', durationSeconds: 60, repRange: '1 minute', options: ['Lizard Crawl'] },
                { name: 'Push Ups', sets: 3, type: 'reps', repRange: 'Failure', options: ['Push Ups'] },
                { name: 'Pike Push ups', sets: 3, type: 'reps', repRange: 'Failure', options: ['Pike Push ups'] }
            ]
        }]
    },
    pull: {
        sections: [{
            bodyPart: 'PULL DAY',
            exercises: [
                { name: 'Bodyweight Rows', sets: 3, type: 'reps', repRange: 'Failure', options: ['Bodyweight Rows'] },
                { name: 'Ab Roll Out', sets: 3, type: 'reps', repRange: 'Failure', options: ['Ab Roll Out'] },
                { name: 'Goblet Curls', sets: 3, type: 'reps', repRange: 'Failure', options: ['Goblet Curls'] },
                { name: 'Tactical Pull ups', sets: 3, type: 'reps', repRange: 'Failure', options: ['Tactical Pull ups'] }
            ]
        }]
    },
    legs: {
        sections: [{
            bodyPart: 'LEG DAY',
            exercises: [
                { name: 'Multi-directional lunge', sets: 2, type: 'reps', repRange: '10 each direction', options: ['Multi-directional lunge'] },
                { name: 'Squat walks', sets: 3, type: 'timed', durationSeconds: 60, repRange: '1 minute', options: ['Squat walks'] },
                { name: 'Precision Broad jumps', sets: 3, type: 'reps', repRange: '10', options: ['Precision Broad jumps'] },
                { name: 'Kettlebell Swing', sets: 3, type: 'reps', repRange: '50', options: ['Kettlebell Swing'] }
            ]
        }]
    },
    fullBody: {
        sections: [{
            bodyPart: 'FULL BODY',
            exercises: [
                { name: 'Push Ups', sets: 3, type: 'reps', repRange: 'Failure', options: ['Push Ups'] },
                { name: 'Kettlebell Swing', sets: 3, type: 'reps', repRange: '50', options: ['Kettlebell Swing'] },
                { name: 'Goblet Curls', sets: 3, type: 'reps', repRange: 'Failure', options: ['Goblet Curls'] },
                { name: 'Hollow Body Hold', sets: 3, type: 'timed', durationSeconds: 60, repRange: '1 minute', options: ['Hollow Body Hold'] },
                { name: 'Kettlebell Halos', sets: 2, type: 'reps', repRange: '15', options: ['Kettlebell Halos'] },
                { name: 'Bodyweight rows', sets: 3, type: 'reps', repRange: '10', options: ['Bodyweight rows'] },
                { name: 'Squat walks', sets: 3, type: 'timed', durationSeconds: 60, repRange: '1 minute', options: ['Squat walks'] }
            ]
        }]
    }
};
