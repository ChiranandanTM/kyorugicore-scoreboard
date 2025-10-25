let roundDeclared = false;
let hongScore = 0;
let chongScore = 0;
let hongGamJeom = 0;
let chongGamJeom = 0;
let currentRound = 1;
const totalRounds = 3;
let hongRoundsWon = 0;
let chongRoundsWon = 0;
let timerInterval = null;
let timerTime = 0;
let timerSetTime = 0;
let isTimerRunning = false;
let matchWinnerDeclared = false;
let currentRoomId = null;
let isMedicalTimeout = false;
let redBlinkClass = '';
let blueBlinkClass = '';
let pendingSubmissions = [];
const REFEREE_VALIDATION_WINDOW_MS = 5000; // 5 seconds window for validation
let pointAction = '';
let team = '';
let defaultSettings = {
    roundMinutes: 1,
    roundSeconds: 30,
    breakSeconds: 30,
    medicalTimeout: 60,
    courtNumber: 'none'
};

// Initialize timer with default settings
let initialTimerTime = defaultSettings.roundMinutes * 60 + defaultSettings.roundSeconds;

// ========== ROOM CREATION ==========
function generateRoomId() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

function createRoom() {
    currentRoomId = generateRoomId();
    const roomId = currentRoomId; const initialData = {
        teamA: { score: 0, gamJeoms: 0 }, // Hong (red)
        teamB: { score: 0, gamJeoms: 0 }, // Chong (blue)
        timer: { minutes: defaultSettings.roundMinutes, seconds: defaultSettings.roundSeconds, running: false },
        round: 1,
        hongRoundsWon: 0,
        chongRoundsWon: 0,
        medicalTimeout: { active: false, team: '' },
        redBlinkClass: '',
        blueBlinkClass: '',
        settings: defaultSettings,
        submissions: {},
        referees: {},
        lastAction: {
            hong: { image: '', refereeName: '' },
            chong: { image: '', refereeName: '' }
        }
    };

    try {
        db.ref(`rooms/${roomId}`).off();

        db.ref(`rooms/${roomId}`).set(initialData).then(() => {
            document.getElementById('roomIdDisplay').textContent = `Room ID: ${roomId}`;
            const qrCanvas = document.getElementById('qrCode');
            qrCanvas.innerHTML = '';
            QRCode.toCanvas(qrCanvas, roomId, (error) => {
                if (error) console.error("QR code generation failed:", error);
            });
            listenToRoom(roomId);
            listenToReferees();
        }).catch((error) => {
            console.error("Failed to create room:", error);
            listenToRoom(roomId);
        });
    } catch (error) {
        console.error("Firebase unavailable:", error);
        listenToRoom(roomId);
    }
}

function listenToRoom(roomId) {
    try {
        db.ref(`rooms/${roomId}`).on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                hongScore = data.teamA?.score || hongScore; // Hong (red)
                chongScore = data.teamB?.score || chongScore; // Chong (blue)
                hongGamJeom = data.teamA?.gamJeoms || hongGamJeom;
                chongGamJeom = data.teamB?.gamJeoms || chongGamJeom;
                currentRound = data.round || currentRound;
                hongRoundsWon = data.hongRoundsWon || hongRoundsWon;
                chongRoundsWon = data.chongRoundsWon || chongRoundsWon;
                if (!isTimerRunning) {
                    // Preserve current timer value when paused
                    if (!data.timer?.running) {
                        timerTime = (data.timer?.minutes || 0) * 60 + (data.timer?.seconds || 0);
                    }
                }
                isTimerRunning = data.timer?.running && !matchWinnerDeclared && !roundDeclared;

                // Start/stop timer based on state
                if (isTimerRunning && !timerInterval && !matchWinnerDeclared && !roundDeclared) {
                    toggleTimer();
                } else if (!isTimerRunning && timerInterval) {
                    stopTimer();
                }

                isMedicalTimeout = data.medicalTimeout?.active || isMedicalTimeout;
                redBlinkClass = data.redBlinkClass || redBlinkClass;
                blueBlinkClass = data.blueBlinkClass || blueBlinkClass;
                defaultSettings = data.settings || defaultSettings;

                if (isMedicalTimeout) {
                    const timeoutTeam = data.medicalTimeout?.team || '';
                    if (timeoutTeam) {
                        document.getElementById(timeoutTeam === 'hong' ? 'redTimeout' : 'blueTimeout').textContent = `${timeoutTeam.toUpperCase()} Medical Timeout`;
                    }
                    document.getElementById('stopTimeoutButton').style.display = 'block';
                } else {
                    document.getElementById('redTimeout').textContent = '';
                    document.getElementById('blueTimeout').textContent = '';
                    document.getElementById('stopTimeoutButton').style.display = 'none';
                }

                updateCourtNumberDisplay();
                updateDisplay();
                updateTimerDisplay();
                updateTimerInputs();

                // Update last action displays only for the relevant team
                if (data.lastAction) {
                    // Hong (red) action
                    const hongContainer = document.querySelector('.gamjeom-container-left');
                    const hongImage = hongContainer.querySelector('.action-image');
                    const hongRefName = hongContainer.querySelector('.referee-name');

                    if (data.lastAction.hong && data.lastAction.hong.image && data.lastAction.hong.timestamp) {
                        if (hongImage) {
                            hongImage.src = data.lastAction.hong.image;
                            hongImage.style.display = 'block';
                            setTimeout(() => {
                                hongImage.style.display = 'none';
                                // Clear hong lastAction in Firebase after display
                                if (currentRoomId) {
                                    db.ref(`rooms/${currentRoomId}/lastAction/hong`).set({
                                        image: '',
                                        refereeName: '',
                                        timestamp: 0
                                    }).catch(error => {
                                        console.error("Error clearing hong lastAction:", error);
                                    });
                                }
                            }, 800);
                        }
                        if (hongRefName && data.lastAction.hong.refereeName) {
                            hongRefName.textContent = `Referee: ${data.lastAction.hong.refereeName}`;
                            hongRefName.style.display = 'block';
                            setTimeout(() => {
                                hongRefName.style.display = 'none';
                            }, 800);
                        }
                    } else {
                        // Ensure Hong display is cleared if no valid action
                        if (hongImage) hongImage.style.display = 'none';
                        if (hongRefName) hongRefName.style.display = 'none';
                    }

                    // Chong (blue) action
                    const chongContainer = document.querySelector('.gamjeom-container-right');
                    const chongImage = chongContainer.querySelector('.action-image');
                    const chongRefName = chongContainer.querySelector('.referee-name');

                    if (data.lastAction.chong && data.lastAction.chong.image && data.lastAction.chong.timestamp) {
                        if (chongImage) {
                            chongImage.src = data.lastAction.chong.image;
                            chongImage.style.display = 'block';
                            setTimeout(() => {
                                chongImage.style.display = 'none';
                                // Clear chong lastAction in Firebase after display
                                if (currentRoomId) {
                                    db.ref(`rooms/${currentRoomId}/lastAction/chong`).set({
                                        image: '',
                                        refereeName: '',
                                        timestamp: 0
                                    }).catch(error => {
                                        console.error("Error clearing chong lastAction:", error);
                                    });
                                }
                            }, 800);
                        }
                        if (chongRefName && data.lastAction.chong.refereeName) {
                            chongRefName.textContent = `Referee: ${data.lastAction.chong.refereeName}`;
                            chongRefName.style.display = 'block';
                            setTimeout(() => {
                                chongRefName.style.display = 'none';
                            }, 800);
                        }
                    } else {
                        // Ensure Chong display is cleared if no valid action
                        if (chongImage) chongImage.style.display = 'none';
                        if (chongRefName) chongRefName.style.display = 'none';
                    }
                } else {
                    // Clear all displays if no lastAction data
                    const hongContainer = document.querySelector('.gamjeom-container-left');
                    const chongContainer = document.querySelector('.gamjeom-container-right');
                    if (hongContainer) {
                        const hongImage = hongContainer.querySelector('.action-image');
                        const hongRefName = hongContainer.querySelector('.referee-name');
                        if (hongImage) hongImage.style.display = 'none';
                        if (hongRefName) hongRefName.style.display = 'none';
                    }
                    if (chongContainer) {
                        const chongImage = chongContainer.querySelector('.action-image');
                        const chongRefName = chongContainer.querySelector('.referee-name');
                        if (chongImage) chongImage.style.display = 'none';
                        if (chongRefName) chongRefName.style.display = 'none';
                    }
                }

                if (isTimerRunning && !timerInterval && !matchWinnerDeclared && !roundDeclared) {
                    toggleTimer();
                } else if (!isTimerRunning && timerInterval) {
                    stopTimer();
                }
            }
        }, (error) => {
            console.error("Error listening to room:", error);
        });
    } catch (error) {
        console.error("Firebase listener setup failed:", error);
        updateCourtNumberDisplay();
        updateDisplay();
        updateTimerDisplay();
        updateTimerInputs();
    }
}

