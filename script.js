const SUPABASE_URL = "https://rzupsnpmxtsuaxxgqptb.supabase.co";
const SUPABASE_KEY = "sb_publishable_GDNRNLAg5G7AGaxAkVVfxA_-UgNuUO_";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ELEMENTS
const entryForm = document.getElementById("entryForm");
const entriesContainer = document.getElementById("entriesContainer");
const newEntryButton = document.getElementById("newEntryButton");
const cancelEntryButton = document.getElementById("cancelEntryButton");
const entryFormContainer = document.getElementById("entryFormContainer");

const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const userEmail = document.getElementById("userEmail");


// PAGE LOAD
document.addEventListener("DOMContentLoaded", function () {
    checkUser();
    loadEntries();
});


// CHECK LOGIN
async function checkUser() {

    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data.user) {

        userEmail.textContent = "Not logged in";

        loginButton.style.display = "inline-block";
        logoutButton.style.display = "none";

        newEntryButton.style.display = "none";

        return;
    }

    userEmail.textContent = data.user.email;

    loginButton.style.display = "none";
    logoutButton.style.display = "inline-block";

    newEntryButton.style.display = "inline-block";
}


// LOGIN
loginButton.addEventListener("click", async function () {

    const email = prompt("Enter your email:");

    if (!email) return;

    const password = prompt("Enter your password:");

    if (!password) return;


    const { error } =
        await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });


    if (error) {

        alert("Login failed: " + error.message);

        return;
    }


    await checkUser();
    await loadEntries();

    alert("You are now logged in!");
});


// LOGOUT
logoutButton.addEventListener("click", async function () {

    await supabaseClient.auth.signOut();

    entryFormContainer.style.display = "none";

    await checkUser();
    await loadEntries();

    alert("You have been logged out.");
});


// NEW ENTRY BUTTON
newEntryButton.addEventListener("click", async function () {

    const { data } =
        await supabaseClient.auth.getUser();


    if (!data.user) {

        alert("Please log in before creating a design entry.");

        return;
    }


    entryFormContainer.style.display = "block";

    newEntryButton.style.display = "none";
});


// CANCEL ENTRY
cancelEntryButton.addEventListener("click", function () {

    entryForm.reset();

    entryFormContainer.style.display = "none";

    newEntryButton.style.display = "inline-block";
});


// SAVE ENTRY
entryForm.addEventListener("submit", async function (event) {

    event.preventDefault();


    const { data } =
        await supabaseClient.auth.getUser();


    if (!data.user) {

        alert("Please log in first.");

        return;
    }


    const title =
        document.getElementById("entryTitle").value;

    const category =
        document.getElementById("entryCategory").value;

    const content =
        document.getElementById("entryContent").value;


    const { error } =
