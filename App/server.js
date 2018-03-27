import express from "express";
import router from "./routes";
import User from "../models/models.js";
// import slack client npm package slack
const { RTMClient, WebClient } = require('@slack/client');
import mongoose from ('mongoose');


//connect to mongo
mongoose.connect(process.env.MONGODB_URI)

// Store token to run on the web client
const token = process.env.SLACK_TOKEN;

// The client is initialized and then started to get an active connection to the platform
const rtm = new RTMClient(token);
rtm.start();

// Need a web client to find a channel where the app can post a message
// message event --> receive something 
const web = new WebClient(token);

// Take any channel for which the bot is a member
rtm.on('message', (message) => {

	let exist = false
	User.find({slackId: message.user})
  .then(function(doc) {
		if (doc.length === 0) {
			console.log('no user')
			var newUser = new User({slackId: message.user})
			newUser.save(function(err) {
				if (err) {console.log(err)}
			})

		}
 	 	else
	 	{
		 exist = true
	 	}
 })
  .catch(function(error) {
 	 console.log(error, 'please create user')
 }).then(() => {

  // Skip messages that are from a bot or my own user ID
  if ( (message.subtype && message.subtype === 'bot_message') ) {return}
	// rtm.activeUserId = id of the bot
  if (!message.text.includes(`<@${rtm.activeUserId}>`)) {return}

	const channel = {
		id: message.channel,
	}

	if (exist)
	{
	  let index = message.text.indexOf('>')+2
	  message.text = message.text.slice(index)

	  // Log the message
	  console.log(`(channel:${message.channel}) ${message.user} says: ${message.text}`);

    // We now have a channel ID to post a message in!
    // use the `sendMessage()` method to send a simple string to a channel using the channel ID
    rtm.sendMessage('You said: ' + message.text, channel.id)
      // Returns a promise that resolves when the message is sent
      .then((msg) => console.log(`Message sent to channel ${channel.id} with ts:${msg.ts}`))
      .catch(console.error);

} else {
		rtm.sendMessage('Looks like this is our first conversation! Lets get to know eachother. Ive taken the liberty of creating your user profile in our database', channel.id)
		// Returns a promise that resolves when the message is sent
		.then((msg) => {
			console.log(`Intro sent to channel ${channel.id} with ts:${msg.ts}`)
		})
		.catch(console.error);
}

})
});

const app = express();

app.use("/", router);

app.listen(3000, () => {
	console.log("Server listening on port 3000!");
}); 