function updateLastAction(team, actionData) {
    if (!currentRoomId) return;

    const updates = {};
    updates[`/rooms/${currentRoomId}/lastAction/${team}`] = {
        image: actionData.image,
        refereeName: actionData.refereeName,
        timestamp: Date.now()
    };
    db.ref().update(updates);
}

// Function to process referee submissions
function processRefereeSubmission(team, points, action, refereeId, refereeName, imageUrl) {
    if (!currentRoomId) return;

    const submission = {
        refereeId,
        team,
        points,
        action,
        timestamp: Date.now(),
        refereeName: refereeName || `Referee ${refereeId.slice(0, 4)}`,
        image: imageUrl
    };

    pendingSubmissions.push(submission);
    validateSubmissions();
}

// Function to validate submissions based on referee count and timing
// --- VALIDATOR (scoreboard side) ---
function validateSubmissions() {
    if (!currentRoomId) return;

    db.ref(`rooms/${currentRoomId}`).once('value').then(snapshot => {
        const data = snapshot.val();
        if (!data) return;

        const referees = data.referees || {};
        const refereeCount = Object.keys(referees).length;
        const now = Date.now();
        const SYNC_WINDOW_MS = 5000;
        const isTimerRunning = !!(data.timer && data.timer.running);

        const submissionsRef = db.ref(`rooms/${currentRoomId}/submissions`);
        submissionsRef.once('value').then(subSnap => {
            const subsRaw = subSnap.val() || {};
            const subs = Object.entries(subsRaw).map(([key, v]) => ({ key, ...v }));

            if (subs.length === 0) return;

            // Group by player + points + action
            const groups = {};
            subs.forEach(s => {
                if (!s.player || !s.action || typeof s.points === 'undefined' || !s.refereeId) return;
                const gKey = `${s.player}__${s.points}__${s.action}`;
                groups[gKey] = groups[gKey] || [];
                groups[gKey].push(s);
            });

            const keysToRemove = new Set();

            Object.entries(groups).forEach(([gKey, groupSubs]) => {
                groupSubs.sort((a, b) => a.timestamp - b.timestamp);
                const earliest = groupSubs[0];
                const sampleImage = earliest.image || '';
                const sampleRefName = (data.referees && data.referees[earliest.refereeId] && data.referees[earliest.refereeId].name) || earliest.refereeId || '';

               // Update lastAction for visual feedback only when a referee submits a score
               if (earliest.action === 'score') {
                const actionTeam = earliest.player === 'red' ? 'hong' : 'chong';
                db.ref(`rooms/${currentRoomId}/lastAction/${actionTeam}`).set({
                    image: sampleImage,
                    refereeName: sampleRefName,
                    timestamp: Date.now(),
                    sourceTeam: earliest.player
                }).catch(e => console.error("lastAction update err", e));
            }
                if (!isTimerRunning) {
                    // timer stopped => don't award points
                    return;
                }

                const uniqueReferees = [...new Set(groupSubs.map(s => s.refereeId))];
                const uniqueCount = uniqueReferees.length;
                const spread = groupSubs[groupSubs.length - 1].timestamp - groupSubs[0].timestamp;

                let shouldAward = false;
                if (refereeCount <= 1) {
                    if (uniqueCount >= 1) shouldAward = true;
                } else if (refereeCount === 2) {
                    if (uniqueCount === 2 && spread <= SYNC_WINDOW_MS) shouldAward = true;
                } else {
                    if (uniqueCount >= 2 && spread <= SYNC_WINDOW_MS) shouldAward = true;
                }

                if (shouldAward) {
                    awardPoints(earliest.player, earliest.points);
                    groupSubs.forEach(s => keysToRemove.add(s.key));
                }
            });

            // Remove processed submissions
            keysToRemove.forEach(k => {
                if (!k) return;
                db.ref(`rooms/${currentRoomId}/submissions/${k}`).remove().catch(err => console.error("remove error", err));
            });

            // Cleanup stale submissions older than 2 * window
            const expiration = SYNC_WINDOW_MS * 2;
            subs.forEach(s => {
                if (now - s.timestamp > expiration) {
                    db.ref(`rooms/${currentRoomId}/submissions/${s.key}`).remove().catch(err => console.error("cleanup error", err));
                }
            });
        }).catch(err => console.error("submissions read error", err));
    }).catch(err => console.error("room read error", err));
}


