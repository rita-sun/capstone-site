// =============================
// SUPABASE SETUP
// =============================

const SUPABASE_URL = "https://rzupsnpmxtsuaxxgqptb.supabase.co";

// Paste your publishable key between the quotes below
const SUPABASE_KEY = "sb_publishable_GDNRNLAg5G7AGaxAkVVfxA_-UgNuUO_";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// =============================
// PAGE ELEMENTS
// =============================

const entryForm = document.getElementById("entryForm");
const entriesContainer = document.getElementById("entriesContainer");

const newEntryButton = document.getElementById("newEntryButton");
const cancelEntryButton = document.getElementById("cancelEntryButton");

const entryFormContainer =
    document.getElementById("entryFormContainer");

const loginButton =
    document.getElementById("loginButton");

const logoutButton =
    document.getElementById("logoutButton");

const userEmail =
    document.getElementById("userEmail");


// =============================
// START PAGE
// =============================

document.addEventListener("DOMContentLoaded", function () {

    checkUser();

    loadEntries();

});


// =============================
// CHECK LOGIN
// =============================

async function checkUser() {

    const { data, error } =
        await supabaseClient.auth.getUser();

    if (error || !data.user) {

        userEmail.textContent = "Not logged in";

        loginButton.style.display = "inline-block";
        logoutButton.style.display = "none";

        return;

    }

    userEmail.textContent = data.user.email;

    loginButton.style.display = "none";
    logoutButton.style.display = "inline-block";

}


// =============================
// LOGIN
// =============================

loginButton.addEventListener("click", async function () {

    const email = prompt("Enter your email:");

    if (!email) {
        return;
    }

    const password = prompt("Enter your password:");

    if (!password) {
        return;
    }


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


// =============================
// LOGOUT
// =============================

logoutButton.addEventListener("click", async function () {

    await supabaseClient.auth.signOut();

    await checkUser();

    alert("You have been logged out.");

});


// =============================
// NEW ENTRY BUTTON
// =============================

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


// =============================
// CANCEL ENTRY
// =============================

cancelEntryButton.addEventListener("click", function () {

    entryForm.reset();

    entryFormContainer.style.display = "none";

    newEntryButton.style.display = "inline-block";

});


// =============================
// SUBMIT NEW ENTRY
// =============================

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
        await supabaseClient
            .from("design_entries")
            .insert([
                {
                    title: title,
                    category: category,
                    content: content,
                    user_id: data.user.id
                }
            ]);


    if (error) {

        console.error(error);

        alert("There was a problem saving your entry: " + error.message);

        return;

    }


    alert("Entry saved!");

    entryForm.reset();

    entryFormContainer.style.display = "none";

    newEntryButton.style.display = "inline-block";

    await loadEntries();

});


// =============================
// LOAD ENTRIES
// =============================

async function loadEntries() {

    if (!entriesContainer) {
        return;
    }


    const { data: entries, error } =
        await supabaseClient
            .from("design_entries")
            .select("*")
            .order("created_at", {
                ascending: false
            });


    if (error) {

        console.error(error);

        entriesContainer.innerHTML =
            "<p>Unable to load entries.</p>";

        return;

    }


    entriesContainer.innerHTML = "";


    if (!entries || entries.length === 0) {

        entriesContainer.innerHTML =
            "<p class='muted'>No design entries yet. Add your first one!</p>";

        return;

    }


    entries.forEach(function (entry) {

        const date =
            new Date(entry.created_at);


        const formattedDate =
            date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
            });


        const entryElement =
            document.createElement("article");


        entryElement.className =
            "log-entry";


        entryElement.innerHTML = `

            <div class="log-entry-meta">

                <span>${entry.category}</span>

                <span>${formattedDate}</span>

            </div>


            <h3>${entry.title}</h3>


            <p class="log-author">
                Added by ${userEmail.textContent}
            </p>


            <p>
                ${entry.content}
            </p>

        `;


        entriesContainer.appendChild(entryElement);

    });

}