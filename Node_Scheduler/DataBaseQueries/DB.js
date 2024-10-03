const sql = require('mssql');
// const config = require('./config.js');


async function connectAndQuery(poolConnectionPromise) {
    try {
        console.log("Starting...");
        // var poolConnection = await sql.connect(config);
        var poolConnection = await poolConnectionPromise;
        console.log("Reading rows from the Table...");
        var resultSet = await poolConnection.request().query(`DROP TABLE IF EXISTS [dbo].[Bystronic12K_shifts];
WITH daily_total_runtime_by_shift AS (
    SELECT
        CONVERT(date, TimeOfData) AS DateIso,
		TimeOfData,
        CASE 
            WHEN DATENAME(weekday, CONVERT(date, TimeOfData)) = 'Friday' AND SUBSTRING(CAST(CAST(TimeOfData AS time) AS varchar),1,5) = '12:00' THEN 1
            WHEN DATENAME(weekday, CONVERT(date, TimeOfData)) = 'Friday' AND SUBSTRING(CAST(CAST(TimeOfData AS time)AS varchar),1,5) = '20:00' THEN 2
            WHEN DATENAME(weekday, CONVERT(date, TimeOfData)) != 'Friday' AND SUBSTRING(CAST(CAST(TimeOfData AS time) AS varchar),1,5) = '14:00' THEN 1
            WHEN DATENAME(weekday, CONVERT(date, TimeOfData)) != 'Friday' AND SUBSTRING(CAST(CAST(TimeOfData AS time) AS varchar),1,5) = '23:59' THEN 2
            ELSE NULL -- Exclude the time period from 11:59:59 pm to 4 am, and other times on Fridays
        END AS Shift,
        OperationHours - LAG(OperationHours) OVER (PARTITION BY CONVERT(date, TimeOfData) ORDER BY TimeOfData) AS Total_Operation_Time_Per_Shift,
        CuttingHours - LAG(CuttingHours) OVER (PARTITION BY CONVERT(date, TimeOfData) ORDER BY TimeOfData) AS Total_Cutting_Time_Per_Shift
    FROM
        [dbo].[BystronicOutput] WHERE MachineID = 'Bystronic12K'
)
SELECT DateIso, Shift, Total_Cutting_Time_Per_Shift,
	CASE 
		WHEN DATENAME(weekday, DateIso) = 'Friday' THEN Total_Cutting_Time_Per_Shift / 8 
		ELSE Total_Cutting_Time_Per_Shift / 10 
	END AS Utilization
INTO [dbo].[Bystronic12K_shifts]
FROM 
	daily_total_runtime_by_shift
WHERE 
	Shift IS NOT NULL;

DROP TABLE IF EXISTS [dbo].[Bystronic12K];
SELECT DateIso,
SUM(Total_Cutting_Time_Per_Shift) AS Total_Time
INTO [dbo].[Bystronic12K]
FROM [dbo].[Bystronic12K_shifts]
GROUP BY DateIso;
ALTER TABLE [dbo].[Bystronic12K] ADD  Utilization AS (
	CASE
		WHEN DATENAME(weekday, DateIso) = 'Friday' THEN Total_Time / 16
		ELSE Total_Time /20
	END
);`);

        console.log("rows affected: ", resultSet["rowsAffected"]);

        // close connection only when we're certain application is finished
       // poolConnection.close();
    } catch (err) {
        console.error(err.message);
    }
}
module.exports = { connectAndQuery } ;

// DROP TABLE IF EXISTS [dbo].[Bystronic10K_shifts];
// WITH daily_total_runtime_by_shift AS (
//     SELECT
//         CONVERT(date, TimeOfData) AS DateIso,
// 		TimeOfData,
//         CASE 
//             WHEN DATENAME(weekday, CONVERT(date, TimeOfData)) = 'Friday' AND SUBSTRING(CAST(CAST(TimeOfData AS time) AS varchar),1,5) = '12:00' THEN 1
//             WHEN DATENAME(weekday, CONVERT(date, TimeOfData)) = 'Friday' AND SUBSTRING(CAST(CAST(TimeOfData AS time)AS varchar),1,5) = '20:00' THEN 2
//             WHEN DATENAME(weekday, CONVERT(date, TimeOfData)) != 'Friday' AND SUBSTRING(CAST(CAST(TimeOfData AS time) AS varchar),1,5) = '14:00' THEN 1
//             WHEN DATENAME(weekday, CONVERT(date, TimeOfData)) != 'Friday' AND SUBSTRING(CAST(CAST(TimeOfData AS time) AS varchar),1,5) = '23:59' THEN 2
//             ELSE NULL -- Exclude the time period from 11:59:59 pm to 4 am, and other times on Fridays
//         END AS Shift,
//         OperationHours - LAG(OperationHours) OVER (PARTITION BY CONVERT(date, TimeOfData) ORDER BY TimeOfData) AS Total_Operation_Time_Per_Shift,
//         CuttingHours - LAG(CuttingHours) OVER (PARTITION BY CONVERT(date, TimeOfData) ORDER BY TimeOfData) AS Total_Cutting_Time_Per_Shift
//     FROM
//         [dbo].[BystronicOutput] WHERE MachineID = 'Bystronic10K'
// )
// SELECT DateIso, Shift, Total_Cutting_Time_Per_Shift,
// 	CASE 
// 		WHEN DATENAME(weekday, DateIso) = 'Friday' THEN Total_Cutting_Time_Per_Shift / 8 
// 		ELSE Total_Cutting_Time_Per_Shift / 10 
// 	END AS Utilization
// INTO [dbo].[Bystronic10K_shifts]
// FROM 
// 	daily_total_runtime_by_shift
// WHERE 
// 	Shift IS NOT NULL;

// DROP TABLE IF EXISTS [dbo].[Bystronic10K];
// SELECT DateIso,
// SUM(Total_Cutting_Time_Per_Shift) AS Total_Time
// INTO [dbo].[Bystronic10K]
// FROM [dbo].[Bystronic10K_shifts]
// GROUP BY DateIso;
// ALTER TABLE [dbo].[Bystronic10K] ADD  Utilization AS (
// 	CASE
// 		WHEN DATENAME(weekday, DateIso) = 'Friday' THEN Total_Time / 16
// 		ELSE Total_Time /20
// 	END
// );
