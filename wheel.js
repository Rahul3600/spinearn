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
    const winPrize = document.
