const EventEmitter = require('events');
const eventEmitter = new EventEmitter();
const cron = require('node-cron');
// const { ChildProcess } = require('child_process');
const spawn = require("child_process").spawn;
const { main } = require('./BystronicDataExtraction/DataPull.js');
const { connectAndQuery } = require('./DataBaseQueries/DB.js');

laser_folder_path_dir  = "../data/HSG/HSG Nest Run Data"; //"T:/HSG/HSG Nest Run Data"
laser_folder_list = [
  "/HSG 1 Nest Run Data",
  "/HSG 2 Nest Run Data",
  //"/HSG 3 Nest Run Data",
  "/HSG 4 Nest Run Data",
  "/HSG 5 Nest Run Data",
  "/HSG 6 Nest Run Data",
  "/HSG 7 Nest Run Data",
  "/HSG 8 Nest Run Data"
];
function getDayOfWeek() {
  const today = new Date();
  return today.getDay();
}

// Function to handle the async loop with delay
async function processFolders(shift) {
  console.time('Processing Time for batch size 20');
  try {
    const result = await runPythonProcess(laser_folder_list, shift);
    console.log(result);
  } catch (error) {
    console.error(error);
  }
  console.timeEnd('Processing Time for batch size 20');
}

// Function to run Python process and return a promise
function runPythonProcess(folderList, shift) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3.12', [
      "../HSG_data_analysis/run2.py",
      JSON.stringify(folderList.map(folder => laser_folder_path_dir + folder)),
      getDayOfWeek(),
      shift
    ]);

    pythonProcess.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve(`Python process for ${folderList.length} folders completed successfully.`);
      } else {
        reject(`Python process for ${folderList.length} folders failed with code ${code}.`);
      }
    });
  });
}

// Generalized function to handle the cron job workflow
async function handleCronJob(shift) {
  try {
    // Step 1: Process folders
    console.time('Processing Time for bystronic12K data pull');
    await main();
    console.timeEnd('Processing Time for bystronic12K data pull');
    // Step 2: Collect Bystronic laser data
    await processFolders(shift);

    // Step 3: Execute SQL queries if it's the right time
    if (shift === 'Shift2') {
      await connectAndQuery();
    }
    
    console.log('All tasks completed successfully.');
  } catch (error) {
    console.error('An error occurred during the cron job:', error);
  }
}

// Schedule for Tuesday to Friday at 4am
cron.schedule('0 4 * * 2-5', () => {
  console.log('Running at 4am Monday to Thursday');
  handleCronJob("Shift0");
});

// Schedule for Monday to Thursday at 2pm
cron.schedule('0 14 * * 1-4', () => {
  console.log('Running at 2pm Monday to Thursday');
  handleCronJob("Shift1");
});

// Schedule for Monday to Thursday at 11 59 55pm. To compensate delay caused by Bystronic data extraction.
cron.schedule('55 59 23 * * 1-4', () => {
  console.log('Running at 12am Monday to Thursday');
  const shift = "Shift2";
  handleCronJob("Shift2");
});

// Schedule for Friday at 12pm
cron.schedule('0 12 * * 5', () => {
  console.log('Running at 12pm on Friday');
  handleCronJob("Shift1");
});

// Schedule for Friday at 8pm
cron.schedule('0 20 * * 5', () => {
  console.log('Running at 8pm on Friday');
  handleCronJob("Shift2");
});

// const fs = require('fs');
// const chokidar = require('chokidar');

// fs.watch("M:/P10&P6 Collaberation",{persistent:true},(event,fileName)=>{
//     console.log("Event: ",event);
//     console.log("File name: ",fileName);
//     const pythonProcess = spawn('python',["C:/Users/mali/Downloads/HSG_data_analysis (incomplete).zip/HSG_data_analysis/run.py", fileName]);
// });

// Initialize watcher.
// const watcher = chokidar.watch("M:/HSG/HSG Nest Run Data", {
//     ignored: /(^|[\/\\])\../, // ignore dotfiles
//     persistent: true
//   });

// // Something to use when events are received.
// const log = console.log.bind(console);

//   watcher
//   .on('add', (path) => {log(`File ${path} has been added`);
//   const pythonProcess = spawn('python',["C:/Users/mali/Downloads/HSG_data_analysis (incomplete).zip/HSG_data_analysis/run.py", path]);
//   eventEmitter.emit("file added");
// })
//   .on('change', (path) => {log(`File ${path} has been changed`);const pythonProcess = spawn('python',["C:/Users/mali/Downloads/HSG_data_analysis (incomplete).zip/HSG_data_analysis/run.py", path]);
//   eventEmitter.emit("file changed");
// })

  //watcher.close().then(() => console.log('closed'));nvm;kfg;kcnbdjbvkclflr