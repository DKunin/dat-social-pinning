'use strict';

const http = require('http');
const fs = require('fs');
const datNode = require('dat-node');
const datDeamon = require('dat-deamon');
const datResolve = require('dat-link-resolve');
const DATA_FILE = './data/data.json';
let datKey;

datDeamon
    .start({
        path: './data'
    })
    .then(({ network, progress, key }) => {
        datKey = key;
        console.log(key);
    });

function pinDat(datKey) {
    try {
        fs.mkdirSync(`./temp/${datKey}`);
    } catch (err) {}
    datNode(`./temp/${datKey}`, { temp: false, key: datKey }, function(
        err,
        dat
    ) {
        dat.joinNetwork(function(err) {
            if (err) throw err;
            if (!dat.network.connected || !dat.network.connecting) {
                console.error('No users currently online for that key.');
            }
        });
    });
}

function appendToFile(datKey) {
    fs.readFile(DATA_FILE, function(err, data) {
        let currentFile = JSON.parse(data.toString());
        if (currentFile.includes(datKey)) {
            currentFile = currentFile.filter(singleKey => singleKey !== datKey);
        } else {
            currentFile = currentFile.concat(datKey);
            pinDat(datKey);
        }
        fs.writeFile(DATA_FILE, JSON.stringify(currentFile, null, 4), () => {});
    });
}


fs.readFile(DATA_FILE, function(err, data) {
    let currentFile = JSON.parse(data.toString());
    currentFile.forEach(pinDat)
});

const server = http.createServer(function(req, res) {
    if (req.method == 'POST') {
        var body = '';
        req.on('data', function(data) {
            body += data;
        });
        req.on('end', function() {
            const { link } = JSON.parse(body);
            datResolve(link, function(err, key) {
                if (key) {
                    appendToFile(key);
                }
            });
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ result: 'ok' }));
    } else {
        console.log('GET');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ datKey }));
    }
});

const port = 3000;
const host = '127.0.0.1';
server.listen(port, host);
console.log('Listening at http://' + host + ':' + port);
