document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Auth elements
  const userIcon = document.getElementById("userIcon");
  const loginModal = document.getElementById("loginModal");
  const closeModal = document.getElementById("closeModal");
  const loginButton = document.getElementById("loginButton");
  const logoutButton = document.getElementById("logoutButton");
  const loginForm = document.getElementById("loginForm");
  const loggedInStatus = document.getElementById("loggedInStatus");
  const loginMessage = document.getElementById("loginMessage");
  const loggedInUsername = document.getElementById("loggedInUsername");

  // Auth state
  let authToken = localStorage.getItem("authToken") || null;
  let isAuthenticated = false;

  // Auth functions
  async function checkAuth() {
    if (!authToken) {
      updateUIForAuth(false);
      return;
    }

    try {
      const response = await fetch("/auth/check", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const result = await response.json();

      if (result.authenticated) {
        isAuthenticated = true;
        loggedInUsername.textContent = result.username;
        updateUIForAuth(true);
      } else {
        isAuthenticated = false;
        authToken = null;
        localStorage.removeItem("authToken");
        updateUIForAuth(false);
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      isAuthenticated = false;
      updateUIForAuth(false);
    }
  }

  function updateUIForAuth(authenticated) {
    if (authenticated) {
      userIcon.classList.add("logged-in");
      userIcon.title = "Logged in as teacher";
      loginForm.classList.add("hidden");
      loggedInStatus.classList.remove("hidden");
      signupForm.querySelector("button").disabled = false;
      // Show delete buttons
      document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.style.display = "inline-block";
      });
    } else {
      userIcon.classList.remove("logged-in");
      userIcon.title = "Login";
      loginForm.classList.remove("hidden");
      loggedInStatus.classList.add("hidden");
      signupForm.querySelector("button").disabled = true;
      signupForm.querySelector("button").textContent = "Login Required";
      // Hide delete buttons
      document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.style.display = "none";
      });
    }
  }

  // Modal controls
  userIcon.addEventListener("click", () => {
    loginModal.classList.add("active");
  });

  closeModal.addEventListener("click", () => {
    loginModal.classList.remove("active");
  });

  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.classList.remove("active");
    }
  });

  // Login
  loginButton.addEventListener("click", async () => {
    const username = document.getElementById("teacherUsername").value;
    const password = document.getElementById("teacherPassword").value;

    if (!username || !password) {
      loginMessage.textContent = "Please enter username and password";
      loginMessage.className = "message error";
      loginMessage.classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch(
        `/login?username=${encodeURIComponent(
          username
        )}&password=${encodeURIComponent(password)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        authToken = result.token;
        localStorage.setItem("authToken", authToken);
        isAuthenticated = true;
        loggedInUsername.textContent = result.username;
        loginMessage.textContent = "Login successful!";
        loginMessage.className = "message success";
        loginMessage.classList.remove("hidden");

        setTimeout(() => {
          loginModal.classList.remove("active");
          loginMessage.classList.add("hidden");
          document.getElementById("teacherUsername").value = "";
          document.getElementById("teacherPassword").value = "";
          updateUIForAuth(true);
          fetchActivities(); // Refresh to show delete buttons
        }, 1000);
      } else {
        loginMessage.textContent = result.detail || "Login failed";
        loginMessage.className = "message error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Login failed. Please try again.";
      loginMessage.className = "message error";
      loginMessage.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });

  // Logout
  logoutButton.addEventListener("click", async () => {
    try {
      await fetch("/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
    } catch (error) {
      console.error("Error logging out:", error);
    }

    authToken = null;
    isAuthenticated = false;
    localStorage.removeItem("authToken");
    loginModal.classList.remove("active");
    updateUIForAuth(false);
    fetchActivities(); // Refresh to hide delete buttons
  });

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
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
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    if (!isAuthenticated) {
      messageDiv.textContent = "Please login as a teacher to unregister students";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
      return;
    }

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
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
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

    if (!isAuthenticated) {
      messageDiv.textContent = "Please login as a teacher to register students";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
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
  checkAuth();
  fetchActivities();
});
