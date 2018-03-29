'use strict';
var axios = require('axios');

module.exports = {
    interpretUserMessage(message, userId) {
        return axios.get('https://api.dialogflow.com/v1/query', {
            params: {
                v:'20170712',
                query: message,
                sessionId: userId,
                timezone: 'America/Los_Angeles',
                lang: 'en', 
            },
            headers: {
                Authorization: `Bearer ${process.env.API_AI_TOKEN}`,
            }
        })
    }
}


