/* =========================
   FACILITIES
========================= */

async function loadFacilities() {

    const table = document.getElementById("facilitiesTable");

    const { data, error } = await supabaseClient
        .from("facilities")
        .select("*")
        .order("facility_name");

    if (error) {
        console.error("Facilities error:", error);
        table.innerHTML = `
            <tr>
                <td colspan="6">Unable to load facilities: ${error.message}</td>
            </tr>
        `;
        return;
    }

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

        row.innerHTML = `
            <td>${facility.facility_name}</td>
            <td>${facility.location || "-"}</td>
            <td>${facility.description || "-"}</td>
            <td>${facility.capacity || 0} persons</td>
            <td><strong>${facility.status}</strong></td>
            <td>
                <button class="edit-btn"
                    onclick="editFacility(${facility.id})">
                    Edit
                </button>

                <button class="toggle-btn"
                    onclick="toggleFacility(${facility.id}, '${facility.status}')">
                    ${facility.status === "Inactive" ? "Activate" : "Deactivate"}
                </button>
            </td>
        `;

        table.appendChild(row);
    });
}


/* =========================
   ADD FACILITY
========================= */

async function addFacility() {

    const facilityName = prompt("Enter facility name:");
    if (!facilityName) return;

    const location = prompt("Enter facility location:");
    if (!location) return;

    const description = prompt("Enter facility description:") || "";

    const capacityInput = prompt("Enter maximum capacity:");

    const capacity = Number(capacityInput);

    if (!capacityInput || !Number.isInteger(capacity) || capacity <= 0) {
        alert("Please enter a valid capacity.");
        return;
    }

    const { data, error } = await supabaseClient
        .from("facilities")
        .insert({
            facility_name: facilityName,
            location: location,
            description: description,
            capacity: capacity,
            status: "Available"
        })
        .select()
        .single();

    if (error) {
        console.error(error);
        alert("Unable to add facility: " + error.message);
        return;
    }

    await createAuditLog(
        "Added Facility",
        "facilities",
        data.id,
        "Administrator added facility: " + facilityName
    );

    alert("Facility added successfully.");

    loadFacilities();
}


/* =========================
   EDIT FACILITY
========================= */

async function editFacility(id) {

    const { data: facility, error: fetchError } =
        await supabaseClient
            .from("facilities")
            .select("*")
            .eq("id", id)
            .single();

    if (fetchError) {
        alert("Unable to retrieve facility: " + fetchError.message);
        return;
    }

    const facilityName = prompt(
        "Facility name:",
        facility.facility_name
    );

    if (!facilityName) return;

    const location = prompt(
        "Location:",
        facility.location || ""
    );

    if (!location) return;

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

    const statusInput = prompt(
        "Facility status:\n\nAvailable\nMaintenance\nInactive",
        facility.status
    );

    if (!["Available", "Maintenance", "Inactive"].includes(statusInput)) {
        alert("Invalid status. Please use Available, Maintenance, or Inactive.");
        return;
    }

    const { error } = await supabaseClient
        .from("facilities")
        .update({
            facility_name: facilityName,
            location: location,
            description: description || "",
            capacity: capacity,
            status: statusInput
        })
        .eq("id", id);

    if (error) {
        alert("Unable to update facility: " + error.message);
        return;
    }

    await createAuditLog(
        "Edited Facility",
        "facilities",
        id,
        "Administrator edited facility: " + facilityName
    );

    alert("Facility updated successfully.");

    loadFacilities();
}


/* =========================
   ACTIVATE / DEACTIVATE
========================= */

async function toggleFacility(id, currentStatus) {

    const newStatus =
        currentStatus === "Inactive"
            ? "Available"
            : "Inactive";

    if (!confirm("Are you sure you want to set this facility to " + newStatus + "?")) {
        return;
    }

    const { error } = await supabaseClient
        .from("facilities")
        .update({
            status: newStatus
        })
        .eq("id", id);

    if (error) {
        alert("Unable to update facility: " + error.message);
        return;
    }

    await createAuditLog(
        newStatus === "Available"
            ? "Activated Facility"
            : "Deactivated Facility",
        "facilities",
        id,
        "Administrator changed facility status to " + newStatus
    );

    alert("Facility status updated.");

    loadFacilities();
}
