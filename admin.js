document.addEventListener("DOMContentLoaded", function () {

    const role = localStorage.getItem("userRole");
    const name = localStorage.getItem("userName");

    if (role !== "Administrator") {

        alert("Access denied.");

        window.location.href = "index.html";

        return;
    }

    document.getElementById("welcomeMessage").textContent =
        "Welcome, " + name + "!";

    loadReservations();
    loadFacilities();

});


/* =========================
   AUDIT LOG
========================= */

async function createAuditLog(action, tableName, recordId, details) {

    try {

        const { data: userData } =
            await supabaseClient.auth.getUser();

        if (!userData || !userData.user) {
            return;
        }

        const userId = userData.user.id;

        const actorName =
            localStorage.getItem("userName") || "Administrator";

        const actorRole =
            localStorage.getItem("userRole") || "Administrator";

        const { error } =
            await supabaseClient
                .from("audit_logs")
                .insert({

                    actor_id: userId,

                    actor_name: actorName,

                    actor_role: actorRole,

                    action: action,

                    table_name: tableName,

                    record_id: recordId || null,

                    details: details || ""

                });

        if (error) {
            console.error("Audit log error:", error);
        }

    } catch (error) {

        console.error("Audit log error:", error);

    }

}


/* =========================
   RESERVATIONS
========================= */

