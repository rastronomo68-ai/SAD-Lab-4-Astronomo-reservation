
/* ========================================
   ADMIN DASHBOARD INITIALIZATION
======================================== */

document.addEventListener("DOMContentLoaded", function () {

    const role = localStorage.getItem("userRole");
    const name = localStorage.getItem("userName");

    if (role !== "Administrator") {
        alert("Access denied.");
        window.location.href = "index.html";
        return;
    }

    document.getElementById("welcomeMessage").textContent =
        "Welcome, " + (name || "Administrator") + "!";

    // Load dashboard data
    loadFacilities();
    loadReservations();

});


/* ========================================
   AUDIT LOG
======================================== */

async function createAuditLog(action, tableName, recordId, details) {

    try {

        const { data: userData } =
            await supabaseClient.auth.getUser();

        if (!userData || !userData.user) return;

        const { error } = await supabaseClient
            .from("audit_logs")
            .insert({
                actor_id: userData.user.id,
                actor_name: localStorage.getItem("userName") || "Administrator",
                actor_role: localStorage.getItem("userRole") || "Administrator",
                action: action,
                table_name: tableName,
                record_id: recordId || null,
                details: details || ""
            });

        if (error) {
            console.error("Audit log error:", error.message);
        }

    } catch (error) {
        console.error("Audit log error:", error);
    }

}


/* ========================================
   LOAD FACILITIES
======================================== */

