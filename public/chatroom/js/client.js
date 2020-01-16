'use strict'

var userName = document.querySelector('input#username');
var inputRoom = document.querySelector('input#room');
var btnConnect = document.querySelector('button#connect');
var btnLeave = document.querySelector('button#leave');
var outputArea = document.querySelector('textarea#output');
var inputArea = document.querySelector('textarea#input');
var btnSend = document.querySelector('button#send');

var socket;
var room;

// connect点击事件
btnConnect.onclick = () => {

    // 创建connect
    socket = io.connect();

    // 接收被加入信令
    socket.on('joined', (room, id) => {
        btnConnect.disabled = true;
        btnLeave.disabled = false;
        inputArea.disabled = false;
        btnSend.disabled = false;
    });

    // 接收离开信令
    socket.on('leaved', (room, id) => {
        btnConnect.disabled = false;
        btnLeave.disabled = true;
        inputArea.disabled = true;
        btnSend.disabled = true;

        socket.disconnect();
    });

    // 接收消息信令
    socket.on('message', (room, data) => {
        outputArea.scrollTop = outputArea.scrollHeight; //窗口总是显示最后的内容
        outputArea.value = outputArea.value + data + '\r';
    });

    // socket.disconnect()回调
    socket.on('disconnect', (socket) => {
        btnConnect.disabled = false;
        btnLeave.disabled = true;
        inputArea.disabled = true;
        btnSend.disabled = true;
    });

    // 发送join信令到服务端
    room = inputRoom.value;
    socket.emit('join', room);
}

// 发送点击事件
btnSend.onclick = () => {
    var data = inputArea.value;
    // 用户名与信息组合
    data = userName.value + ':' + data;
    // 发送消息信令
    socket.emit('message', room, data);
    inputArea.value = '';
}

// 离开房间点击事件
btnLeave.onclick = () => {
    room = inputRoom.value;
    // 发送离开信令
    socket.emit('leave', room);
}

inputArea.onkeypress = (event) => {
    //event = event || window.event;
    if (event.keyCode == 13) { //回车发送消息
        var data = inputArea.value;
        data = userName.value + ':' + data;
        socket.emit('message', room, data);
        inputArea.value = '';
        event.preventDefault(); //阻止默认行为
    }
}