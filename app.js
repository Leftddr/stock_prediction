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
    fs.readFile('./html/stock_chat.html', function(err, data){
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
var room_list = [];

io.sockets.on('connection', function(socket){

    socket.on('login', function(message){
      if(login_ids[message.id]){
        sendResponse(socket, "", '', '이미 존재하는 id 입니다.');
        return;
      }
      login_ids[message.id] = socket.id;
      socket.login_id = message.id;
      io.sockets.connected[socket.id] = socket;
      sendResponse(socket, message.id + "님", '', '로그인이 성공적으로 완료되었습니다.');
    });

    socket.on('sendInformation', function(message){
        console.dir("모든 사람에게 [정보] 메세지를 전달합니다.");
        io.sockets.emit('messageInfo', message);
    });

    socket.on('sendPrivate', function(message){
      console.dir(message.receiver + "에게 메세지를 전달합니다.");
      if(login_ids[message.receiver]){
        io.sockets.connected[login_ids[message.receiver]].emit('messagePriv', message);
      }
      else{
        sendResponse(socket, '', '404', '상대방 아이디를 찾을 수 없습니다.');
      }
    });

    socket.on('groupsend', function(message){
      console.dir(message.roomid + "전체에 메세지를 보냅니다.");
      if(io.sockets.adapter.rooms.has(message.roomid)){
        io.sockets.in(message.roomid).emit('groupsend', message);
      }
      else{
        sendResponse(socket, '', '', '현재 보낸 이름을 가진 방이 없습니다.');
      }
    });

    socket.on('makeroom', function(message){
      if(io.sockets.adapter.rooms[message.roomid]){
        sendResponse(socket, '', '', '방의 이름이 이미 존재합니다.');
        return;
      }
      console.dir(message.nickname + "님이 " + message.roomid + "방을 만들었습니다.");
      socket.join(message.roomid);
      var curRoom = io.sockets.adapter.rooms.get(message.roomid);
    
      curRoom.owner = message.nickname;
      curRoom.users_cnt = 1;
      curRoom.users = [];
      curRoom.users.push(message.nickname); 

      room_list.push(message.roomid);
      sendResponse(socket, '', '', '성공적으로 방을 만들었습니다.');
    });

    socket.on('userlist', function(message){
      if(io.sockets.adapter.rooms.has(message.roomid))
        sendResponse(socket, "userlist", "200", io.sockets.adapter.rooms.get(message.roomid).users);
      else
        sendResponse(socket, '', '', '현재 보낸 이름을 가진 방이 없습니다.');
    });

    socket.on('roomlist', function(message){
      sendResponse(socket, "roomlist", "200", room_list);
    });

    socket.on('roomenter', function(message){
      if(io.sockets.adapter.rooms.has(message.roomid)){
        socket.join(message.roomid);

        var curRoom = io.sockets.adapter.rooms.get(message.roomid);
        curRoom.users.push(message.nickname);
        curRoom.users_cnt++;

        console.dir(message.roomid + "방에 참가하였습니다.");
        sendResponse(socket, message.roomid, "", "에 참가하였습니다.");
      }
      else{
        sendResponse(socket, '', '', '현재 보낸 이름을 가진 방이 없습니다.');
      }
    });

    socket.on('roomleave', function(message){
      if(io.sockets.adapter.rooms.has(message.roomid)){
        socket.leave(message.roomid);

        var curRoom = io.sockets.adapter.rooms.get(message.roomid);
        curRoom.users_cnt--;
        if(curRoom.users_cnt == 0){
          io.sockets.adapter.rooms.delete(message.roomid);
          sendResponse(socket, message.roomid, "", "을 완전히 삭제합니다.");
        }
        else{
          console.dir(message.roomid + "방을 떠났습니다.");
          sendResponse(socket, message.roomid, "", "을 떠났습니다.");
        }
      }
      else{
        sendResponse(socket, '', '', '현재 보낸 이름을 가진 방이 없습니다.');
      }
    });
});

function sendResponse(socket, command, code, message){
  var statusObj = {command : command, code : code, message : message};
  socket.emit('response', statusObj);
}

console.log("event setting");
