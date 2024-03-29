// Define an array to store table data
let tableData = [];
// Declare variables for timer and status update interval
let timer;
let statusUpdateInterval;
// Toast
const toastSuccess = document.getElementById('toast-success');
const toastDanger = document.getElementById('toast-danger');
// Function to asynchronously load list names from data.json file
async function loadListNames() {
    try {
        // Fetch data.json
        const response = await fetch("data.json");
        // Parse response JSON
        const data = await response.json();
        // Get list select element from DOM
        const listSelect = document.getElementById("list-select");
        // Iterate through data and populate options for list select
        for (const listName in data) {
            const option = document.createElement("option");
            option.value = listName;
            option.textContent = listName;
            listSelect.appendChild(option);
        }
    } catch (error) {
        console.error("Error loading list names:", error);
    }
}

// Function to fetch data from server
async function fetchData() {
    // Get API key from input field
    const apiKey = localStorage.getItem('apiKey');
    // Validate API key
    if (apiKey === "" || apiKey === null) {
        showToast(toastDanger, "No API key");
        displayNoDataMessage();
        return;
    }

    // Get selected list from list select element
    const listSelect = document.getElementById("list-select");
    const selectedList = listSelect.value;

    // Return if no list is selected
    if (!selectedList) {
        return;
    }

    // Disable fetch button and start countdown
    const fetchButton = document.getElementById("fetch-button");
    fetchButton.disabled = true;
    startCountdown();

    // Clear table body and show loading indicator
    const tableBody = document.getElementById("table-body");
    tableBody.innerHTML = "";
    showLoadingIndicator();
    hideDataTable();

    try {
        // Fetch data.json
        const response = await fetch("data.json");
        // Parse response JSON
        const data = await response.json();
        // Get table data for the selected list
        tableData = data[selectedList];
        // If no data, display no data message and return
        if (tableData.length === 0) {
            displayNoDataMessage();
            showToast(toastDanger, "No data - internal server error");
            hideToast(toastSuccess);
            hideLoadingIndicator();
            return;
        }

        // Fetch user data asynchronously for each row
        const userPromises = tableData.map(async (row) => {
            const apiUrl = `https://api.torn.com/user/${row.id}?selections=basic&key=${apiKey}`;
            try {
                const userResponse = await fetch(apiUrl);
                const userData = await userResponse.json();
                // Format user status
                const status = formatStatus(userData.status);
                return {
                    ...row,
                    status
                };
            } catch (error) {
                console.error("Error fetching data:", error);
                showToast(toastDanger, "Error fetching data, incorrect API key or Too Many Requests");
                displayNoDataMessage();
            }
        });

        // Wait for all user data to be fetched
        const usersWithStatus = await Promise.all(userPromises);

        // Sort users based on status
        const sortedUsers = usersWithStatus.sort((a, b) => {
            if (a.status === "Okay" && b.status !== "Okay") return -1;
            if (a.status !== "Okay" && b.status === "Okay") return 1;
            if (a.status === "Okay" && b.status === "Okay") return 0;

            const aRemaining = parseHospitalTime(a.status);
            const bRemaining = parseHospitalTime(b.status);

            return aRemaining - bRemaining;
        });

        // Populate table rows with sorted user data
        sortedUsers.forEach((user, index) => {
            const attackLink = createAttackLink(user.id, user.status);
            const newRow = createTableRow(user, user.status, attackLink, index);
            tableBody.innerHTML += newRow;
        });

        // Hide no data message, display table, and start status update interval
        hideNoDataMessage();
        displayDataTable();

        clearInterval(statusUpdateInterval);
        statusUpdateInterval = setInterval(() => {
            updateStatus();
        }, 1000);

        hideLoadingIndicator();
    } catch (error) {
        console.error("Error fetching data:", error);
        hideLoadingIndicator();
    }
}

// Function to start countdown timer
function startCountdown() {
    const fetchButton = document.getElementById("fetch-button");
    const startTime = Date.now();
    const countdownSeconds = 30;

    clearInterval(timer);
    timer = setInterval(() => {
        const secondsSinceStart = Math.floor((Date.now() - startTime) / 1000);
        const remainingTime = countdownSeconds - secondsSinceStart;

        if (remainingTime <= 0) {
            clearInterval(timer);
            fetchButton.innerHTML = `<span class="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0">Fetch</span>`;
            fetchButton.disabled = false;
        } else {
            fetchButton.innerHTML = `<span class="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0">Fetch (${remainingTime}s)</span>`;
        }
    }, 1000);
}

// Function to parse remaining hospital time from status string
function parseHospitalTime(status) {
    const timeMatch = status.match(/\((\d+)m (\d+)s\)/);
    if (!timeMatch) return Infinity;
    const [_, minutes, seconds] = timeMatch;
    return parseInt(minutes) * 60 + parseInt(seconds);
}

// Function to display no data message
function displayNoDataMessage() {
    const noDataMessage = document.getElementById("no-data-message");
    noDataMessage.classList.remove("hidden");

    const dataTable = document.getElementById("data-table");
    dataTable.classList.add("hidden");

    const apiMessage = document.getElementById("api-message");
    apiMessage.classList.remove("hidden");
}

// Function to hide no data message
function hideNoDataMessage() {
    const noDataMessage = document.getElementById("no-data-message");
    noDataMessage.classList.add("hidden");
}

