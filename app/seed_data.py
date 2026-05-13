"""
Exercise seed data. Each entry: (name, muscle_group, equipment, is_custom)
BW exercises use equipment='BW'.
"""

EXERCISES = [
    # CHEST
    ("Bench Press (Barbell)", "Chest", "Barbell", 0),
    ("Incline Bench Press (Barbell)", "Chest", "Barbell", 0),
    ("Decline Bench Press (Barbell)", "Chest", "Barbell", 0),
    ("Flat Dumbbell Press", "Chest", "Dumbbell", 0),
    ("Incline Dumbbell Press", "Chest", "Dumbbell", 0),
    ("Cable Fly", "Chest", "Cable", 0),
    ("Pec Deck", "Chest", "Machine", 0),
    ("Push Up", "Chest", "BW", 0),
    ("Dips (Chest)", "Chest", "BW", 0),
    ("Plate Pinch Press", "Chest", "Plate", 1),

    # BACK
    ("Deadlift", "Back", "Barbell", 0),
    ("Pull Up", "Back", "BW", 0),
    ("Lat Pulldown", "Back", "Cable", 0),
    ("Bent Over Row (Barbell)", "Back", "Barbell", 0),
    ("Seated Cable Row", "Back", "Cable", 0),
    ("T-Bar Row", "Back", "Barbell", 0),
    ("Face Pull", "Back", "Cable", 0),
    ("Shrugs (Barbell)", "Back", "Barbell", 0),
    ("One Arm Dumbbell Row", "Back", "Dumbbell", 0),
    ("Rack Pull", "Back", "Barbell", 0),

    # SHOULDERS
    ("Overhead Press (Barbell)", "Shoulders", "Barbell", 0),
    ("Seated Dumbbell Press", "Shoulders", "Dumbbell", 0),
    ("Lateral Raise", "Shoulders", "Dumbbell", 0),
    ("Front Raise", "Shoulders", "Dumbbell", 0),
    ("Rear Delt Fly", "Shoulders", "Dumbbell", 0),
    ("Arnold Press", "Shoulders", "Dumbbell", 0),
    ("Cable Lateral Raise", "Shoulders", "Cable", 0),
    ("Upright Row", "Shoulders", "Barbell", 0),
    ("Head Harness Neck Flexion", "Shoulders", "Harness", 1),
    ("Head Harness Neck Extension", "Shoulders", "Harness", 1),

    # LEGS
    ("Squat (Barbell)", "Legs", "Barbell", 0),
    ("Leg Press", "Legs", "Machine", 0),
    ("Romanian Deadlift", "Legs", "Barbell", 0),
    ("Leg Curl (Machine)", "Legs", "Machine", 0),
    ("Leg Extension (Machine)", "Legs", "Machine", 0),
    ("Calf Raise (Standing)", "Legs", "Machine", 0),
    ("Calf Raise (Seated)", "Legs", "Machine", 0),
    ("Hack Squat", "Legs", "Machine", 0),
    ("Bulgarian Split Squat", "Legs", "Dumbbell", 0),
    ("Nordic Curl with Push", "Legs", "BW", 1),
    ("Reverse Nordic Curl", "Legs", "BW", 1),

    # ARMS
    ("Barbell Curl", "Arms", "Barbell", 0),
    ("Dumbbell Curl", "Arms", "Dumbbell", 0),
    ("Hammer Curl", "Arms", "Dumbbell", 0),
    ("Preacher Curl", "Arms", "Barbell", 0),
    ("Cable Curl", "Arms", "Cable", 0),
    ("Tricep Pushdown (Cable)", "Arms", "Cable", 0),
    ("Skull Crusher", "Arms", "Barbell", 0),
    ("Close Grip Bench Press", "Arms", "Barbell", 0),
    ("Overhead Tricep Extension", "Arms", "Cable", 0),
    ("Dips (Tricep)", "Arms", "BW", 0),

    # CORE
    ("Plank", "Core", "BW", 0),
    ("Dragon Flag", "Core", "BW", 1),
    ("Ab Wheel Rollout", "Core", "BW", 0),
    ("Hanging Leg Raise", "Core", "BW", 0),
    ("Cable Crunch", "Core", "Cable", 0),
    ("Sit Up", "Core", "BW", 0),
    ("Russian Twist", "Core", "BW", 0),
    ("Neck Front/Back", "Core", "BW", 1),

    # CARDIO
    ("Treadmill", "Cardio", "Machine", 0),
    ("Stationary Bike", "Cardio", "Machine", 0),
    ("Rowing Machine", "Cardio", "Machine", 0),
    ("Jump Rope", "Cardio", "BW", 0),
]
