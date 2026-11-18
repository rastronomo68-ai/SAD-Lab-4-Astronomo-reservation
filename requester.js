
document.addEventListener("DOMContentLoaded", function () {

    const role = localStorage.getItem("userRole");
    const name = localStorage.getItem("userName");

    if (role !== "Requester") {
        alert("Access denied.");
        window.location.href = "index.html";
        return;
    }

    const welcomeMessage = document.getElementById("welcomeMessage");

    if (welcomeMessage) {
        welcomeMessage.textContent = "Welcome, " + name + "!";
    }

    // Get HTML elements
    const facilitySelect = document.getElementById("facilitySelect");
    const reservationForm = document.getElementById("reservationForm");
    const reservationDate = document.getElementById("reservationDate");
    const startTimeInput = document.getElementById("startTime");
    const endTimeInput = document.getElementById("endTime");
    const purposeInput = document.getElementById("purpose");

    const reservationsTableBody =
        document.getElementById("reservationsTableBody");

    let currentUser = null;

    // Get current local date in YYYY-MM-DD format
    function getLocalDate() {
        const today = new Date();

        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    // Convert time to PostgreSQL TIME format
    function formatTimeOnly(time) {
        return time.length === 5 ? `${time}:00` : time;
    }

    // Initialize page
    async function initializePage() {

        const { data: { user }, error } =
            await supabaseClient.auth.getUser();

        if (error || !user) {
            alert("Please log in again.");
            window.location.href = "index.html";
            return;
        }

        currentUser = user;

        if (reservationDate) {
            reservationDate.min = getLocalDate();
        }

        await loadFacilities();
        await loadReservations();
    }

    // Load available facilities
    
async function loadReservations() {

    const { data, error } = await supabaseClient
        .from("reservations")
        .select(`
            id,
            reservation_date,
            purpose,
            start_time,
            end_time,
            status,
            facilities (
                facility_name
            )
        `)
        .eq("requester_id", currentUser.id)
        .order("reservation_date", { ascending: false });

    if (error) {
        console.error("Reservation loading error:", error);
        console.error("Error details:", error.message);
        return;
    }

    if (!reservationsTableBody) return;

    reservationsTableBody.innerHTML = "";

    if (!data || data.length === 0) {
        reservationsTableBody.innerHTML =
            '<tr><td colspan="7">No reservations found.</td></tr>';
        return;
    }

    data.forEach(function (reservation) {

        const row = document.createElement("tr");

        const values = [
            reservation.reservation_date || "",
            reservation.facilities?.facility_name || "Unknown Facility",
            reservation.purpose || "",
            reservation.start_time || "",
            reservation.end_time || "",
            reservation.status || ""
        ];

        values.forEach(function (value) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        const actionCell = document.createElement("td");

        if (reservation.status === "Pending") {

            const cancelButton = document.createElement("button");

            cancelButton.type = "button";
            cancelButton.textContent = "Cancel";

            cancelButton.addEventListener("click", function () {
                cancelReservation(reservation.id);
            });

            actionCell.appendChild(cancelButton);

        } else {
            actionCell.textContent = "No action";
        }

        row.appendChild(actionCell);
        reservationsTableBody.appendChild(row);
    });
}

    // Check facility availability
    async function checkFacilityAvailability(
        facilityId,
        selectedDate,
        startTime,
        endTime
    ) {

        const start = formatTimeOnly(startTime);
        const end = formatTimeOnly(endTime);

        const { data, error } = await supabaseClient
            .from("reservations")
            .select("id")
            .eq("facility_id", facilityId)
            .eq("reservation_date", selectedDate)
            .in("status", [
                "Pending",
                "Approved",
                "Scheduled",
                "In Use"
            ])
            .lt("start_time", end)
            .gt("end_time", start);

        if (error) {
            console.error("Availability check error:", error);
            alert(
                "Unable to check facility availability: " +
                error.message
            );
            return null;
        }

        return data.length === 0;
    }

    // Submit reservation
    async function submitReservation(event) {

        event.preventDefault();

        const facilityId = facilitySelect?.value;
        const selectedDate = reservationDate?.value;
        const startTime = startTimeInput?.value;
        const endTime = endTimeInput?.value;
        const purpose = purposeInput?.value.trim();

        if (
            !facilityId ||
            !selectedDate ||
            !startTime ||
            !endTime ||
            !purpose
        ) {
            alert("Please complete all reservation fields.");
            return;
        }

        if (startTime >= endTime) {
            alert("End time must be later than start time.");
            return;
        }

        // Check if selected date is in the past
        if (selectedDate < getLocalDate()) {
            alert("Please select a future date.");
            return;
        }

        // Check if selected date and time are in the future
        const selectedStart = new Date(
            `${selectedDate}T${startTime}:00`
        );

        if (selectedStart.getTime() <= Date.now()) {
            alert("Please select a future date and time.");
            return;
        }

        // Check availability
        const available = await checkFacilityAvailability(
            facilityId,
            selectedDate,
            startTime,
            endTime
        );

        if (available === null) return;

        if (!available) {
            alert("This facility is already reserved during that time.");
            return;
        }

        // Insert reservation
        const { error } = await supabaseClient
            .from("reservations")
            .insert({
                facility_id: facilityId,
                requester_id: currentUser.id,
                reservation_date: selectedDate,
                purpose: purpose,
                start_time: formatTimeOnly(startTime),
                end_time: formatTimeOnly(endTime),
                status: "Pending"
            });

        if (error) {
            console.error("Reservation submission error:", error);
            alert("Unable to submit reservation: " + error.message);
            return;
        }

        alert("Reservation submitted successfully!");

        reservationForm.reset();

        if (reservationDate) {
            reservationDate.min = getLocalDate();
        }

        await loadReservations();
    }

    // Load reservation history
    async function loadReservations() {

        const { data, error } = await supabaseClient
            .from("reservation_details")
            .select("*")
            .eq("requester_id", currentUser.id)
            .order("start_time", { ascending: false });

        if (error) {
            console.error("Reservation loading error:", error);
            alert("Unable to load reservations: " + error.message);
            return;
        }

        if (!reservationsTableBody) return;

        reservationsTableBody.innerHTML = "";

        if (!data || data.length === 0) {
            reservationsTableBody.innerHTML =
                '<tr><td colspan="7">No reservations found.</td></tr>';
            return;
        }

        data.forEach(function (reservation) {

            const row = document.createElement("tr");

            const values = [
                reservation.facility_name,
                reservation.purpose,
                reservation.start_time,
                reservation.end_time,
                reservation.status
            ];

            values.forEach(function (value) {
                const cell = document.createElement("td");
                cell.textContent = value ?? "";
                row.appendChild(cell);
            });

            const actionCell = document.createElement("td");

            if (reservation.status === "Pending") {

                const cancelButton = document.createElement("button");

                cancelButton.textContent = "Cancel";
                cancelButton.type = "button";

                cancelButton.addEventListener("click", function () {
                    cancelReservation(reservation.id);
                });

                actionCell.appendChild(cancelButton);

            } else {
                actionCell.textContent = "No action";
            }

            row.appendChild(actionCell);
            reservationsTableBody.appendChild(row);
        });
    }

    // Cancel pending reservation
    async function cancelReservation(reservationId) {

        const confirmed = confirm(
            "Are you sure you want to cancel this reservation?"
        );

        if (!confirmed) return;

        const { error } = await supabaseClient
            .from("reservations")
            .update({ status: "Cancelled" })
            .eq("id", reservationId)
            .eq("requester_id", currentUser.id)
            .eq("status", "Pending");

        if (error) {
            console.error("Cancellation error:", error);
            alert("Unable to cancel reservation: " + error.message);
            return;
        }

        alert("Reservation cancelled successfully!");

        await loadReservations();
    }

    // Logout
    async function logout() {

        const confirmed = confirm("Are you sure you want to log out?");

        if (!confirmed) return;

        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            alert("Logout failed: " + error.message);
            return;
        }

        localStorage.removeItem("userRole");
        localStorage.removeItem("userName");

        window.location.href = "index.html";
    }

    // Event listeners
    if (reservationForm) {
        reservationForm.addEventListener(
            "submit",
            submitReservation
        );
    }

    const logoutButton = document.getElementById("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", logout);
    }

    const refreshButton = document.getElementById("refreshButton");

    if (refreshButton) {
        refreshButton.addEventListener("click", loadReservations);
    }

    initializePage();

});