function listenToReferees() {
    db.ref(`rooms/${currentRoomId}/referees`).on("value", (snapshot) => {
        const data = snapshot.val() || {};
        const sortedReferees = Object.entries(data)
            .sort((a, b) => a[1].joined - b[1].joined)
            .map(([id, val], index) => {
                const defaultName = `Referee ${index + 1}`;
                if (!val.name || val.name.startsWith('Referee ')) {
                    // Set default numbered name if none exists or if it's the old format
                    db.ref(`rooms/${currentRoomId}/referees/${id}`).update({ name: defaultName });
                }
                return `<div class="referee-entry">
                    <span class="referee-id">${defaultName}</span>
                    <input type="text" class="rename-input" 
                        value="${val.name || defaultName}" 
                        placeholder="Enter referee name"
                        onchange="renameDevice('${id}', this.value)" />
                    <button class="delete-referee" onclick="deleteReferee('${id}')">
                        ✕
                    </button>
                </div>`;
            });

        const connectedDevices = document.getElementById("connectedDevices");
        if (connectedDevices) {
            connectedDevices.innerHTML = `
                <h3>Connected Referees (${sortedReferees.length})</h3>
                <style>
                    .referee-entry {
                        display: flex;
                        align-items: center;
                        margin: 10px 0;
                        gap: 10px;
                    }
                    .referee-id {
                        min-width: 100px;
                        font-weight: bold;
                    }
                    .rename-input {
                        padding: 5px;
                        border-radius: 4px;
                        border: 1px solid #ccc;
                    }
                    .delete-referee {
                        background: #ff4444;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        padding: 5px 10px;
                        cursor: pointer;
                    }
                    .delete-referee:hover {
                        background: #cc0000;
                    }
                </style>
                <div class="referee-list">
                    ${sortedReferees.join('')}
                </div>
            `;
        }
    });
}

function deleteReferee(refereeId) {
    if (!currentRoomId) return;

    if (confirm('Are you sure you want to remove this referee?')) {
        db.ref(`rooms/${currentRoomId}/referees/${refereeId}`).remove()
            .then(() => {
                console.log(`Referee ${refereeId} removed successfully`);
            })
            .catch((error) => {
                console.error("Error removing referee:", error);
                alert("Failed to remove referee. Please try again.");
            });
    }
}

// ========== SCOREBOARD SETTINGS ==========
function openEditScoreboardSlide() {
    const slide = document.getElementById('editScoreboardSlide');
    if (slide) {
        document.getElementById('defaultRoundMinutes').value = defaultSettings.roundMinutes;
        document.getElementById('defaultRoundSeconds').value = defaultSettings.roundSeconds;
        document.getElementById('defaultBreakSeconds').value = defaultSettings.breakSeconds;
        document.getElementById('defaultMedicalTimeout').value = defaultSettings.medicalTimeout;
        document.getElementById('courtNumberSelect').value = defaultSettings.courtNumber;
        slide.style.display = 'block';
    }
}

function closeEditScoreboardSlide() {
    const slide = document.getElementById('editScoreboardSlide');
    if (slide) {
        slide.style.display = 'none';
    }
}

function saveScoreboardSettings() {
    defaultSettings.courtNumber = document.getElementById('courtNumberSelect').value;
    const minutes = parseInt(document.getElementById('defaultRoundMinutes').value) || 0;
    const seconds = parseInt(document.getElementById('defaultRoundSeconds').value) || 0;
    const breakSecs = parseInt(document.getElementById('defaultBreakSeconds').value) || 30;
    const medicalSecs = parseInt(document.getElementById('defaultMedicalTimeout').value) || 60;
    defaultSettings.roundMinutes = minutes;
    defaultSettings.roundSeconds = seconds;
    defaultSettings.breakSeconds = breakSecs;
    defaultSettings.medicalTimeout = medicalSecs;
    // Only update current timer if not in an active round/state
    // Update all settings at once
    defaultSettings.roundMinutes = minutes;
    defaultSettings.roundSeconds = seconds;
    defaultSettings.breakSeconds = breakSecs;
    defaultSettings.medicalTimeout = medicalSecs;
    if (!isMedicalTimeout && !matchWinnerDeclared && !roundDeclared) {
        timerTime = minutes * 60 + seconds;
        timerSetTime = timerTime;
        updateTimerDisplay();
    }
    if (currentRoomId) {
        db.ref(`rooms/${currentRoomId}/settings`).update(defaultSettings).then(() => {
            // After successful update to Firebase, update local timer
            if (!matchWinnerDeclared && !roundDeclared && !isMedicalTimeout && !isTimerRunning) {
                db.ref(`rooms/${currentRoomId}/timer`).update({
                    minutes: minutes,
                    seconds: seconds,
                    running: false
                });
            }
        });
    }
    closeEditScoreboardSlide();
    updateCourtNumberDisplay();
}

function updateCourtNumberDisplay() {
    const courtNumberEl = document.getElementById('courtNumber');
    if (courtNumberEl) {
        if (defaultSettings.courtNumber === 'none') {
            courtNumberEl.textContent = '';
            courtNumberEl.style.display = 'none';
        } else {
            courtNumberEl.textContent = `Court No ${defaultSettings.courtNumber}`;
            courtNumberEl.style.display = 'block';

            // Dynamically adjust font size based on container width
            const containerWidth = courtNumberEl.parentElement.offsetWidth;
            const baseFontSize = Math.min(Math.max(containerWidth * 0.1, 36), 72); // Between 36px and 72px
            courtNumberEl.style.fontSize = `${baseFontSize}px`;
        }
    }
}

// Update updateTimerInputs function to include seconds
function updateTimerInputs() {
    // Only update the timer values if we're not in an active round or timeout
    if (!isTimerRunning && !isMedicalTimeout && !roundDeclared) {
        timerSetTime = defaultSettings.roundMinutes * 60 + defaultSettings.roundSeconds;
        timerTime = timerSetTime;
        updateTimerDisplay();
    }
}

