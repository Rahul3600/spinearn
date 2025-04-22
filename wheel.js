// Wheel variables
let theWheel;
let wheelSpinning = false;
let audio = new Audio('https://cdn.freesound.org/previews/220/220156_4100837-lq.mp3'); // Tick sound

// Wheel segments (rewards)
const segments = [
    {'fillStyle': '#ECD078', 'text': '10 Points'},
    {'fillStyle': '#D95B43', 'text': '50 Points'},
    {'fillStyle': '#C02942', 'text': '100 Points'},
    {'fillStyle': '#542437', 'text': '150 Points'},
    {'fillStyle': '#53777A', 'text': '200 Points'},
    {'fillStyle': '#ECD078', 'text': '500 Points'},
    {'fillStyle': '#D95B43', 'text': 'Try Again'},
    {'fillStyle': '#C02942', 'text': '1000 Points'}
];

// Initialize the wheel
function initWheel() {
    theWheel = new Winwheel({
        'numSegments': segments.length,
        'outerRadius': 200,
        'textFontSize': 16,
        'textMargin': 10,
        'segments': segments,
        'animation': {
            'type': 'spinToStop',
            'duration': 5,
            'spins': 8,
            'callbackFinished': alertPrize
        },
        'pins': {
            'number': segments.length,
            'fillStyle': 'silver',
            'outerRadius': 5
        }
    });
    
    // Draw the wheel
    theWheel.draw();
    
    // Update spin button state
    updateUserInfo();
}

// Start spinning the wheel
document.getElementById('spinBtn').addEventListener('click', startSpin);

function startSpin() {
    // Ensure user has spins available
    const user = auth.currentUser;
    if (!user) return;
    
    db.collection('users').doc(user.uid).get()
        .then((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                if (userData.spins > 0) {
                    // Deduct a spin
                    db.collection('users').doc(user.uid).update({
                        spins: firebase.firestore.FieldValue.increment(-1)
                    })
                    .then(() => {
                        // Update UI
                        updateUserInfo();
                        
                        // Disable the spin button during spin
                        document.getElementById('spinBtn').disabled = true;
                        
                        // Reset the wheel if it's already spun
                        if (wheelSpinning) {
                            theWheel.stopAnimation(false);
                            theWheel.rotationAngle = 0;
                            theWheel.draw();
                            wheelSpinning = false;
                        }
                        
                        // Start the spin animation
                        theWheel.startAnimation();
                        wheelSpinning = true;
                        
                        // Play the tick sound
                        audio.play();
                    })
                    .catch((error) => {
                        console.error("Error deducting spin:", error);
                        alert("Error: Couldn't deduct spin. Please try again.");
                    });
                } else {
                    alert("You don't have any spins left! Earn more spins to continue.");
                }
            }
        })
        .catch((error) => {
            console.error("Error checking spins:", error);
        });
}

// Process the wheel result
function alertPrize(indicatedSegment) {
    // Stop the tick sound
    audio.pause();
    audio.currentTime = 0;
    
    // Get the prize
    const prize = indicatedSegment.text;
    
    // Show the win modal
    const winModal = document.getElementById('winModal');
    const winPrize = document.getElementById('winPrize');
    
    winPrize.textContent = prize;
    winModal.style.display = 'flex';
    
    // Create confetti effect
    createConfetti();
    
    // Add the reward to the user's account (except for "Try Again")
    if (prize !== 'Try Again') {
        const pointsMatch = prize.match(/(\d+) Points/);
        if (pointsMatch && pointsMatch[1]) {
            const pointsWon = parseInt(pointsMatch[1]);
            addRewardToUser(pointsWon);
        }
    }
    
    // Re-enable the spin button
    document.getElementById('spinBtn').disabled = false;
    wheelSpinning = false;
}

// Add reward to user's account
function addRewardToUser(points) {
    const user = auth.currentUser;
    if (!user) return;
    
    // Update user's points
    db.collection('users').doc(user.uid).update({
        points: firebase.firestore.FieldValue.increment(points)
    })
    .then(() => {
        // Add to rewards history
        db.collection('users').doc(user.uid).collection('rewards').add({
            type: 'points',
            amount: points,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            // Update UI
            updateUserInfo();
            loadUserRewards();
        })
        .catch((error) => {
            console.error("Error adding reward to history:", error);
        });
    })
    .catch((error) => {
        console.error("Error updating user points:", error);
    });
}

// Create confetti effect
function createConfetti() {
    const confettiContainer = document.getElementById('confettiContainer');
    confettiContainer.innerHTML = '';
    
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.animationDelay = Math.random() * 5 + 's';
        confetti.style.backgroundColor = getRandomColor();
        confettiContainer.appendChild(confetti);
    }
}

// Get random color for confetti
function getRandomColor() {
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Close win modal
document.querySelector('#winModal .close-btn').addEventListener('click', () => {
    document.getElementById('winModal').style.display = 'none';
});

// Claim reward button
document.getElementById('claimRewardBtn').addEventListener('click', () => {
    document.getElementById('winModal').style.display = 'none';
});

// Earn spins modal
document.getElementById('earnSpinsBtn').addEventListener('click', () => {
    document.getElementById('earnSpinsModal').style.display = 'flex';
});

// Close earn spins modal
document.querySelector('#earnSpinsModal .close-btn').addEventListener('click', () => {
    document.getElementById('earnSpinsModal').style.display = 'none';
});

// Daily login claim button
document.getElementById('dailyLoginBtn').addEventListener('click', () => {
    const user = auth.currentUser;
    if (!user) return;
    
    // Check if user already claimed today
    db.collection('users').doc(user.uid).get()
        .then((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                const lastClaim = userData.lastDailyClaim ? userData.lastDailyClaim.toDate() : null;
                const now = new Date();
                
                // If no claim today, give a bonus spin
                if (!lastClaim || 
                    (lastClaim.getDate() !== now.getDate() || 
                     lastClaim.getMonth() !== now.getMonth() || 
                     lastClaim.getFullYear() !== now.getFullYear())) {
                    
                    // Add a bonus spin
                    db.collection('users').doc(user.uid).update({
                        spins: firebase.firestore.FieldValue.increment(1),
                        lastDailyClaim: firebase.firestore.FieldValue.serverTimestamp()
                    })
                    .then(() => {
                        alert('Daily login bonus: +1 spin!');
                        updateUserInfo();
                        document.getElementById('earnSpinsModal').style.display = 'none';
                    });
                } else {
                    alert('You already claimed your daily bonus today. Come back tomorrow!');
                }
            }
        })
        .catch((error) => {
            console.error("Error checking daily claim:", error);
        });
});

// Refer friend button
document.getElementById('referFriendBtn').addEventListener('click', () => {
    // Generate a referral link (in a real app, this would be a unique link)
    const referralLink = window.location.href + '?ref=' + auth.currentUser.uid;
    
    // Copy to clipboard
    navigator.clipboard.writeText(referralLink)
        .then(() => {
            alert('Referral link copied to clipboard! Share it with your friends to earn spins.');
        })
        .catch((error) => {
            console.error('Error copying referral link:', error);
            alert('Could not copy referral link. Please try again.');
        });
});

// Tasks button
document.getElementById('tasksBtn').addEventListener('click', () => {
    alert('Tasks feature coming soon!');
});
