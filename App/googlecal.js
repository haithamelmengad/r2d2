import { google } from 'googleapis';
import { User } from '../models/models';
const IntlMessageFormat = require('intl-messageformat');
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
                console.log('REJECTED', err)
                oauth2Client.refreshAccessToken((err, tokens) => {
                    // your access_token is now refreshed and stored in oauth2Client
                    // store these new tokens in a safe place (e.g. database)
                    if(err){
                        return reject(err);
                    }else{
                        resolve(tokens);
                    }
                });
            } else {
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
    app.get(oauthcb, (req, res) => {
        let user = req.query.state;
        authcode = req.query.code;
        getToken(authcode)
        .then((tokens) => {
            User.findOneAndUpdate({
                slackId: user,
            }, {
                $set: {
                    googleTokens: tokens
                }
            }, {
                'new': true
            }, (err, user) => {
                if (err) {
                    console.log('Error: ' + err);
                } else {
                    res.send("successfully granted access to calendar");
                }
            });
        });
    });

    app.get('/', (req, res) => {
        
        let user = req.query.user;
        var authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            state: user,
            redirect_uri: 'https://579e696e.ngrok.io' + oauthcb
        });
        res.redirect(authUrl);
        
    });
}

/**
 * Creates a reminder (all-day event) in the user's calendar
 * @param {String} date start date of the reminder
 * @param {String} timeZone user's current timezone
 * @param {String} summary subject of the reminder
 */
function addReminder(date, summary, tokens) {
    oauth2Client.setCredentials(tokens);
    return new Promise(function (resolve, reject) {
                calendar.events.insert({
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
        .catch(err => {
            console.log(err)
        });

}

/**
 * Helper funciton that creates a string that lists the meeting participants
 * @param {Array} attendees list of people attending the meeting
 */
const createAttendeesString = (attendees) => {
    if(attendees.length===0){
        return;
    }
    if(attendees.length===1){
        return attendees;
    }else{
        const attendeesCopy = [...attendees];
        let lastAttendee = attendeesCopy[attendeesCopy.length-1];
        attendeesCopy[attendeesCopy.length-1] = 'and ' + lastAttendee;
        if(attendeesCopy.length===2){
            return attendeesCopy.join(' ');
        }else{
            return attendeesCopy.join(', ')
        }
    }
}

/**
 * Helper function that creates a dateTime string to be passed to the meeting event
 * @param {String} date Date of the meeting
 * @param {String} time Time of the meeting
 */
const getDateTime = (date, time) => {
    const d = date.split('-');
    const t = time.split(':');
    const dateTime = new Date(d[0], (d[1]-1), d[2], t[0], t[1], t[2])
    return dateTime
}

/**
 * Creates a reminder (all-day event) in the user's calendar
 * @param {String} startDateTime start date/time of the meeting
 * @param {String} timeZone user's current timezone
 * @param {String} summary subject of the event
 * @param {String} location location of the meeting
 * @param {Array} attendees an array of {'email': 'example@gmail.com'}
 */

function addMeeting(startDate, startTime, duration, description, location, attendees, tokens) {
    oauth2Client.setCredentials(tokens);
    const dateTime = getDateTime(startDate, startTime);
    console.log('DATETIME:', dateTime);
    const startDateTime = dateTime;
    let endDateObj;
    let endDateTime;
    if (duration) { //I'm assuming duration is an integer representing minutes
        endDateObj = new Date(startDateTime.getTime() + (duration*60000));
        endDateTime = endDateObj.toISOString();
    }else{
        endDateObj = new Date(dateTime.getTime() + (30*60000));
        endDateTime = endDateObj.toISOString();
    }
    const attendeesString = createAttendeesString(attendees);
    const subject = description ? description : 'Meeting with '+ attendeesString;
    var event = {
        'summary': subject,
        'location': location,
        'start': {
            'dateTime': dateTime.toISOString(),
            'timeZone': 'America/Los_Angeles',
        },
        'end': {
            'dateTime': endDateTime,
            'timeZone': 'America/Los_Angeles',
        },
        'reminders': {
            'useDefault': true,
        },
        'attendees': attendees,
    }
    return new Promise(function (resolve, reject) {
        calendar.events.insert({
            auth: oauth2Client,
            calendarId: 'primary',
            resource: event,
        },
        function (err, res) {
            if (err) {
                console.log('FAILED');
                reject(err);
            } else {
                console.log('INSERTED MEETING');
                resolve(tokens);
            }
        });
    })
}

module.exports = {
    authorizeGoogleCal,
    addReminder,
    getToken,
    addMeeting,
    createAttendeesString,
}