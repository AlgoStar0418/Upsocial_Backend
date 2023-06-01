require("dotenv").config();
var express = require("express");
const cors = require('cors');
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const session = require('express-session');
var app = express();
const port = process.env.PORT;
const Route = require("./routes/inxex");// Import Routers.
const downloadRoute = require('./routes/download.router');
const logger = require('morgan');


app.use(cors());
// enable CORS without external module
app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type");
    res.setHeader("Access-Control-Allow-Credentials", true);
    next();
});

// Body parser middleware
app.use(cookieParser());
app.use(bodyParser.json({ limit: '800mb' }));
app.use(logger('dev'));
app.use(bodyParser.urlencoded({ limit: '800mb', extended: true }));
app.use(bodyParser.json());
app.use(express.static("downloads"));

app.use(session({
    key: 'user_sid',
    secret: 'somerandonstuffs',
    resave: true,
    saveUninitialized: true,
    cookie: {
        expires: 600000
    }
}));

// Use routes
app.use("/api/Upsocial", Route);

// add.upsocial
app.use('/api', downloadRoute);



app.listen(port, () => console.log(`Backend API is now running on port: ${port}`));