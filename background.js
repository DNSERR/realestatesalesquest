// Listener for extension installation
chrome.runtime.onInstalled.addListener(() => {
    console.log("Real Estate Sales Quest extension successfully installed.");
    initializeExtensionData();
});

/**
 * Initializes extension data on installation or update
 */
function initializeExtensionData() {
    chrome.storage.sync.get(['trialStartDate'], (data) => {
        if (!data.trialStartDate) {
            const trialStartDate = new Date().toISOString();
            chrome.storage.sync.set({ trialStartDate }, () => {
                console.log("Trial period initialized:", trialStartDate);
            });
        }
    });
}

/**
 * Message handler for incoming requests from content or popup scripts.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'checkSubscription') {
        checkSubscriptionStatus()
            .then(status => sendResponse(status))
            .catch(error => {
                console.error("Subscription check error:", error.message || error);
                sendResponse({ error: "Subscription check failed" });
            });
        return true; // Keeps the message channel open for async response
    } else {
        console.warn("Unrecognized message type:", request.type);
        sendResponse({ error: "Unrecognized request type" });
    }
});

/**
 * Checks the user's subscription status
 * @returns {Promise<Object>} - An object containing the subscription status
 */
async function checkSubscriptionStatus() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['trialStartDate'], (data) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                const now = new Date();
                const trialStartDate = data.trialStartDate ? new Date(data.trialStartDate) : null;
                const trialDays = 7;
                const trialEnded = trialStartDate && (now - trialStartDate) / (1000 * 60 * 60 * 24) > trialDays;

                resolve({
                    trialEnded: trialEnded,
                    trialDaysLeft: trialStartDate ? Math.max(0, trialDays - Math.floor((now - trialStartDate) / (1000 * 60 * 60 * 24))) : 0
                });
            }
        });
    });
}

console.log("background.js loaded successfully");