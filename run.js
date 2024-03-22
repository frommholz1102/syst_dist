// Main server file for the survey ID generation service

// Import builtin NodeJS modules
const https = require("https");
const fs = require("fs");
const express = require("express");
var bodyParser = require('body-parser');
const cors = require('cors');
// uuid module only for generating process IDs
const { v4: uuidv4 } = require('uuid'); 

// Instantiate an Express application
const app = express();
app.use(bodyParser.json());     // be ready to parse JSON from POST requests
app.use(cors({ origin: '*' })); // allow access from inside javascript

// read data process log file
// whenever the browser (Limesurvey) request an ID ("START") / sends a "COMPLETE"
// an entry is created. The corresponding folderId is also recorded.
const logFilePath = "process_log.json";
const idCountPath = "id_counts.json";

// define functions for log file
// 1.) timestamp generation
// 2.) processId generation
// 3.) find next folderId
// 4.) write log file

// Function to generate a timestamp
function generateTimestamp() {
    const now = new Date();

    return now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
}


// Function to generate a unique processId
function generateProcessID() {
    // generate a string of numbers and characters as processID
    return uuidv4(); // Generate UUID
}


// finding the next folderId by counting completes in log file
// the count only depends on COMPLETED surveys (processes)
function findNextFolderId(groupId, logFilePath, idCountPath, totalFolderIds) {
    let logData = [];
    let idCountData = [];
    let totalCompletes = 0;

    // load files (log file and id count file)
    try {
        if (fs.existsSync(logFilePath)) {
            const existingData = fs.readFileSync(logFilePath, 'utf8');
            if (existingData.trim() !== '') {
                logData = JSON.parse(existingData);
            }
        }
    } catch (error) {
        console.error('Error reading log file:', error);
    }
    try {
        if (fs.existsSync(idCountPath)) {
            const existingData = fs.readFileSync(idCountPath, 'utf8');
            if (existingData.trim() !== '') {
                idCountData = JSON.parse(existingData);
            }
        }
    } catch (error) {
        console.error('Error reading id count file:', error);
    }

    //  count completes per folerId and total Completes
    const folderCounts = new Map();
    for (const entry of logData) {
        if (entry.action === 'COMPLETE' && entry.folderId !== null) {
            const folderId = entry.folderId.toString();

            totalCompletes++;

            // Increment completes for the folderId
            if (folderCounts.has(folderId)) {
                folderCounts.set(folderId, folderCounts.get(folderId) + 1);
            } else {
                folderCounts.set(folderId, 1);
            }
        }
    }

    // get array from id counter for groupId (starts with 1)
    const groupIdArray = idCountData[groupId];

    // Find the indices where the array has the value 1
    const indicesWithOne = [];
    for (let i = 0; i < groupIdArray.length; i++) {
        if (groupIdArray[i] === 1) {
            indicesWithOne.push(i);
        }
    }

    let nextFolderId;
    // If there are indices with value 1, randomly select one of them
    if (indicesWithOne.length > 0) {
        const randomIndex = Math.floor(Math.random() * indicesWithOne.length);
        nextFolderId = indicesWithOne[randomIndex] + 1; // Adding 1 to convert index to folderId
    } else {
        // If no indices with value 1 found, return a random folderId
        nextFolderId = Math.floor(Math.random() * totalFolderIds) + 1;
    }

    console.log('Next Folder ID:', nextFolderId);
    return nextFolderId;
}
  

function generateStatusReport(data) {
    for (let group in data) {
        let nonOneItems = data[group].filter(item => item !== 1).length;
        console.log(`Group ${group}: ${nonOneItems}`);
    }
}

