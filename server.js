'use strict'

var http = require('http');
var https = require('https');
var fs = require('fs');

var express = require('express');
var serveIndex = require('serve-index');

// 增加socket.io
var socketIo = require('socket.io');

// 日志依赖包
var log4js = require('log4js');
// 日志配置
log4js.configure({
	appenders: {
		file: {
			type: 'file',
			filename: 'app.log',
			layout: {
				type: 'pattern',
				pattern: '%r %p - %m',
			}
		}
	},
	categories: {
		default: {
			appenders: ['file'],
			level: 'debug'
		}
	}
});
var logger = log4js.getLogger();

var app = express();
app.use(serveIndex('./public'));
app.use(express.static('./public'));

//http server
var http_server = http.createServer(app);
http_server.listen(80, '0.0.0.0');

var options = {
	key: fs.readFileSync('./cert/privkey1.pem'),
	cert: fs.readFileSync('./cert/fullchain1.pem')
}

//https server
var https_server = https.createServer(options, app);

// socket.io 与 https_server 和 http_server 绑定
var io = socketIo.listen(https_server);
var sockio = socketIo.listen(http_server);

// https sockio connection连接
io.sockets.on('connection', (socket) => {
	// 信令与业务
	// 接收到消息信令
	socket.on('message', (room, data) => {
		// 发送消息信令
		socket.to(room).emit('message', room, data) //房间内所有人,除自己外
	});

	// 接收到加入房间信令，该函数应该加锁
	socket.on('join', (room) => {
		socket.join(room);
		// 获取房间
		var myRoom = io.sockets.adapter.rooms[room];
		// 获取房间人数
		var users = Object.keys(myRoom.sockets).length;

		logger.info('the number of user in room is: ' + users);

		//在这里可以控制进入房间的人数,现在一个房间最多 2个人
		//为了便于客户端控制，如果是多人的话，应该将目前房间里
		//人的个数当做数据下发下去。
		if (users < 3) {
			// 给某个房间所有人发送joined信令
			socket.emit('joined', room, socket.id);
			if (users > 1) {
				// 除自己之外所有人发otherjoin信令
				socket.to(room).emit('otherjoin', room);
			}
		} else {
			// 人数超了离开房间
			socket.leave(room);
			// 给本次连接发送full信令
			socket.emit('full', room, socket.id);
		}
	});

	// 接收到离开房间信令
	socket.on('leave', (room) => {
		var myRoom = io.sockets.adapter.rooms[room];
		var users = Object.keys(myRoom.sockets).length;

		logger.info('the number of user in room is: ' + (users - 1));

		socket.leave(room);
		// 给房间内所有人,除自己外发送bye信令
		socket.to(room).emit('bye', room, socket.id)
		socket.emit('leaved', room, socket.id);
	});

});

// http sockio connection连接
sockio.sockets.on('connection', (socket) => {
	// 信令与业务
	socket.on('message', (room, data) => {
		sockio.in(room).emit('message', room, socket.id, data)
	});

	socket.on('join', (room) => {
		socket.join(room);
		var myRoom = sockio.sockets.adapter.rooms[room];
		var users = Object.keys(myRoom.sockets).length;
		logger.info('the number of user in room is: ' + users);
		socket.emit('joined', room, socket.id);
	});

	socket.on('leave', (room) => {
		var myRoom = sockio.sockets.adapter.rooms[room];
		var users = Object.keys(myRoom.sockets).length;

		logger.info('the number of user in room is: ' + (users - 1));

		socket.leave(room);
		socket.emit('leaved', room, socket.id);
	});
});

https_server.listen(443, '0.0.0.0');