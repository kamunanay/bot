const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiHelper {
    constructor(apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.conversations = new Map(); // Untuk menyimpan riwayat percakapan
    }

    async getResponse(userId, prompt) {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
            
            // Dapatkan riwayat percakapan atau buat yang baru
            let conversation = this.conversations.get(userId) || [];
            conversation.push({ role: "user", parts: [{ text: prompt }] });
            
            // Batasi riwayat percakapan agar tidak terlalu panjang
            if (conversation.length > 10) {
                conversation = conversation.slice(-10);
            }
            
            const chat = model.startChat({
                history: conversation,
                generationConfig: {
                    maxOutputTokens: 1000,
                    temperature: 0.9,
                    topP: 0.1,
                    topK: 16,
                },
            });

            const result = await chat.sendMessage(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Simpan respons ke riwayat percakapan
            conversation.push({ role: "model", parts: [{ text }] });
            this.conversations.set(userId, conversation);
            
            return text;
        } catch (error) {
            console.error("Error getting response from Gemini:", error);
            return "Maaf, saya sedang tidak bisa merespon. Coba lagi nanti ya!";
        }
    }

    clearConversation(userId) {
        this.conversations.delete(userId);
        return "Percakapan telah direset!";
    }
}

module.exports = GeminiHelper;