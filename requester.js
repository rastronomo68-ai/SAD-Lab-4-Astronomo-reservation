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
        container.innerHTML = "<p>Unable to load facilities: " +
            error.message + "</p>";
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = "<p>No facilities available.</p>";
        return;
    }

    container.innerHTML = "";

    data.forEach(function (facility) {

        const card = document.createElement("div");

        card.className = "card";

        card.innerHTML = `
            <h2>${facility.facility_name}</h2>

            <p>
                <strong>Location:</strong>
                ${facility.location || "Not specified"}
            </p>

            <p>${facility.description || ""}</p>

            <p>
                <strong>Capacity:</strong>
                ${facility.capacity || 0} persons
            </p>

            <p>
                <strong>Status:</strong>
                ${facility.status}
            </p>

            <br>

            <button class="btn"
                onclick="openReservationForm(
                    ${facility.id},
                    '${String(facility.facility_name).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'
                )">
                Reserve
            </button>
        `;

        container.appendChild(card);
    });
}
