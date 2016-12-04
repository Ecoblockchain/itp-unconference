
/*
 * routes/routes.js
 *
 * Routes contains the functions (callbacks) associated with request urls.
 */

var http = require('http');
var request = require('request'); // library to make requests to remote urls
var Q = require('q'); // library for javascript promises
var moment = require("moment"); // date manipulation library
var Topic = require("../models/model.js"); //db model... call like Model.Topic

//Twilio
var twilio = require('twilio');

/*
	GET /
*/
exports.index = function(req, res) {

		//build and render template
		var viewData = {
			pageTitle : "ITP January"
		}

		res.render('index.html', viewData);

}

exports.getData = function(req,res){
console.log("route.js getData"+res);
	var data = {}; // data to respond back with

	//console.log(socketsUtil);
	//socketsUtil.calls('hello','hello world');

	Topic.findQ({'type':'teach'})
	.then(function(response){
		data['teach'] = response;
		return Topic.findQ({'type':'learn'})
	})
	.then(function(response){
		data['learn'] = response;
		return res.json(data);
	})
	.fail(function (err) { console.log(err); })
	.done();

}

exports.twilioCallback =  function(req,res){

	var newMsg = req.body.Body;
	console.log(req);
	var conversationId; // an id to track the conversation, will be the mongoDb id

	// let's get the first word, so we know which action they are doing
	// can be teach, learn, or vote
	var words = newMsg.split(" ");
	var action = words[0].toLowerCase();
	var msgToRelay = ''; // all the stuff after the action word
	for(var i=0;i<words.length;i++){
		if(i==0) continue;
		msgToRelay += words[i];
		if(i!=words.length-1) msgToRelay += ' ';
	}

	switch(action) {
	    case 'teach':
        handleTwilioMessage('teach',msgToRelay);
        break;
	    case 'learn':
        handleTwilioMessage('learn',msgToRelay);
        break;
	    case 'vote':
        handleTwilioMessage('vote',msgToRelay);
        break;
      case 'name':
      	handleTwilioMessage('name',msgToRelay);
	    default:
	    	respondBackToTwilio('default');
	   }

	//function does 3 things
	// 1. saves the data to db
	// 2. calls function to emit it to front-end via sockets
	// 3. responds back to twilio

	function handleTwilioMessage(key,msg){
		switch(key) {
	    case 'teach':
	     var dataToSave = {
	     	description: msg,
	     	type: 'teach',
	     	voteCount: 1,
	     	voteCode: generateVoteCode()
	     }
	     // save to db;
	     var topic = Topic(dataToSave);
	    	topic.saveQ()
	    	.then(function (response){
	    		conversationId = response._id.str;
	    		console.log(response);
	    		emitSocketMsg('teach',response);
	    		respondBackToTwilio('teach');
				})
				.fail(function (err) { console.log(err); })
				.done();
        break;

	    case 'learn':
	     var dataToSave = {
	     	description: msg,
	     	type: 'learn',
	     	voteCount: 1,
	     	voteCode: generateVoteCode()
	     }
	     // save to db;
	     var topic = new Topic(dataToSave);
	    	topic.saveQ()
	    	.then(function (response){
	    		emitSocketMsg('learn',response);
	    		respondBackToTwilio('teach');
				})
				.fail(function (err) { console.log(err); })
				.done();
        break;
	    case 'vote':
	    	// handle this differently
	    	Topic.findOneQ({'voteCode':msg})
	    	.then(function(response){
	    		if(response == null) return respondBackToTwilio('vote-fail');
	    		else {
	    			var newVoteCount = response.voteCount + 1;
	    			var topicId = response._id;
	    			return Topic.findByIdAndUpdateQ(topicId,{'voteCount':newVoteCount})
	    		}
	    	})
	    	.then(function(response){
	    		emitSocketMsg('vote',response);
	    		respondBackToTwilio('vote');
	    	})
	    	.fail(function (err) { console.log(err); })
				.done();
        break;
	    default:
	      res.status(500).send({error:'Oops, something went wrong.'});
		}
	}

	function generateVoteCode(){
		var code = '';
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		for(var i=0;i<3;i++)
			code += possible.charAt(Math.floor(Math.random() * possible.length));
		return code;
	}

	function respondBackToTwilio(key){

		var twilioResp = new twilio.TwimlResponse();

		switch(key) {
	    case 'teach':
        twilioResp.sms('Awesome! We have noted that you want to teach ' + msgToRelay +'. One more step, please respond with your name.');
        res.cookie('conversation',conversationId);
        break;
	    case 'learn':
        twilioResp.sms('Sweet! We have noted that you want to learn ' + msgToRelay);
        break;
	    case 'vote':
	    	twilioResp.sms('Oh cool! We have noted your vote for ' + msgToRelay);
	    	break;
	    case 'vote-fail':
	    	twilioResp.sms('Oops! Could not find that vote code ('+msgToRelay+') :( Try again');
	    	break;
	    default:
	      twilioResp.sms('We got your message, but you need to start it with either teach, learn or vote!');
	  	}
		res.set('Content-Type', 'text/xml');
  	res.send(twilioResp.toString());
	}

	function emitSocketMsg(key,data){
		var dataToRelay = {key:key,topic:data};
		io.sockets.emit('twilioData',dataToRelay);
	}
}