// Update settings in real-time as they change
function addSettingsListeners() {
    const minutesInput = document.getElementById('defaultRoundMinutes');
    const secondsInput = document.getElementById('defaultRoundSeconds');
    const breakSecondsInput = document.getElementById('defaultBreakSeconds');
    const medicalTimeoutInput = document.getElementById('defaultMedicalTimeout');

    let updateTimeout; // For debouncing updates

    function updateTimerValue(immediate = false) {
        // Clear any pending timeout
        if (updateTimeout) clearTimeout(updateTimeout);

        const updateFunction = () => {
            if (!isMedicalTimeout && !matchWinnerDeclared && !roundDeclared) {
                // Get and validate input values
                const minutes = Math.max(0, Math.min(59, parseInt(minutesInput.value) || 0));
                const seconds = Math.max(0, Math.min(59, parseInt(secondsInput.value) || 0));

                // Ensure inputs show valid values
                minutesInput.value = minutes;
                secondsInput.value = seconds;

                // Update timer values immediately
                timerTime = minutes * 60 + seconds;
                timerSetTime = timerTime;

                // Store in default settings
                defaultSettings.roundMinutes = minutes;
                defaultSettings.roundSeconds = seconds;

                // Stop timer if it's running to ensure clean update
                if (isTimerRunning) {
                    stopTimer();
                }

                updateTimerDisplay();

                // Update Firebase if connected
                if (currentRoomId) {
                    const updates = {};
                    updates[`rooms/${currentRoomId}/settings/roundMinutes`] = minutes;
                    updates[`rooms/${currentRoomId}/settings/roundSeconds`] = seconds;
                    updates[`rooms/${currentRoomId}/timer/minutes`] = minutes;
                    updates[`rooms/${currentRoomId}/timer/seconds`] = seconds;
                    updates[`rooms/${currentRoomId}/timer/running`] = false;

                    db.ref().update(updates).catch(error => {
                        console.error("Error updating timer values:", error);
                    });
                }
            }
        };

        if (immediate) {
            updateFunction();
        } else {
            // Debounce updates to prevent too many Firebase writes
            updateTimeout = setTimeout(updateFunction, 300);
        }
    }

    // Update timer values when inputs change
    minutesInput.addEventListener('input', () => updateTimerValue(false));
    minutesInput.addEventListener('change', () => updateTimerValue(true));
    secondsInput.addEventListener('input', () => updateTimerValue(false));
    secondsInput.addEventListener('change', () => updateTimerValue(true));

    // Update break timer settings with debouncing
    let breakUpdateTimeout;
    breakSecondsInput.addEventListener('input', () => {
        if (breakUpdateTimeout) clearTimeout(breakUpdateTimeout);

        breakUpdateTimeout = setTimeout(() => {
            const breakSeconds = Math.max(0, Math.min(300, parseInt(breakSecondsInput.value) || 30));
            breakSecondsInput.value = breakSeconds;
            defaultSettings.breakSeconds = breakSeconds;

            if (currentRoomId) {
                db.ref(`rooms/${currentRoomId}/settings`).update({
                    breakSeconds: breakSeconds
                }).catch(error => {
                    console.error("Error updating break timer:", error);
                });
            }
        }, 300);
    });

    // Update medical timeout settings with debouncing
    let medicalUpdateTimeout;
    medicalTimeoutInput.addEventListener('input', () => {
        if (medicalUpdateTimeout) clearTimeout(medicalUpdateTimeout);

        medicalUpdateTimeout = setTimeout(() => {
            const medicalTimeout = Math.max(0, Math.min(300, parseInt(medicalTimeoutInput.value) || 60));
            medicalTimeoutInput.value = medicalTimeout;
            defaultSettings.medicalTimeout = medicalTimeout;

            if (currentRoomId) {
                db.ref(`rooms/${currentRoomId}/settings`).update({
                    medicalTimeout: medicalTimeout
                }).catch(error => {
                    console.error("Error updating medical timeout:", error);
                });
            }
        }, 300);
    });
}

// ========== DISPLAY ==========
function updateDisplay() {
    const redScoreEl = document.getElementById("redScore");
    const blueScoreEl = document.getElementById("blueScore");
    const redGamJeomEl = document.getElementById("redGamJeomCounter");
    const blueGamJeomEl = document.getElementById("blueGamJeomCounter");
    const roundEl = document.getElementById("currentRound");

    if (redScoreEl && blueScoreEl && redGamJeomEl && blueGamJeomEl && roundEl) {
        redScoreEl.textContent = hongScore; // Hong (red)
        blueScoreEl.textContent = chongScore; // Chong (blue)
        redGamJeomEl.textContent = `${hongGamJeom}/5`;
        blueGamJeomEl.textContent = `${chongGamJeom}/5`;
        roundEl.textContent = currentRound;

        // Update CSS variables for Gam-Jeom progress
        document.querySelector('.gamjeom-container-left').style.setProperty('--hongGamJeom', hongGamJeom);
        document.querySelector('.gamjeom-container-right').style.setProperty('--chongGamJeom', chongGamJeom);        // Remove any existing blink classes
        if (redScoreEl.className.includes('blink-white')) redScoreEl.classList.remove('blink-white');
        if (redScoreEl.className.includes('blink-yellow')) redScoreEl.classList.remove('blink-yellow');
        if (blueScoreEl.className.includes('blink-white')) blueScoreEl.classList.remove('blink-white');
        if (blueScoreEl.className.includes('blink-yellow')) blueScoreEl.classList.remove('blink-yellow');

        // Add new blink classes if needed
        if (redBlinkClass) redScoreEl.classList.add(redBlinkClass);
        if (blueBlinkClass) blueScoreEl.classList.add(blueBlinkClass);

        if (matchWinnerDeclared) {
            disableButtons();
        }
    } else {
        console.warn("One or more score elements not found in DOM");
    }
}

// ========== POINT ADJUSTMENT ==========
function openPointSlide(action, teamColor) {
    if (matchWinnerDeclared || isMedicalTimeout || roundDeclared) return;
    pointAction = action;
    team = teamColor;
    const slideHeader = document.getElementById('slideHeader');
    if (slideHeader) {
        slideHeader.textContent = action === 'add' ? 'Add Points' : 'Subtract Points';
        document.getElementById('pointSlide').style.display = 'block';
    }
}

function closePointSlide() {
    const pointSlide = document.getElementById('pointSlide');
    if (pointSlide) {
        pointSlide.style.display = 'none';
    }
    pointAction = '';
    team = '';
}

function adjustPoints(points) {
    if (matchWinnerDeclared || isMedicalTimeout || roundDeclared) return;

    if (pointAction === 'add') {
        if (team === 'red') {
            hongScore += points; // Hong (red)
        } else if (team === 'blue') {
            chongScore += points; // Chong (blue)
        }
    } else if (pointAction === 'subtract') {
        if (team === 'red') {
            hongScore = Math.max(0, hongScore - points); // Hong (red)
        } else if (team === 'blue') {
            chongScore = Math.max(0, chongScore - points); // Chong (blue)
        }
    }
    updateDisplay();
    checkPointGap();
    checkGamJeomLimit();
    closePointSlide();

    if (currentRoomId) {
        // Update scores without affecting lastAction
        db.ref(`rooms/${currentRoomId}`).update({
            teamA: { score: hongScore, gamJeoms: hongGamJeom }, // Hong (red)
            teamB: { score: chongScore, gamJeoms: chongGamJeom } // Chong (blue)
        }).catch(error => {
            console.error("Error updating scores in adjustPoints:", error);
        });
    }
}


