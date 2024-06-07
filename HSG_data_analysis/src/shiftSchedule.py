#uses python3

from datetime import time

# first_shift_start = time(hour=4, minute=0, second=0)
# shift_change = time(hour=14, minute=0, second=0)
# second_shift_end = time(hour=23, minute=59, second=59)

P6 = [
    {
        "Shift Name": "First",
        "shift": 1,
        "start": time(hour=4),
        "end": time(hour=14),
        "days": [1,2,3,4]       # Monday through thursday
    },
    {
        "Shift Name": "Second",
        "shift": 2,
        "start": time(hour=14),
        "end": time(hour=23, minute=59, second=59),
        "days": [1,2,3,4]       # Monday through thursday
    },
    {
        "Shift Name": "Third",
        "shift": 3,
        "start": time(hour=4),
        "end": time(hour=20),
        "days": [5,6]       # Friday Saturday
    },
    {
        "Shift Name": "Third",
        "shift": 3,
        "start": time(hour=4),
        "end": time(hour=16),
        "days": [7]       # Sunday
    },
]

P10 = [
    {
        "Shift Name": "First",
        "shift": 1,
        "start": time(hour=4), # means 4am
        "end": time(hour=14), # means 2pm
        "days": [1,2,3,4]       # Monday through thursday
    },
    {
        "Shift Name": "Second",
        "shift": 2,
        "start": time(hour=14), # means 2pm
        "end": time(hour=23, minute=59, second=59), # means 11:59:59pm
        "days": [1,2,3,4]       # Monday through thursday
    },
    {
        "Shift Name": "FirstOT",
        "shift": 1,
        "start": time(hour=4), # means 4am
        "end": time(hour=12), # means 12pm
        "days": [5]       # Friday
    },
    {
        "Shift Name": "SecondOT",
        "shift": 2,
        "start": time(hour=12), # means 12pm
        "end": time(hour=19,minute=59,second=59), # means 7:59:59pm
        "days": [5]       # Friday
    },

    #No Shift schedule for Saturday and Sunday.
]