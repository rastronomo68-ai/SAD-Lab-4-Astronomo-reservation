document.addEventListener("DOMContentLoaded", function () {

    const role = localStorage.getItem("userRole");
    const name = localStorage.getItem("userName");

    if (role !== "Facility Staff") {

        alert("Access denied.");

        window.location.href = "index.html";

        return;
    }

    document.getElementById("welcomeMessage").textContent =
        "Welcome, " + name + "!";

    loadReservations();

});


async function loadReservations() {

    const table =
        document.getElementById("staffReservationsTable");

    const { data, error } =
        await supabaseClient
            .from("reservation_details")
            .select("*")
            .in("status", [
                "Approved",
                "Scheduled",
                "In Use",
                "Completed"
            ])
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


    updateCounts(data || []);

    table.innerHTML = "";


    if (!data || data.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="7">
                    No approved reservations.
                </td>
            </tr>
        `;

        return;
    }


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
            reservation.status === "Approved" ||
            reservation.status === "Scheduled"
        ) {

            action = `
                <button
                    class="approve-btn"
                    onclick="markInUse(${reservation.id})"
                >
                    Mark In Use
                </button>
            `;

        }


        else if (reservation.status === "In Use") {

            action = `
                <button
                    class="approve-btn"
                    onclick="markCompleted(${reservation.id})"
                >
                    Mark Completed
                </button>
            `;

        }


        row.innerHTML = `

            <td>
                ${reservation.requester_name ||
                  reservation.requester_email ||
                  "-"}
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


function updateCounts(data) {

    const approved =
        data.filter(
            item => item.status === "Approved" ||
                    item.status === "Scheduled"
        ).length;


    const inUse =
        data.filter(
            item => item.status === "In Use"
        ).length;


    const completed =
        data.filter(
            item => item.status === "Completed"
        ).length;


    document.getElementById("approvedCount").textContent =
        approved;

    document.getElementById("inUseCount").textContent =
        inUse;

    document.getElementById("completedCount").textContent =
        completed;

}


async function markInUse(reservationId) {

    const confirmed =
        confirm(
            "Mark this reservation as In Use?"
        );


    if (!confirmed) {
        return;
    }


    const { error } =
        await supabaseClient
            .from("reservations")
            .update({
                status: "In Use"
            })
            .eq("id", reservationId)
            .in("status", [
                "Approved",
                "Scheduled"
            ]);


    if (error) {

        console.error(error);

        alert(
            "Unable to update reservation: " +
            error.message
        );

        return;
    }


    alert("Reservation marked as In Use.");

    loadReservations();

}


async function markCompleted(reservationId) {

    const confirmed =
        confirm(
            "Mark this reservation as Completed?"
        );


    if (!confirmed) {
        return;
    }


    const { error } =
        await supabaseClient
            .from("reservations")
            .update({
                status: "Completed"
            })
            .eq("id", reservationId)
            .eq("status", "In Use");


    if (error) {

        console.error(error);

        alert(
            "Unable to update reservation: " +
            error.message
        );

        return;
    }


    alert("Reservation marked as Completed.");

    loadReservations();

}


async function logout() {

    await supabaseClient.auth.signOut();

    localStorage.clear();

    window.location.href = "index.html";

}