import express from "express";
import router from "./routes";
import {User} from "../models/models.js";
import fs from 'fs';
import readline from 'readline';
import opn from 'opn';
import dialogflow from './dialogflow';
import {authorizeGoogleCal, addReminder, getToken, addMeeting, createAttendeesString} from './googlecal';
const {
	RTMClient,
	WebClient,
	RTM_EVENTS,
} = require('@slack/client');
import mongoose from 'mongoose';

//connect to mongo
mongoose.connect(process.env.MONGODB_URI);
	
// Store token to run on the web client
const token = process.env.SLACK_TOKEN;

// The client is initialized and then started to get an active connection to the platform
const rtm = new RTMClient(token);
rtm.start();

// Need a web client to find a channel where the app can post a message
// message event --> receive something 
const web = new WebClient(token);


//Set up express:
const app = express();
app.use("/", router);


// Take any channel for which the bot is a member
rtm.on('message', (message) => {
	let exist = false; //initialize exist to false
	User.find({ slackId: message.user })
		.then(function (user) {
			//if no user was found, add a new user
			if (user.length === 0) {
				console.log('no user');
				var newUser = new User({
					slackId: message.user
				});
				newUser.save(function (err) {
					if (err) {
						console.log(err);
					}
				});
			} else {
				//otherwise, the user already exists
				exist = true;
			}
		})
		.catch(function (error) {
			console.log(error, 'please create user');
		}).then(() => {
			// Skip messages that are from a bot or my own user ID
			if (message.subtype && message.subtype === 'bot_message') {
				return;
			}
			if (!message.text.includes(`<@${rtm.activeUserId}>`)) {
				return;
			}
			const channel = { id: message.channel };
			if (exist) {
				let index = message.text.indexOf('>') + 2;
				message.text = message.text.slice(index);
				console.log(`(channel:${message.channel}) ${message.user} says: ${message.text}`);
				// We now have a channel ID to post a message in!
				// use the `sendMessage()` method to send a simple string to a channel using the channel ID
				dialogflow.interpretUserMessage(message.text, message.user) //returns a promise
					// Returns a promise that resolves when the message is sent
				.then((res) => {
					var { data } = res;
					if(data.result.actionIncomplete){
						web.chat.postMessage({channel: message.channel, text: data.result.fulfillment.speech, username: message.user},
							(err, res) => { 
								if(err){
									console.log(err);
								} else{
									// addReminder(data.result.parameters.date, action[0], tokens);
								}
							});
					}else {
						//If the event is scheduling a meeting:
						console.log('PARAMETERS', data.result.parameters);
						if(data.result.parameters.createMeeting){
							const invitees = data.result.parameters['given-name'];
							const date = data.result.parameters.date;
							const time = data.result.parameters.time;
							const action = data.result.parameters.action;
							const location = data.result.parameters.meetingLocation;
							const duration = data.result.parameters.duration;
							web.chat.postMessage({channel: message.channel, text: `Okay, I scheduled a meeting ${invitees? 'with '+ createAttendeesString(invitees): ''} ${date? 'on '+ date: ""} ${time? 'at '+ time: ""} ${location? 'at '+ location: ''} ${action? 'to '+ action: ''}`},
							function(error, res){
								if(error){
									console.log(error);
								}else{
									User.findOne({slackId: message.user})
									.then((user) => {
										const tokens = user.googleTokens;
										return addMeeting(date, time, duration, action, location, invitees, tokens);
									})
									.catch((error) => {
										console.log(error)
									});
								}
							}
						)
						}else{ //If the event is to set a reminder:
							web.chat.postMessage({channel: message.channel, text: `Okay, I will remind you to ${data.result.parameters.action[0]} on ${data.result.parameters.date}`, username: message.user}, 
							function(err, res){ 
								if(err){
									console.log(err);
								} else{
									User.findOne({slackId: message.user})
									.then((user) => {
										const tokens = user.googleTokens;
										return addReminder(data.result.parameters.date, data.result.parameters.action[0], tokens);	
									})
									.catch(function(error){
										console.log('Error retrieving token', error);
									});
								}
							});
						}
					}
				})
				.catch(console.error);
			} else {
				rtm.sendMessage(`Looks like this is our first conversation! Lets get to know eachother. Ive taken the liberty of creating your user profile in our database. Please visit https://579e696e.ngrok.io/?user=${message.user} to allow me to access your google calendar`, channel.id)
					.then((msg) => {
						console.log(`Intro sent to channel ${channel.id} with ts:${msg.ts}`);
					})
					.catch((error) => {console.error});
			}
		});
});

authorizeGoogleCal(app);
app.listen(3000, () => {
	console.log("Server listening on port 3000!");
});
