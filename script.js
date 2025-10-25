// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDKGg_bhwCAR6OpywuTiX-HpTXUHboNVhc",
    authDomain: "tkd-kc.firebaseapp.com",
    databaseURL: "https://tkd-kc-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tkd-kc",
    storageBucket: "tkd-kc.appspot.com",
    messagingSenderId: "460367866714",
    appId: "1:460367866714:web:9e68cf9afabe9ccbf7a163"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let currentRoom = null;
let refereeId = localStorage.getItem('refereeId');
if (!refereeId) {
  refereeId = Math.random().toString(36).substr(2, 8);
  localStorage.setItem('refereeId', refereeId);
}
let refereeName = null;

// Function to join room
function joinRoom() {
    const roomCode = document.getElementById('roomCodeInput').value.toUpperCase();
    if (roomCode) {
        currentRoom = roomCode;
        if (!refereeId) {
            refereeId = generateRefereeId();
            localStorage.setItem('refereeId', refereeId);
        }
        
        // Register referee in the room
        db.ref(`rooms/${roomCode}/referees/${refereeId}`).set({
            connected: true,
            name: `Referee ${Math.floor(Math.random() * 1000)}`, // Default name
            lastActive: Date.now()
        }).then(() => {
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('currentRoomId', roomCode);
            sessionStorage.setItem('refereeId', refereeId);
            
            // Get the referee name
            db.ref(`rooms/${roomCode}/referees/${refereeId}`).on('value', (snapshot) => {
                if (snapshot.exists()) {
                    refereeName = snapshot.val().name;
                }
            });
            
            document.getElementById('roomEntry').style.display = 'none';
            document.getElementById('scoringUI').style.display = 'block';
            setupScoringButtons();
        }).catch((error) => {
            console.error("Error joining room:", error);
            alert("Failed to join room. Please try again.");
        });
    }
}

// Function to generate unique referee ID
function generateRefereeId() {
    return 'referee_' + Math.random().toString(36).substr(2, 9);
}

// Setup scoring buttons
function setupScoringButtons() {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.addEventListener('click', function() {
            const isRed = section.classList.contains('red');
            const isBlue = section.classList.contains('blue');
            const team = isRed ? 'hong' : 'chong';
            
            // Get the image source from the section
            const image = section.querySelector('img');
            const imageUrl = image.src;
            
            // Get the action type
            const actionType = section.classList.contains('head') ? 'head' :
                             section.classList.contains('body') ? 'body' :
                             section.classList.contains('punch') ? 'punch' : '';
            
            // Send the action to the scoreboard
            updateLastAction(team, {
                image: imageUrl,
                refereeName: refereeName,
                actionType: actionType
            });
        });
    });
}

// Function to update last action
function updateLastAction(team, actionData) {
    if (!currentRoom) return;
    
    db.ref(`rooms/${currentRoom}/lastAction/${team}`).set({
        image: actionData.image,
        refereeName: actionData.refereeName,
        actionType: actionData.actionType,
        timestamp: Date.now()
    }).catch(error => {
        console.error("Error updating last action:", error);
    });
}

// QR Code Scanner Setup
document.getElementById('scanQRButton').addEventListener('click', function() {
    const qrReader = document.getElementById('qr-reader');
    qrReader.style.display = 'block';
    
    const html5QrCode = new Html5Qrcode("qr-reader");
    const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrCode.start(
        { facingMode: "environment" },
        qrConfig,
        (decodedText) => {
            html5QrCode.stop();
            document.getElementById('roomCodeInput').value = decodedText;
            qrReader.style.display = 'none';
            joinRoom();
        },
        (error) => {
            // console.error("QR Code scanning error:", error);
        }
    ).catch((err) => {
        console.error("QR Code scanner initialization error:", err);
    });
});
