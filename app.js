var express = require('express');
var path = require('path');
// var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors = require('cors'); // for access-control

var mongoose = require('mongoose');

var index = require('./routes/index');
var users = require('./routes/users');
var sensors = require('./routes/sensors');
var patients = require('./routes/patients');
var beds = require('./routes/beds');
var rooms = require('./routes/rooms');
var floors = require('./routes/floors');
var hospitals = require('./routes/hospitals');
var data = require('./routes/data');

var app = express();

// Setup mongoose
var mongoDB = 'mongodb://127.0.0.1/cloud_sensor_monitor';

mongoose.connect(mongoDB, {
  useMongoClient: true
});

// Get the default connection
var db = mongoose.connection;
// Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'MongoDB connection error: '));
db.once('open', function(){
    // CONNECTED TO MONGODB SERVER
    console.log("Connected to mongod server");
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// for access-control, use it before all route definitions
app.use(cors({origin: '*'}));

app.use('/', index);
app.use('/users', users);
app.use('/data', data);
app.use('/api/sensors', sensors);
app.use('/api/patients', patients);
app.use('/api/beds', beds);
app.use('/api/rooms', rooms);
app.use('/api/floors', floors);
app.use('/api/hospitals', hospitals);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


module.exports = app;
