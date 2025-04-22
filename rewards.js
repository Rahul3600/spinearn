// Load user rewards
function loadUserRewards() {
    const user = auth.currentUser;
    if (!user) return;
    
    const rewardsContainer = document.getElementById('rewardsContainer');
    
    // Show loading state
    rewardsContainer.innerHTML = '<div class="loading-rewards">Loading rewards...</div>';
    
    db.collection('users').doc(user.uid).collection('rewards')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                // No rewards yet
                rewardsContainer.innerHTML = `
                    <div class="empty-rewards">
                        <i class="fas fa-gift"></i>
                        <p>Spin the wheel to earn rewards!</p>
                    </div>
                `;
                return;
            }
            
            // Clear container
            rewardsContainer.innerHTML = '';
            
            // Add each reward
            querySnapshot.forEach((doc) => {
                const reward = doc.data();
                const timestamp = reward.timestamp ? reward.timestamp.toDate() : new Date();
                const formattedDate = formatDate(timestamp);
                
                let rewardIcon, rewardTitle, rewardDescription;
                
                if (reward.type === 'points') {
                    rewardIcon = 'fa-star';
                    rewardTitle = `${reward.amount} Points`;
                    rewardDescription = 'Earned from spinning the wheel';
                } else {
                    rewardIcon = 'fa-gift';
                    rewardTitle = 'Special Reward';
                    rewardDescription = 'A special reward for you';
                }
                
                const rewardElement = document.createElement('div');
                rewardElement.className = 'reward-item';
                rewardElement.innerHTML = `
                    <div class="reward-info">
                        <div class="reward-icon">
                            <i class="fas ${rewardIcon}"></i>
                        </div>
                        <div class="reward-details">
                            <h3>${rewardTitle}</h3>
                            <p>${rewardDescription}</p>
                        </div>
                    </div>
                    <div class="reward-date">${formattedDate}</div>
                `;
                
                rewardsContainer.appendChild(rewardElement);
            });
        })
        .catch((error) => {
            console.error("Error loading rewards:", error);
            rewardsContainer.innerHTML = `
                <div class="error-message">
                    <p>Error loading rewards. Please try again.</p>
                </div>
            `;
        });
}

// Format date for display
function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    
    // If less than a day, show relative time
    if (diff < 24 * 60 * 60 * 1000) {
        if (diff < 60 * 1000) {
            return 'Just now';
        } else if (diff < 60 * 60 * 1000) {
            const minutes = Math.floor(diff / (60 * 1000));
            return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        } else {
            const hours = Math.floor(diff / (60 * 60 * 1000));
            return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        }
    } else {
        // Otherwise show the date
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
}

// Refresh rewards button
document.getElementById('refreshRewardsBtn').addEventListener('click', () => {
    loadUserRewards();
    
    // Add animation to the refresh button
    const refreshBtn = document.getElementById('refreshRewardsBtn');
    refreshBtn.classList.add('spinning');
    
    // Remove animation after 1 second
    setTimeout(() => {
        refreshBtn.classList.remove('spinning');
    }, 1000);
});