// ========== GAM-JEOM ==========
function addGamJeom(team) {
    if (matchWinnerDeclared || isMedicalTimeout || roundDeclared) return;

    if (team === 'hong') {
        hongGamJeom++;
        chongScore++; // Opponent gets +1
    } else if (team === 'chong') {
        chongGamJeom++;
        hongScore++; // Opponent gets +1
    }

    // Update Firebase immediately to ensure scores are synced
    if (currentRoomId) {
        db.ref(`rooms/${currentRoomId}`).update({
            teamA: { score: hongScore, gamJeoms: hongGamJeom }, // Hong (red)
            teamB: { score: chongScore, gamJeoms: chongGamJeom } // Chong (blue)
        }).catch((error) => {
            console.error("Error updating Firebase in addGamJeom:", error);
        });
    }

    // Update display and check conditions
    updateDisplay();
    checkGamJeomLimit();
    checkPointGap();
}


function subtractGamJeom(team) {
    if (matchWinnerDeclared || isMedicalTimeout || roundDeclared) return;
    if (team === 'hong') {
        if (hongGamJeom > 0) {
            hongGamJeom--;
            if (chongScore > 0) chongScore--; // Remove point from opponent (Chong)
        }
    } else if (team === 'chong') {
        if (chongGamJeom > 0) {
            chongGamJeom--;
            if (hongScore > 0) hongScore--; // Remove point from opponent (Hong)
        }
    }
    updateDisplay();
    checkPointGap();
    checkGamJeomLimit();

    if (currentRoomId) {
        db.ref(`rooms/${currentRoomId}`).update({
            teamA: { score: hongScore, gamJeoms: hongGamJeom }, // Hong (red)
            teamB: { score: chongScore, gamJeoms: chongGamJeom } // Chong (blue)
        });
    }
}

function checkGamJeomLimit() {
    if (hongGamJeom >= 5 && hongRoundsWon < 2 && chongRoundsWon < 2 && !matchWinnerDeclared && !roundDeclared) {
        declareRoundWinner('chong');
    } else if (chongGamJeom >= 5 && hongRoundsWon < 2 && chongRoundsWon < 2 && !matchWinnerDeclared && !roundDeclared) {
        declareRoundWinner('hong');
    }
}

// ========== POINT GAP ==========
function checkPointGap() {
    if (hongScore - chongScore >= 12 && hongRoundsWon < 2 && chongRoundsWon < 2 && !matchWinnerDeclared && !roundDeclared) {
        stopTimer();
        declareRoundWinner('hong');
    } else if (chongScore - hongScore >= 12 && hongRoundsWon < 2 && chongRoundsWon < 2 && !matchWinnerDeclared && !roundDeclared) {
        stopTimer();
        declareRoundWinner('chong');
    }
}

// ========== WINNER ==========
function declareRoundWinner(winner) {
    if (matchWinnerDeclared || isMedicalTimeout || roundDeclared) return;

    roundDeclared = true;
    redBlinkClass = winner === 'hong' ? 'blink-white' : '';
    blueBlinkClass = winner === 'chong' ? 'blink-white' : '';
    if (winner === 'hong') {
        hongRoundsWon++;
    } else if (winner === 'chong') {
        chongRoundsWon++;
    }

    stopTimer();
    updateDisplay();

    if (hongRoundsWon >= 2 || chongRoundsWon >= 2) {
        declareMatchWinner(winner);
    } if (currentRoomId) {
        db.ref(`rooms/${currentRoomId}`).update({
            round: currentRound,
            hongRoundsWon: hongRoundsWon,
            chongRoundsWon: chongRoundsWon,
            redBlinkClass: redBlinkClass,
            blueBlinkClass: blueBlinkClass,
            matchWinnerDeclared: matchWinnerDeclared,
            roundDeclared: roundDeclared,
            teamA: { score: hongScore, gamJeoms: hongGamJeom }, // Hong (red)
            teamB: { score: chongScore, gamJeoms: chongGamJeom } // Chong (blue)
        });
    }
}

function declareMatchWinner(winner) {
    if (matchWinnerDeclared) return;
    matchWinnerDeclared = true;
    redBlinkClass = winner === 'hong' ? 'blink-yellow' : '';
    blueBlinkClass = winner === 'chong' ? 'blink-yellow' : '';

    stopTimer();
    disableButtons();
    document.querySelector('.reset-scores-button').disabled = false;
    document.querySelector('.new-match-button').disabled = false;
    updateDisplay();

    if (currentRoomId) {
        db.ref(`rooms/${currentRoomId}`).update({
            redBlinkClass: redBlinkClass,
            blueBlinkClass: blueBlinkClass
        });
    }
}

// ========== MEDICAL TIMEOUT ==========
function medicalTimeout(team) {
    if (matchWinnerDeclared || isMedicalTimeout) return;

    // If break timer is running, pause it
    if (roundDeclared) {
        clearInterval(breakInterval);
        roundDeclared = false;
    }

    isMedicalTimeout = true;
    disableButtons();
    document.getElementById('stopTimeoutButton').style.display = 'block';

    const timeoutTeam = team === 'red' ? 'HONG' : 'CHONG';

    // Show medical timeout in break timer location
    const breakTimerElement = document.getElementById('breakTimer');
    const breakTimerDisplay = document.getElementById('breakTimerDisplay');
    breakTimerElement.style.display = 'block';
    breakTimerElement.style.opacity = '1';

    // Set and start medical timeout timer
    stopTimer();
    timerTime = defaultSettings.medicalTimeout;
    updateTimerDisplay();
    updateDisplay();

    // Start medical timeout countdown
    timerInterval = setInterval(() => {
        if (timerTime > 0 && isMedicalTimeout) {
            timerTime--;
            updateTimerDisplay();
        } else if (timerTime <= 0) {
            stopMedicalTimeout();
            displayMessage('Medical Timeout Complete');
        }
    }, 1000);

    // Show start message
    displayMessage(`${timeoutTeam} Medical Timeout Started`);

    if (currentRoomId) {
        db.ref(`rooms/${currentRoomId}`).update({
            medicalTimeout: { active: true, team: team === 'red' ? 'hong' : 'chong' },
            timer: { minutes: Math.floor(defaultSettings.medicalTimeout / 60), seconds: defaultSettings.medicalTimeout % 60, running: false }
        });
    }
}

