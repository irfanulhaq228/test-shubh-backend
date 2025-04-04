const admin = require('firebase-admin');

const serviceAccount = require('./shubh-exchange-firebase-adminsdk-yz7br-c87d157ac7.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

function sendCustomNotification(title, body, recipientToken) {
    const message = {
        notification: {
            title: title,
            body: body,
        },
        token: recipientToken,
        android: {
            priority: "high",
            notification: {
                sound: 'notification_sound',
                icon: 'notification_logo',
                color: '#4A90E2',
            },
        },
    };


    return admin.messaging().send(message)
        .then((response) => {
            console.log('Successfully sent notification:', response);
        })
        .catch((error) => {
            console.error('Error sending notification:', error);
        });
};

module.exports = sendCustomNotification;