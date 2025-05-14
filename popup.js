document.addEventListener('DOMContentLoaded', initializeApp);

const TRIAL_DAYS = 7;
const TOTAL_DAYS = 90;
const STRIPE_LINK = "https://buy.stripe.com/7sI3fg97N5F5bxC9AF"; // Replace with your actual Stripe link

const dailyContacts = Array(TOTAL_DAYS).fill(0);
const dailyAppointments = Array(TOTAL_DAYS).fill(0);

async function initializeApp() {
    try {
        setupEventListeners();
        loadDefaultIcon();
        setupRealTimeValidation();
        await loadSavedData();
        initializeTrackingGrid();
        updateProgressDisplay();
        await checkSubscriptionStatus();
        console.log("App initialized successfully.");
    } catch (error) {
        console.error("Error initializing app:", error);
        showError("Failed to initialize the application. Please try reloading.");
    }
}

function setupEventListeners() {
    const eventMap = {
        'sendEmailButton': sendEmail,
        'printButton': printProgress,
        'downloadDataBtn': downloadData,
        'clearDataBtn': clearData
    };

    Object.entries(eventMap).forEach(([id, handler]) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', handler);
        } else {
            console.warn(`Element with id '${id}' not found`);
        }
    });
}

function loadDefaultIcon() {
    const iconElement = document.getElementById('appIcon');
    if (iconElement) {
        iconElement.src = './icons/icon128.png';
        iconElement.alt = 'Real Estate Sales Quest Icon';
    } else {
        console.warn("App icon element not found");
    }
}

function setupRealTimeValidation() {
    const fieldsToValidate = [
        'title', 'description', 'address', 'listPrice', 'livingSpace', 'lotSize',
        'bedrooms', 'bathrooms', 'agentName', 'agentEmail', 'agentNumber', 'agentDRE',
        'propertyWebsite'
    ];

    fieldsToValidate.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            element.addEventListener('input', () => validateField(element));
        }
    });
}

function validateField(element) {
    const isValid = element.checkValidity();
    element.classList.toggle('invalid', !isValid);
    element.setAttribute('aria-invalid', !isValid);

    if (isValid) {
        clearFieldError(element);
    } else {
        showFieldError(element, element.validationMessage);
    }

    if (['agentNumber', 'agentDRE'].includes(element.id)) {
        element.value = element.value.replace(/\D/g, '');
    }
}

function clearFieldError(element) {
    const errorElement = document.getElementById(`${element.id}-error`);
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

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

function initializeTrackingGrid() {
    const contactGridContainer = document.getElementById('contactGrid');
    const appointmentGridContainer = document.getElementById('appointmentGrid');

    if (!contactGridContainer || !appointmentGridContainer) {
        console.error("Grid containers not found");
        return;
    }

    contactGridContainer.innerHTML = '';
    appointmentGridContainer.innerHTML = '';

    dailyContacts.forEach((count, index) => createAndAppendTile('contact', count, index, contactGridContainer));
    dailyAppointments.forEach((count, index) => createAndAppendTile('appointment', count, index, appointmentGridContainer));

    updateTotals();
}

function createAndAppendTile(type, count, index, container) {
    const tile = createTile(type, count);
    tile.addEventListener('click', () => logDailyCount(tile, index, type));
    container.appendChild(tile);
}

function createTile(type, count) {
    const tile = document.createElement('div');
    tile.className = `tile ${type}-tile`;
    tile.textContent = count || '';
    tile.setAttribute('role', 'button');
    tile.tabIndex = 0;
    updateTileColor(tile, count, type);
    return tile;
}

function logDailyCount(tile, index, type) {
    const dailyArray = type === 'contact' ? dailyContacts : dailyAppointments;
    const count = promptForCount(type, dailyArray[index]);
    if (count !== null) {
        dailyArray[index] = count;
        updateTile(tile, count, type);
        saveData();
        updateTotals();
        updateProgressDisplay();
    }
}

function promptForCount(type, currentCount) {
    const input = prompt(`Enter the number of ${type}s:`, currentCount);
    if (input === null) return null;
    const count = parseInt(input, 10);
    if (isNaN(count) || count < 0) {
        alert("Please enter a valid non-negative number.");
        return null;
    }
    return count;
}

function updateTile(tile, count, type) {
    tile.textContent = count || '';
    tile.setAttribute('aria-label', `${type}: ${count}`);
    updateTileColor(tile, count, type);
}

function updateTileColor(tile, count, type) {
    const baseColor = type === 'appointment' ? "#FFC0CB" : "#FFD700";
    const intensity = Math.min(count / 5, 1);
    tile.style.backgroundColor = count > 0 ? `rgba(${hexToRgb(baseColor)}, ${intensity})` : "#E6E6FA";
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
}

function updateTotals() {
    const contactTotal = dailyContacts.reduce((sum, count) => sum + count, 0);
    const appointmentTotal = dailyAppointments.reduce((sum, count) => sum + count, 0);
    updateTotalDisplay('contactTotal', contactTotal, 'Contacts');
    updateTotalDisplay('appointmentTotal', appointmentTotal, 'Appointments');
}

function updateTotalDisplay(elementId, total, label) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = `Total ${label}: ${total}`;
        element.setAttribute('aria-label', `Total ${label}: ${total}`);
    } else {
        console.warn(`Total display element not found: ${elementId}`);
    }
}

