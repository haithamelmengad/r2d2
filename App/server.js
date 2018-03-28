import express from "express";
import router from "./routes";
import {User} from "../models/models.js";
import fs from 'fs';
import readline from 'readline';
import google from 'googleapis';
import googleAuth from 'google-auth-library';
import opn from 'opn';

// import slack client npm package slack
const {
	RTMClient,
	WebClient
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
			// rtm.activeUserId = id of the bot
			if (!message.text.includes(`<@${rtm.activeUserId}>`)) {
				return;
			}
			const channel = {
				id: message.channel
			};
			if (exist) {
				let index = message.text.indexOf('>') + 2;
				message.text = message.text.slice(index);

				// Log the message
				console.log(`(channel:${message.channel}) ${message.user} says: ${message.text}`);
				localStorage.setItem('slackId', message.user);
				// We now have a channel ID to post a message in!
				// use the `sendMessage()` method to send a simple string to a channel using the channel ID
				rtm.sendMessage('You said: ' + message.text, channel.id)
					// Returns a promise that resolves when the message is sent
					.then((msg) => console.log(`Message sent to channel ${channel.id} with ts:${msg.ts}`))
					.catch(console.error);
			} else {
				rtm.sendMessage('Looks like this is our first conversation! Lets get to know eachother. Ive taken the liberty of creating your user profile in our database. Please visit http://localhost:3000 to allow me to access your google calendar', channel.id)
					.then((msg) => {
						authorizeGoogleCal(message);
						console.log(`Intro sent to channel ${channel.id} with ts:${msg.ts}`);
					})
					.catch(console.error);
			}
		});
});


/**
 * Requests permission to access and write to the user's google calendar.
 * If permission is granted, the googleId token is stored in the database for the user.
 * 
 * @param {Object} message the message object that the user sends to the slackbot
 */
function authorizeGoogleCal(message) {
	const oauthcb = '/oauthcb';
	var SCOPES = ['https://www.googleapis.com/auth/calendar'];

	var authcode = '';
	app.get(oauthcb, (req, res) => {
		authcode = req.query.code;
		console.log('AUTHCODE:', authcode);
		res.redirect('/');
	});

	const credentials = JSON.parse(process.env.CLIENTSECRET);
	var clientSecret = credentials.installed.client_secret;
	var clientId = credentials.installed.client_id;
	var redirectUrl = credentials.installed.redirect_uris[0];
	var auth = new googleAuth();
	var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

	app.get('/', (req, res) => {
	console.log('Redirected to /');
	
	if (!authcode) {
		var authUrl = oauth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES,
		redirect_uri: 'http://localhost:3000' + oauthcb
		});
		opn(authUrl); // why is this not opening?
		res.redirect(authUrl);
	} else {
		User.findOneAndUpdate({slackId: message.user}, {$set:{googleId: clientId}}, {'new': true}, (err, user) => {
		if (err) {
			console.log('Error: ' + err);
		} else {
			res.send(user);
		}
		});
	}
	});
}

app.listen(3000, () => {
	console.log("Server listening on port 3000!");
});