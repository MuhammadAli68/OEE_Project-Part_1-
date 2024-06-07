import pandas
import os
import sys
import datetime as dt
import csv
import time
import threading
import json  # Required to parse the JSON argument from Node.js

from src.parsing import parseRecord, SkipToptwoLines
from src.util import getDurationFromHMS, getHMS, getShift
from src.FileSelectTime import timeperiod_dict

def extract_to_df(inputfile):
    with open(inputfile) as f:
        datalist = []
        while True:
            datalist.append(parseRecord(f))
            if len(f.readline()) == 0:
                break
        datalist = datalist[:-1]
        df = pandas.DataFrame(datalist)
        df["DateIso"] = df["Start Time"].map(lambda x: x.date().isoformat())
        df["Time"] = df["Start Time"].map(lambda x: x.time())
        df["TotalTimeHours"] = df["Total Time"] / 3600
        return df

def Create_File(folder, file):
    outputfile = os.path.join(folder, "data", "430dataout.csv")
    outputfile_per_shift = os.path.join(folder, "output", "withgroupshifts.csv")
    outputfile_without_shift = os.path.join(folder, "output", "withoutgroupshifts.csv")
    
    df = extract_to_df(file)
    df["Shift"] = df["Start Time"].map(lambda x: getShift(x, "P10"))

    df['DateIso'] = pandas.to_datetime(df['DateIso'])
    df.to_csv(outputfile, index=False)
    df.drop_duplicates() # remove duplicates

    #df = df[df["Cycle Times"] != "Part"]

    # Sort the DataFrame by "Start Time" and then "Total Time"
    df = df.sort_values(by=["Start Time", "Total Time"])

    # Drop duplicates, keeping the last occurrence based on "File Name" and "Start Time"
    df = df.drop_duplicates(subset=["File Name", "Start Time"], keep="last")

    sumdf_includes_shift = df.groupby(["DateIso", "Shift"])["Total Time"].sum()
    sumdf_includes_shift = pandas.DataFrame(sumdf_includes_shift).reset_index()
    sumdf_includes_shift["Total Time HMS"] = sumdf_includes_shift["Total Time"].map(getHMS)
    sumdf_includes_shift["Utilization"] = sumdf_includes_shift["Total Time"] / (10 * 60 * 60)
    
    friday_mask = sumdf_includes_shift['DateIso'].apply(lambda x: x.isoweekday() == 5)
    sumdf_includes_shift.loc[friday_mask, 'Utilization'] = sumdf_includes_shift.loc[friday_mask, 'Total Time'] / (8 * 60 * 60)
    sumdf_includes_shift.loc[sumdf_includes_shift["Shift"] == 0, "Utilization"] = sumdf_includes_shift.loc[sumdf_includes_shift["Shift"] == 0, "Total Time"] / (4 * 60 * 60)

    sumdf_includes_shift.to_csv(outputfile_per_shift, index=False)

    filtered_df = df[df['Shift'] != 0]
    sumdf = filtered_df.groupby(["DateIso"])["Total Time"].sum()
    sumdf = pandas.DataFrame(sumdf).reset_index()
    sumdf["Total Time HMS"] = sumdf["Total Time"].map(getHMS)
    sumdf["Utilization"] = sumdf["Total Time"] / (20 * 60 * 60)
    
    friday_mask = sumdf['DateIso'].apply(lambda x: x.isoweekday() == 5)
    sumdf.loc[friday_mask, 'Utilization'] = sumdf.loc[friday_mask, 'Total Time'] / (16 * 60 * 60)
    sumdf.to_csv(outputfile_without_shift, index=False)

def SelectFiles(folder, DayofWeek, ShiftNumber):
    merged_file_path = os.path.join(folder, "Job_Collection", "merged_file.csv")

    if os.path.exists(merged_file_path):
        start_time, end_time = get_time_period(DayofWeek, ShiftNumber)
        file_mode = 'a'
        filtered_files = lambda f: is_within_time_period(f, start_time, end_time)
    else:
        file_mode = 'w'
        filtered_files = lambda f: True  # No filtering, include all files

    with open(merged_file_path, file_mode, newline='') as merged_file:
        csvwriter = csv.writer(merged_file)
        for files in get_files_in_batches(folder, filtered_files):
            for filename in files:
                with open(filename, 'r') as f:
                    SkipToptwoLines(f)
                    for _ in range(0, 5):
                        statement = f.readline().strip().split(',')
                        csvwriter.writerow(statement)
                    csvwriter.writerow(["", "", "", ""])
            yield

    Create_File(folder, merged_file_path)

def get_files_in_batches(folder, filter_func, batch_size=20):
    files = [os.path.join(folder, f) for f in os.listdir(folder) if os.path.isfile(os.path.join(folder, f))]
    files = [f for f in files if filter_func(f)]
    for i in range(0, len(files), batch_size):
        yield files[i:i+batch_size]

def is_within_time_period(file_path, start_time, end_time):
    creation_time = dt.datetime.fromtimestamp(os.path.getctime(file_path))
    return start_time <= creation_time <= end_time

def get_time_period(DayofWeek, ShiftNumber):
    start_time = dt.datetime.combine(current_date, dt.datetime.strptime(timeperiod_dict[DayofWeek][ShiftNumber]["start"], '%H:%M:%S').time())
    end_time = dt.datetime.combine(current_date, dt.datetime.strptime(timeperiod_dict[DayofWeek][ShiftNumber]["end"], '%H:%M:%S').time())
    return start_time, end_time

def worker(folder, DayofWeek, ShiftNumber):
    for _ in SelectFiles(folder, DayofWeek, ShiftNumber):
        time.sleep(1)  # Adjust the sleep time if necessary


if __name__ == "__main__":
#     folders = [
#   "T:/HSG/HSG Nest Run Data/HSG 1 Nest Run Data",
#   "T:/HSG/HSG Nest Run Data/HSG 2 Nest Run Data",
#   #"/HSG 3 Nest Run Data",
#   "T:/HSG/HSG Nest Run Data/HSG 4 Nest Run Data",
#   "T:/HSG/HSG Nest Run Data/HSG 5 Nest Run Data",
#   "T:/HSG/HSG Nest Run Data/HSG 6 Nest Run Data",
#   "T:/HSG/HSG Nest Run Data/HSG 7 Nest Run Data",
#   "T:/HSG/HSG Nest Run Data/HSG 8 Nest Run Data"
# ]
#     DayofWeek = 3
#     ShiftNumber = "Shift1"
    folders = json.loads(sys.argv[1])
    DayofWeek = int(sys.argv[2])
    ShiftNumber = sys.argv[3]
    current_date = dt.datetime.now().date() # making this global so that all threads see the same date.
    print("current date: ",current_date)

    threads = []
    for folder in folders:
        thread = threading.Thread(target=worker, args=(folder, DayofWeek, ShiftNumber))
        threads.append(thread)
        thread.start()

    for thread in threads:
        thread.join()

    print("All threads completed.")