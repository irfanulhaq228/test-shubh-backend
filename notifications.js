const { messaging } = require('./firebase');

const sendNotification = (tokens, payload) => {
  messaging.sendToDevice(tokens, payload)
    .then(response => {
      console.log('Successfully sent message:', response);
    })
    .catch(error => {
      console.log('Error sending message:', error);
    });
};

module.exports = { sendNotification };