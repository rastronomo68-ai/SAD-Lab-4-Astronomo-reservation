
document.addEventListener("DOMContentLoaded", function () {

    const role = localStorage.getItem("userRole");
    const name = localStorage.getItem("userName");

    if (role !== "Requester") {
        alert("Access denied.");
        window.location.href = "index.html";
        return;
    }

    document.getElementById("welcomeMessage").textContent =
        "Welcome, " + name + "!";

    loadFacilities();
    loadReservations();

    // Reservation form
    const reservationForm =
        document.getElementById("reservationForm");

    reservationForm.addEventListener("submit", function (event) {
        event.preventDefault();
        submitReservationForm();
    });

    // Set minimum date to today
    const dateInput =
        document.getElementById("reservationDate");

    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    dateInput.min = `${year}-${month}-${day}`;

});


/* ========================================
   LOAD FACILITIES
======================================== */

async function loadFacilities() {

    const container =
        document.getElementById("facilitiesContainer");

    const { data, error } = await supabaseClient
        .from("facilities")
        .select("*")
        .eq("status", "Available")
        .order("facility_name");

    if (error) {
        console.error("Facilities error:", error);
        container.innerHTML =
            "<p>Unable to load facilities: " + error.message + "</p>";
        return;
    }

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
        location.innerHTML = "<strong>Location:</strong> ";
        location.append(
            document.createTextNode(
                facility.location || "Not specified"
            )
        );

        const description = document.createElement("p");
        description.textContent = facility.description || "";

        const capacity = document.createElement("p");
        capacity.innerHTML = "<strong>Capacity:</strong> ";
        capacity.append(
            document.createTextNode(
                (facility.capacity || 0) + " persons"
            )
        );

        const status = document.createElement("p");
        status.innerHTML = "<strong>Status:</strong> ";
        status.append(
            document.createTextNode(facility.status)
        );

        const reserveButton = document.createElement("button");
        reserveButton.className = "btn";
        reserveButton.textContent = "Reserve";

        reserveButton.addEventListener("click", function () {
            openReservationForm(
                facility.id,
                facility.facility_name
            );
        });

        card.appendChild(title);
        card.appendChild(location);
        card.appendChild(description);
        card.appendChild(capacity);
        card.appendChild(status);
        card.appendChild(document.createElement("br"));
        card.appendChild(reserveButton);

        container.appendChild(card);

    });

}


/* ========================================
   OPEN RESERVATION FORM
======================================== */

function openReservationForm(facilityId, facilityName) {

    const modal =
        document.getElementById("reservationModal");

    const form =
        document.getElementById("reservationForm");

    // Reset form fields
    form.reset();

    // Set selected facility
    document.getElementById("selectedFacility").value =
        facilityName;

    document.getElementById("selectedFacilityId").value =
        facilityId;

    // Show modal
    modal.classList.add("show");

}


/* ========================================
   CLOSE RESERVATION FORM
======================================== */

function closeReservationForm() {

    const modal =
        document.getElementById("reservationModal");

    modal.classList.remove("show");

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


    // Create date and time
    const startDate =
        new Date(`${selectedDate}T${startInput}:00`);

    const endDate =
        new Date(`${selectedDate}T${endInput}:00`);


    // Check valid date
    if (
        isNaN(startDate.getTime()) ||
        isNaN(endDate.getTime())
    ) {
        alert("Please select a valid date and time.");
        return;
    }


    // Start must be before end
    if (startDate >= endDate) {
        alert("Start time must be before end time.");
        return;
    }


    // Do not allow past time
    const now = new Date();

    if (startDate <= now) {
        alert("Please select a future date and time.");
        return;
    }


    const startTime = startDate.toISOString();
    const endTime = endDate.toISOString();


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
       Uses the actual database column: status
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

    // Close form
    closeReservationForm();

    // Reset form
    document.getElementById("reservationForm").reset();

    // Reload reservations
    loadReservations();

}


/* ========================================
   LOAD RESERVATIONS
======================================== */

async function loadReservations() {

    const table =
        document.getElementById("reservationsTable");

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

    if (error) {
        console.error(error);

        table.innerHTML = `
            <tr>
                <td colspan="6">
                    Unable to load reservations.
                </td>
            </tr>
        `;

        return;
    }

    if (!data || data.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="6">
                    No reservations yet.
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = "";

    data.forEach(function (reservation) {

        const row = document.createElement("tr");

        const start =
            new Date(reservation.start_time).toLocaleString();

        const end =
            new Date(reservation.end_time).toLocaleString();

        let action = "";

        if (reservation.status === "Pending") {

            const cancelButton =
                document.createElement("button");

            cancelButton.className = "cancel-btn";
            cancelButton.textContent = "Cancel";

            cancelButton.addEventListener("click", function () {
                cancelReservation(reservation.id);
            });

            action = cancelButton;

        }

        const statusClass =
            reservation.status
                .toLowerCase()
                .replace(/\s+/g, "-");

        const facilityCell = document.createElement("td");
        facilityCell.textContent = reservation.facility_name || "-";

        const purposeCell = document.createElement("td");
        purposeCell.textContent = reservation.purpose || "-";

        const startCell = document.createElement("td");
        startCell.textContent = start;

        const endCell = document.createElement("td");
        endCell.textContent = end;

        const statusCell = document.createElement("td");

        const statusBadge = document.createElement("span");
        statusBadge.className =
            "status-badge status-" + statusClass;

        statusBadge.textContent = reservation.status;

        statusCell.appendChild(statusBadge);

        const actionCell = document.createElement("td");

        if (action) {
            actionCell.appendChild(action);
        } else {
            actionCell.textContent = "-";
        }

        row.appendChild(facilityCell);
        row.appendChild(purposeCell);
        row.appendChild(startCell);
        row.appendChild(endCell);
        row.appendChild(statusCell);
        row.appendChild(actionCell);

        table.appendChild(row);

    });

}


/* ========================================
   CANCEL RESERVATION
======================================== */

async function cancelReservation(reservationId) {

    const confirmCancel = confirm(
        "Are you sure you want to cancel this reservation?"
    );

    if (!confirmCancel) {
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

    loadReservations();

}


/* ========================================
   LOGOUT
======================================== */

async function logout() {

    await supabaseClient.auth.signOut();

    localStorage.clear();

    window.location.href = "index.html";

}
