document.addEventListener('DOMContentLoaded', initializeOptions);

const THEME_COLORS = {
    light: '#ffffff',
    dark: '#333333',
    blue: '#3498db',
    green: '#2ecc71'
};

/**
 * Initializes options page by loading stored settings and setting up event listeners.
 */
async function initializeOptions() {
    try {
        const themeColorSelect = document.getElementById('themeColor');
        const notificationsCheckbox = document.getElementById('notifications');
        const dailyGoalInput = document.getElementById('dailyGoal');
        const saveOptionsButton = document.getElementById('saveOptions');
        const resetOptionsButton = document.getElementById('resetOptions');
        const successMessage = document.getElementById('successMessage');

        await loadStoredOptions(themeColorSelect, notificationsCheckbox, dailyGoalInput);
        setupEventListeners(saveOptionsButton, resetOptionsButton, themeColorSelect, notificationsCheckbox, dailyGoalInput, successMessage);
        setupRealTimeValidation(dailyGoalInput);
        await checkSubscriptionStatus();
        console.log("Options page initialized successfully.");
    } catch (error) {
        console.error("Error initializing options page:", error);
        showError("Failed to initialize options. Please try reloading.");
    }
}

/**
 * Loads stored options and updates UI.
 * @param {HTMLSelectElement} themeColorSelect - Select element for theme color.
 * @param {HTMLInputElement} notificationsCheckbox - Checkbox for notifications.
 * @param {HTMLInputElement} dailyGoalInput - Input for daily goal.
 */
async function loadStoredOptions(themeColorSelect, notificationsCheckbox, dailyGoalInput) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['themeColor', 'notifications', 'dailyGoal'], (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error("Failed to load stored options"));
            } else {
                themeColorSelect.value = result.themeColor || 'light';
                notificationsCheckbox.checked = result.notifications !== false;
                dailyGoalInput.value = result.dailyGoal || 5;
                updateThemePreview(themeColorSelect.value);
                resolve();
            }
        });
    });
}

/**
 * Sets up event listeners for options page elements.
 * @param {HTMLButtonElement} saveButton - Button to save options.
 * @param {HTMLButtonElement} resetButton - Button to reset options.
 * @param {HTMLSelectElement} themeColorSelect - Select element for theme color.
 * @param {HTMLInputElement} notificationsCheckbox - Checkbox for notifications.
 * @param {HTMLInputElement} dailyGoalInput - Input for daily goal.
 * @param {HTMLElement} successMessage - Element to display success message.
 */
function setupEventListeners(saveButton, resetButton, themeColorSelect, notificationsCheckbox, dailyGoalInput, successMessage) {
    saveButton.addEventListener('click', () => saveOptions(themeColorSelect, notificationsCheckbox, dailyGoalInput, successMessage));
    resetButton.addEventListener('click', () => resetOptions(themeColorSelect, notificationsCheckbox, dailyGoalInput, successMessage));
    themeColorSelect.addEventListener('change', () => updateThemePreview(themeColorSelect.value));
}

/**
 * Saves options to Chrome storage.
 * @param {HTMLSelectElement} themeColorSelect - Select element for theme color.
 * @param {HTMLInputElement} notificationsCheckbox - Checkbox for notifications.
 * @param {HTMLInputElement} dailyGoalInput - Input for daily goal.
 * @param {HTMLElement} successMessage - Element to display success message.
 */
function saveOptions(themeColorSelect, notificationsCheckbox, dailyGoalInput, successMessage) {
    const optionsToSave = {
        themeColor: themeColorSelect.value,
        notifications: notificationsCheckbox.checked,
        dailyGoal: parseInt(dailyGoalInput.value, 10)
    };

    chrome.storage.sync.set(optionsToSave, () => {
        if (chrome.runtime.lastError) {
            showError("Failed to save options. Please try again.");
        } else {
            showSuccessMessage(successMessage);
            updateThemePreview(themeColorSelect.value);
        }
    });
}

