document.addEventListener('DOMContentLoaded', function() {
    const apiKeyForm = document.getElementById('api-key-form');
    const themeForm = document.getElementById('theme-form');
    const toastSuccess = document.getElementById('toast-success');
    const toastDanger = document.getElementById('toast-danger');

    apiKeyForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent default form submission

        // Get the API key from the input field
        const apiKeyInput = document.getElementById('api-key');
        const apiKey = apiKeyInput.value;
        applyAPIKey(apiKey);
        // Simulate success/failure based on the value of the API key
        if (apiKey.trim() !== '') {
            // Show success toast
            showToast(toastSuccess);
            hideToast(toastDanger);
        } else {
            // Show failure toast
            showToast(toastDanger);
            hideToast(toastSuccess);
        }
    });

    themeForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent default form submission

        // Get the selected theme from the select input
        const themeSelect = document.getElementById('appearance');
        const selectedTheme = themeSelect.value;

        // Apply the selected theme
        applyTheme(selectedTheme);

        // Show success toast
        showToast(toastSuccess);
        hideToast(toastDanger);
    });

    // Function to apply selected API key
    function applyAPIKey(apiKey) {
        // Save the selected API key to local storage
        localStorage.setItem('apiKey', apiKey);
        // Implement API key application logic here...
    }

    // Function to apply selected theme
    function applyTheme(theme) {
        // Save the selected theme to local storage
        localStorage.setItem('theme', theme);
        // Implement theme application logic here...
    }

    // Function to show toast
    function showToast(toast) {
        toast.style.display = 'flex'; // Set display property to flex
        toast.classList.remove('opacity-0'); // Remove TailwindCSS opacity class
    }

    // Function to hide toast
    function hideToast(toast) {
        toast.style.display = 'none'; // Hide toast
    }
});