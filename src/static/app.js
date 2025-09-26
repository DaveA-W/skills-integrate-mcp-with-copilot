document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const categoryFilter = document.getElementById("category-filter");
  const sortFilter = document.getElementById("sort-filter");
  const searchInput = document.getElementById("search-input");
  const availableOnlyCheckbox = document.getElementById("available-only");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  let cachedActivities = {};

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      cachedActivities = activities;

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate category filter
      populateCategoryFilter(activities);

      // Populate activities list
      const entries = Object.entries(activities);
      const filteredSorted = applyFiltersAndSort(entries);

      filteredSorted.forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
      // wire up filters
      [categoryFilter, sortFilter, searchInput, availableOnlyCheckbox].forEach((el) => {
        el.addEventListener("change", () => renderFromCache());
        el.addEventListener("input", () => renderFromCache());
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  function populateCategoryFilter(activities) {
    const categories = new Set();
    Object.values(activities).forEach((a) => {
      if (a.category) categories.add(a.category);
    });

    // Clear existing options except 'All'
    categoryFilter.innerHTML = '<option value="">All</option>';
    Array.from(categories)
      .sort()
      .forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        categoryFilter.appendChild(opt);
      });
  }

  function applyFiltersAndSort(entries) {
    // entries: array of [name, details]
    const search = searchInput.value.trim().toLowerCase();
    const category = categoryFilter.value;
    const availableOnly = availableOnlyCheckbox.checked;
    // filter
    let filtered = entries.filter(([name, details]) => {
      if (category && details.category !== category) return false;
      if (availableOnly) {
        const spotsLeft = details.max_participants - details.participants.length;
        if (spotsLeft <= 0) return false;
      }
      if (search) {
        const hay = `${name} ${details.description} ${details.schedule} ${details.category || ''}`.toLowerCase();
        return hay.includes(search);
      }
      return true;
    });

    // sort
    const sort = sortFilter.value;
    if (sort === "name-asc") {
      filtered.sort((a, b) => a[0].localeCompare(b[0]));
    } else if (sort === "name-desc") {
      filtered.sort((a, b) => b[0].localeCompare(a[0]));
    } else if (sort === "availability") {
      filtered.sort((a, b) => {
        const aSpots = a[1].max_participants - a[1].participants.length;
        const bSpots = b[1].max_participants - b[1].participants.length;
        return bSpots - aSpots;
      });
    }

    return filtered;
  }

  function renderFromCache() {
    if (!cachedActivities) return;
    activitiesList.innerHTML = "";
    const entries = Object.entries(cachedActivities);
    const filteredSorted = applyFiltersAndSort(entries);
    filteredSorted.forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";
      const spotsLeft = details.max_participants - details.participants.length;
      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Category:</strong> ${details.category || '—'}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;
      activitiesList.appendChild(activityCard);
    });

    // Reattach delete handlers
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
