import {
    google
} from 'googleapis';
import {
    User
} from '../models/models';
const oauthcb = '/oauthcb';
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

var authcode = '';
const credentials = JSON.parse(process.env.CLIENTSECRET);
var clientSecret = credentials.installed.client_secret;
var clientId = credentials.installed.client_id;
var redirectUrl = credentials.installed.redirect_uris[0];
var oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUrl);
var calendar = google.calendar('v3');

const getToken = (code) => {
    return new Promise(function (resolve, reject) {
        oauth2Client.getToken(code, function (err, tokens) {
            if (err) {
                console.log('REJECTED')
                reject(err)
            } else {
                console.log('ACCEPTED TOKENS')
                resolve(tokens);
            }
        });
    });
}

/**
 * Requests permission to access and write to the user's google calendar.
 * If permission is granted, the googleId token is stored in the database for the user.
 * 
 * @param {Object} message the message object that the user sends to the slackbot
 */
const authorizeGoogleCal = (app) => {
    let user;
    app.get(oauthcb, (req, res) => {
        authcode = req.query.code;
        console.log('AUTHCODE:', authcode);
        res.redirect('/');
    });

    app.get('/', (req, res) => {
        console.log('Redirected to /');

        if (!authcode) {
            user = req.query.user;
            var authUrl = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: SCOPES,
                redirect_uri: 'http://localhost:3000' + oauthcb
            });
            res.redirect(authUrl);
        } else {
            console.log('AUTHCODE:', authcode);
            getToken(authcode)

            .then((tokens) => {
                User.findOneAndUpdate({
                    slackId: user,
                }, {
                    $set: {
                        googleId: tokens
                    }
                }, {
                    'new': true
                }, (err, user) => {
                    if (err) {
                        console.log('Error: ' + err);
                    } else {
                        console.log('your code is', authcode);
                        res.send(user);
                    }
                });
            })
            
        }
    })
}

/**
 * Creates a reminder (all-day event) in the user's calendar
 * @param {String} date start date of the reminder
 * @param {String} timeZone user's current timezone
 * @param {String} summary subject of the reminder
 */
function addReminder(summary, date, tokens) {
    // var client = getAuthclient();
    console.log("TOKENS:", tokens);
    oauth2Client.setCredentials(tokens);
    return new Promise(function (resolve, reject) {
            oauth2Client.refreshAccessToken((err, tokens) => {
                // your access_token is now refreshed and stored in oauth2Client
                // store these new tokens in a safe place (e.g. database)
                if(err){
                    return reject(err);
                }
                calendar.events.insert({ //how do we specify client (with token?)
                    auth: oauth2Client,
                    calendarId: 'primary',
                    resource: {
                        summary: summary,
                        start: {
                            date: date,
                            timeZone: 'America/Los_Angeles',
                        },
                        end: {
                            date: date,
                            timeZone: 'America/Los_Angeles',
                        },
                        reminders: {
                            useDefault: true,
                        },
                    }
                }, function (err, res) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(tokens);
                    }
                });
            })
        })
        .catch(err => {
            console.log('oh no', err)
        });

}

// /**
//  * Creates a reminder (all-day event) in the user's calendar
//  * @param {String} startDateTime start date/time of the meeting
//  * @param {String} endDateTime ending date/time of the meeting
//  * @param {String} timeZone user's current timezone
//  * @param {String} summary subject of the event
//  * @param {String} location location of the meeting
//  * @param {Array} attendees an array of {'email': 'example@gmail.com'}
//  */

// function addMeeting(startDateTime, duration, timeZone, summary, location, attendees) {
//     // set default meeting time to 30 minutes after start time:
//     if (!endDateTime) {
//         endDateTime = new Date(startDateTime.getTime() + (30 * 60000));
//     }
//     var event = {
//         'summary': summary,
//         'location': location,
//         'start': {
//             'dateTime': startDateTime,
//             'timeZone': timeZone,
//         },
//         'end': {
//             'dateTime': endDateTime,
//             'timeZone': timeZone,
//         },
//         'reminders': {
//             'useDefault': true,
//         },
//         'attendees': attendees,
//     }
//     var request = google.client.calendar.events.insert({ //how do we specify client (look in html file)
//         'calendarId': 'primary',
//         'resource': event,
//     });
//     request.execute(function (event) {
//         appendPre('Event created:', event.htmlLink);
//     });
// }

module.exports = {
    authorizeGoogleCal,
    addReminder,
    getToken,
}