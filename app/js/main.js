'use strict';


const { clipboard } = require('electron');
const psychokinesis = require('psychokinesis');
const request = require('request');
const uuid = require('uuid');
const path = require('path');
const blobToBuffer = require('blob-to-buffer');

var psycDomain = uuid.v4() + '.psy';
var psycEntryNode = null;


navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

var constraints = {"audio": true, "video": {  "mandatory": {  "minWidth": 320,  "maxWidth": 320, "minHeight": 240,"maxHeight": 240 }, "optional": [] } };


var copyBtn = document.querySelector('button#copy');

var videoElement = document.querySelector('video');
var dataElement = document.querySelector('#data');

copyBtn.disabled = true;
videoElement.controls = false;
videoElement.muted= true;


function errorCallback(error){
	console.log('navigator.getUserMedia error: ', error);
}

var mediaRecorder;
var chunks = [];
var count = 0;
var blob = null;
var requestInterval = 10000;

if (typeof MediaRecorder === 'undefined' || !navigator.getUserMedia) {
	alert('MediaRecorder not supported on your browser, use Firefox 30 or Chrome 49 instead.');
	throw new Error('MediaRecorder not supported on your browser');
}

navigator.getUserMedia(constraints, startRecording, errorCallback);


function startRecording(stream) {
	if (typeof MediaRecorder.isTypeSupported == 'function'){
		/*
			MediaRecorder.isTypeSupported is a function announced in https://developers.google.com/web/updates/2016/01/mediarecorder and later introduced in the MediaRecorder API spec http://www.w3.org/TR/mediastream-recording/
		*/
		if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
		  var options = {mimeType: 'video/webm;codecs=vp9'};
		} else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
		  var options = {mimeType: 'video/webm;codecs=vp8'};
		}

		mediaRecorder = new MediaRecorder(stream, options);
	}else{
		mediaRecorder = new MediaRecorder(stream);
	}

	mediaRecorder.start(10);

	var url = window.URL || window.webkitURL;
	videoElement.src = url ? url.createObjectURL(stream) : stream;
	videoElement.play();

	mediaRecorder.ondataavailable = function(e) {
		chunks.push(e.data);
	};

	mediaRecorder.onerror = function(e){
		log('Error: ' + e);
		console.log('Error: ', e);
	};


	mediaRecorder.onstart = function(){
		setTimeout(function(){
			mediaRecorder.stop();
		}, requestInterval);
	};

	mediaRecorder.onstop = function(){
		blob = new Blob(chunks, {type: "video/webm"});
		chunks = [];

		navigator.getUserMedia(constraints, startRecording, errorCallback);
	};

	mediaRecorder.onpause = function(){
		log('Paused & state = ' + mediaRecorder.state);
	}

	mediaRecorder.onresume = function(){
		log('Resumed  & state = ' + mediaRecorder.state);
	}

	mediaRecorder.onwarning = function(e){
		log('Warning: ' + e);
	};
}


function onBtnCopyClicked(){
	clipboard.writeText('http://covertness.coding.me/Media-Recorder-API-Demo/?domain=' + psycDomain);
	log('分享链接已复制到剪贴板！');
}


function log(message){
	dataElement.innerHTML = dataElement.innerHTML+'<br>'+message ;
}



request('https://coding.net/u/covertness/p/nodelist/git/raw/master/nodes.txt', function (error, response, body) {
	if (!error && response.statusCode == 200) {
		let nodeList = new Buffer(body, 'base64').toString('ascii');
		let nodes = JSON.parse(nodeList);

		if (nodes.length > 0) {
			psycEntryNode = nodes[Math.floor(Math.random() * nodes.length)];

			let psyc = psychokinesis.createServer({
				domain: psycDomain,
				nodeIdFile: 'node.data',
				entryNode: psycEntryNode
			}, (req, resp) => {
				handleRequest(req, resp);
			});

			psyc.on('ready', () => {
				copyBtn.disabled = false;

                log('Psychokinesis is ready. Domain: ' + psycDomain);
            });

            psyc.on('error', (err) => {
                log('Psychokinesis error:' + err);
            });
		}
	} else {
		log('Get psychokinesis entry nodelist failed!');
	}
});

function handleRequest(req, resp) {
	resp.setHeader('Access-Control-Allow-Origin', '*');
	
	if (blob === null) {
		resp.statusCode = 404;
		resp.end();
		return;
	}

	blobToBuffer(blob, function (err, buffer) {
		if (err) {
			log('response error:' + err);
			resp.statusCode = 500;
            resp.end();
			return;
		}

		resp.end(buffer);
	});
}