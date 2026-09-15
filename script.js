const SUPABASE_URL = "https://rzupsnpmxtsuaxxgqptb.supabase.co";
const SUPABASE_KEY = "sb_publishable_GDNRNLAg5G7AGaxAkVVfxA_-UgNuUO_";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const teamNames = {
    "eddf8394-747e-4128-8ede-ebc4a376c1c1": "Rita",
    "9646e5e4-b46e-4e75-b57c-e92eefade6ad": "Andrew",
    "0144ca1b-0768-48f8-adff-62f7bf5ce0a2": "Akil",
    "eaac6c8f-ff7a-4964-81d6-ed8ac2f45a3a": "Kevin",
    "06143692-44f1-4348-824e-642636f21861": "Sunil"
};

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
    
    const name = teamNames[data.user.id] || "Team member";


    const { error } =
        await supabaseClient
            .from("design_entries")
            .insert([
                {
                    title: title,
                    category: category,
                    content: content,
                    user_id: data.user.id,
                    name: name
                }
            ]);


    if (error) {

        console.error(error);

        alert(
            "There was a problem saving your entry: "
            + error.message
        );

        return;
    }


    alert("Entry saved!");


    entryForm.reset();

    entryFormContainer.style.display = "none";

    newEntryButton.style.display = "inline-block";


    await loadEntries();
});


// LOAD ENTRIES
async function loadEntries() {

    if (!entriesContainer) return;


    // Get current user
    const { data: userData } =
        await supabaseClient.auth.getUser();

    const currentUser =
        userData.user;


    // Get all entries
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


    // Display entries
    entries.forEach(function (entry) {

        const date =
            new Date(entry.created_at);


        // Date + time
        const formattedDate =
            date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
            });


        const formattedTime =
            date.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit"
            });


        const entryElement =
            document.createElement("article");


        entryElement.className = "log-entry";


    // Check if current user created this entry
    const isOwner =
        currentUser &&
        currentUser.id === entry.user_id;

    // Rita is the master user and can delete any entry
    const isMasterUser =
        currentUser &&
        currentUser.id === "eddf8394-747e-4128-8ede-ebc4a376c1c1";

    // Show Delete button if the user owns the entry OR is Rita
    const canDelete =
        isOwner || isMasterUser;

    // Delete button
    const deleteButton =
        canDelete
            ? `
                <button
                    class="delete-entry-button"
                    data-id="${entry.id}"
                >
                    Delete
                </button>
            `
            : "";


        entryElement.innerHTML = `

            <div class="log-entry-meta">

                <span>
                    ${entry.category}
                </span>

                <span>
                    ${formattedDate} · ${formattedTime}
                </span>

            </div>


            <h3>
                ${entry.title}
            </h3>


            <p class="log-author">
                Added by ${entry.name || "Team member"}
            </p>


            <p>
                ${entry.content}
            </p>


            ${deleteButton}

        `;


        entriesContainer.appendChild(entryElement);

    });


    // Add delete functionality
    document
        .querySelectorAll(".delete-entry-button")
        .forEach(function (button) {

            button.addEventListener(
                "click",
                deleteEntry
            );

        });
}


// DELETE ENTRY
async function deleteEntry(event) {

    const entryId =
        event.target.dataset.id;


    const confirmed =
        confirm(
            "Are you sure you want to delete this entry?"
        );


    if (!confirmed) return;


    const { error } =
        await supabaseClient
            .from("design_entries")
            .delete()
            .eq("id", entryId);


    if (error) {

        console.error(error);

        alert(
            "There was a problem deleting the entry: "
            + error.message
        );

        return;
    }


    alert("Entry deleted.");


    await loadEntries();
}