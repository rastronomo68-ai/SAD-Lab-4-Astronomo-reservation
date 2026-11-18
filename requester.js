
/* ========================================
   REQUESTER DASHBOARD
======================================== */

document.addEventListener("DOMContentLoaded", function () {

    const role = localStorage.getItem("userRole");
    const name = localStorage.getItem("userName");

    if (role !== "Requester") {
        alert("Access denied.");
        window.location.href = "index.html";
        return;
    }

    document.getElementById("welcomeMessage").textContent =
        "Welcome, " + (name || "Requester") + "!";

    loadFacilities();
    loadReservations();

    const reservationForm =
        document.getElementById("reservationForm");

    reservationForm.addEventListener("submit", function (event) {
        event.preventDefault();
        submitReservationForm();
    });

    // Set minimum date to today using local date
    const dateInput =
        document.getElementById("reservationDate");

    dateInput.min = getLocalDate();

});


/* ========================================
   LOCAL DATE HELPER
======================================== */

function getLocalDate() {

    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


/* ========================================
   LOAD FACILITIES
======================================== */

async function loadFacilities() {

    const container =
        document.getElementById("facilitiesContainer");

    container.innerHTML = "<p>Loading facilities...</p>";

    try {

        const { data, error } = await supabaseClient
            .from("facilities")
            .select("*")
            .eq("status", "Available")
            .order("facility_name");

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML =
                "<p>No facilities available.</p>";
            return;
        }

        container.innerHTML = "";

        data.forEach(function (facility) {

            const card = document.createElement("div");
            card.className = "card";

            const title = document.createElement("h2");
            title.textContent = facility.facility_name;

            const location = document.createElement("p");
            location.textContent =
                "Location: " + (facility.location || "Not specified");

            const description = document.createElement("p");
            description.textContent = facility.description || "";

            const capacity = document.createElement("p");
            capacity.textContent =
                "Capacity: " + (facility.capacity || 0) + " persons";

            const status = document.createElement("p");
            status.textContent = "Status: " + facility.status;

            const reserveButton = document.createElement("button");
            reserveButton.className = "btn";
            reserveButton.textContent = "Reserve";

            reserveButton.addEventListener("click", function () {
                openReservationForm(
                    facility.id,
                    facility.facility_name
                );
            });

            card.append(
                title,
                location,
                description,
                capacity,
                status,
                document.createElement("br"),
                reserveButton
            );

            container.appendChild(card);

        });

    } catch (error) {

        console.error("Facilities error:", error);

        container.innerHTML =
            "<p>Unable to load facilities: " + error.message + "</p>";

    }

}


/* ========================================
   OPEN RESERVATION FORM
======================================== */

function openReservationForm(facilityId, facilityName) {

    const form =
        document.getElementById("reservationForm");

    form.reset();

    document.getElementById("selectedFacility").value =
        facilityName;

    document.getElementById("selectedFacilityId").value =
        facilityId;

    document.getElementById("reservationDate").min =
        getLocalDate();

    document.getElementById("reservationModal")
        .classList.add("show");

}


/* ========================================
   CLOSE RESERVATION FORM
======================================== */

function closeReservationForm() {

    document.getElementById("reservationModal")
        .classList.remove("show");

}


/* ========================================
   SUBMIT RESERVATION FORM
======================================== */

