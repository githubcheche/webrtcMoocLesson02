'use strict'

var localVideo = document.querySelector('video#localvideo');
var remoteVideo = document.querySelector('video#remotevideo');

var btnStart = document.querySelector('button#start');
var btnCall = document.querySelector('button#call');
var btnHangup = document.querySelector('button#hangup');

var offerSdpTextarea = document.querySelector('textarea#offer');
var answerSdpTextarea = document.querySelector('textarea#answer');

var localStream;
var pc1; // 拨打方
var pc2; // 接听方

function getMediaStream(stream) {
    localVideo.srcObject = stream;
    localStream = stream;
}

function handleError(err) {
    console.error('Failed to get Media Stream!', err);
}

// 开始采集获取本地流
function start() {

    if (!navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia) {
        console.error('the getUserMedia is not supported!');
        return;
    } else {
        var constraints = {
            video: true,
            audio: false
        }
        navigator.mediaDevices.getUserMedia(constraints)
            .then(getMediaStream)
            .catch(handleError);

        btnStart.disabled = true;
        btnCall.disabled = false;
        btnHangup.disabled = true;
    }
}

// 获取远端流并设置到video标签
function getRemoteStream(e) {
    if (remoteVideo.srcObject !== e.streams[0]) {
        remoteVideo.srcObject = e.streams[0];
    }
}

function handleOfferError(err) {
    console.error('Failed to create offer:', err);
}

function handleAnswerError(err) {
    console.error('Failed to create answer:', err);
}

function getAnswer(desc) {
    pc2.setLocalDescription(desc);
    answerSdpTextarea.value = desc.sdp // answer的sdp显示

    //pc2 send desc to signal
    //pc1 receive desc from signal

    pc1.setRemoteDescription(desc);
}

function getOffer(desc) {
    pc1.setLocalDescription(desc); // 此时触发ice收集candidate流程
    offerSdpTextarea.value = desc.sdp // offer的sdp显示

    //pc1 send desc to signal
    //pc2 receive desc from signal

    // 假设pc2收到了pc1的Description
    pc2.setRemoteDescription(desc);
    // pc2创建answer
    pc2.createAnswer()
        .then(getAnswer)
        .catch(handleAnswerError);

}

// 开始拨打电话
function call() {

    pc1 = new RTCPeerConnection();
    pc2 = new RTCPeerConnection();

    // pc1收集好candidate后回调
    pc1.onicecandidate = (e) => {
        // pc1 send candidate to peer
        // pc2 receive candidate from peer

        // 这里假设pc1发送了candidate过来
        pc2.addIceCandidate(e.candidate);
        console.log('pc1 ICE candidate:', e.candidate);
    }

    pc1.iceconnectionstatechange = (e) => {
        console.log(`pc1 ICE state: ${pc.iceConnectionState}`);
        console.log('ICE state change event: ', e);
    }

    pc2.onicecandidate = (e) => {
        // pc2 send candidate to peer
        // pc1 receive candidate from peer

        // 这里假设pc2发送了candidate过来
        pc1.addIceCandidate(e.candidate)
            .catch(handleError);
        console.log('pc2 ICE candidate:', e.candidate);
    }

    pc2.iceconnectionstatechange = (e) => {
        console.log(`pc2 ICE state: ${pc.iceConnectionState}`);
        console.log('ICE state change event: ', e);
    }

    // 获取到远端流回调
    pc2.ontrack = getRemoteStream;

    //add Stream to caller 添加本地所有流
    localStream.getTracks().forEach((track) => {
        pc1.addTrack(track, localStream);
    });

    // 0为关闭，1为打开
    var offerOptions = {
        offerToRecieveAudio: 0,
        offerToRecieveVideo: 1
    }

    // pc1发送端创建offer
    pc1.createOffer(offerOptions)
        .then(getOffer)
        .catch(handleOfferError);

    btnCall.disabled = true;
    btnHangup.disabled = false;
}

function hangup() {
    pc1.close();
    pc2.close();
    pc1 = null;
    pc2 = null;

    btnCall.disabled = false;
    btnHangup.disabled = true;
}

btnStart.onclick = start;
btnCall.onclick = call;
btnHangup.onclick = hangup;