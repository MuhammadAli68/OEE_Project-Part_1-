const node_opc = require('node-opcua-client');
const AzureClient = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;
const Protocol = require('azure-iot-device-mqtt').Mqtt; // Changed to Mqtt for proper protocol
const ServiceClient = require('azure-iothub').Client;
const { AttributeIds } = require("node-opcua-client");

const endpointUrl = "opc.tcp://192.168.110.15:56000";
const deviceConnectionString = "HostName=oee-iot-hub.azure-devices.net;DeviceId=bystronic12K;SharedAccessKey=iZZs5wuxDkz7GFaxBCwhkt5Sr1OEEnvbDAIoTKzLb4I="
const serviceConnectionString = "HostName=oee-iot-hub.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=ObaWPBDsfaG7B5RQOyVuE6xfiUoL0PfT0AIoTAwPT5c=";

const connectionStrategy = {
    initialDelay: 1000,
    maxRetry: 1
};

const client = node_opc.OPCUAClient.create({
    applicationName: "MyClient",
    connectionStrategy: connectionStrategy,
    endpointMustExist: false
});

var iothubclient = AzureClient.fromConnectionString(deviceConnectionString, Protocol);
var serviceClient = ServiceClient.fromConnectionString(serviceConnectionString);
var messageID = 2;
var messageBody = "";

async function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function receiveFeedback(err, receiver) {
    receiver.on('message', function (msg) {
        console.log('Feedback message:')
        console.log(msg.getData().toString('utf-8'));
    });
}

function printResultFor(op) {
    return function printResult(err, res) {
        if (err) console.log(op + ' error: ' + err.toString());
        if (res) console.log(op + ' status: ' + res.constructor.name);
    };
}

async function main() {
    try {
        // step 1 : connect to OPC UA server
        await client.connect(endpointUrl);
        console.log("connected !");

        // step 2 : createSession
        const session = await client.createSession();
        console.log("session created !");

        // step 3 : read OperationHours and CuttingHours values
        const dataValue1 = await session.read({
            nodeId: "ns=2;s=Machine.OperationHours",
            attributeId: AttributeIds.Value
        });
        console.log("Machine Operating hours = ", dataValue1.value.value);
        let operation_hours = dataValue1.value.value;

        const dataValue2 = await session.read({
            nodeId: "ns=2;s=Machine.CuttingHours",
            attributeId: AttributeIds.Value
        });
        console.log("Laser Cutting hours = ", dataValue2.value.value);
        let cutting_hours = dataValue2.value.value;
        let Time = new Date(dataValue2.serverTimestamp).toLocaleString("en-US",{timeZone:"America/New_York",hour12: false}).replace(",","");

        messageBody = JSON.stringify({
            "MachineID": "Bystronic12K",
            "OperationHours": operation_hours,
            "CuttingHours": cutting_hours,
            "TimeOfData": Time
        });

        // connect to azure-iot-device and send message
        await new Promise((resolve, reject) => {
            iothubclient.open(function (err) {
                if (err) {
                    console.error('Could not connect: ' + err.message);
                    reject(err);
                } else {
                    console.log('Client connected');
                    var message = new Message(messageBody);
                    message.ack = 'full';
                    message.messageId = ++messageID;
                    console.log('Sending message: ' + message.getData());
                    iothubclient.sendEvent(message, function (err, res) {
                        printResultFor('send')(err, res);
                        if (err) reject(err);
                        else resolve();
                    });
                }
            });
        });

        // connect to azure-iothub and get feedback
        await new Promise((resolve, reject) => {
            serviceClient.open(function (err) {
                if (err) {
                    console.error('Could not connect: ' + err.message);
                    reject(err);
                } else {
                    console.log('Service client connected');
                    serviceClient.getFeedbackReceiver(function (err, receiver) {
                        if (err) {
                            console.error('Could not get feedback receiver: ' + err.message);
                            reject(err);
                        } else {
                            receiveFeedback(null, receiver);
                            resolve();
                        }
                    });
                }
            });
        });

        console.log("done !");
        // close opc ua session
        await session.close();

        // disconnecting opc ua server
        await client.disconnect();

        // close connection from azure-iothub
        await serviceClient.close();
        // close connection from azure-iot-device
        await iothubclient.close();

        return;
    } catch (err) {
        console.log("An error has occurred : ", err);
    }
}

module.exports = { main };
