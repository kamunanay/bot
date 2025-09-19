const fs = require('fs');
const chalk = require('chalk');

//~~~~~~~~~~~ Settings Bot ~~~~~~~~~~~//
global.owner = '6281295344364';
global.prefix = '.';
global.namaBot = "Xiao Bot";
global.namaOwner = "Ganz";
global.linkSaluran = "https://t.me/...";
global.versi = "2.0";

//~~~~~~~~~~~ Settings Gemini AI ~~~~~~~~~~~//
global.geminiKey = "AIzaSyDSXxBdCDZLOkMkpnUfs28K6gStfT1igTw";

//~~~~~~~~~~ Settings Message ~~~~~~~~//
global.mess = {
    wait: 'Sedang memproses...',
    error: 'Terjadi kesalahan!'
};

//~~~~~~~~~~ Auto Reaction Settings ~~~~~~~~~~//
global.statusReactions = {
    'senang': '😄',
    'bahagia': '😊',
    'sedih': '😢',
    'menangis': '😭',
    'lucu': '😂',
    'tertawa': '🤣',
    'keren': '😎',
    'mantap': '👏',
    'suka': '❤️',
    'wow': '😲',
    'foto': '📸',
    'video': '🎥',
    'musik': '🎵',
    'makan': '🍔',
    'olahraga': '⚽',
    'default': '👍'
};

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`Update ${__filename}`));
    delete require.cache[file];
    require(file);
});