function stopMedicalTimeout() {
    if (!isMedicalTimeout) return;

    // Clear the medical timeout timer
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    isMedicalTimeout = false;

    // Update the medical timeout display to show it's stopped
    const breakTimerElement = document.getElementById('breakTimer');
    const breakTimerDisplay = document.getElementById('breakTimerDisplay');
    if (breakTimerDisplay) {
        const timeoutTeam = document.getElementById('redTimeout').textContent.includes('HONG') ? 'HONG' : 'CHONG';
        breakTimerDisplay.textContent = `${timeoutTeam} Medical Timeout Ended`;
    }

    document.getElementById('stopTimeoutButton').style.display = 'none';
    enableAllButtons();
    timerTime = timerSetTime;
    updateTimerDisplay();
    updateDisplay();

    // Show stop message
    displayMessage('Medical Timeout Stopped');

    if (currentRoomId) {
        db.ref(`rooms/${currentRoomId}`).update({
            medicalTimeout: { active: false, team: '' },
            timer: { minutes: Math.floor(timerSetTime / 60), seconds: timerSetTime % 60, running: false }
        });
    }
}

// ========== RESET AND NEW MATCH ==========
function resetScores() {
    if (isMedicalTimeout) return;

    hongScore = 0;
    chongScore = 0;
    hongGamJeom = 0;
    chongGamJeom = 0;
    updateDisplay();

    redBlinkClass = '';
    blueBlinkClass = '';
    roundDeclared = false;

    // Handle timer reset based on match state
    if (!matchWinnerDeclared && currentRound < totalRounds) {
        // Move to next round with break time
        currentRound++;
        updateDisplay();
        startBreakTime(); // Start break timer with transition
    } else {
        // Reset to default round time
        timerTime = defaultSettings.roundMinutes * 60 + defaultSettings.roundSeconds;
        timerSetTime = timerTime;
        // Ensure break timer is hidden
        updateBreakTimerDisplay(0);
    }

    updateTimerDisplay();
    stopTimer();
    updateDisplay();
    enableAllButtons();

    if (currentRoomId) {
        db.ref(`rooms/${currentRoomId}`).update({
            teamA: { score: 0, gamJeoms: 0 },
            teamB: { score: 0, gamJeoms: 0 },
            round: currentRound,
            redBlinkClass: '',
            blueBlinkClass: '',
            timer: {
                minutes: Math.floor(timerSetTime / 60),
                seconds: timerSetTime % 60,
                running: false
            }
        });
    }
}

function newMatch() {
    if (isMedicalTimeout) {
        return;
    }

    // Clear any existing break message
    const breakMsg = document.getElementById('breakMessage');
    if (breakMsg && breakMsg.parentNode) {
        breakMsg.parentNode.removeChild(breakMsg);
    }

    hongScore = 0;
    chongScore = 0;
    hongGamJeom = 0;
    chongGamJeom = 0;
    hongRoundsWon = 0;
    chongRoundsWon = 0;
    currentRound = 1;
    matchWinnerDeclared = false; timerTime = defaultSettings.roundMinutes * 60 + defaultSettings.roundSeconds;
    timerSetTime = timerTime;
    isTimerRunning = false;
    roundDeclared = false;
    redBlinkClass = '';
    blueBlinkClass = '';

    // Clear any existing intervals
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    stopTimer();
    updateCourtNumberDisplay();
    updateDisplay();
    updateTimerDisplay();
    updateTimerInputs();
    enableAllButtons();

    if (currentRoomId) {
        db.ref(`rooms/${currentRoomId}`).update({
            teamA: { score: 0, gamJeoms: 0 }, // Hong (red)
            teamB: { score: 0, gamJeoms: 0 }, // Chong (blue)
            timer: { minutes: defaultSettings.roundMinutes, seconds: 0, running: false },
            round: 1,
            hongRoundsWon: 0,
            chongRoundsWon: 0,
            medicalTimeout: { active: false, team: '' },
            redBlinkClass: '',
            blueBlinkClass: '',
            submissions: {}
        }).catch((error) => {
            console.warn("Failed to update Firebase in newMatch:", error);
        });
    } else {
        console.warn("No currentRoomId set, skipping Firebase update in newMatch");
    }
}

// ========== TIMER ==========
function setTimer() {
    if (isMedicalTimeout || roundDeclared || matchWinnerDeclared) return;

    let minutes = parseInt(document.getElementById('timerMinutes').value) || 0;
    let seconds = parseInt(document.getElementById('timerSeconds').value) || 0;

    // Validate input values
    minutes = Math.min(Math.max(minutes, 0), 59);
    seconds = Math.min(Math.max(seconds, 0), 59);

    // Update timer values
    timerSetTime = minutes * 60 + seconds;
    timerTime = timerSetTime;

    // Stop the timer if it's running
    if (isTimerRunning) {
        clearInterval(timerInterval);
        timerInterval = null;
        isTimerRunning = false;
        document.getElementById('playPauseImage').src = 'assets/images/play.svg';
    }

    updateTimerDisplay();

    if (currentRoomId) {
        db.ref(`rooms/${currentRoomId}/timer`).update({
            minutes: minutes,
            seconds: seconds,
            running: false
        });
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerTime / 60).toString().padStart(2, '0');
    const seconds = (timerTime % 60).toString().padStart(2, '0');
    document.getElementById('timerDisplay').textContent = `${minutes}:${seconds}`;

    // Update medical timeout display if active
    if (isMedicalTimeout) {
        const breakTimerDisplay = document.getElementById('breakTimerDisplay');
        if (breakTimerDisplay) {
            const timeoutTeam = document.getElementById('redTimeout').textContent.includes('HONG') ? 'HONG' : 'CHONG';
            breakTimerDisplay.textContent = `${timeoutTeam} Medical: ${minutes}:${seconds}`;
        }
    }
}