async function submitReservationForm() {

    const facilityId =
        document.getElementById("selectedFacilityId").value;

    const purpose =
        document.getElementById("reservationPurpose").value.trim();

    const selectedDate =
        document.getElementById("reservationDate").value;

    const startInput =
        document.getElementById("startTime").value;

    const endInput =
        document.getElementById("endTime").value;


    // Check required fields

    if (
        !facilityId ||
        !purpose ||
        !selectedDate ||
        !startInput ||
        !endInput
    ) {
        alert("Please complete all required fields.");
        return;
    }


    // Validate date and time using local date/time

    const selectedStart = new Date(
        `${selectedDate}T${startInput}:00`
    );

    const selectedEnd = new Date(
        `${selectedDate}T${endInput}:00`
    );

    if (
        isNaN(selectedStart.getTime()) ||
        isNaN(selectedEnd.getTime())
    ) {
        alert("Please select a valid date and time.");
        return;
    }

    // Start must be earlier than end

    if (selectedStart >= selectedEnd) {
        alert("End time must be later than start time.");
        return;
    }

    // Compare with current local date and time

    const now = new Date();

    if (selectedStart.getTime() <= now.getTime()) {
        alert(
            "Please select a future date and time.\n\n" +
            "Current local time: " + now.toLocaleString()
        );
        return;
    }

    // Convert to ISO timestamps for Supabase

    const startTime = selectedStart.toISOString();
    const endTime = selectedEnd.toISOString();


    /* ========================================
       GET CURRENT USER
    ======================================== */

    const {
        data: userData,
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !userData || !userData.user) {

        alert("You are not logged in.");

        window.location.href = "index.html";

        return;
    }

    const userId = userData.user.id;


    /* ========================================
       CHECK FACILITY
    ======================================== */

    const {
        data: facility,
        error: facilityError
    } = await supabaseClient
        .from("facilities")
        .select("status")
        .eq("id", facilityId)
        .single();

    if (facilityError) {

        console.error(facilityError);

        alert("Unable to check facility: " + facilityError.message);

        return;
    }

    if (facility.status !== "Available") {

        alert("This facility is currently unavailable.");

        return;
    }


    /* ========================================
       CHECK RESERVATION CONFLICT
    ======================================== */

    const {
        data: conflicts,
        error: conflictError
    } = await supabaseClient
        .from("reservations")
        .select("id, start_time, end_time, status")
        .eq("facility_id", facilityId)
        .in("status", [
            "Pending",
            "Approved",
            "Scheduled",
            "In Use"
        ])
        .lt("start_time", endTime)
        .gt("end_time", startTime);

    if (conflictError) {

        console.error(conflictError);

        alert(
            "Unable to check facility availability: " +
            conflictError.message
        );

        return;
    }

    if (conflicts && conflicts.length > 0) {

        alert(
            "Sorry, this facility is already reserved during the selected time.\n\n" +
            "Please choose another time or facility."
        );

        return;
    }


    /* ========================================
       SAVE RESERVATION
    ======================================== */

    const { error } = await supabaseClient
        .from("reservations")
        .insert({

            facility_id: facilityId,

            requester_id: userId,

            purpose: purpose,

            start_time: startTime,

            end_time: endTime,

            status: "Pending"

        });

    if (error) {

        console.error(error);

        alert("Reservation failed: " + error.message);

        return;
    }

    alert(
        "Reservation submitted successfully!\n\n" +
        "Status: Pending"
    );

    closeReservationForm();

    document.getElementById("reservationForm").reset();

    await loadReservations();

}


/* ========================================
   LOAD RESERVATIONS
======================================== */

async function loadReservations() {

    const table =
        document.getElementById("reservationsTable");

    table.innerHTML = `
        <tr>
            <td colspan="6">Loading reservations...</td>
        </tr>
    `;

    try {

        const {
            data: userData,
            error: userError
        } = await supabaseClient.auth.getUser();

        if (userError || !userData || !userData.user) {

            window.location.href = "index.html";

            return;
        }

        const { data, error } = await supabaseClient
            .from("reservation_details")
            .select("*")
            .eq("requester_id", userData.user.id)
            .order("start_time", {
                ascending: false
            });

        if (error) throw error;

        if (!data || data.length === 0) {

            table.innerHTML = `
                <tr>
                    <td colspan="6">No reservations yet.</td>
                </tr>
            `;

            return;
        }

        table.innerHTML = "";

        data.forEach(function (reservation) {

            const row = document.createElement("tr");

            const values = [
                reservation.facility_name || "-",
                reservation.purpose || "-",
                new Date(reservation.start_time).toLocaleString(),
                new Date(reservation.end_time).toLocaleString(),
                reservation.status || "-"
            ];

            values.forEach(function (value, index) {

                const cell = document.createElement("td");

                if (index === 4) {

                    const badge = document.createElement("span");

                    badge.className =
                        "status-badge status-" +
                        String(value).toLowerCase().replace(/\s+/g, "-");

                    badge.textContent = value;

                    cell.appendChild(badge);

                } else {

                    cell.textContent = value;

                }

                row.appendChild(cell);

            });

            const actionCell = document.createElement("td");

            if (reservation.status === "Pending") {

                const cancelButton = document.createElement("button");

                cancelButton.className = "cancel-btn";
                cancelButton.textContent = "Cancel";

                cancelButton.addEventListener("click", function () {
                    cancelReservation(reservation.id);
                });

                actionCell.appendChild(cancelButton);

            } else {

                actionCell.textContent = "-";

            }

            row.appendChild(actionCell);

            table.appendChild(row);

        });

    } catch (error) {

        console.error("Reservations error:", error);

        table.innerHTML = `
            <tr>
                <td colspan="6">
                    Unable to load reservations: ${error.message}
                </td>
            </tr>
        `;

    }

}


/* ========================================
   CANCEL RESERVATION
======================================== */

async function cancelReservation(reservationId) {

    if (!confirm("Are you sure you want to cancel this reservation?")) {
        return;
    }

    const {
        data: userData,
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !userData || !userData.user) {

        alert("You are not logged in.");

        window.location.href = "index.html";

        return;
    }

    const { error } = await supabaseClient
        .from("reservations")
        .update({
            status: "Cancelled"
        })
        .eq("id", reservationId)
        .eq("requester_id", userData.user.id)
        .eq("status", "Pending");

    if (error) {

        console.error(error);

        alert("Unable to cancel reservation: " + error.message);

        return;
    }

    alert("Reservation cancelled.");

    await loadReservations();

}


/* ========================================
   LOGOUT
======================================== */

async function logout() {

    await supabaseClient.auth.signOut();

    localStorage.clear();

    window.location.href = "index.html";

}
