// Login logic will be connected to Supabase in the next step.
document.getElementById("loginForm").addEventListener("submit", async function(event) {

    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const message = document.getElementById("loginMessage");

    message.textContent = "Logging in...";
    message.style.color = "#2563eb";

    try {

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            message.textContent = error.message;
            message.style.color = "red";
            return;
        }

        const user = data.user;

        const { data: profile, error: profileError } =
            await supabaseClient
                .from("profiles")
                .select("full_name, email, role")
                .eq("id", user.id)
                .single();

        if (profileError) {
            message.textContent = "User profile not found.";
            message.style.color = "red";
            return;
        }

        localStorage.setItem("userRole", profile.role);
        localStorage.setItem("userName", profile.full_name);
        localStorage.setItem("userEmail", profile.email);

        if (profile.role === "Administrator") {
            window.location.href = "admin.html";
        }
        else if (profile.role === "Facility Staff") {
            window.location.href = "staff.html";
        }
        else if (profile.role === "Requester") {
            window.location.href = "requester.html";
        }
        else {
            message.textContent = "Invalid user role.";
            message.style.color = "red";
        }

    } catch (error) {

        console.error(error);

        message.textContent = "Something went wrong. Please try again.";
        message.style.color = "red";
    }
});