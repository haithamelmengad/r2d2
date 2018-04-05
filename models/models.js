import mongoose from 'mongoose';
var Schema = mongoose.Schema;

//Models a User
var userSchema = new Schema({
	slackUsername: String,
	defaultMeetingMins: Number,
	slackId: String,
	googleTokens: Object,
	slackEmail: String,
	slackDmIds: Array
});

var User = mongoose.model('User', userSchema);


//Models a Reminder
const reminderSchema = new mongoose.Schema({
	subject: {
		type: String,
		required: true
	},
	day: {
		type: Date,
		required: true
	},
	googleCalEventId: {
		type: Schema.Types.ObjectId
		// ref:
	},
	requesterId: {
		type: Schema.Types.ObjectId,
		ref: 'User'
	}
});

const Reminder = mongoose.model('Reminder', reminderSchema);

//Models a Meeting


// 'summary': description,
//         'location': location,
//         'start': {
//             'dateTime': startDateTime,
//             'timeZone': 'America/Los_Angeles',
//         },
//         'end': {
//             'dateTime': endDateTime,
//             'timeZone': 'America/Los_Angeles',
//         },
//         'reminders': {
//             'useDefault': true,
//         },
		// 'attendees': attendees,


const meetingSchema = new mongoose.Schema({
	day: {
		type: Date,
		required: true
	},
	time: {
		type: Date, //time??
		required: true
	},
	invitees: {
		type: Array,
		required: true
	},
	subject: String,
	location: String,
	googleCalFields: String, //Type??
	status: {
		type: String,
		enum: ['Pending', 'Scheduled']
	},
	createdAt: Date, //type?
	requesterId: {
		type: Schema.Types.ObjectId,
		ref: 'User'
	}
});

const Meeting = mongoose.model('Meeting', meetingSchema);



// /**
//  * Models an invite request
//  */
// const inviteRequestSchema = new mongoose.Schema({
// 	eventId: {
// 		type: Schema.Types.ObjectId
// 	},
// 	inviteeId: {
// 		type: Schema.Types.ObjectId
// 	},
// 	requesterId: {
// 		type: Schema.Types.ObjectId
// 	},
// 	status: {
// 		type: String,
// 		enum: ['Pending', 'Scheduled']
// 	}
// });

// const InviteRequest = mongoose.model('InviteRequest', inviteRequestSchema);


module.exports = {
	User,
	Meeting,
	Reminder
};
