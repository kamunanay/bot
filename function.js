const fs = require('fs');
const crypto = require('crypto');

function isUrl(text) {
    try {
        new URL(text);
        return true;
    } catch (error) {
        return false;
    }
}

function generateMessageTag() {
    return `${Date.now()}.${Math.random().toString(36).substring(2, 15)}`;
}

function getBuffer(url) {
    return new Promise((resolve, reject) => {
        axios.get(url, { responseType: 'arraybuffer' })
            .then(({ data }) => resolve(data))
            .catch(reject);
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomToken(length = 16) {
    return crypto.randomBytes(length).toString('hex');
}

function isOwner(sender) {
    return sender === global.owner + '@s.whatsapp.net';
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / 60000) % 60;
    const hours = Math.floor(ms / 3600000);
    return `${hours} jam ${minutes} menit ${seconds} detik`;
}

module.exports = {
    isUrl,
    generateMessageTag,
    getBuffer,
    sleep,
    randomToken,
    isOwner,
    formatDuration
};