// Function to display data table
function displayDataTable() {
    const dataTable = document.getElementById("data-table");
    dataTable.classList.remove("hidden");

    const apiMessage = document.getElementById("api-message");
    apiMessage.classList.add("hidden");
}

// Function to format user status
function formatStatus(status) {
    let formattedStatus = status.state;
    if (formattedStatus === "Hospital") {
        const remaining = status.until - Date.now() / 1000;
        const minutes = Math.floor(remaining / 60);
        const seconds = Math.floor(remaining % 60);
        formattedStatus = `Hospitalized (${minutes}m ${seconds}s)`;
    }
    return formattedStatus;
}

// Function to update user status in table
function updateStatus() {
    const rows = document.querySelectorAll("#table-body tr");
    rows.forEach((row) => {
        const statusCell = row.querySelector("td:nth-child(8)");
        const currentStatus = statusCell.textContent.trim();
        const remaining = parseHospitalTime(currentStatus);
        if (remaining === Infinity) return;

        const updatedRemaining = remaining - 1;
        if (updatedRemaining <= 0) {
            statusCell.textContent = "Okay";
            const userId = row.querySelector("a[href*='XID']").textContent.match(/\[(\d+)\]/)[1];
            const attackLinkCell = row.querySelector("td:nth-child(9)");
            attackLinkCell.innerHTML = createAttackLink(userId, "Okay");
        } else {
            const updatedMinutes = Math.floor(updatedRemaining / 60);
            const updatedSeconds = updatedRemaining % 60;
            statusCell.textContent = `Hospitalized (${updatedMinutes}m ${updatedSeconds}s)`;
        }
    });
}



// Show loading indicator
function showLoadingIndicator() {
    const loadingIndicator = document.getElementById("loading-indicator");
    loadingIndicator.classList.remove("hidden");
}

// Hide loading indicator
function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById("loading-indicator");
    loadingIndicator.classList.add("hidden");
}

// Hide data table
function hideDataTable() {
    const dataTable = document.getElementById("data-table");
    dataTable.classList.add("hidden");
}

// Create attack link for a user
function createAttackLink(id, status) {
    const isDisabled = status !== "Okay";
    const disabledClass = isDisabled ? "cursor-not-allowed opacity-30 hover:bg-white" : "hover:bg-gray-50";
    const onClick = isDisabled ? "event.preventDefault();" : "";

    return `<a target="_blank" href="https://www.torn.com/loader2.php?sid=getInAttack&user2ID=${id}" class="inline-flex items-center rounded-md bg-white dark:bg-gray-700 px-2.5 py-1.5 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 ${disabledClass}" onclick="${onClick}">Attack</a>`;
}

// Function to populate API key from URL parameters
function populateAPIKey() {
    const urlParams = new URLSearchParams(window.location.search);
    const apiKey = urlParams.get('apiKey');
    if (apiKey) {
        document.getElementById("api-key").value = apiKey;
    }
}

// Create table row HTML
function createTableRow(row, status, attackLink, index) {
    const isNotFirst = index > 0;
    const borderClass = isNotFirst ? 'border-t border-gray-200' : '';

    return `
    <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
      <td class="relative py-4 pl-4 pr-3 text-sm sm:pl-6 min-w-0 ${borderClass}">
        <div class="font-medium text-gray-900 dark:text-gray-300">
            <a href="https://www.torn.com/profiles.php?XID=${row.id}" target="_blank">
              ${row.name}
              <span class="ml-1 text-blue-600">[${row.id}]</span>
            </a>
        </div>
        <div class="mt-1 flex flex-col text-gray-500 dark:text-gray-300 sm:block lg:hidden">
            <span>Level: ${row.lvl}</span>
            <span>Total: ${row.total}</span>
        </div>
      </td>
      <td class="hidden px-5 py-3 text-sm text-gray-500 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${row.lvl}</td>
      <td class="hidden px-5 py-3 text-sm text-gray-500 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${row.total}</td>
      <td class="hidden px-5 py-3 text-sm text-gray-500 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${row.str}</td>
      <td class="hidden px-5 py-3 text-sm text-gray-500 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${row.def}</td>
      <td class="hidden px-5 py-3 text-sm text-gray-500 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${row.spd}</td>
      <td class="hidden px-5 py-3 text-sm text-gray-500 dark:text-gray-300 lg:table-cell min-w-0 ${borderClass}">${row.dex}</td>
      <td class="px-5 py-3 text-sm text-gray-500 dark:text-gray-300 min-w-0 ${borderClass}">
        <div class="sm:hidden w-40">${status}</div>
        <div class="hidden sm:block w-40">${status}</div>
      </td>
      <td class="relative py-3.5 pl-3 pr-2 text-left text-sm font-medium sm:pr-6 min-w-0 ${borderClass}">
        ${attackLink}
      </td>
    </tr>
  `;
}

// Function to show toast
function showToast(toast, message) {
    toast.style.display = 'flex'; // Set display property to flex
    toast.classList.remove('opacity-0'); // Remove TailwindCSS opacity class

    // Update the text content with the message
    const textElement = toast.querySelector('.toast-message');
    textElement.textContent = message;
}

// Function to hide toast
function hideToast(toast) {
    toast.style.display = 'none'; // Hide toast
}

// Event listener when DOM content is loaded
document.addEventListener("DOMContentLoaded", () => {
    // Populate API key from URL parameters
    populateAPIKey();
    // Load list names
    loadListNames();
});