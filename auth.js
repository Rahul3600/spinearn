// Firebase configuration
// Replace with your actual Firebase project config
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get references to auth and firestore
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements for Auth
const authSection = document.getElementById('authSection');
const appSection = document.getElementById('appSection');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginTabBtn = document.getElementById('loginTabBtn');
const signupTabBtn = document.getElementById('signupTabBtn');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');

// Tab switching
loginTabBtn.addEventListener('click', () => {
    loginTabBtn.classList.add('active');
    signupTabBtn.classList.remove('active');
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
});

signupTabBtn.addEventListener('click', () => {
    signupTabBtn.classList.add('active');
    loginTabBtn.classList.remove('active');
    signupForm.style.display = 'block';
    loginForm.style.display = 'none';
});

// Sign up with email and password
signupBtn.addEventListener('click', () => {
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    if (!name || !email || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    // Show loading state
    signupBtn.disabled = true;
    signupBtn.innerHTML = '<span class="loading"></span>';
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Add user to Firestore
            return db.collection('users').doc(userCredential.user.uid).set({
                name: name,
                email: email,
                points: 0,
                spins: 3, // Give 3 free spins to new users
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .catch((error) => {
            alert('Error: ' + error.message);
            // Reset button state
            signupBtn.disabled = false;
            signupBtn.textContent = 'Sign Up';
        });
});

// Login with email and password
loginBtn.addEventListener('click', () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    // Show loading state
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="loading"></span>';
    
    auth.signInWithEmailAndPassword(email, password)
        .catch((error) => {
            alert('Error: ' + error.message);
            // Reset button state
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        });
});

// Login with Google
googleLoginBtn.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    // Show loading state
    googleLoginBtn.disabled = true;
    googleLoginBtn.innerHTML = '<span class="loading"></span> Google';
    
    auth.signInWithPopup(provider)
        .then((result) => {
            // Check if this is a new user
            const isNewUser = result.additionalUserInfo.isNewUser;
            if (isNewUser) {
                // Add new Google user to Firestore
                return db.collection('users').doc(result.user.uid).set({
                    name: result.user.displayName,
                    email: result.user.email,
                    points: 0,
                    spins: 3, // Give 3 free spins to new users
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Update last login for existing users
                return db.collection('users').doc(result.user.uid).update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        })
        .catch((error) => {
            alert('Error: ' + error.message);
            // Reset button state
            googleLoginBtn.disabled = false;
            googleLoginBtn.innerHTML = '<i class="fab fa-google"></i> Google';
        });
});

// Logout
logoutBtn.addEventListener('click', () => {
    auth.signOut();
});

// Check for daily login bonus
function checkDailyLoginBonus(userId) {
    db.collection('users').doc(userId).get()
        .then((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                const lastLogin = userData.lastLogin ? userData.lastLogin.toDate() : null;
                const now = new Date();
                
                // If last login was on a different day, give a bonus spin
                if (lastLogin && 
                    (lastLogin.getDate() !== now.getDate() || 
                     lastLogin.getMonth() !== now.getMonth() || 
                     lastLogin.getFullYear() !== now.getFullYear())) {
                    
                    // Add a bonus spin
                    const newSpins = (userData.spins || 0) + 1;
                    db.collection('users').doc(userId).update({
                        spins: newSpins,
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    })
                    .then(() => {
                        alert('Daily login bonus: +1 spin!');
                        updateUserInfo();
                    });
                } else {
                    // Just update the last login time
                    db.collection('users').doc(userId).update({
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        })
        .catch((error) => {
            console.error("Error checking daily login bonus:", error);
        });
}

// Auth state change listener
auth.onAuthStateChanged((user) => {
    // Reset button states
    loginBtn.disabled = false;
    loginBtn.textContent = 'Login';
    signupBtn.disabled = false;
    signupBtn.textContent = 'Sign Up';
    googleLoginBtn.disabled = false;
    googleLoginBtn.innerHTML = '<i class="fab fa-google"></i> Google';
    
    if (user) {
        // User is signed in
        authSection.style.display = 'none';
        appSection.style.display = 'block';
        
        // Get user data and update UI
        db.collection('users').doc(user.uid).get()
            .then((doc) => {
                if (doc.exists) {
                    const userData = doc.data();
                    userName.textContent = userData.name || 'User';
                    document.getElementById('spinsCount').textContent = userData.spins || 0;
                    document.getElementById('availableSpins').textContent = userData.spins || 0;
                    document.getElementById('pointsCount').textContent = userData.points || 0;
                    
                    // Check for daily login bonus
                    checkDailyLoginBonus(user.uid);
                    
                    // Load user rewards
                    loadUserRewards();
                    
                    // Initialize the wheel
                    initWheel();
                }
            })
            .catch((error) => {
                console.error("Error getting user data:", error);
            });
    } else {
        // User is signed out
        authSection.style.display = 'flex';
        appSection.style.display = 'none';
        
        // Reset forms
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('signupName').value = '';
        document.getElementById('signupEmail').value = '';
        document.getElementById('signupPassword').value = '';
    }
});

// Update user info (spins, points)
function updateUserInfo() {
    const user = auth.currentUser;
    if (user) {
        db.collection('users').doc(user.uid).get()
            .then((doc) => {
                if (doc.exists) {
                    const userData = doc.data();
                    document.getElementById('spinsCount').textContent = userData.spins || 0;
                    document.getElementById('availableSpins').textContent = userData.spins || 0;
                    document.getElementById('pointsCount').textContent = userData.points || 0;
                    
                    // Update spin button state
                    const spinBtn = document.getElementById('spinBtn');
                    if (userData.spins > 0) {
                        spinBtn.disabled = false;
                    } else {
                        spinBtn.disabled = true;
                    }
                }
            })
            .catch((error) => {
                console.error("Error updating user info:", error);
            });
    }
}
