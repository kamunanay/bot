require('./settings');
const fs = require('fs');
const pino = require('pino');
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');
const readline = require('readline');
const { exec } = require('child_process');
const { say } = require('cfonts');
const os = require('os');
const { Boom } = require('@hapi/boom');
const cron = require('node-cron');

const {
    default: WAConnection, generateWAMessageFromContent,
    prepareWAMessageMedia, useMultiFileAuthState, Browsers, DisconnectReason, makeInMemoryStore, makeCacheableSignalKeyStore, fetchLatestWaWebVersion, proto, getAggregateVotesInPollMessage
} = require('@whiskeysockets/baileys');

const GeminiHelper = require('./geminiHelper');
const { isUrl, generateMessageTag, getBuffer, sleep, randomToken, isOwner, formatDuration } = require('./function');

// Inisialisasi Gemini AI
const gemini = new GeminiHelper(global.geminiKey);

const pairingCode = true;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

(async () => {
    // Buat folder session jika belum ada
    if (!fs.existsSync('./session')) {
        fs.mkdirSync('./session');
    }
})();

async function startingBot() {
    try {
        const store = await makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
        const { state, saveCreds } = await useMultiFileAuthState('session');
        const { version } = await axios.get("https://raw.githubusercontent.com/nstar-y/Bail/refs/heads/main/src/Defaults/baileys-version.json").then(res => res.data);

        const ganz = await WAConnection({
            version: version,
            printQRInTerminal: !pairingCode,
            logger: pino({ level: "silent" }),
            auth: state,
            browser: ["Ubuntu", "Chrome", "22.04.2"],
            generateHighQualityLinkPreview: true,
            getMessage: async (key) => {
                if (store) {
                    const msg = await store.loadMessage(key.remoteJid, key.id, undefined);
                    return msg?.message || undefined;
                }
                return {
                    conversation: 'Bot'
                };
            }
        });

        if (pairingCode && !ganz.authState.creds.registered) {
            const correctAnswer = 'xiao';
            let attempts = 0;
            let maxAttempts = 3;
            let verified = false;
            
            while (attempts < maxAttempts && !verified) {
                const answer = await question(chalk.yellow.bold('Masukan Key Panel\n'));
                if (answer.toLowerCase() === correctAnswer) {
                    verified = true;
                    console.log(chalk.green.bold('Jawaban benar! Silahkan lanjutkan.'));
                } else {
                    attempts++;
                    if (attempts < maxAttempts) {
                        console.log(chalk.red.bold(`Jawaban salah! Kesempatan tersisa: ${maxAttempts - attempts}`));
                    } else {
                        console.log(chalk.red.bold('Jawaban salah! Kesempatan habis.'));
                        return;
                    }
                }
            }
            
            let phoneNumber = await question(chalk.yellow.bold('Masukkan Nomor WhatsApp :\n'));
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
            let code = await ganz.requestPairingCode(phoneNumber);
            code = code.match(/.{1,4}/g).join(" - ") || code;
            console.log(`${chalk.blue.bold('Kode Pairing')} : ${chalk.white.bold(code)}`);
        }

        ganz.ev.on('creds.update', saveCreds);

        ganz.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, receivedPendingNotifications } = update;
            if (connection === 'close') {
                const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
                if (reason === DisconnectReason.connectionLost) {
                    console.log('Connection to Server Lost, Attempting to Reconnect...');
                    startingBot();
                } else if (reason === DisconnectReason.connectionClosed) {
                    console.log('Connection closed, Attempting to Reconnect...');
                    startingBot();
                } else if (reason === DisconnectReason.restartRequired) {
                    console.log('Restart Required...');
                    startingBot();
                } else if (reason === DisconnectReason.timedOut) {
                    console.log('Connection Timed Out, Attempting to Reconnect...');
                    startingBot();
                } else if (reason === DisconnectReason.badSession) {
                    console.log('Delete Session and Scan again...');
                    startingBot();
                } else if (reason === DisconnectReason.connectionReplaced) {
                    console.log('Close current Session first...');
                    startingBot();
                } else if (reason === DisconnectReason.loggedOut) {
                    console.log('Scan again and Run...');
                    exec('rm -rf ./session/*');
                    process.exit(1);
                } else if (reason === DisconnectReason.Multidevicemismatch) {
                    console.log('Scan again...');
                    exec('rm -rf ./session/*');
                    process.exit(0);
                } else {
                    ganz.end(`Unknown DisconnectReason : ${reason}|${connection}`);
                }
            }
            
            if (connection == 'open') {
                console.log(chalk.green.bold('Bot berhasil terhubung!'));
                
                // Kirim pesan ke owner
                ganz.sendMessage(ganz.user.id.split(":")[0] + "@s.whatsapp.net", {
                    text: `*🤖 Bot Connected*\n\nBot ${global.namaBot} telah berhasil terhubung!`
                });
                
                // Tampilkan info server
                const formatp = (bytes) => {
                    if (bytes === 0) return '0 B';
                    const k = 1024;
                    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
                    const i = Math.floor(Math.log(bytes) / Math.log(k));
                    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
                };

                const runtime = (uptime) => {
                    const hours = Math.floor(uptime / 3600);
                    const minutes = Math.floor((uptime % 3600) / 60);
                    const seconds = Math.floor(uptime % 60);
                    return `${hours} jam ${minutes} menit ${seconds} detik`;
                };

                const tot = {
                    totalGb: Math.floor(os.totalmem() / (1024 * 1024 * 1024)),
                };

                console.log(chalk.blue.bold(`
╔══════════════════════════════╗
║         SERVER INFO          ║
╠══════════════════════════════╣
║ Platform  : ${os.type().padEnd(17)} ║
║ Total RAM : ${formatp(os.totalmem()).padEnd(17)} ║
║ Total CPU : ${os.cpus().length + ' Core'.padEnd(17)} ║
║ Runtime   : ${runtime(os.uptime()).padEnd(17)} ║
╚══════════════════════════════╝
                `));
                
                console.log(chalk.magenta.bold(`
╔══╗....<💖
╚╗╔╝..('\../')
╔╝╚╗..( •.• )
╚══╝..(,,)(,,) .<💖
╔╗╔═╦╦╦═╗ ╔╗╔╗
║╚╣║║║║╩╣ ║╚╝║
╚═╩═╩═╩═╝ ╚══╝
                `));
                
                console.log(chalk.green.bold(`${global.namaOwner}\n${global.owner}\n\n`));
            } else if (receivedPendingNotifications == 'true') {
                console.log('Please wait About 1 Minute...');
            }
        });

        // Handle auto reaction to status updates
        ganz.ev.on('status.update', async (update) => {
            try {
                const status = update.status;
                const sender = update.id;
                
                if (!status || !status.status) return;
                
                // Deteksi jenis status dan pilih reaction
                let reaction = global.statusReactions.default;
                const statusText = status.status.toLowerCase();
                
                if (statusText.includes('senang') || statusText.includes('happy') || statusText.includes('bahagia')) {
                    reaction = global.statusReactions.senang;
                } else if (statusText.includes('sedih') || statusText.includes('sad') || statusText.includes('menangis')) {
                    reaction = global.statusReactions.sedih;
                } else if (statusText.includes('lucu') || statusText.includes('funny') || statusText.includes('tertawa')) {
                    reaction = global.statusReactions.lucu;
                } else if (statusText.includes('keren') || statusText.includes('cool')) {
                    reaction = global.statusReactions.keren;
                } else if (statusText.includes('mantap') || statusText.includes('great')) {
                    reaction = global.statusReactions.mantap;
                } else if (statusText.includes('suka') || statusText.includes('love') || statusText.includes('❤️')) {
                    reaction = global.statusReactions.suka;
                } else if (statusText.includes('wow') || statusText.includes('amazing')) {
                    reaction = global.statusReactions.wow;
                } else if (statusText.includes('foto') || statusText.includes('photo')) {
                    reaction = global.statusReactions.foto;
                } else if (statusText.includes('video') || statusText.includes('movie')) {
                    reaction = global.statusReactions.video;
                } else if (statusText.includes('musik') || statusText.includes('music')) {
                    reaction = global.statusReactions.musik;
                } else if (statusText.includes('makan') || statusText.includes('food')) {
                    reaction = global.statusReactions.makan;
                } else if (statusText.includes('olahraga') || statusText.includes('sport')) {
                    reaction = global.statusReactions.olahraga;
                }
                
                // Kirim reaction setelah delay singkat
                await sleep(2000);
                await ganz.sendMessage(sender, {
                    react: {
                        text: reaction,
                        key: status.key
                    }
                });
                
                console.log(chalk.cyan(`Reacted to status from ${sender} with ${reaction}`));
            } catch (error) {
                console.error('Error reacting to status:', error);
            }
        });

        // Handle incoming messages
        ganz.ev.on('messages.upsert', async (message) => {
            try {
                const msg = message.messages[0];
                if (!msg.message || msg.key.fromMe) return;
                
                const body = msg.message.conversation || 
                            (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text) || '';
                const sender = msg.key.remoteJid;
                const from = msg.key.remoteJid;
                const isGroup = from.endsWith('@g.us');
                
                const reply = async (text, options = {}) => {
                    await ganz.sendMessage(from, { text }, { quoted: msg, ...options });
                };

                // Handle commands
                if (body.startsWith(global.prefix)) {
                    const command = body.slice(global.prefix.length).trim().split(' ')[0].toLowerCase();
                    const args = body.slice(global.prefix.length).trim().split(' ').slice(1);
                    
                    switch (command) {
                        case 'menu':
                        case 'help':
                            await reply(`🤖 *${global.namaBot} Menu*\n\n` +
                                      `Fitur:\n` +
                                      `- Chat otomatis dengan AI Gemini\n` +
                                      `- Auto reaction status\n\n` +
                                      `Perintah:\n` +
                                      `- ${global.prefix}menu - Tampilkan menu\n` +
                                      `- ${global.prefix}owner - Info pemilik\n` +
                                      `- ${global.prefix}reset - Reset percakapan AI\n\n` +
                                      `Dibuat oleh: ${global.namaOwner}`);
                            break;
                            
                        case 'owner':
                            await reply(`👑 Owner: ${global.namaOwner}\n` +
                                      `📞 WA: ${global.owner}\n` +
                                      `📢 Channel: ${global.linkSaluran}`);
                            break;
                            
                        case 'reset':
                            const resetMsg = gemini.clearConversation(sender);
                            await reply(resetMsg);
                            break;
                            
                        default:
                            // Kirim ke Gemini AI jika bukan perintah yang dikenal
                            const response = await gemini.getResponse(sender, body);
                            await reply(response);
                            break;
                    }
                } else {
                    // Balas pesan biasa dengan Gemini AI
                    if (body.trim().length > 0) {
                        const response = await gemini.getResponse(sender, body);
                        await reply(response);
                    }
                }
            } catch (error) {
                console.error('Error handling message:', error);
            }
        });

        // Handle contacts update
        ganz.ev.on('contacts.update', (update) => {
            for (let contact of update) {
                let id = ganz.decodeJid(contact.id);
                if (store && store.contacts) store.contacts[id] = { id, name: contact.notify };
            }
        });

        return ganz;

    } catch (error) {
        console.error('Error starting bot:', error);
        process.exit(1);
    }
}

startingBot();

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`Update ${__filename}`));
    delete require.cache[file];
    require(file);
});