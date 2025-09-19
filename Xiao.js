process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

require('./settings');
const { getGeminiResponse } = require('./geminiHelper');
const { isOwner } = require('./function');

// Dictionary untuk mapping status reaction
const statusReactions = {
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

module.exports.Solving = async (ganz, store) => {
    // Fitur auto-reaction status
    ganz.ev.on('status.update', async (update) => {
        try {
            const status = update.status;
            const sender = update.id;
            
            if (!status || !status.status) return;
            
            // Deteksi jenis status dan pilih reaction
            let reaction = statusReactions.default;
            const statusText = status.status.toLowerCase();
            
            if (statusText.includes('senang') || statusText.includes('happy') || statusText.includes('bahagia')) reaction = statusReactions.senang;
            else if (statusText.includes('sedih') || statusText.includes('sad') || statusText.includes('menangis')) reaction = statusReactions.sedih;
            else if (statusText.includes('lucu') || statusText.includes('funny') || statusText.includes('tertawa')) reaction = statusReactions.lucu;
            else if (statusText.includes('keren') || statusText.includes('cool')) reaction = statusReactions.keren;
            else if (statusText.includes('mantap') || statusText.includes('great')) reaction = statusReactions.mantap;
            else if (statusText.includes('suka') || statusText.includes('love') || statusText.includes('❤️')) reaction = statusReactions.suka;
            else if (statusText.includes('wow') || statusText.includes('amazing')) reaction = statusReactions.wow;
            else if (statusText.includes('foto') || statusText.includes('photo')) reaction = statusReactions.foto;
            else if (statusText.includes('video') || statusText.includes('movie')) reaction = statusReactions.video;
            else if (statusText.includes('musik') || statusText.includes('music')) reaction = statusReactions.musik;
            else if (statusText.includes('makan') || statusText.includes('food')) reaction = statusReactions.makan;
            else if (statusText.includes('olahraga') || statusText.includes('sport')) reaction = statusReactions.olahraga;
            
            // Kirim reaction setelah delay singkat
            await new Promise(resolve => setTimeout(resolve, 2000));
            await ganz.sendMessage(sender, {
                react: {
                    text: reaction,
                    key: status.key
                }
            });
            
            console.log(`Reacted to status from ${sender} with ${reaction}`);
        } catch (error) {
            console.error('Error reacting to status:', error);
        }
    });

    // Fitur chat otomatis dengan Gemini AI
    ganz.ev.on('messages.upsert', async (message) => {
        const msg = message.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        const body = msg.message.conversation || 
                    (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text) || '';
        const sender = msg.key.remoteJid;
        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        
        const reply = async (text) => {
            await ganz.sendMessage(from, { text }, { quoted: msg });
        };

        try {
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
                        // Reset percakapan untuk pengguna tertentu
                        // Anda perlu mengimplementasikan fungsi clearConversation di geminiHelper
                        await reply("Fitur reset belum diimplementasikan");
                        break;
                        
                    default:
                        // Kirim ke Gemini AI jika bukan perintah yang dikenal
                        const response = await getGeminiResponse(sender, body);
                        await reply(response);
                        break;
                }
            } else {
                // Balas pesan biasa dengan Gemini AI
                if (body.trim().length > 0) {
                    const response = await getGeminiResponse(sender, body);
                    await reply(response);
                }
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    });
};

module.exports.MessagesUpsert = async (ganz, message, store) => {
    // Implementasi tambahan jika diperlukan
};