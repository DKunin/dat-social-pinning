'use strict';

const http = require('http');
const fs = require('fs');
const datNode = require('dat-node');
const datDeamon = require('dat-deamon');
const datResolve = require('dat-link-resolve');
const DATA_FILE = './data/data.json';
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());
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
    currentFile.forEach(pinDat);
});

app.get('/links', cors(), (req, res) => {
    fs.readFile(DATA_FILE, function(err, data) {
        res.json(JSON.parse(data.toString()));
    });
});

app.post('/newlink', cors(), (req, res) => {
    const { link } = req.body;
    datResolve(link, function(err, key) {
        if (key) {
            appendToFile(key);
        }
    });
    res.json({ link });
});

app.listen(3002);
