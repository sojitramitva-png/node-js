global.express = require("express");
const bodyParser = require('body-parser');
const cors = require("cors");
const { Server } = require('socket.io');
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

global.app = express();
global.jwt = require('jsonwebtoken');
const http = require('http').createServer(app);

app.use(express.static('uploads'));
// parse application/json
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.json({ limit: '100mb' }));

app.use(cors());

app.use(function (req, res, next) {
    console.info(`${req.method} ${req.originalUrl}`)
    var origin = req.headers.origin;

    res.header('access-control-allow-origin', origin);
    res.header("access-control-allow-credentials", "true");
    res.header("access-control-allow-headers", "x-requested-with");
    res.header("access-control-allow-headers", "origin, x-requested-with, content-type, accept,application/x-www-form-urlencoded,application/json,multipart/form-data");
    res.header("access-control-allow-headers", "true");

    next();
});

// global.mongoose = require('mongoose');
// mongoose.Promise = global.Promise;
// global.connection = mongoose.createConnection("mongodb://127.0.0.1:27017/trelloLite");
// global.Schema = mongoose.Schema;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

global.db = admin.firestore();


global.io = new Server(http, {
    cors: {
        origin: "*", // or restrict to your domain
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join user to their personal room when they connect
    socket.on('joinRoom', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined room user_${userId}`);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected', socket.id);
    });
});

http.listen(4000, () => {
    console.log('Server listening on port 4000');
});


require('./middleware');
require("./routes");