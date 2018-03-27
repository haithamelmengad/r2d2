var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var opn = require("opn");
var express = require('express');
var opn = require('opn');
var User = require('../models/models.js');
// var bodyParser = require('body-parser')
var app = express()
const token = process.env.SLACK_TOKEN;


const oauthcb = '/oauthcb'
var SCOPES = ['https://www.googleapis.com/auth/calendar'];

var authcode = ''

app.get(oauthcb, (req, res) => {
  authcode = req.query.code
  console.log('here get oauth')
  res.redirect('/')
})

const credentials = JSON.parse(process.env.CLIENTSECRET)
var clientSecret = credentials.installed.client_secret;
var clientId = credentials.installed.client_id;
var redirectUrl = credentials.installed.redirect_uris[0];
var auth = new googleAuth();
var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl)

app.get('/', (req, res) => {
  if (!authcode) {
    console.log('here get /')
    var authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      redirect_uri: 'http://localhost:3000' + oauthcb,
    });
    res.redirect(authUrl);
  } else {
    console.log('here get redirect')
    User.findOne({}, (err, user) => {
      console.log('kjhasdf')
      if (err) {
        console.log('This is error : ' + err)
      } else {
        res.send(user)
      }
    })
  }
})

app.listen(3000)
// });

// // If modifying these scopes, delete your previously saved credentials
// // at ~/.credentials/calendar-nodejs-quickstart.json

// // Authorize a client with the loaded credentials, then call the
// // Google Calendar API.
// authorize(JSON.parse(process.env.CLIENTSECRET), newEvent);
// /**
//  * Create an OAuth2 client with the given credentials, and then execute the
//  * given callback function.
//  *
//  * @param {Object} credentials The authorization client credentials.
//  * @param {function} callback The callback to call with the authorized client.
//  */


// /**
//  * Get and store new token after prompting for user authorization, and then
//  * execute the given callback with the authorized OAuth2 client.
//  *
//  * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
//  * @param {getEventsCallback} callback The callback to call with the authorized
//  *     client.
//  */
// function getNewToken(oauth2Client, callback) {
//   var authUrl = oauth2Client.generateAuthUrl({
//     access_type: 'offline',
//     scope: SCOPES
//   });
//   console.log(authUrl)
//   opn(authUrl);

//   oauth2Client.credentials = token;
//   storeToken(token);
//   callback(oauth2Client);
// }

// // //MY CODE:
// //   var oauth2Endpoint = 'https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=';
// //   fetch(oauth2Endpoint)
// //   .then(() => {
// //     console.log('req.query.access_token')
// //     console.log('RESPONSE', res);
// //     const token = req.query.acces_token;
// //     storeToken(token);
// //     callback(oauth2Client);

// //   })
// //   .catch((error) => {
// //     console.log(error);
// //   })
// // }









// //     var rl = readline.createInterface({
// //     input: process.stdin,
// //     output: process.stdout
// //   });
// //   rl.question('Enter the code from that page here: ', function(code) {
// //     rl.close();
// //     oauth2Client.getToken(code, function(err, token) {
// //       if (err) {
// //         console.log('Error while trying to retrieve access token', err);
// //         return;
// //       }
// //       oauth2Client.credentials = token;
// //       storeToken(token);
// //       callback(oauth2Client);
// //     });
// // }

// /**
//  * Store token to disk be used in later program executions.
//  *
//  * @param {Object} token The token to store to disk.
//  */
// function storeToken(token) {
//   try {
//     fs.mkdirSync(TOKEN_DIR);
//   } catch (err) {
//     if (err.code != 'EEXIST') {
//       throw err;
//     }
//   }
//   fs.writeFile(TOKEN_PATH, JSON.stringify(token));
//   console.log('Token stored to ' + TOKEN_PATH);
// }

// /**
//  * Lists the next 10 events on the user's primary calendar.
//  *
//  * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
//  */


//   var event = {
//     'summary': 'Google I/O 2015',
//     'location': '800 Howard St., San Francisco, CA 94103',
//     'description': 'A chance to hear more about Google\'s developer products.',
//     'start': {
//       'dateTime': '2015-05-28T09:00:00-07:00',
//       'timeZone': 'America/Los_Angeles',
//     },
//     'end': {
//       'dateTime': '2015-05-28T17:00:00-07:00',
//       'timeZone': 'America/Los_Angeles',
//     },
//     'recurrence': [
//       'RRULE:FREQ=DAILY;COUNT=2'
//     ],
//     'attendees': [
//       {'email': 'dugelsta@wellesley.edu'},
//       {'email': 'haitham.elmengad@gmail.com'},
//     ],
//     'reminders': {
//       'useDefault': false,
//       'overrides': [
//         {'method': 'email', 'minutes': 24 * 60},
//         {'method': 'popup', 'minutes': 10},
//       ],
//   },
// };
// var calendar = google.calendar('v3');
// function newEvent(auth) {
//   calendar.events.insert({
//     auth: auth,
//     calendarId: 'primary',
//     resource: event,
//   }, function(err, event) {
//     if (err) {
//       console.log('There was an error contacting the Calendar service: ' + err);
//       return;
//     }
//     console.log('Event created: %s', event.htmlLink);
//   });  
// }

// //   calendar.events.list({
// //     auth: auth,
// //     calendarId: 'primary',
// //     timeMin: (new Date()).toISOString(),
// //     maxResults: 10,
// //     singleEvents: true,
// //     orderBy: 'startTime'
// //   }, function(err, response) {
// //     if (err) {
// //       console.log('The API returned an error: ' + err);
// //       return;
// //     }
// //     var events = response.items;
// //     if (events.length == 0) {
// //       console.log('No upcoming events found.');
// //     } else {
// //       console.log('Upcoming 10 events:');
// //       for (var i = 0; i < events.length; i++) {
// //         var event = events[i];
// //         var start = event.start.dateTime || event.start.date;
// //         console.log('%s - %s', start, event.summary);
// //       }
// //     }
// //   });
// // }