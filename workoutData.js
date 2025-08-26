const workoutData = {
    day1: [
        {
            bodyPart: 'CHEST',
            exercises: [
                {
                    name: 'Horizontal Push',
                    sets: 3,
                    repRange: '5-8',
                    options: ['Barbell Bench Press', 'Dumbbell Bench Press', 'Weighted Pushup']
                },
                {
                    name: 'Incline Push',
                    sets: 3,
                    repRange: '8-12',
                    options: ['Barbell Incline Bench Press', 'Dumbbell Incline Bench Press', 'Weighted Decline Pushup']
                }
            ]
        },
        {
            bodyPart: 'BACK',
            exercises: [
                {
                    name: 'Vertical Pull',
                    sets: 2,
                    repRange: '8-12',
                    options: ['Pull Up', 'Chin Up', 'Lat Pulldown Machine']
                },
                {
                    name: 'Horizontal Pull',
                    sets: 2,
                    repRange: '8-12',
                    options: ['Barbell Row', 'Dumbbell Row']
                }
            ]
        },
        {
            bodyPart: 'BICEPS',
            exercises: [
                {
                    name: 'Normal Curl',
                    sets: 3,
                    repRange: '8-12',
                    options: ['Barbell Strict Curl', 'EZ-Bar Curl', 'Dumbbell Curl']
                }
            ]
        },
        {
            bodyPart: 'SHOULDERS',
            exercises: [
                {
                    name: 'Lateral Raise',
                    sets: 3,
                    repRange: '15-20',
                    options: ['Dumbbell Lateral Raise', 'Cable Lateral Raise']
                },
                {
                    name: 'Rear Delt Movement',
                    sets: 5,
                    repRange: '15-20',
                    options: ['Rear Delt Fly', 'Reverse Peck Deck', 'Facepull']
                }
            ]
        },
        {
            bodyPart: 'TRICEPS',
            exercises: [
                {
                    name: 'Overhead Extension',
                    sets: 3,
                    repRange: '12-15',
                    options: ['Skull Crusher', 'Overhead Triceps Extension']
                }
            ]
        },
        {
            bodyPart: 'LEGS',
            exercises: [
                {
                    name: 'Squat',
                    sets: 3,
                    repRange: '5-8',
                    options: ['Back Squat', 'Front Squat']
                },
                {
                    name: 'Lunges',
                    sets: 3,
                    repRange: '15 each leg',
                    options: ['Lunges', 'Glute Kickbacks']
                },
                {
                    name: 'Hamstring Curl',
                    sets: 3,
                    repRange: '12-15',
                    options: ['Hamstring Curls', 'Nordic Hamstring Curls']
                },
                {
                    name: 'Calf Raise',
                    sets: 3,
                    repRange: '15-30',
                    options: ['Calf Raise Machine', 'Standing Calf Raise']
                }
            ]
        }
    ],
    day2: [
        {
            bodyPart: 'SHOULDERS',
            exercises: [
                {
                    name: 'Overhead Press',
                    sets: 3,
                    repRange: '8-12',
                    options: ['Standing Overhead Press', 'Seated Overhead Press']
                }
            ]
        },
        {
            bodyPart: 'CHEST',
            exercises: [
                {
                    name: 'Horizontal Push',
                    sets: 3,
                    repRange: '8-12',
                    options: ['Barbell Bench Press', 'Dumbbell Bench Press', 'Weighted Pushup']
                }
            ]
        },
        {
            bodyPart: 'BACK',
            exercises: [
                {
                    name: 'Horizontal Pull',
                    sets: 2,
                    repRange: '8-12',
                    options: ['Barbell Row', 'Dumbbell Row']
                },
                {
                    name: 'Vertical Pull',
                    sets: 2,
                    repRange: '8-12',
                    options: ['Pull Up', 'Chin Up', 'Lat Pulldown Machine']
                }
            ]
        },
        {
            bodyPart: 'BICEPS',
            exercises: [
                {
                    name: 'Peak Focused Curl',
                    sets: 3,
                    repRange: '12-15',
                    options: ['Concentration Curl', 'Preacher Curl']
                }
            ]
        },
        {
            bodyPart: 'SHOULDERS',
            exercises: [
                {
                    name: 'Lateral Raise',
                    sets: 3,
                    repRange: '15-20',
                    options: ['Dumbbell Lateral Raise', 'Cable Lateral Raise']
                },
                {
                    name: 'Rear Delt Movement',
                    sets: 5,
                    repRange: '15-20',
                    options: ['Rear Delt Fly', 'Reverse Peck Deck', 'Facepull']
                }
            ]
        },
        {
            bodyPart: 'LEGS',
            exercises: [
                {
                    name: 'Hip Hinge Movement',
                    sets: 3,
                    repRange: '8-12',
                    options: ['Romanian Deadlift', 'Stiff Leg Deadlift', 'Good Mornings']
                },
                {
                    name: 'Lunges',
                    sets: 3,
                    repRange: '15 each leg',
                    options: ['Lunges', 'Glute Kickbacks']
                },
                {
                    name: 'Leg Isolation',
                    sets: 3,
                    repRange: '12-15',
                    options: ['Leg Press', 'Hack Squat', 'Leg Extensions']
                },
                {
                    name: 'Calf Raise',
                    sets: 3,
                    repRange: '15-30',
                    options: ['Calf Raise Machine', 'Standing Calf Raise']
                }
            ]
        }
    ],
    day3: [
        {
            bodyPart: 'BICEPS',
            exercises: [
                {
                    name: 'Normal Curl',
                    sets: 3,
                    repRange: '8-12',
                    options: ['Barbell Strict Curl', 'EZ-Bar Curl', 'Dumbbell Curl']
                },
                {
                    name: 'Brachialis & Brachioradialis Curl',
                    sets: 3,
                    repRange: '12-15',
                    options: ['Hammer Curl', 'Reverse Grip Curl']
                }
            ]
        },
        {
            bodyPart: 'CHEST',
            exercises: [
                {
                    name: 'Incline Push',
                    sets: 3,
                    repRange: '8-12',
                    options: ['Barbell Incline Bench Press', 'Dumbbell Incline Bench Press', 'Weighted Decline Pushup']
                }
            ]
        },
        {
            bodyPart: 'BACK',
            exercises: [
                {
                    name: 'Vertical Pull',
                    sets: 2,
                    repRange: '8-12',
                    options: ['Pull Up', 'Chin Up', 'Lat Pulldown Machine']
                },
                {
                    name: 'Horizontal Pull',
                    sets: 2,
                    repRange: '8-12',
                    options: ['Barbell Row', 'Dumbbell Row']
                }
            ]
        },
        {
            bodyPart: 'SHOULDERS',
            exercises: [
                {
                    name: 'Overhead Press',
                    sets: 3,
                    repRange: '8-12',
                    options: ['Standing Overhead Press', 'Seated Overhead Press']
                }
            ]
        },
        {
            bodyPart: 'TRICEPS',
            exercises: [
                {
                    name: 'Lateral Head Isolation',
                    sets: 3,
                    repRange: '12-15',
                    options: ['Triceps Pushdown', 'Pushups', 'Dips']
                },
                {
                    name: 'Overhead Extension',
                    sets: 3,
                    repRange: '12-15',
                    options: ['Skull Crusher', 'Overhead Triceps Extension']
                }
            ]
        },
        {
            bodyPart: 'LEGS',
            exercises: [
                {
                    name: 'Hip Thrust',
                    sets: 3,
                    repRange: '8-12',
                    options: ['Barbell Hip Thrust', 'Hip Thrust Machine']
                },
                {
                    name: 'Squat',
                    sets: 3,
                    repRange: '8-12',
                    options: ['Back Squat', 'Front Squat']
                },
                {
                    name: 'Hamstring Curl',
                    sets: 3,
                    repRange: '12-15',
                    options: ['Hamstring Curls', 'Nordic Hamstring Curls']
                },
                {
                    name: 'Calf Raise',
                    sets: 3,
                    repRange: '15-30',
                    options: ['Calf Raise Machine', 'Standing Calf Raise']
                }
            ]
        }
    ]
};
