const sql = require('mssql');

const config = {
    user: 'OEEadmin', // better stored in an app setting such as process.env.DB_USER
    password: '!CGd@6ajWiX3Hj5', // better stored in an app setting such as process.env.DB_PASSWORD
    server: 'myfreeoeedbserver.database.windows.net', // better stored in an app setting such as process.env.DB_SERVER
    port: 1433, // optional, defaults to 1433, better stored in an app setting such as process.env.DB_PORT
    database: 'myfreeoeedb', // better stored in an app setting such as process.env.DB_NAME
    authentication: {
        type: 'default'
    },
    options: {
        encrypt: true
    },
    stream:true
}

async function connectAndQuery() {
    try {
        console.log("Starting...");
        var poolConnection = await sql.connect(config);

        console.log("Reading rows from the Table...");
        var resultSet = await poolConnection.request().query(`DROP TABLE IF EXISTS [dbo].[Bystronic12K_shifts];
WITH daily_total_runtime_by_shift AS (
    SELECT
        CONVERT(date, TimeOfData) AS DateIso,
        CASE 
            WHEN DATENAME(weekday, CONVERT(date, TimeOfData)) = 'Friday' AND CAST(TimeOfData AS time) BETWEEN '04:00:00' AND '11:59:59' THEN 1
            WHEN DATENAME(weekday, CONVERT(date, TimeOfData)) = 'Friday' AND CAST(TimeOfData AS time) BETWEEN '12:00:00' AND '19:59:59' THEN 2
            WHEN DATENAME(weekday, CONVERT(date, TimeOfData)) != 'Friday' AND CAST(TimeOfData AS time) BETWEEN '04:00:00' AND '13:59:59' THEN 1
            WHEN DATENAME(weekday, CONVERT(date, TimeOfData)) != 'Friday' AND CAST(TimeOfData AS time) BETWEEN '14:00:00' AND '23:59:58' THEN 2
            ELSE NULL -- Exclude the time period from 11:59:59 pm to 4 am, and other times on Fridays
        END AS Shift,
        OperationHours - LAG(OperationHours) OVER (PARTITION BY CONVERT(date, TimeOfData) ORDER BY TimeOfData) AS Total_Time_Per_Shift,
        CuttingHours - LAG(CuttingHours) OVER (PARTITION BY CONVERT(date, TimeOfData) ORDER BY TimeOfData) AS Total_Cutting_Time_Per_Shift
    FROM
        [dbo].[Bystronic12Koutput]
)
SELECT DateIso, Shift, Total_Time_Per_Shift,
	CASE 
		WHEN DATENAME(weekday, DateIso) = 'Friday' THEN Total_Time_Per_Shift / 8 
		ELSE Total_Time_Per_Shift / 10 
	END AS Utilization
INTO [dbo].[Bystronic12K_shifts]
FROM 
	daily_total_runtime_by_shift
WHERE 
	Shift IS NOT NULL;

DROP TABLE IF EXISTS [dbo].[Bystronic12K];
SELECT DateIso,
SUM(Total_Time_Per_Shift) AS Total_Time
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
        poolConnection.close();
    } catch (err) {
        console.error(err.message);
    }
}
module.exports = { connectAndQuery } ;
