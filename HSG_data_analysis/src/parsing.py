#uses python3

from .util import getDurationFromHMS, getDateTime

def SkipToptwoLines(f):
    next(f)  # Skip the first line
    next(f)  # Skip the second line

# def parseHeader(f): # This function is not being used
    
#     #               Sample Header Portion 
#     #       0               1                   2               3             
#     # 01    Production info ,                   ,               ,
#     # 02    2024/04/23      ,                   ,               ,
#     # 03    Statistical Data,                   ,               ,
#     # 04    Pierce Count    ,   4517305         ,Pierce Time    ,111:37:39.012
#     # 05    G00 Len.        ,   346930.627399998,G00 Time       ,187:06:08.985
#     # 06    Cutting Len.    ,   459352.964899997,Cutting Time   ,242:52:21.814
#     # 07    Cycle Times     ,   2195            ,Total Time     ,463:24:14.776

#     # line 1
#     title = f.readline().split(',')[0]  #gets title from the top of the csv which is 'production info'
    
#     # line 2
#     primary_date = f.readline().split(',')[0] #moves to next line and gets date from csv
#     title += " "
#     title += primary_date # appends date infront of title

#     #line 3
#     f.readline() #moves to next line

#     line4 = f.readline().split(',')
#     pierce_count = int(line4[1])
#     pierce_time = getDurationFromHMS(line4[3])

#     line5 = f.readline().split(',')
#     G00length = float(line5[1])
#     G00time = getDurationFromHMS(line5[3])

#     line6 = f.readline().split(',')
#     cuttinglength = float(line6[1])
#     cuttingtime = getDurationFromHMS(line6[3])

#     line7 = f.readline().split(',') 
#     cycletimes = line7[1]
#     totaltime = getDurationFromHMS(line7[3])

#     return {
#         "Title": title,
#         "Pierce Count": pierce_count,
#         "Pierce Time": pierce_time,
#         "G00 Len.": G00length,
#         "G00 Time": G00time,
#         "Cutting Len.": cuttinglength,
#         "Cutting Time": cuttingtime,
#         "Cycle Times": cycletimes,
#         "Total Time": totaltime
#     }



def parseRecord(f):
    
    filename = f.readline()
    if len(filename) == 0:
        return
    # if(type(filename) is str):
    #     filename = filename.split(',')
    filename = filename.split('File Name,')[1].replace(",,","").strip()
    # print("filename: ",filename)

    line2 = f.readline().split(',')
    # if(type(line2) is str):
    #     line2 = line2.split(',')
    # print("line2: ",line2)
    start = getDateTime(line2[1])
    cycles = line2[5].strip()
    
    line3 = f.readline().split(',')
    # if(type(line3) is str):
    #     line3 = line3.split(',')
    # print("line3: ", line3)
    cutlength = float(line3[1])
    cuttime = getDurationFromHMS(line3[3])
    totaltime = getDurationFromHMS(line3[5])

    line4 = f.readline().split(',')
    # if(type(line4) is str):
    #     line4 = line4.split(',')
    # print("line4: ",line4)
    G00length = float(line4[1])
    G00time = getDurationFromHMS(line4[3])

    line5 = f.readline().split(',')
    # if(type(line5) is str):
    #     line5 = line5.split(',')
    # print("line5: ",line5)
    pierce_count = int(line5[1])
    pierce_time = getDurationFromHMS(line5[3])
    
    record = {
        "File Name": filename,
        "Start Time": start,
        "Cycle Times": cycles,
        "Cutting Len.": cutlength,
        "Cutting Time": cuttime,
        "Total Time": totaltime,
        "G00 Len.": G00length,
        "G00 Time": G00time,
        "Pierce Count": pierce_count,
        "Pierce Time": pierce_time
    }

    return record