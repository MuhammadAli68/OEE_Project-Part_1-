const node_opc = require('node-opcua-client');
const { AttributeIds,  MessageSecurityMode, SecurityPolicy } = require("node-opcua-client");
const sql = require('mssql');

const config  = require('../DataBaseQueries/config.js');
const endpoints = [{"Bystronic12K":"opc.tcp://192.168.110.15:56000"}]; //,{"Bystronic10K":"opc.tcp://192.168.110.11:56000"}

const connectionStrategy = {
    initialDelay: 1000,
    maxRetry: 0
};

async function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    try {
        const client = node_opc.OPCUAClient.create({
            applicationName: "MyClient",
            connectionStrategy: connectionStrategy,
            securityMode: MessageSecurityMode.None,
            securityPolicy: SecurityPolicy.None,
            keepSessionAlive: false,
            endpointMustExist: false
        });

        for (const endpointUrl of endpoints) {
            const machineName = Object.keys(endpointUrl)[0];
            const url = endpointUrl[machineName];

            // step 1 : connect to OPC UA server
            await client.connect(url);
            console.log("Connected to:", url);

            // step 2 : createSession
            const session = await client.createSession();
            console.log("Session created!");

            // step 3 : read OperationHours and CuttingHours values
            const dataValue1 = await session.read({
                nodeId: "ns=2;s=Machine.OperationHours",
                attributeId: AttributeIds.Value
            });
            console.log("Machine Operating hours =", dataValue1.value.value);

            const dataValue2 = await session.read({
                nodeId: "ns=2;s=Machine.CuttingHours",
                attributeId: AttributeIds.Value
            });
            console.log("Laser Cutting hours =", dataValue2.value.value);

            let Time = new Date(dataValue2.serverTimestamp).toLocaleString("en-US", { timeZone: "America/New_York", hour12: false }).replace(",", "");

            // create connection with Azure SQL Database
            var poolConnection = await sql.connect(config);

            // Insert data into Azure SQL Database
            const query = `INSERT INTO [dbo].[BystronicOutput] (MachineID, OperationHours, CuttingHours, TimeOfData) 
                            VALUES (@MachineID, @OperationHours, @CuttingHours, @TimeOfData);`;

            console.log('Executing query:', query);

            let result = await poolConnection.request()
                .input('MachineID', sql.VarChar, machineName)
                .input('OperationHours', sql.Float, dataValue1.value.value)
                .input('CuttingHours', sql.Float, dataValue2.value.value)
                .input('TimeOfData', sql.VarChar, Time)
                .query(query);

            console.log('Query executed. Result:', result);

            // close OPC UA session
            await session.close();

            // disconnecting from OPC UA server
            await client.disconnect();
            await timeout(100);
        }

        console.log("All operations completed!");

    } catch (err) {
        console.log("An error has occurred : ", err);
    } finally {

        // close connection with Database
        await poolConnection.close();
    }
}
// main();
module.exports = { main };

//const AzureClient = require('azure-iot-device').Client;
//const Message = require('azure-iot-device').Message;
//const Protocol = require('azure-iot-device-mqtt').Mqtt; // Changed to Mqtt for proper protocol
//const ServiceClient = require('azure-iothub').Client;

//const deviceConnectionString = "HostName=oee-iot-hub.azure-devices.net;DeviceId=bystronic12K;SharedAccessKey=iZZs5wuxDkz7GFaxBCwhkt5Sr1OEEnvbDAIoTKzLb4I="
//const serviceConnectionString = "HostName=oee-iot-hub.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=ObaWPBDsfaG7B5RQOyVuE6xfiUoL0PfT0AIoTAwPT5c=";

// var iothubclient = AzureClient.fromConnectionString(deviceConnectionString, Protocol);
// var serviceClient = ServiceClient.fromConnectionString(serviceConnectionString);
// var messageID = 2;
// var messageBody = "";

// function receiveFeedback(err, receiver) {
//     receiver.on('message', function (msg) {
//         console.log('Feedback message:')
//         console.log(msg.getData().toString('utf-8'));
//     });
// }

// function printResultFor(op) {
//     return function printResult(err, res) {
//         if (err) console.log(op + ' error: ' + err.toString());
//         if (res) console.log(op + ' status: ' + res.constructor.name);
//     };
// }

// messageBody = JSON.stringify({
//     "MachineID": "Bystronic12K",
//     "OperationHours": operation_hours,
//     "CuttingHours": cutting_hours,
//     "TimeOfData": Time
// });

// connect to azure-iot-device and send message
// await new Promise((resolve, reject) => {
//     iothubclient.open(function (err) {
//         if (err) {
//             console.error('Could not connect: ' + err.message);
//             reject(err);
//         } else {
//             console.log('Client connected');
//             var message = new Message(messageBody);
//             message.ack = 'full';
//             message.messageId = ++messageID;
//             console.log('Sending message: ' + message.getData());
//             iothubclient.sendEvent(message, function (err, res) {
//                 printResultFor('send')(err, res);
//                 if (err) reject(err);
//                 else resolve();
//             });
//         }
//     });
// });

// connect to azure-iothub and get feedback
// await new Promise((resolve, reject) => {
//     serviceClient.open(function (err) {
//         if (err) {
//             console.error('Could not connect: ' + err.message);
//             reject(err);
//         } else {
//             console.log('Service client connected');
//             serviceClient.getFeedbackReceiver(function (err, receiver) {
//                 if (err) {
//                     console.error('Could not get feedback receiver: ' + err.message);
//                     reject(err);
//                 } else {
//                     receiveFeedback(null, receiver);
//                     resolve();
//                 }
//             });
//         }
//     });
// });

// close connection from azure-iothub
// await serviceClient.close();
// close connection from azure-iot-device
// await iothubclient.close();