function saveData() {
    const currentDate = new Date().toISOString();
    chrome.storage.sync.set({ dailyContacts, dailyAppointments, lastSaveDate: currentDate }, () => {
        if (chrome.runtime.lastError) {
            console.error("Error saving data:", chrome.runtime.lastError);
            showError("Failed to save data. Please try again.");
        } else {
            showMessage("Data saved successfully!");
        }
    });
}

async function loadSavedData() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['dailyContacts', 'dailyAppointments', 'lastSaveDate'], (data) => {
            if (chrome.runtime.lastError) {
                console.error("Error loading data:", chrome.runtime.lastError);
                reject(new Error("Failed to load saved data"));
            } else {
                if (data.dailyContacts) dailyContacts.splice(0, TOTAL_DAYS, ...data.dailyContacts);
                if (data.dailyAppointments) dailyAppointments.splice(0, TOTAL_DAYS, ...data.dailyAppointments);
                resolve(data.lastSaveDate);
            }
        });
    });
}

function updateProgressDisplay() {
    const progressContainer = document.getElementById('progressDisplay');
    if (!progressContainer) {
        console.error("Progress container not found");
        return;
    }

    progressContainer.innerHTML = '';
    const weeklyProgressElement = document.createElement('div');
    weeklyProgressElement.innerHTML = '<h4>Weekly Progress</h4>';

    const table = document.createElement('table');
    table.innerHTML = `
        <tr>
            <th>Week</th>
            <th>Contacts</th>
            <th>Appointments</th>
        </tr>
    `;

    for (let week = 0; week < 13; week++) {
        const weekContacts = dailyContacts.slice(week * 7, (week + 1) * 7).reduce((sum, count) => sum + count, 0);
        const weekAppointments = dailyAppointments.slice(week * 7, (week + 1) * 7).reduce((sum, count) => sum + count, 0);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>Week ${week + 1}</td>
            <td>${weekContacts}</td>
            <td>${weekAppointments}</td>
        `;
        table.appendChild(row);
    }

    weeklyProgressElement.appendChild(table);
    progressContainer.appendChild(weeklyProgressElement);
}

function showMessage(message, type = 'info') {
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.className = `message ${type}`;
    messageElement.setAttribute('role', 'alert');
    messageElement.setAttribute('aria-live', 'polite');
    document.body.appendChild(messageElement);
    setTimeout(() => messageElement.remove(), 3000);
}

function showError(message) {
    showMessage(message, 'error');
}

function sendEmail() {
    const formData = new FormData(document.getElementById('flyerForm'));
    const flyerData = Object.fromEntries(formData.entries());
    const subject = encodeURIComponent(`New Property Listing: ${flyerData.title}`);
    const body = encodeURIComponent(`
        Property Details:
        Title: ${flyerData.title}
        Description: ${flyerData.description}
        Address: ${flyerData.address}
        Price: ${flyerData.listPrice}
        Living Space: ${flyerData.livingSpace} sq ft
        Lot Size: ${flyerData.lotSize} sq ft
        Bedrooms: ${flyerData.bedrooms}
        Bathrooms: ${flyerData.bathrooms}
        Property Website: ${flyerData.propertyWebsite}
        Agent: ${flyerData.agentName}
        Contact: ${flyerData.agentNumber}
        DRE#: ${flyerData.agentDRE}
    `);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=&su=${subject}&body=${body}`;
    window.open(gmailUrl, '_blank');
}

function printProgress() {
    const printWindow = window.open('', '_blank');
    const contactTotal = dailyContacts.reduce((sum, count) => sum + count, 0);
    const appointmentTotal = dailyAppointments.reduce((sum, count) => sum + count, 0);

    const printContent = `
        <html>
            <head>
                <title>90-Day Sales Progress Report</title>
                <style>
                    body { font-family: Arial, sans-serif; }
                    table { border-collapse: collapse; width: 100%; }
                    th, td { border: 1px solid black; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                </style>
            </head>
            <body>
                <h1>90-Day Sales Progress Report</h1>
                <h2>Summary</h2>
                <p>Total Contacts: ${contactTotal}</p>
                <p>Total Appointments: ${appointmentTotal}</p>
                <h2>Daily Breakdown</h2>
                <table>
                    <tr>
                        <th>Day</th>
                        <th>Contacts</th>
                        <th>Appointments</th>
                    </tr>
                    ${dailyContacts.map((contacts, index) => `
                        <tr>
                            <td>Day ${index + 1}</td>
                            <td>${contacts}</td>
                            <td>${dailyAppointments[index]}</td>
                        </tr>
                    `).join('')}
                </table>
            </body>
        </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

function downloadData() {
    const data = { contacts: dailyContacts, appointments: dailyAppointments };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "sales_quest_data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function clearData() {
    if (confirm('Are you sure you want to clear all data and restart?')) {
        dailyContacts.fill(0);
        dailyAppointments.fill(0);
        saveData();
        initializeTrackingGrid();
        updateProgressDisplay();
        showMessage("Data cleared successfully!");
    }
}

async function checkSubscriptionStatus() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['isPremium', 'subscriptionStartDate'], (data) => {
            if (data.isPremium) {
                unlockFullFunctionality();
            } else {
                checkTrialPeriod();
            }
            resolve();
        });
    });
}

function checkTrialPeriod() {
    const trialStartDate = localStorage.getItem('trialStartDate');
    const currentDate = new Date();

    if (!trialStartDate) {
        localStorage.setItem('trialStartDate', currentDate.toISOString());
        showMessage("Your 7-day trial has started!", "info");
        return;
    }

    const trialEnd = new Date(trialStartDate);
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

    if (currentDate > trialEnd) {
        showStripePopup();
    } else {
        const daysLeft = Math.ceil((trialEnd - currentDate) / (1000 * 60 * 60 * 24));
        showMessage(`Your trial period ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Enjoy!`, "info");
    }
}

function showStripePopup() {
    const stripeLink = "YOUR_STRIPE_LINK_HERE"; // Replace with your actual Stripe link
    const shouldSubscribe = confirm("Your 7-day trial has ended. Would you like to subscribe to the full version?");
    if (shouldSubscribe) {
        window.open(stripeLink, '_blank');
    } else {
        showMessage("You're now using the limited version. Subscribe anytime to access.", "warning");
        limitFunctionality();
    }
}

function limitFunctionality() {
    console.log("Limiting functionality for non-premium users");
    document.getElementById('downloadDataBtn').disabled = true;
    document.getElementById('printButton').disabled = true;
    // Add more limitations as needed
}

function unlockFullFunctionality() {
    console.log("Unlocking full functionality for premium users");
    document.getElementById('downloadDataBtn').disabled = false;
    document.getElementById('printButton').disabled = false;
    // Add more unlocks as needed
}

function sendEmail() {
    const formData = new FormData(document.getElementById('flyerForm'));
    const flyerData = Object.fromEntries(formData.entries());
    const subject = encodeURIComponent(`New Property Listing: ${flyerData.title}`);
    const body = encodeURIComponent(`
        Property Details:
        Title: ${flyerData.title}
        Description: ${flyerData.description}
        Address: ${flyerData.address}
        Price: ${flyerData.listPrice}
        Living Space: ${flyerData.livingSpace} sq ft
        Lot Size: ${flyerData.lotSize} sq ft
        Bedrooms: ${flyerData.bedrooms}
        Bathrooms: ${flyerData.bathrooms}
        Property Website: ${flyerData.propertyWebsite}
        Agent: ${flyerData.agentName}
        Contact: ${flyerData.agentNumber}
        DRE#: ${flyerData.agentDRE}
    `);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=&su=${subject}&body=${body}`;
    window.open(gmailUrl, '_blank');
}

function printProgress() {
    const printWindow = window.open('', '_blank');
    const contactTotal = dailyContacts.reduce((sum, count) => sum + count, 0);
    const appointmentTotal = dailyAppointments.reduce((sum, count) => sum + count, 0);

    const printContent = `
        <html>
            <head>
                <title>90-Day Sales Progress Report</title>
                <style>
                    body { font-family: Arial, sans-serif; }
                    table { border-collapse: collapse; width: 100%; }
                    th, td { border: 1px solid black; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                </style>
            </head>
            <body>
                <h1>90-Day Sales Progress Report</h1>
                <h2>Summary</h2>
                <p>Total Contacts: ${contactTotal}</p>
                <p>Total Appointments: ${appointmentTotal}</p>
                <h2>Daily Breakdown</h2>
                <table>
                    <tr>
                        <th>Day</th>
                        <th>Contacts</th>
                        <th>Appointments</th>
                    </tr>
                    ${dailyContacts.map((contacts, index) => `
                        <tr>
                            <td>Day ${index + 1}</td>
                            <td>${contacts}</td>
                            <td>${dailyAppointments[index]}</td>
                        </tr>
                    `).join('')}
                </table>
            </body>
        </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

function downloadData() {
    const data = { contacts: dailyContacts, appointments: dailyAppointments };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "sales_quest_data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function clearData() {
    if (confirm('Are you sure you want to clear all data and restart?')) {
        dailyContacts.fill(0);
        dailyAppointments.fill(0);
        saveData();
        initializeTrackingGrid();
        updateProgressDisplay();
        showMessage("Data cleared successfully!");
    }
}

// Make sure to have this at the end of your file
document.addEventListener('DOMContentLoaded', initializeApp);

console.log("popup.js loaded successfully");