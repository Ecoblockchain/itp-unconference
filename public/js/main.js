$(document).ready(function(){

	renderPage();

	function renderPage(){
			$.getJSON( "/api/get/topics", function(data) {
				$.each(data.teach, function(index) {
	        $('#teach').append(
	          '<div class="topic-holder" id="'+data.teach[index]._id+'">' +
	          	'<p>Topic: ' +data.teach[index].description+'</p>' +
	          	'<p>Session Leader: ' +data.teach[index].person+'</p>' +
	          	'<p>Current Vote Count: ' +data.teach[index].voteCount+'</p>' +
	          	'<p>Vote for this topic by texting "Vote ' +data.teach[index].voteCode+'"</p>' +
	        	'</div>'				  
	        );
	      });
				$.each(data.learn, function(index) {
	        $('#learn').append(
	          '<div class="topic-holder" id="'+data.learn[index]._id+'">' +
	          	'<p>Topic: ' +data.learn[index].description+'</p>' +
	          	'<p>Current Vote Count: ' +data.learn[index].voteCount+'</p>' +
	          	'<p>Vote for this topic by texting "Vote ' +data.learn[index].voteCode+'"</p>' +
	        	'</div>'				  
	        );
	      });					
			});
		}
});

// local --> http://localhost:5000/
// server --> http://itp-jan-jam.herokuapp.com/
var socket = io('http://itp-jan-jam.herokuapp.com/');
socket.on('connect', function () {
	console.log('connected');
	socket.emit('meh','hello back');
});

socket.on('hello', function (data) {
  console.log(data);
});

socket.on('twilioData', function (data) {
  console.log(data);
  //socket.emit('my other event', { my: 'data' });
});