function toggleTimer() {
    if (isMedicalTimeout || matchWinnerDeclared) return;

    if (roundDeclared) {
        // Reset timer for next round
        timerTime = defaultSettings.roundMinutes * 60 + defaultSettings.roundSeconds;
        timerSetTime = timerTime;
        roundDeclared = false;

        // Hide break timer
        const breakTimerElement = document.getElementById('breakTimer');
        const breakTimerDisplay = document.getElementById('breakTimerDisplay');
        if (breakTimerElement) {
            breakTimerElement.style.display = 'none';
            breakTimerElement.style.opacity = '0';
        }
        if (breakTimerDisplay) {
            breakTimerDisplay.style.color = '';
            breakTimerDisplay.style.fontSize = '';
            breakTimerDisplay.style.fontWeight = '';
        }

        // Update Firebase for round state
        if (currentRoomId) {
            db.ref(`rooms/${currentRoomId}`).update({
                roundDeclared: false,
                timer: {
                    minutes: Math.floor(timerTime / 60),
                    seconds: timerTime % 60,
                    running: false
                }
            });
        }
        updateTimerDisplay();
    }

    if (isTimerRunning) {
        // Stop timer but maintain current time
        clearInterval(timerInterval);
        timerInterval = null;
        isTimerRunning = false;
        playSound('stopSound');
        document.getElementById('playPauseImage').src = 'assets/images/play.svg';
    } else {
        // Resume from current time (don't reset timerTime)
        timerInterval = setInterval(() => {
            if (timerTime > 0 && !matchWinnerDeclared && !isMedicalTimeout && !roundDeclared) {
                timerTime--;
                updateTimerDisplay();
                updateDisplay();
                if (Math.abs(hongScore - chongScore) >= 12) {
                    stopTimer();
                    declareRoundWinner(hongScore > chongScore ? 'hong' : 'chong');
                    return;
                }
            } else {
                clearInterval(timerInterval);
                timerInterval = null;
                isTimerRunning = false;
                document.getElementById('playPauseImage').src = 'assets/images/play.svg';
                if (timerTime <= 0 && !matchWinnerDeclared && !roundDeclared) {
                    if (hongScore > chongScore) {
                        declareRoundWinner('hong');
                    } else if (chongScore > hongScore) {
                        declareRoundWinner('chong');
                    } else {
                        roundDeclared = true;
                        stopTimer();
                        updateDisplay();
                        if (currentRoomId) {
                            db.ref(`rooms/${currentRoomId}`).update({
                                round: currentRound,
                                redBlinkClass: '',
                                blueBlinkClass: ''
                            });
                        }
                    }
                }
            }
        }, 1000);
        isTimerRunning = true;
        playSound('startSound');
        document.getElementById('playPauseImage').src = 'assets/images/pause.svg';
    }
    updateDisplay();

    if (currentRoomId) {
        db.ref(`rooms/${currentRoomId}/timer`).update({
            running: isTimerRunning,
            minutes: Math.floor(timerTime / 60),
            seconds: timerTime % 60
        });
    }
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        isTimerRunning = false;
        document.getElementById('playPauseImage').src = 'assets/images/play.svg';
        // Play stop sound when timer stops
        playSound('stopSound');
        updateDisplay();

        if (currentRoomId) {
            db.ref(`rooms/${currentRoomId}/timer`).update({
                running: false
            });
        }
    }
}

function resetTimer() {
    if (isMedicalTimeout || matchWinnerDeclared) return;

    stopTimer();

    // If round is declared, prepare for break time
    if (roundDeclared && currentRound < totalRounds) {
        timerTime = defaultSettings.breakSeconds;
        timerSetTime = defaultSettings.breakSeconds;
    } else {
        // Reset to default round time including seconds
        timerTime = defaultSettings.roundMinutes * 60 + defaultSettings.roundSeconds;
        timerSetTime = timerTime;
    }

    updateTimerDisplay();
    updateDisplay();

    if (currentRoomId) {
        db.ref(`rooms/${currentRoomId}/timer`).update({
            minutes: Math.floor(timerTime / 60),
            seconds: timerTime % 60,
            running: false
        });
    }
}

// Break timer functionality
function startBreakTimer() {
    // Show break message
    const breakMessageDiv = document.createElement('div');
    breakMessageDiv.id = 'breakMessage';
    document.body.appendChild(breakMessageDiv);

    function updateBreakDisplay() {
        if (breakMessageDiv) {
            breakMessageDiv.textContent = `Break Time: ${timerTime}`;
        }
    }

    // Start counting up
    updateBreakDisplay();
    const breakInterval = setInterval(() => {
        if (timerTime < timerSetTime) {
            timerTime++;
            updateBreakDisplay();
        } else {
            clearInterval(breakInterval);
            if (breakMessageDiv.parentNode) {
                breakMessageDiv.textContent = 'Break Over';
                setTimeout(() => {
                    document.body.removeChild(breakMessageDiv);
                    // Start next round
                    timerTime = defaultSettings.roundMinutes * 60 + defaultSettings.roundSeconds;
                    timerSetTime = timerTime;
                    updateTimerDisplay();
                    roundDeclared = false;
                    enableAllButtons();
                }, 2000);
            }
        }
        updateTimerDisplay();
    }, 1000);
}

function startBreakTimeCountUp() {
    let breakCount = 1;
    const breakSeconds = defaultSettings.breakSeconds;

    // Create and show break message
    const messageDiv = document.createElement('div');
    messageDiv.id = 'breakMessage';
    document.querySelector('.container').appendChild(messageDiv);

    // Hide timer display during break
    document.getElementById('timerDisplay').textContent = '00:00';

    const breakInterval = setInterval(() => {
        if (breakCount <= breakSeconds) {
            messageDiv.textContent = `Break Time: ${breakCount}/${breakSeconds}s`;
            breakCount++;
        } else {
            clearInterval(breakInterval);
            if (messageDiv.parentNode) {
                messageDiv.textContent = 'Break Over!';
                setTimeout(() => {
                    messageDiv.parentNode.removeChild(messageDiv);                    // Prepare next round without auto-starting
                    timerTime = defaultSettings.roundMinutes * 60 + defaultSettings.roundSeconds;
                    timerSetTime = timerTime;
                    updateTimerDisplay();
                    roundDeclared = false;
                }, 2000);
            }
        }
    }, 1000);

    // Update Firebase if needed
    if (currentRoomId) {
        db.ref(`rooms/${currentRoomId}/timer`).update({
            minutes: 0,
            seconds: 0,
            running: false,
            breakTime: true
        });
    }
}

function updateBreakTimerDisplay(breakTime) {
    const breakTimerElement = document.getElementById('breakTimer');
    const breakTimerDisplay = document.getElementById('breakTimerDisplay');

    if (breakTime > 0) {
        const minutes = Math.floor(breakTime / 60).toString().padStart(2, '0');
        const seconds = (breakTime % 60).toString().padStart(2, '0');
        breakTimerDisplay.textContent = `${minutes}:${seconds}`;

        // Show break timer with animation
        breakTimerElement.style.display = 'block';
        // Force a reflow to ensure the animation works
        breakTimerElement.offsetHeight;
    } else {
        // Hide break timer with transition
        breakTimerElement.addEventListener('transitionend', function handler() {
            breakTimerElement.style.display = 'none';
            breakTimerElement.removeEventListener('transitionend', handler);
        });
        breakTimerElement.style.opacity = '0';
    }
}

