var socketio = require('socket.io');
var cors = require('cors');
var express = require('express');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressSession = require('express-session');
var expressErrorHandler = require('express-error-handler');
var mongodb = require('mongodb');
var mongoose = require('mongoose');
var crypto = require('crypto');
var passport = require('passport');
var flash = require('connect-flash');
var http = require('http');
var fs = require('fs');

var app = express();
var router = express.Router();

app.use(cors());
app.set('port', 54321);
app.use(logger('dev'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(cookieParser());
app.use(expressSession({
  secret: 'my key',
  resave: true,
  saveUninitialized: true
}));

router.get('/', function(req, res){
    fs.readFile('./stock_chat.html', function(err, data){
        if(err) {console.log('error'); return;}
        res.end(data);
    })
});

app.use('/', router);
var server = require('http').Server(app);
server.listen(app.get('port'), () => {
  console.log('Starting Server');
});

var io = socketio(server, {pingTimeout: 5000});
console.log('Ready to Socket io');
io.sockets.connected = [];

var login_ids = {};

io.sockets.on('connection', function(socket){
    socket.on('login', function(message){
      login_ids[message.id] = socket.id;
      socket.login_id = message.id;
      io.sockets.connected[socket.id] = socket;
      console.dir(io.sockets.connected);
    });

    socket.on('sendInformation', function(message){
        console.dir("모든 사람에게 [정보] 메세지를 전달합니다.");
        io.sockets.emit('messageInfo', message);
    });

    socket.on('sendPrivate', function(message){
      console.dir(io.sockets.sockets);
      console.dir(message.receiver + "에게 메세지를 전달합니다.");
      if(login_ids[message.receiver]){
        io.sockets.connected[login_ids[message.receiver]].emit('messagePriv', message);
      }
      else{
        sendResponse(socket, 'login', '404', '상대방 아이디를 찾을 수 없습니다.');
      }
    });
});

function sendResponse(socket, command, code, message){
  var statusObj = {command : command, code : code, message : message};
  socket.emit('response', statusObj);
}

console.log("event setting");