/**
 * Resets options to default values.
 * @param {HTMLSelectElement} themeColorSelect - Select element for theme color.
 * @param {HTMLInputElement} notificationsCheckbox - Checkbox for notifications.
 * @param {HTMLInputElement} dailyGoalInput - Input for daily goal.
 * @param {HTMLElement} successMessage - Element to display success message.
 */
function resetOptions(themeColorSelect, notificationsCheckbox, dailyGoalInput, successMessage) {
    themeColorSelect.value = 'light';
    notificationsCheckbox.checked = true;
    dailyGoalInput.value = 5;
    updateThemePreview('light');
    saveOptions(themeColorSelect, notificationsCheckbox, dailyGoalInput, successMessage);
}

/**
 * Updates the theme preview based on selected color.
 * @param {string} color - The selected theme color.
 */
function updateThemePreview(color) {
    const previewElement = document.getElementById('themePreview');
    previewElement.style.backgroundColor = THEME_COLORS[color];
    previewElement.style.color = color === 'light' ? '#000000' : '#ffffff';
    previewElement.textContent = `Theme Preview: ${color.charAt(0).toUpperCase() + color.slice(1)}`;
}

/**
 * Displays a temporary success message after saving options.
 * @param {HTMLElement} successMessage - Element to display the success message.
 */
function showSuccessMessage(successMessage) {
    successMessage.style.display = 'block';
    successMessage.setAttribute('aria-hidden', 'false');
    setTimeout(() => {
        successMessage.style.display = 'none';
        successMessage.setAttribute('aria-hidden', 'true');
    }, 2000);
}

/**
 * Displays an error message.
 * @param {string} message - The error message to display.
 */
function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.textContent = message;
    errorElement.className = 'error-message';
    errorElement.setAttribute('role', 'alert');
    document.body.appendChild(errorElement);
    setTimeout(() => errorElement.remove(), 3000);
}

/**
 * Sets up real-time validation for the daily goal input.
 * @param {HTMLInputElement} dailyGoalInput - Input for daily goal.
 */
function setupRealTimeValidation(dailyGoalInput) {
    dailyGoalInput.addEventListener('input', () => validateField(dailyGoalInput));
}

/**
 * Validates a field and shows/hides error messages.
 * @param {HTMLInputElement} element - The input element to validate.
 */
function validateField(element) {
    const isValid = element.checkValidity();
    element.classList.toggle('invalid', !isValid);
    element.setAttribute('aria-invalid', !isValid);
    isValid ? clearFieldError(element) : showFieldError(element, element.validationMessage);
}

/**
 * Clears the error message for a field.
 * @param {HTMLInputElement} element - The input element to clear error for.
 */
function clearFieldError(element) {
    const errorElement = document.getElementById(`${element.id}-error`);
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

/**
 * Shows an error message for a field.
 * @param {HTMLInputElement} element - The input element to show error for.
 * @param {string} message - The error message to display.
 */
function showFieldError(element, message) {
    let errorElement = document.getElementById(`${element.id}-error`);
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = `${element.id}-error`;
        errorElement.className = 'error-message';
        element.parentNode.insertBefore(errorElement, element.nextSibling);
    }
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

/**
 * Checks the subscription status and updates UI accordingly.
 */
async function checkSubscriptionStatus() {
    return new Promise((resolve) => {
        chrome.storage.sync.get('isPremium', (data) => {
            if (data.isPremium) {
                unlockPremiumOptions();
            } else {
                limitOptions();
            }
            resolve();
        });
    });
}

/**
 * Unlocks premium options for subscribed users.
 */
function unlockPremiumOptions() {
    console.log("Unlocking premium options");
    // Enable premium-only options here
    document.getElementById('premiumFeatures').style.display = 'block';
}

/**
 * Limits options for non-premium users.
 */
function limitOptions() {
    console.log("Limiting options for non-premium users");
    // Disable or hide premium-only options here
    document.getElementById('premiumFeatures').style.display = 'none';
}

console.log("options.js loaded successfully");