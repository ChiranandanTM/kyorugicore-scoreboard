class ScoringChatbot {
    constructor() {
        this.isOpen = false;
        this.messageHistory = [];
        this.initializeUI();
        this.bindEvents();
    }

    initializeUI() {
        const chatbotHTML = `
            <div id="chatbot-container" class="chatbot-minimized">
                <div id="chatbot-header">
                    <span>Scoring Assistant</span>
                    <button id="chatbot-toggle">−</button>
                </div>
                <div id="chatbot-messages"></div>
                <div id="chatbot-input-area">
                    <input type="text" id="chatbot-input" placeholder="Ask a question...">
                    <button id="chatbot-send">Send</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', chatbotHTML);
    }

    bindEvents() {
        const toggle = document.getElementById('chatbot-toggle');
        const send = document.getElementById('chatbot-send');
        const input = document.getElementById('chatbot-input');

        toggle.addEventListener('click', () => this.toggleChatbot());
        send.addEventListener('click', () => this.handleUserInput());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleUserInput();
        });
    }

    toggleChatbot() {
        const container = document.getElementById('chatbot-container');
        const toggle = document.getElementById('chatbot-toggle');
        this.isOpen = !this.isOpen;
        
        if (this.isOpen) {
            container.classList.remove('chatbot-minimized');
            toggle.textContent = '−';
        } else {
            container.classList.add('chatbot-minimized');
            toggle.textContent = '+';
        }
    }

    async handleUserInput() {
        const input = document.getElementById('chatbot-input');
        const message = input.value.trim();
        if (!message) return;

        this.addMessage('user', message);
        input.value = '';

        const response = await this.processQuery(message);
        this.addMessage('bot', response);
    }

    async processQuery(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('score') && lowerMessage.includes('room')) {
            const roomMatch = message.match(/room\s+id\s+([A-Z0-9]+)/i);
            if (roomMatch) {
                const roomId = roomMatch[1];
                try {
                    const snapshot = await db.ref(`rooms/${roomId}`).once('value');
                    const data = snapshot.val();
                    if (data) {
                        return `Room ${roomId} score:\nHong: ${data.teamA.score}\nChong: ${data.teamB.score}\nRound: ${data.round}`;
                    }
                    return `No data found for Room ID ${roomId}`;
                } catch (error) {
                    return "Sorry, I couldn't retrieve that information.";
                }
            }
        }

        if (lowerMessage.includes('current room')) {
            if (currentRoomId) {
                return `Current Room ID is: ${currentRoomId}`;
            }
            return "No active room session.";
        }

        if (lowerMessage.includes('help')) {
            return "You can ask me:\n- Score for a specific room (e.g., 'What's the score in Room ID ABC123?')\n- Current room ID\n- Match status";
        }

        return "I'm not sure how to help with that. Try asking about match scores or room IDs.";
    }

    addMessage(sender, text) {
        const messages = document.getElementById('chatbot-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chatbot-message ${sender}-message`;
        messageDiv.textContent = text;
        messages.appendChild(messageDiv);
        messages.scrollTop = messages.scrollHeight;
        this.messageHistory.push({ sender, text });
    }
}
