var http = require('http').Server();
var fs = require('fs');
var IO = require('socket.io');

var redis = require('redis');
var redisClient = redis.createClient;
var pub = redisClient(6379, '127.0.0.1');
var sub = redisClient(6379, '127.0.0.1');

/*//配置ssl证书
var options = {
  key: fs.readFileSync('./ssl/key.pem'),
  cert: fs.readFileSync('./ssl/cert.pem'),
  passphrase: '123456789'
};

var server = https.createServer(options).listen(443);
console.log("The HTTPS server is up and running");*/

var io = IO(http);
console.log("Socket Secure server is up and running.");

// 房间用户名单
var roomUsers = {};
var roomInfo = {};

io.on('connect', function (socket) {
  var roomID = '';  //房间号
  var user = '';   //当前登录用户名

  socket.on('message', function(data) {
    var data = JSON.parse(data);
    switch (data.event) {
      //当有新用户加入时
      case "join":
        console.log("User joined", data.name);
        user = data.name;
        roomID = data.room;
        if (! roomUsers[roomID]) {
          roomUsers[roomID] = [];
          roomInfo[roomID] = [];
          sub.subscribe(roomID);
        }
        //当昵称重复时
        if(roomInfo[roomID][user]) {
          pub.publish(roomID, JSON.stringify({
            "event": "join",
            "message": "该用户名已存在",
            "success": false
          }));
        } else {
          //保存用户信息于该房间
          roomUsers[roomID].push(user);
          roomInfo[roomID][user] = socket;
          socket.name = user;
          socket.join(roomID);
          pub.publish(roomID, JSON.stringify({
            "event": "join",
            "users": roomUsers[roomID],
            "success": true
          }));
        }
        break;

      case "offer":
        //for example: UserA wants to call UserB
        console.log("Sending offer to: ", data.connectedUser);
        //if UserB exists then send him offer details
        var conn = roomInfo[roomID][data.connectedUser];
        if(conn != null) {
          //setting that UserA connected with UserB
          socket.otherName = data.connectedUser;
          sendTo(conn, {
            "event": "offer",
            "offer": data.offer,
            "name": socket.name
          });
        } else {
          sendTo(socket, {
            "event": "msg",
            "message": "Not found this name"
          });
        }
        break;

      case "answer":
        console.log("Sending answer to: ", data.connectedUser);
        //for ex. UserB answers UserA
        var conn = roomInfo[roomID][data.connectedUser];
        if(conn != null) {
          socket.otherName = data.name;
          sendTo(conn, {
            "event": "answer",
            "answer": data.answer
          });
        }
        break;

      case "candidate":
        console.log("Sending candidate to:", data.connectedUser);
        var conn = roomInfo[roomID][data.connectedUser];
        if(conn != null) {
          sendTo(conn, {
            "event": "candidate",
            "candidate": data.candidate
          });
        }
        break;
    }
  })
});

sub.on("subscribe", function(channel) {
  console.log('subscribe: ' + channel);
});

sub.on("message", function(channel, message) {
  console.log("message channel " + channel + ": " + message);
  io.to(channel).emit('message', JSON.parse(message));
});

function sendTo(connection, message) {
  connection.send(message);
}

http.listen(3000);