// Helper function to start break timer
function startBreakTime() {
    if (currentRound < 2 || currentRound > totalRounds) return;

    const breakTime = defaultSettings.breakSeconds;
    if (breakTime <= 0) return;

    let timeRemaining = breakTime;
    let breakInterval;
    roundDeclared = true;

    // Clear any existing intervals
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    function startOverTimeCount() {
        playSound('stopSound'); // Play stop sound when break time ends
        let overtimeCount = 0;
        const breakTimerDisplay = document.getElementById('breakTimerDisplay');
        const breakTimerElement = document.getElementById('breakTimer');

        if (breakTimerDisplay && breakTimerElement) {
            breakTimerDisplay.textContent = 'Over time: 00:00';
            breakTimerDisplay.style.color = '#ff0000';
            breakTimerDisplay.style.fontSize = '2em';
            breakTimerDisplay.style.fontWeight = 'bold';
            breakTimerElement.style.display = 'block';
            breakTimerElement.style.opacity = '1';
            breakTimerDisplay.style.animation = 'blinkBreakTimer 1s infinite';

            timerInterval = setInterval(() => {
                overtimeCount++;
                const minutes = Math.floor(overtimeCount / 60).toString().padStart(2, '0');
                const seconds = (overtimeCount % 60).toString().padStart(2, '0');
                breakTimerDisplay.textContent = `Over time: ${minutes}:${seconds}`;
            }, 1000);
        }
    }

    // Start break countdown
    breakInterval = setInterval(() => {
        timeRemaining--;
        if (timeRemaining > 0) {
            updateBreakTimerDisplay(timeRemaining);
        } else {
            clearInterval(breakInterval);
            startOverTimeCount();
        }
    }, 1000);

    // Update Firebase
    if (currentRoomId) {
        db.ref(`rooms/${currentRoomId}`).update({
            roundDeclared: true,
            'timer/running': false
        });
    }
}

// ========== UTILITY ==========
function disableButtons() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach((button) => {
        if (!button.classList.contains('reset-scores-button') &&
            !button.classList.contains('new-match-button') &&
            !button.classList.contains('create-room-button') &&
            button.id !== 'stopTimeoutButton' &&
            button.id !== 'editScoreboardButton') {
            button.disabled = true;
        }
    });
}

function enableAllButtons() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach((button) => {
        button.disabled = false;
    });
}

function displayMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.id = 'winnerMessage';
    messageDiv.textContent = message;
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '50%';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translate(-50%, -50%)';
    messageDiv.style.fontSize = '32px';
    messageDiv.style.fontWeight = 'bold';
    messageDiv.style.color = '#000';
    messageDiv.style.backgroundColor = '#fff';
    messageDiv.style.padding = '20px';
    messageDiv.style.border = '3px solid #000';
    messageDiv.style.borderRadius = '10px';
    messageDiv.style.textAlign = 'center';
    messageDiv.style.zIndex = '1000';

    document.body.appendChild(messageDiv);

    setTimeout(() => {
        if (messageDiv && messageDiv.parentNode) {
            document.body.removeChild(messageDiv);
        }
    }, 2000);
}

// ========== BINDING ==========
window.onload = function () {
    try {
        // Left Team (Hong, red)
        const leftTeam = document.querySelector('.left-team');
        if (leftTeam) {
            const leftButtons = leftTeam.querySelectorAll('button');
            if (leftButtons[0]) leftButtons[0].onclick = () => openPointSlide('add', 'red'); // Add Points
            if (leftButtons[1]) leftButtons[1].onclick = () => openPointSlide('subtract', 'red'); // Remove Points
            if (leftButtons[2]) leftButtons[2].onclick = () => declareRoundWinner('hong'); // Declare Round Winner
            if (leftButtons[3]) leftButtons[3].onclick = () => declareMatchWinner('hong'); // Declare Match Winner
            if (leftButtons[4]) leftButtons[4].onclick = () => medicalTimeout('red'); // Medical Timeout
        }

        // Right Team (Chong, blue)
        const rightTeam = document.querySelector('.right-team');
        if (rightTeam) {
            const rightButtons = rightTeam.querySelectorAll('button');
            if (rightButtons[0]) rightButtons[0].onclick = () => openPointSlide('add', 'blue'); // Add Points
            if (rightButtons[1]) rightButtons[1].onclick = () => openPointSlide('subtract', 'blue'); // Remove Points
            if (rightButtons[2]) rightButtons[2].onclick = () => declareRoundWinner('chong'); // Declare Round Winner
            if (rightButtons[3]) rightButtons[3].onclick = () => declareMatchWinner('chong'); // Declare Match Winner
            if (rightButtons[4]) rightButtons[4].onclick = () => medicalTimeout('blue'); // Medical Timeout
        }

        // Gam-Jeom Controls
        const gamjeomLeft = document.querySelector('.gamjeom-container-left');
        if (gamjeomLeft) {
            gamjeomLeft.children[1].onclick = () => addGamJeom('hong');
            gamjeomLeft.children[2].onclick = () => subtractGamJeom('hong');
        }
        const gamjeomRight = document.querySelector('.gamjeom-container-right');
        if (gamjeomRight) {
            gamjeomRight.children[1].onclick = () => addGamJeom('chong');
            gamjeomRight.children[2].onclick = () => subtractGamJeom('chong');
        }        // Timer Controls
        const playPauseButton = document.getElementById('playPauseButton');
        if (playPauseButton) playPauseButton.onclick = toggleTimer;
        const resetTimerButton = document.getElementById('resetTimerButton');
        if (resetTimerButton) resetTimerButton.onclick = resetTimer;

        // Edit Scoreboard
        const editScoreboardButton = document.getElementById('editScoreboardButton');
        if (editScoreboardButton) {
            editScoreboardButton.addEventListener('click', openEditScoreboardSlide);
        }

        // Reset and New Match
        const resetScoresButton = document.querySelector('.reset-scores-button');
        if (resetScoresButton) resetScoresButton.onclick = resetScores;
        const newMatchButton = document.querySelector('.new-match-button');
        if (newMatchButton) newMatchButton.onclick = newMatch;

        // Point Slide Buttons
        const pointButtonsContainer = document.querySelector('.point-buttons');
        if (pointButtonsContainer) {
            const pointButtons = pointButtonsContainer.children;
            for (let i = 0; i < pointButtons.length; i++) {
                pointButtons[i].onclick = () => adjustPoints(i + 1);
            }
        }
        const closeSlideButton = document.querySelector('.close-slide');
        if (closeSlideButton) closeSlideButton.onclick = closePointSlide;

        // Stop Timeout
        const stopTimeoutButton = document.getElementById('stopTimeoutButton');
        if (stopTimeoutButton) stopTimeoutButton.onclick = stopMedicalTimeout;

        // Add settings input listeners
        addSettingsListeners();

        updateCourtNumberDisplay();
        updateDisplay();
        updateTimerDisplay();
        updateTimerInputs();
    } catch (error) {
        console.error("Error setting up event listeners:", error);
    }
}
