#uses python3
from datetime import datetime, time, timedelta

from .shiftSchedule import P10, P6

def getDateTime(str):
    """
    Accepts DateTime string as formatted in HSG data, returns python datetime.datetime object
    """
    dt = datetime.strptime(str, "%Y/%m/%d %H:%M:%S")
    return dt


def getDurationFromHMS(str):
    """
    Accepts as input string containing hh:mm:ss.ms or similar
    Returns equivalent amount of seconds
    """
    try:
        str_split = str.split(":")
        
        hour = int(str_split[0])
        minutes = int(str_split[1])
        seconds = float(str_split[2])
        return seconds + minutes * 60 + hour * 3600
    except:
        print("getDurationFromHMS function: Expected string in format HH:MM:SS or similar, got: ", str)
        raise ValueError


def filterShift(comparisonShift, weekDay, the_time):
    
    within_time = the_time >= comparisonShift["start"] and the_time < comparisonShift["end"]

    within_weekdays = weekDay in comparisonShift["days"]

    return within_time and within_weekdays



def getShift(the_date, plant):

    shift_schedule = None

    if plant == "P10":
        shift_schedule = P10
    elif plant == "P6":
        shift_schedule = P6
    else:
        raise ValueError("Wrong value for Plant, should be P10 or P6")

    weekDay = the_date.isoweekday()
    the_time = the_date.time()
    
    shiftNum = None

    try:

        result = filter(lambda x: filterShift(x, weekDay, the_time), shift_schedule)
        shiftObjectList = list(result)

        if len(shiftObjectList) > 1:
            raise ValueError("Multiple Matching Shifts") # determining if start time is not corresponding to multiple shifts. We need only 1 value for shift.
        
        if len(shiftObjectList) == 0:
            raise ValueError("No matching shift") # start time did not correspond to any shift. We need a value for shift.


        shiftObject = shiftObjectList[0]
        shiftNum = shiftObject["shift"]

    except:
        shiftNum = 0 #assigns a the value 0 fo rthe cases in which multiple shifts or no shift is being assigned
    
    return shiftNum

    
def getHMS(from_seconds):
    td = timedelta(seconds=from_seconds)
    return str(td)