async function loadFacilities() {

    const table = document.getElementById("facilitiesTable");

    if (!table) {
        console.error("facilitiesTable not found.");
        return;
    }

    table.innerHTML = `
        <tr>
            <td colspan="6">Loading facilities...</td>
        </tr>
    `;

    try {

        const { data, error } = await supabaseClient
            .from("facilities")
            .select("*")
            .order("facility_name");

        if (error) throw error;

        if (!data || data.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="6">No facilities found.</td>
                </tr>
            `;
            return;
        }

        table.innerHTML = "";

        data.forEach(function (facility) {

            const row = document.createElement("tr");

            function addCell(value) {
                const cell = document.createElement("td");
                cell.textContent = value ?? "-";
                row.appendChild(cell);
            }

            addCell(facility.facility_name);
            addCell(facility.location);
            addCell(facility.description);
            addCell((facility.capacity ?? 0) + " persons");
            addCell(facility.status);

            const actionCell = document.createElement("td");

            const editButton = document.createElement("button");
            editButton.className = "edit-btn";
            editButton.textContent = "Edit";

            editButton.addEventListener("click", function () {
                editFacility(facility.id);
            });

            const toggleButton = document.createElement("button");
            toggleButton.className = "toggle-btn";

            toggleButton.textContent =
                facility.status === "Inactive"
                    ? "Activate"
                    : "Deactivate";

            toggleButton.addEventListener("click", function () {
                toggleFacility(facility.id, facility.status);
            });

            actionCell.appendChild(editButton);
            actionCell.appendChild(toggleButton);

            row.appendChild(actionCell);
            table.appendChild(row);

        });

        console.log("Facilities loaded:", data.length);

    } catch (error) {

        console.error("Unable to load facilities:", error);

        table.innerHTML = `
            <tr>
                <td colspan="6">
                    Unable to load facilities: ${error.message}
                </td>
            </tr>
        `;

    }

}


/* ========================================
   ADD FACILITY
======================================== */

async function addFacility() {

    const facilityName = prompt("Enter facility name:");

    if (!facilityName || !facilityName.trim()) return;

    const location = prompt("Enter facility location:");

    if (!location || !location.trim()) return;

    const description =
        prompt("Enter facility description:") || "";

    const capacityInput =
        prompt("Enter maximum capacity:");

    const capacity = Number(capacityInput);

    if (!capacityInput || !Number.isInteger(capacity) || capacity <= 0) {
        alert("Please enter a valid capacity.");
        return;
    }

    try {

        const { data, error } = await supabaseClient
            .from("facilities")
            .insert({
                facility_name: facilityName.trim(),
                location: location.trim(),
                description: description.trim(),
                capacity: capacity,
                status: "Available"
            })
            .select()
            .single();

        if (error) throw error;

        await createAuditLog(
            "Added Facility",
            "facilities",
            data.id,
            "Administrator added facility: " + facilityName
        );

        alert("Facility added successfully.");

        await loadFacilities();

    } catch (error) {

        console.error(error);
        alert("Unable to add facility: " + error.message);

    }

}


/* ========================================
   EDIT FACILITY
======================================== */

async function editFacility(id) {

    try {

        const { data: facility, error: fetchError } =
            await supabaseClient
                .from("facilities")
                .select("*")
                .eq("id", id)
                .single();

        if (fetchError) throw fetchError;

        const facilityName = prompt(
            "Facility name:",
            facility.facility_name
        );

        if (!facilityName || !facilityName.trim()) return;

        const location = prompt(
            "Location:",
            facility.location || ""
        );

        if (!location || !location.trim()) return;

        const description = prompt(
            "Description:",
            facility.description || ""
        );

        const capacityInput = prompt(
            "Maximum capacity:",
            facility.capacity
        );

        const capacity = Number(capacityInput);

        if (!capacityInput || !Number.isInteger(capacity) || capacity <= 0) {
            alert("Please enter a valid capacity.");
            return;
        }

        const status = prompt(
            "Facility status:\n\nAvailable\nMaintenance\nInactive",
            facility.status
        );

        if (!["Available", "Maintenance", "Inactive"].includes(status)) {
            alert("Invalid facility status.");
            return;
        }

        const { error } = await supabaseClient
            .from("facilities")
            .update({
                facility_name: facilityName.trim(),
                location: location.trim(),
                description: description || "",
                capacity: capacity,
                status: status
            })
            .eq("id", id);

        if (error) throw error;

        await createAuditLog(
            "Edited Facility",
            "facilities",
            id,
            "Administrator edited facility: " + facilityName
        );

        alert("Facility updated successfully.");

        await loadFacilities();

    } catch (error) {

        console.error(error);
        alert("Unable to update facility: " + error.message);

    }

}


/* ========================================
   ACTIVATE / DEACTIVATE FACILITY
======================================== */

async function toggleFacility(id, currentStatus) {

    const newStatus =
        currentStatus === "Inactive"
            ? "Available"
            : "Inactive";

    if (!confirm("Change facility status to " + newStatus + "?")) {
        return;
    }

    try {

        const { error } = await supabaseClient
            .from("facilities")
            .update({
                status: newStatus
            })
            .eq("id", id);

        if (error) throw error;

        await createAuditLog(
            newStatus === "Available"
                ? "Activated Facility"
                : "Deactivated Facility",
            "facilities",
            id,
            "Facility status changed to " + newStatus
        );

        alert("Facility status updated.");

        await loadFacilities();

    } catch (error) {

        console.error(error);
        alert("Unable to update facility: " + error.message);

    }

}


/* ========================================
   LOAD RESERVATIONS
======================================== */

async function loadReservations() {

    const table =
        document.getElementById("adminReservationsTable");

    if (!table) {
        console.error("adminReservationsTable not found.");
        return;
    }

    table.innerHTML = `
        <tr>
            <td colspan="7">Loading reservations...</td>
        </tr>
    `;

    try {

        const { data, error } = await supabaseClient
            .from("reservation_details")
            .select("*")
            .order("start_time", { ascending: false });

        if (error) throw error;

        const pending = (data || []).filter(
            item => item.status === "Pending"
        ).length;

        document.getElementById("pendingCount").textContent = pending;

        if (!data || data.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="7">No reservation requests.</td>
                </tr>
            `;
            return;
        }

        table.innerHTML = "";

        data.forEach(function (reservation) {

            const row = document.createElement("tr");

            const values = [
                reservation.requester_name || reservation.requester_email || "-",
                reservation.facility_name || "-",
                reservation.purpose || "-",
                new Date(reservation.start_time).toLocaleString(),
                new Date(reservation.end_time).toLocaleString(),
                reservation.status || "-"
            ];

            values.forEach(function (value) {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });

            const actionCell = document.createElement("td");

            if (reservation.status === "Pending") {

                const approveButton = document.createElement("button");
                approveButton.className = "approve-btn";
                approveButton.textContent = "Approve";

                approveButton.addEventListener("click", function () {
                    approveReservation(reservation.id);
                });

                const rejectButton = document.createElement("button");
                rejectButton.className = "cancel-btn";
                rejectButton.textContent = "Reject";

                rejectButton.addEventListener("click", function () {
                    rejectReservation(reservation.id);
                });

                actionCell.appendChild(approveButton);
                actionCell.appendChild(rejectButton);

            } else {
                actionCell.textContent = "-";
            }

            row.appendChild(actionCell);
            table.appendChild(row);

        });

        console.log("Reservations loaded:", data.length);

    } catch (error) {

        console.error("Unable to load reservations:", error);

        table.innerHTML = `
            <tr>
                <td colspan="7">
                    Unable to load reservations: ${error.message}
                </td>
            </tr>
        `;

    }

}


/* ========================================
   APPROVE RESERVATION
======================================== */

async function approveReservation(id) {

    if (!confirm("Approve this reservation?")) return;

    const { error } = await supabaseClient
        .from("reservations")
        .update({ status: "Approved" })
        .eq("id", id)
        .eq("status", "Pending");

    if (error) {
        alert("Unable to approve reservation: " + error.message);
        return;
    }

    await createAuditLog(
        "Approved Reservation",
        "reservations",
        id,
        "Administrator approved a reservation request."
    );

    alert("Reservation approved.");

    await loadReservations();

}


/* ========================================
   REJECT RESERVATION
======================================== */

async function rejectReservation(id) {

    if (!confirm("Reject this reservation?")) return;

    const { error } = await supabaseClient
        .from("reservations")
        .update({ status: "Rejected" })
        .eq("id", id)
        .eq("status", "Pending");

    if (error) {
        alert("Unable to reject reservation: " + error.message);
        return;
    }

    await createAuditLog(
        "Rejected Reservation",
        "reservations",
        id,
        "Administrator rejected a reservation request."
    );

    alert("Reservation rejected.");

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
