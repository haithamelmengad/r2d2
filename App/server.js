import express from "express";
import router from "./routes";
import {User} from "../models/models.js";
import fs from 'fs';
import readline from 'readline';
import opn from 'opn';
import dialogflow from './dialogflow';
import {authorizeGoogleCal, addReminder, getToken, addMeeting, createAttendeesString, redirectUrl} from './googlecal';
const {RTMClient, WebClient, RTM_EVENTS} = require('@slack/client');
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

//test Array for mapping names to slackIds:
const inviteeInfo=[
	{
		name: 'Delaney',
		id: 'U9W7PKK35'
	},
	{
		name: 'Sal',
		id: 'U9XB3FY31',
	},
	{
		name: 'Henry',
		id: 'U9YF4KZE3'
	}
]

/**
 * Map an array of name strings to an array of slackIds for each person
 * @param {Array} invitees list of people invited to the meeting
 */
const inviteesToIds = (invitees) => {
	const inviteeIds = invitees.map(invitee => {
		const id = inviteeInfo.find((i) => {
			return i.name.toLowerCase() === invitee.toLowerCase()
		}).id;
		return id;
	});
	return inviteeIds;
}


// Take any channel for which the bot is a member
rtm.on('message', (message) => {
	let exist = false; //initialize exist to false
	User.find({ slackId: message.user })
		.then(function (user) {
			// console.log('MESSAGE:', message);
			//if no user was found, add a new user
			if (user.length === 0) {
				web.chat.postMessage({channel: message.channel, text: 'What is your name?'}); //GET THE USER'S NAME
				var newUser = new User({
					slackId: message.user,
					channel: message.channel,
					// ADD NAME TOO
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
			// if (!message.text.includes(`<@${rtm.activeUserId}>`)) {
			// 	return;
			// }
			const channel = { id: message.channel };
			if (exist) {
				// let index = message.text.indexOf('>') + 2;
				// message.text = message.text.slice(index);
				// console.log(`(channel:${message.channel}) ${message.user} says: ${message.text}`);
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
								}
							});
					}else {
						//If the event is scheduling a meeting:
						if(data.result.parameters.createMeeting){
							// console.log('DATA:', data);
							const invitees = data.result.parameters['given-name'];
							const date = data.result.parameters.date;
							const time = data.result.parameters.time;
							const action = data.result.parameters.action;
							const location = data.result.parameters.meetingLocation;
							const duration = data.result.parameters.duration;

							web.chat.postMessage({
								channel: message.channel, 
								text: `Okay. I scheduled a meeting ${invitees? 'with '+ createAttendeesString(invitees): ''} ${date? 'on '+ date: ""} ${time? 'at '+ time: ""} ${location? 'at '+ location: ''} ${action? 'to '+ action: ''}`},
							function(error, res){
								if(error){
									console.log(error);
								}else{
									app.post('/button', (req, res) => {
										const response = JSON.parse(req.body.payload).actions[0].name; //Yes or No response
									})
									const inviteeIds = inviteesToIds(invitees);
									User.find({slackId: inviteeIds})
									.then((users) => {									
										if(users.length===0){
											console.log('no users found');
										}
										users.forEach((user) => {
											const tokens = user.googleTokens;
											// const channel = user.channel;
											web.chat.postMessage({channel: user.channel, text: 'Someone scheduled a meeting for you.',
											attachments: [
												{
													title: 'Can you attend this meeting?',
													attachment_type: 'default',
													color: "#3AA3E3",
													callback_id: 'response',
													actions: [
														{
															name: 'Yes',
															text: 'Yes',
															type: 'button',
															value: 'Yes',
														},
														{
															name: 'No',
															text: 'No',
															type: 'button',
															value: 'No',
														}
													]
												}
											]} )
											addMeeting(date, time, duration, action, location, invitees, tokens);
										})
									})
									.catch((error) => {
										console.log(error)
									});									
								}
							}
						)
						}else{ //If the event is to set a reminder:
							web.chat.postMessage({channel: message.channel, text: `Okay, I will remind you to ${action? action[0]: ''} on ${date? date: ''}`, username: message.user}, 
							function(err, res){ 
								if(err){
									console.log(err);
								} else{
									User.findOne({slackId: message.user})
									.then((user) => {
										const tokens = user.googleTokens;
										return addReminder(date, action[0], tokens);	
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
				const link = redirectUrl.slice(0, redirectUrl.length - 8);
				rtm.sendMessage(`Looks like this is our first conversation! Lets get to know eachother. Ive taken the liberty of creating your user profile in our database. Please visit ${link}/?user=${message.user} to allow me to access your google calendar`, channel.id)
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