async function loadReservations() {

    const table =
        document.getElementById(
            "adminReservationsTable"
        );

    const { data, error } =
        await supabaseClient
            .from("reservation_details")
            .select("*")
            .order("start_time", {
                ascending: false
            });

    if (error) {

        console.error(error);

        table.innerHTML = `
            <tr>
                <td colspan="7">
                    Unable to load reservations.
                </td>
            </tr>
        `;

        return;
    }

    const pending =
        (data || []).filter(
            item => item.status === "Pending"
        ).length;

    document.getElementById(
        "pendingCount"
    ).textContent = pending;

    if (!data || data.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="7">
                    No reservation requests.
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = "";

    data.forEach(function (reservation) {

        const row =
            document.createElement("tr");

        const start =
            new Date(
                reservation.start_time
            ).toLocaleString();

        const end =
            new Date(
                reservation.end_time
            ).toLocaleString();

        let action = "-";

        if (
            reservation.status === "Pending"
        ) {

            action = `

                <button
                    class="approve-btn"
                    onclick="approveReservation(${reservation.id})"
                >
                    Approve
                </button>

                <button
                    class="cancel-btn"
                    onclick="rejectReservation(${reservation.id})"
                >
                    Reject
                </button>

            `;

        }

        row.innerHTML = `

            <td>
                ${
                    reservation.requester_name ||
                    reservation.requester_email ||
                    "-"
                }
            </td>

            <td>
                ${reservation.facility_name}
            </td>

            <td>
                ${reservation.purpose}
            </td>

            <td>
                ${start}
            </td>

            <td>
                ${end}
            </td>

            <td>
                <strong>
                    ${reservation.status}
                </strong>
            </td>

            <td>
                ${action}
            </td>

        `;

        table.appendChild(row);

    });

}


/* =========================
   APPROVE RESERVATION
========================= */

async function approveReservation(
    reservationId
) {

    if (
        !confirm(
            "Approve this reservation?"
        )
    ) {
        return;
    }

    const { error } =
        await supabaseClient
            .from("reservations")
            .update({
                status: "Approved"
            })
            .eq("id", reservationId)
            .eq("status", "Pending");

    if (error) {

        alert(
            "Unable to approve reservation: " +
            error.message
        );

        return;
    }

    await createAuditLog(
        "Approved Reservation",
        "reservations",
        reservationId,
        "Administrator approved a reservation request."
    );

    alert(
        "Reservation approved."
    );

    loadReservations();

}


/* =========================
   REJECT RESERVATION
========================= */

async function rejectReservation(
    reservationId
) {

    if (
        !confirm(
            "Reject this reservation?"
        )
    ) {
        return;
    }

    const { error } =
        await supabaseClient
            .from("reservations")
            .update({
                status: "Rejected"
            })
            .eq("id", reservationId)
            .eq("status", "Pending");

    if (error) {

        alert(
            "Unable to reject reservation: " +
            error.message
        );

        return;
    }

    await createAuditLog(
        "Rejected Reservation",
        "reservations",
        reservationId,
        "Administrator rejected a reservation request."
    );

    alert(
        "Reservation rejected."
    );

    loadReservations();

}


/* =========================
   FACILITIES
========================= */

async function loadFacilities() {

    const table =
        document.getElementById(
            "facilitiesTable"
        );

    const { data, error } =
        await supabaseClient
            .from("facilities")
            .select("*")
            .order("name");

    if (error) {

        console.error(error);

        table.innerHTML = `
            <tr>
                <td colspan="6">
                    Unable to load facilities.
                </td>
            </tr>
        `;

        return;
    }

    if (!data || data.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="6">
                    No facilities found.
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = "";

    data.forEach(function (facility) {

        const row =
            document.createElement("tr");

        const status =
            facility.is_active
                ? "Active"
                : "Inactive";

        row.innerHTML = `

            <td>
                ${facility.name}
            </td>

            <td>
                ${facility.location || "-"}
            </td>

            <td>
                ${facility.description || "-"}
            </td>

            <td>
                ${facility.condition || "-"}
            </td>

            <td>
                <strong>
                    ${status}
                </strong>
            </td>

            <td>

                <button
                    class="edit-btn"
                    onclick="editFacility(
                        ${facility.id},
                        '${escapeText(facility.name)}',
                        '${escapeText(facility.location || "")}',
                        '${escapeText(facility.description || "")}',
                        '${escapeText(facility.condition || "Good")}'
                    )"
                >
                    Edit
                </button>

                <button
                    class="toggle-btn"
                    onclick="toggleFacility(
                        ${facility.id},
                        ${facility.is_active}
                    )"
                >
                    ${
                        facility.is_active
                            ? "Deactivate"
                            : "Activate"
                    }
                </button>

            </td>

        `;

        table.appendChild(row);

    });

}


function escapeText(text) {

    return String(text)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/\n/g, " ")
        .replace(/\r/g, " ");

}


/* =========================
   ADD FACILITY
========================= */

async function addFacility() {

    const name =
        prompt(
            "Enter facility name:"
        );

    if (!name) {
        return;
    }

    const location =
        prompt(
            "Enter facility location:"
        );

    if (!location) {
        return;
    }

    const description =
        prompt(
            "Enter facility description:"
        );

    const conditionInput =
        prompt(
            "Enter condition:\n\nGood\nMaintenance"
        );

    const condition =
        conditionInput === "Maintenance"
            ? "Maintenance"
            : "Good";

    const { data, error } =
        await supabaseClient
            .from("facilities")
            .insert({

                name: name,

                location: location,

                description:
                    description || "",

                condition: condition,

                is_active: true

            })
            .select()
            .single();

    if (error) {

        console.error(error);

        alert(
            "Unable to add facility: " +
            error.message
        );

        return;
    }

    await createAuditLog(
        "Added Facility",
        "facilities",
        data ? data.id : null,
        "Administrator added facility: " + name
    );

    alert(
        "Facility added successfully."
    );

    loadFacilities();

}


/* =========================
   EDIT FACILITY
========================= */

async function editFacility(
    id,
    oldName,
    oldLocation,
    oldDescription,
    oldCondition
) {

    const name =
        prompt(
            "Facility name:",
            oldName
        );

    if (!name) {
        return;
    }

    const location =
        prompt(
            "Location:",
            oldLocation
        );

    if (!location) {
        return;
    }

    const description =
        prompt(
            "Description:",
            oldDescription
        );

    const conditionInput =
        prompt(
            "Condition:\n\nGood\nMaintenance",
            oldCondition
        );

    const condition =
        conditionInput === "Maintenance"
            ? "Maintenance"
            : "Good";

    const { error } =
        await supabaseClient
            .from("facilities")
            .update({

                name: name,

                location: location,

                description:
                    description || "",

                condition: condition

            })
            .eq("id", id);

    if (error) {

        console.error(error);

        alert(
            "Unable to update facility: " +
            error.message
        );

        return;
    }

    await createAuditLog(
        "Edited Facility",
        "facilities",
        id,
        "Administrator edited facility: " + name
    );

    alert(
        "Facility updated successfully."
    );

    loadFacilities();

}


/* =========================
   ACTIVATE / DEACTIVATE
========================= */

async function toggleFacility(
    id,
    currentStatus
) {

    const newStatus =
        !currentStatus;

    const action =
        newStatus
            ? "activate"
            : "deactivate";

    if (
        !confirm(
            "Are you sure you want to " +
            action +
            " this facility?"
        )
    ) {
        return;
    }

    const { error } =
        await supabaseClient
            .from("facilities")
            .update({
                is_active: newStatus
            })
            .eq("id", id);

    if (error) {

        console.error(error);

        alert(
            "Unable to update facility: " +
            error.message
        );

        return;
    }

    await createAuditLog(
        newStatus
            ? "Activated Facility"
            : "Deactivated Facility",
        "facilities",
        id,
        "Administrator " +
        action +
        "d facility."
    );

    alert(
        "Facility status updated."
    );

    loadFacilities();

}


/* =========================
   LOGOUT
========================= */

async function logout() {

    await supabaseClient.auth.signOut();

    localStorage.clear();

    window.location.href =
        "index.html";

}