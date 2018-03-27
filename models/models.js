var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Mongoose model
var userSchema = new Schema({
	owner: String,
	slackId: String,
    googleId: String
})

var User = mongoose.model('User', userSchema);

module.exports = User;