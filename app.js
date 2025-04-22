// Main app initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('Spin & Win App initialized');
    
    // Check for URL parameters (for referrals)
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    
    if (refParam) {
        // Store the referral ID in localStorage
        localStorage.setItem('referralId', refParam);
        console.log('Referral detected:', refParam);
    }
    
    // Process referral when user signs up
    auth.onAuthStateChanged((user) => {
        if (user) {
            const referralId = localStorage.getItem('referralId');
            if (referralId && referralId !== user.uid) {
                // Check if this is a new user
                db.collection('users').doc(user.uid).get()
                    .then((doc) => {
                        if (doc.exists && doc.data().createdAt) {
                            const createdAt = doc.data().createdAt.toDate();
                            const now = new Date();
                            
                            // If account was created less than 5 minutes ago, process the referral
                            if ((now - createdAt) < 5 * 60 * 1000) {
                                processReferral(referralId, user.uid);
                            }
                        }
                    });
                
                // Clear the referral ID
                localStorage.removeItem('referralId');
            }
        }
    });
});

// Process a referral
function processReferral(referrerId, newUserId) {
    // Check if referrer exists
    db.collection('users').doc(referrerId).get()
        .then((doc) => {
            if (doc.exists) {
                // Add 2 spins to the referrer
                db.collection('users').doc(referrerId).update({
                    spins: firebase.firestore.FieldValue.increment(2)
                })
                .then(() => {
                    // Add to referrer's rewards history
                    db.collection('users').doc(referrerId).collection('rewards').add({
                        type: 'referral',
                        amount: 2,
                        referredUser: newUserId,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    console.log('Referral processed successfully');
                })
                .catch((error) => {
                    console.error("Error processing referral:", error);
                });
            }
        })
        .catch((error) => {
            console.error("Error checking referrer:", error);
        });
}

// Add CSS styles for confetti
const style = document.createElement('style');
style.textContent = `
    .confetti {
        position: absolute;
        width: 10px;
        height: 10px;
        background-color: #f00;
        border-radius: 50%;
        animation: fall 5s linear forwards;
        z-index: 1;
    }
    
    @keyframes fall {
        0% {
            transform: translateY(-100px) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(400px) rotate(360deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Download Winwheel.js if not available
if (typeof Winwheel !== 'function') {
    console.log('Winwheel.js not found, downloading...');
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/winwheel@1.0.1/dist/Winwheel.min.js';
    document.head.appendChild(script);
    
    script.onload = () => {
        console.log('Winwheel.js loaded successfully');
        if (auth.currentUser) {
            initWheel();
        }
    };
    
    script.onerror = () => {
        console.error('Failed to load Winwheel.js');
        alert('Failed to load required resources. Please refresh the page.');
    };
}