// when recieving the complete from the survey update the group ID count file
function updateGroupIdCount(groupId, folderId, processId, logFilePath, idCountPath) {
    
    folderId = parseInt(folderId);
    groupId = parseInt(groupId);
    // Load log data
    let logData = [];
    try {
        if (fs.existsSync(logFilePath)) {
            const existingData = fs.readFileSync(logFilePath, 'utf8');
            if (existingData.trim() !== '') {
                logData = JSON.parse(existingData);
            }
        }
    } catch (error) {
        console.error('Error reading log file:', error);
    }
   // Check if there is a corresponding "START" entry in the log data
   const startEntry = logData.find(entry =>
        entry.action === 'START' &&
        entry.folderId === folderId &&
        entry.processId === processId &&
        entry.groupId === groupId
    );

    if (startEntry) {
        // Update id count file
        // Open id count file
        let idCountData = [];
        try {
            if (fs.existsSync(idCountPath)) {
                const existingData = fs.readFileSync(idCountPath, 'utf8');
                if (existingData.trim() !== '') {
                    idCountData = JSON.parse(existingData);
                }
            }
        } catch (error) {
            console.error('Error reading id count file:', error);
        }

        // Get the array corresponding to the group ID
        const groupIdArray = idCountData[groupId];
        // Decrease the array value of the folderID (index starts at 1) 
        groupIdArray[folderId - 1] = groupIdArray[folderId - 1]-1;

        // Save updated id count data back to file
        fs.writeFileSync(idCountPath, JSON.stringify(idCountData, null, 4), 'utf8');
        generateStatusReport(idCountData);

        // create log entry and write into log file ("COMPLETE")
        const timestamp = generateTimestamp();
        const logEntry = {
            timestamp: timestamp,
            processId: processId,
            action: "COMPLETE",
            folderId: folderId,
            groupId: groupId
        };
        writeLogEntry(logEntry, logFilePath)

    } else {
        console.log("Corresponding 'START' entry not found in log data.");
    }
}

// Function to write a log entry to the "process_log.json" JSON file
function writeLogEntry(logEntry, logFilePath) {
    let logData = [];
  
    try {
        // Read existing log data if the file exists
        if (fs.existsSync(logFilePath)) {
          const existingData = fs.readFileSync(logFilePath, 'utf8');
    
          // Check if the file is not empty
          if (existingData.trim() !== '') {
            logData = JSON.parse(existingData);
          }
        }
      } catch (error) {
        console.error('Error reading log file:', error);
      }
  
    // Add the new log entry
    logData.push(logEntry);
  
    // Write the updated log data back to the file
    fs.writeFileSync(logFilePath, JSON.stringify(logData, null, 2), 'utf8');
}


// set ssl-options (SSL key and certificate file) for server
// SSL ensures a secure connection between the browser and this server
const options = {
    key: fs.readFileSync("ssl/pk.key"),
    cert: fs.readFileSync("ssl/ssl.cer"), 
    ca: [fs.readFileSync("ssl/issl.cer")]
};

// create https server listening to port 8000
// firewall only open on this port (via IONOS)
https.createServer(options, app).listen(8000, () => {
    console.log("Server running on port 8000.");
});

// default GET: send back new folderId
app.get('/', function (req, res, next) {

    res.setHeader('Access-Control-Allow-Origin', '*');

    // Extracting groupId from query parameters
    const groupId = parseInt(req.query.groupId);
    console.log("Received groupId:", groupId);

    // prepare log entry (timestamp, process id)
    const timestamp = generateTimestamp();
    const processID = generateProcessID();
    // find first folderId with the least completes as well as 
    // folderId available for groupId
    const nextFolderId = findNextFolderId(groupId, logFilePath, idCountPath, 115);

    console.log("--------------------")
    console.log("Sent "+nextFolderId)
    
    // write entry into logfile ("STARTED")
    const logEntry = {
        timestamp: timestamp,
        processId: processID,
        action: "START",
        folderId: nextFolderId, 
        groupId: groupId
    };
    writeLogEntry(logEntry, logFilePath)
    
    // send folderId and processId as response to browser
    res.json({ folderId: nextFolderId, processId: processID });
    
    return;
});

// default POST: process folderId from body
app.post('/', function (req, res, next) {

    // retrieve information from request body 
    var folderId = req.body.folderId;
    var processId = req.body.processId;
    var groupId = req.body.groupId;

    console.log("Recieved " + folderId);
    console.log();

    updateGroupIdCount(groupId, folderId, processId, logFilePath, idCountPath)

    // send response (no data)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(req.body);
});

