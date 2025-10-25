// Tie Breaker Data
let tieBreakerData = {
    hong: { rounds: [ [], [], [] ] },
    chong: { rounds: [ [], [], [] ] }
};

// Function to store points for tie breaker
function storeTieBreakerPoints(team, points, image) {
    if (currentRound <= totalRounds) {
        const roundIndex = currentRound - 1;
        if (team === 'hong') {
            tieBreakerData.hong.rounds[roundIndex].push({ points, image });
        } else if (team === 'chong') {
            tieBreakerData.chong.rounds[roundIndex].push({ points, image });
        }
    }
}

// Function to clear tie breaker data for a new match
function clearTieBreakerData() {
    tieBreakerData = {
        hong: { rounds: [ [], [], [] ] },
        chong: { rounds: [ [], [], [] ] }
    };
}

// Function to show tie breaker details
function showTieBreaker() {
    // Implementation for displaying tie breaker data will be added here
    alert('Tie Breaker functionality is under development.');
}
