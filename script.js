
const SUPABASE_URL = "https://rzupsnpmxtsuaxxgqptb.supabase.co";
const SUPABASE_KEY = "sb_publishable_GDNRNLAg5G7AGaxAkVVfxA_-UgNuUO_";

const PHOTO_BUCKET = "design-photos"; // Must match your Supabase Storage bucket
const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10 MB

const MASTER_USER_ID = "eddf8394-747e-4128-8ede-ebc4a376c1c1";

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


// ========================================
// ELEMENTS
// ========================================

const entryForm = document.getElementById("entryForm");
const entriesContainer = document.getElementById("entriesContainer");
const newEntryButton = document.getElementById("newEntryButton");
const cancelEntryButton = document.getElementById("cancelEntryButton");
const entryFormContainer = document.getElementById("entryFormContainer");

const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const userEmail = document.getElementById("userEmail");

const entryPhotosInput = document.getElementById("entryPhotos");
const newPhotoPreviews = document.getElementById("newPhotoPreviews");

let pendingPhotos = [];
let previewUrls = [];


// ========================================
// HELPER FUNCTIONS
// ========================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function getPhotoUrl(path) {
    const { data } = supabaseClient.storage
        .from(PHOTO_BUCKET)
        .getPublicUrl(path);

    return data.publicUrl;
}

function getEntryPhotos(entry) {
    return Array.isArray(entry.photos) ? entry.photos : [];
}

function canManageEntry(entry, user) {
    return Boolean(
        user &&
        (user.id === entry.user_id || user.id === MASTER_USER_ID)
    );
}

function formatDate(dateValue) {
    const date = new Date(dateValue);

    return {
        date: date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        }),
        time: date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit"
        })
    };
}

function makeSafeFileName(name) {
    return name
        .normalize("NFKD")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(-100);
}

function revokePreviewUrls() {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    previewUrls = [];
}

function resetPhotoSelection() {
    revokePreviewUrls();
    pendingPhotos = [];

    if (entryPhotosInput) {
        entryPhotosInput.value = "";
    }

    if (newPhotoPreviews) {
        newPhotoPreviews.innerHTML = "";
    }
}


// ========================================
// PHOTO SELECTION AND PREVIEWS
// ========================================

if (entryPhotosInput) {
    entryPhotosInput.addEventListener("change", function () {
        const files = Array.from(entryPhotosInput.files || []);

        files.forEach(file => {
            if (!file.type.startsWith("image/")) {
                alert(file.name + " is not an image.");
                return;
            }

            if (file.size > MAX_PHOTO_SIZE) {
                alert(file.name + " is larger than 10 MB.");
                return;
            }

            pendingPhotos.push({
                file: file,
                caption: ""
            });
        });

        renderNewPhotoPreviews();

        // Clear the input so the same file can be selected again.
        entryPhotosInput.value = "";
    });
}

function renderNewPhotoPreviews() {
    if (!newPhotoPreviews) return;

    revokePreviewUrls();
    newPhotoPreviews.innerHTML = "";

    pendingPhotos.forEach((photo, index) => {
        const url = URL.createObjectURL(photo.file);
        previewUrls.push(url);

        const item = document.createElement("div");
        item.className = "photo-preview-item";

        const image = document.createElement("img");
        image.src = url;
        image.alt = photo.file.name;

        const details = document.createElement("div");
        details.className = "photo-preview-details";

        const filename = document.createElement("p");
        filename.className = "photo-filename";
        filename.textContent = photo.file.name;

        const caption = document.createElement("input");
        caption.type = "text";
        caption.className = "photo-caption-input";
        caption.placeholder = "Add a caption (optional)";
        caption.value = photo.caption;

        caption.addEventListener("input", function () {
            pendingPhotos[index].caption = caption.value;
        });

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "remove-photo-button";
        remove.textContent = "Remove";

        remove.addEventListener("click", function () {
            pendingPhotos.splice(index, 1);
            renderNewPhotoPreviews();
        });

        details.append(filename, caption, remove);
        item.append(image, details);

        newPhotoPreviews.appendChild(item);
    });
}


// ========================================
// PHOTO STORAGE FUNCTIONS
// ========================================

async function uploadPhotos(photos, entryId, userId) {
    const uploadedPhotos = [];

    for (const photo of photos) {
        const file = photo.file;

        const path =
            `${userId}/${entryId}/${crypto.randomUUID()}-${makeSafeFileName(file.name)}`;

        const { error } = await supabaseClient.storage
            .from(PHOTO_BUCKET)
            .upload(path, file, {
                contentType: file.type,
                upsert: false
            });

        if (error) {
            // Clean up photos uploaded earlier in this batch.
            const uploadedPaths = uploadedPhotos.map(item => item.path);

            if (uploadedPaths.length > 0) {
                await supabaseClient.storage
                    .from(PHOTO_BUCKET)
                    .remove(uploadedPaths);
            }

            throw error;
        }

        uploadedPhotos.push({
            path: path,
            caption: (photo.caption || "").trim()
        });
    }

    return uploadedPhotos;
}

async function removeStoredPhotos(photos) {
    const paths = photos
        .map(photo => photo.path)
        .filter(Boolean);

    if (paths.length === 0) return;

    const { error } = await supabaseClient.storage
        .from(PHOTO_BUCKET)
        .remove(paths);

    if (error) {
        console.error("Could not remove stored photos:", error);
    }
}


// ========================================
// PAGE LOAD
// ========================================

document.addEventListener("DOMContentLoaded", function () {
    checkUser();
    loadEntries();
});


// ========================================
// AUTHENTICATION
// ========================================

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

loginButton.addEventListener("click", async function () {
    const email = prompt("Enter your email:");
    if (!email) return;

    const password = prompt("Enter your password:");
    if (!password) return;

    const { error } = await supabaseClient.auth.signInWithPassword({
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

logoutButton.addEventListener("click", async function () {
    await supabaseClient.auth.signOut();

    entryFormContainer.style.display = "none";
    entryForm.reset();
    resetPhotoSelection();

    await checkUser();
    await loadEntries();

    alert("You have been logged out.");
});


// ========================================
// NEW ENTRY BUTTON
// ========================================

newEntryButton.addEventListener("click", async function () {
    const { data } = await supabaseClient.auth.getUser();

    if (!data.user) {
        alert("Please log in before creating a design entry.");
        return;
    }

    entryForm.reset();
    resetPhotoSelection();

    entryFormContainer.style.display = "block";
    newEntryButton.style.display = "none";
});


// ========================================
// CANCEL NEW ENTRY
// ========================================

cancelEntryButton.addEventListener("click", function () {
    entryForm.reset();
    resetPhotoSelection();

    entryFormContainer.style.display = "none";
    newEntryButton.style.display = "inline-block";
});


// ========================================
// SAVE NEW ENTRY
// ========================================

entryForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const submitButton = entryForm.querySelector('button[type="submit"]');

    submitButton.disabled = true;
    submitButton.textContent = "Saving...";

    let newEntryId = null;

    try {
        const { data } = await supabaseClient.auth.getUser();

        if (!data.user) {
            alert("Please log in first.");
            return;
        }

        const title = document.getElementById("entryTitle").value.trim();
        const category = document.getElementById("entryCategory").value;
        const workType = document.getElementById("entryWorkType").value;
        const entryDate = document.getElementById("entryDate").value;
        const content = document.getElementById("entryContent").value.trim();

        const name = teamNames[data.user.id] || "Team member";

        // Create the entry first to obtain its database ID.
        const { data: newEntry, error } = await supabaseClient
            .from("design_entries")
            .insert({
                title: title,
                category: category,
                work_type: workType,
                content: content,
                user_id: data.user.id,
                name: name,
                created_at: new Date(entryDate).toISOString(),
                photos: []
            })
            .select()
            .single();

        if (error) throw error;

        newEntryId = newEntry.id;

        // Upload photos, if any were selected.
        if (pendingPhotos.length > 0) {
            const uploadedPhotos = await uploadPhotos(
                pendingPhotos,
                newEntry.id,
                data.user.id
            );

            const { error: updateError } = await supabaseClient
                .from("design_entries")
                .update({
                    photos: uploadedPhotos
                })
                .eq("id", newEntry.id);

            if (updateError) {
                await removeStoredPhotos(uploadedPhotos);
                throw updateError;
            }
        }

        alert("Entry saved!");

        entryForm.reset();
        resetPhotoSelection();

        entryFormContainer.style.display = "none";
        newEntryButton.style.display = "inline-block";

        await loadEntries();

    } catch (error) {
        console.error(error);

        // Remove the incomplete entry if saving its photos failed.
        if (newEntryId) {
            await supabaseClient
                .from("design_entries")
                .delete()
                .eq("id", newEntryId);
        }

        alert("There was a problem saving your entry: " + error.message);

    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Save Entry";
    }
});


// ========================================
// PHOTO GALLERY DISPLAY
// ========================================

function renderPhotoGallery(photos) {
    if (!photos || photos.length === 0) return "";

    return `
        <div class="entry-photo-gallery">
            ${photos.map((photo, index) => `
                <figure class="entry-photo">
                    <img
                        src="${escapeHTML(getPhotoUrl(photo.path))}"
                        alt="${escapeHTML(photo.caption || "Design log photo")}"
                        class="gallery-photo"
                        data-photo-index="${index}"
                    >
                    ${photo.caption ? `
                        <figcaption>${escapeHTML(photo.caption)}</figcaption>
                    ` : ""}
                </figure>
            `).join("")}
        </div>
    `;
}


// ========================================
// LOAD ENTRIES
// ========================================

async function loadEntries() {
    if (!entriesContainer) return;

    const { data: userData } = await supabaseClient.auth.getUser();
    const currentUser = userData.user;

    const { data: entries, error } = await supabaseClient
        .from("design_entries")
        .select("*")
        .order("created_at", {
            ascending: false
        });

    if (error) {
        console.error(error);
        entriesContainer.innerHTML = "<p>Unable to load entries.</p>";
        return;
    }

    entriesContainer.innerHTML = "";

    if (!entries || entries.length === 0) {
        entriesContainer.innerHTML =
            "<p class='muted'>No design entries yet. Add your first one!</p>";
        return;
    }

    entries.forEach(function (entry) {
        const entryElement = document.createElement("article");
        entryElement.className = "log-entry";

        const { date, time } = formatDate(entry.created_at);
        const photos = getEntryPhotos(entry);
        const canEdit = canManageEntry(entry, currentUser);

        entryElement.innerHTML = `
            <div class="log-entry-meta">
                <span>${escapeHTML(entry.category)}</span>
                <span>${escapeHTML(entry.work_type || "")}</span>
                <span>${escapeHTML(date)} · ${escapeHTML(time)}</span>
            </div>

            <h3>${escapeHTML(entry.title)}</h3>

            <p class="log-author">
                Added by ${escapeHTML(entry.name || "Team member")}
            </p>

            <p class="log-content">${escapeHTML(entry.content)}</p>

            ${renderPhotoGallery(photos)}

            <div class="entry-actions">
                ${canEdit ? `
                    <button class="edit-entry-button">Edit</button>
                    <button class="delete-entry-button">Delete</button>
                ` : ""}
            </div>
        `;

        if (canEdit) {
            entryElement
                .querySelector(".edit-entry-button")
                .addEventListener("click", function () {
                    editEntry(entry.id, entryElement);
                });

            entryElement
                .querySelector(".delete-entry-button")
                .addEventListener("click", function () {
                    deleteEntry(entry.id);
                });
        }

        // Click a photo to open the lightbox.
        entryElement.querySelectorAll(".gallery-photo").forEach(image => {
            image.addEventListener("click", function () {
                const index = Number(image.dataset.photoIndex);
                openLightbox(photos[index]);
            });
        });

        entriesContainer.appendChild(entryElement);
    });
}


// ========================================
// EDIT ENTRY
// ========================================

async function editEntry(entryId, entryElement) {
    const { data: entry, error } = await supabaseClient
        .from("design_entries")
        .select("*")
        .eq("id", entryId)
        .single();

    if (error || !entry) {
        console.error(error);
        alert("Unable to load this entry.");
        return;
    }

    // Keep a separate editable copy of existing photos.
    const existingPhotos = getEntryPhotos(entry).map(photo => ({
        ...photo,
        remove: false
    }));

    // Photos added during this editing session.
    const addedPhotos = [];

    entryElement.innerHTML = `
        <div class="edit-entry-form">

            <label>Phase</label>

            <select class="edit-category">
                ${["","Research", "Ideation", "Design", "Prototyping", "Testing", "Reflection"]
                    .map(value => `
                        <option value="${value}" ${entry.category === value ? "selected" : ""}>
                            ${value || "No category"}}
                        </option>
                    `).join("")}
            </select>

            <label>Work Type</label>

            <select class="edit-work-type">
                ${["", "Electrical", "Mechanical", "Software", "Controls", "Project Management"]
                    .map(value => `
                        <option value="${value}" ${(entry.work_type || "") === value ? "selected" : ""}>
                            ${value || "No work type"}
                        </option>
                    `).join("")}
            </select>

            <label>Title</label>

            <input
                type="text"
                class="edit-title"
                value="${escapeHTML(entry.title)}"
            >

            <label>Content</label>

            <textarea class="edit-content" rows="6">${escapeHTML(entry.content)}</textarea>

            <div class="form-group edit-existing-photos">
                <label>Existing Photos</label>
                <div class="edit-photo-list"></div>
            </div>

            <div class="form-group">
                <label>Add More Photos</label>

                <input
                    type="file"
                    class="edit-photos-input"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                >

                <div class="edit-new-photo-list photo-preview-list"></div>
            </div>

            <div class="edit-actions">
                <button type="button" class="save-edit-button">
                    Save Changes
                </button>

                <button type="button" class="cancel-edit-button">
                    Cancel
                </button>
            </div>

        </div>
    `;

    const existingList = entryElement.querySelector(".edit-photo-list");
    const newList = entryElement.querySelector(".edit-new-photo-list");
    const fileInput = entryElement.querySelector(".edit-photos-input");

    // Display existing photos and their captions.
    function renderExistingPhotos() {
        existingList.innerHTML = "";

        existingPhotos.forEach((photo, index) => {
            const item = document.createElement("div");
            item.className = "photo-preview-item";

            if (photo.remove) {
                item.classList.add("photo-marked-remove");
            }

            const image = document.createElement("img");
            image.src = getPhotoUrl(photo.path);
            image.alt = photo.caption || "Existing photo";

            const details = document.createElement("div");
            details.className = "photo-preview-details";

            const caption = document.createElement("input");
            caption.type = "text";
            caption.className = "photo-caption-input";
            caption.placeholder = "Add a caption (optional)";
            caption.value = photo.caption || "";
            caption.disabled = photo.remove;

            caption.addEventListener("input", function () {
                existingPhotos[index].caption = caption.value;
            });

            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "remove-photo-button";
            remove.textContent = photo.remove ? "Undo remove" : "Remove";

            remove.addEventListener("click", function () {
                existingPhotos[index].remove = !existingPhotos[index].remove;
                renderExistingPhotos();
            });

            details.append(caption, remove);
            item.append(image, details);
            existingList.appendChild(item);
        });
    }

    // Display newly selected photos.
    function renderAddedPhotos() {
        newList.innerHTML = "";

        addedPhotos.forEach((photo, index) => {
            const item = document.createElement("div");
            item.className = "photo-preview-item";

            const image = document.createElement("img");
            image.src = photo.previewUrl;
            image.alt = photo.file.name;

            const details = document.createElement("div");
            details.className = "photo-preview-details";

            const filename = document.createElement("p");
            filename.className = "photo-filename";
            filename.textContent = photo.file.name;

            const caption = document.createElement("input");
            caption.type = "text";
            caption.className = "photo-caption-input";
            caption.placeholder = "Add a caption (optional)";
            caption.value = photo.caption;

            caption.addEventListener("input", function () {
                addedPhotos[index].caption = caption.value;
            });

            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "remove-photo-button";
            remove.textContent = "Remove";

            remove.addEventListener("click", function () {
                URL.revokeObjectURL(addedPhotos[index].previewUrl);
                addedPhotos.splice(index, 1);
                renderAddedPhotos();
            });

            details.append(filename, caption, remove);
            item.append(image, details);
            newList.appendChild(item);
        });
    }

    renderExistingPhotos();

    fileInput.addEventListener("change", function () {
        const files = Array.from(fileInput.files || []);

        files.forEach(file => {
            if (!file.type.startsWith("image/")) {
                alert(file.name + " is not an image.");
                return;
            }

            if (file.size > MAX_PHOTO_SIZE) {
                alert(file.name + " is larger than 10 MB.");
                return;
            }

            addedPhotos.push({
                file: file,
                caption: "",
                previewUrl: URL.createObjectURL(file)
            });
        });

        renderAddedPhotos();
        fileInput.value = "";
    });

    entryElement
        .querySelector(".save-edit-button")
        .addEventListener("click", function () {
            saveEditedEntry(entryId, entryElement, existingPhotos, addedPhotos);
        });

    entryElement
        .querySelector(".cancel-edit-button")
        .addEventListener("click", function () {
            addedPhotos.forEach(photo => URL.revokeObjectURL(photo.previewUrl));
            loadEntries();
        });
}


// ========================================
// SAVE EDITED ENTRY
// ========================================

async function saveEditedEntry(entryId, entryElement, existingPhotos, addedPhotos) {
    const saveButton = entryElement.querySelector(".save-edit-button");

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
        const category = entryElement.querySelector(".edit-category").value;
        const workType = entryElement.querySelector(".edit-work-type").value;
        const title = entryElement.querySelector(".edit-title").value.trim();
        const content = entryElement.querySelector(".edit-content").value.trim();

        if (!title || !content) {
            alert("Please enter a title and content.");
            return;
        }

        const { data: userData } = await supabaseClient.auth.getUser();

        if (!userData.user) {
            alert("Please log in first.");
            return;
        }

        // Keep photos that have not been marked for removal.
        const keptPhotos = existingPhotos
            .filter(photo => !photo.remove)
            .map(photo => ({
                path: photo.path,
                caption: (photo.caption || "").trim()
            }));

        const removedPhotos = existingPhotos.filter(photo => photo.remove);

        // Upload any new photos.
        const uploadedPhotos = await uploadPhotos(
            addedPhotos,
            entryId,
            userData.user.id
        );

        const updatedPhotos = [...keptPhotos, ...uploadedPhotos];

        const { error } = await supabaseClient
            .from("design_entries")
            .update({
                title: title,
                category: category,
                work_type: workType,
                content: content,
                photos: updatedPhotos
            })
            .eq("id", entryId);

        if (error) {
            await removeStoredPhotos(uploadedPhotos);
            throw error;
        }

        // Delete removed files only after the database update succeeds.
        await removeStoredPhotos(removedPhotos);

        addedPhotos.forEach(photo => URL.revokeObjectURL(photo.previewUrl));

        alert("Entry updated!");

        await loadEntries();

    } catch (error) {
        console.error(error);
        alert("There was a problem updating the entry: " + error.message);

    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "Save Changes";
        }
    }
}


// ========================================
// DELETE ENTRY
// ========================================

async function deleteEntry(entryId) {
    const confirmed = confirm(
        "Are you sure you want to delete this entry?"
    );

    if (!confirmed) return;

    // Retrieve photos before deleting the entry.
    const { data: entry, error: fetchError } = await supabaseClient
        .from("design_entries")
        .select("photos")
        .eq("id", entryId)
        .single();

    if (fetchError) {
        alert("Unable to retrieve this entry's photos: " + fetchError.message);
        return;
    }

    // Delete the database entry.
    const { error } = await supabaseClient
        .from("design_entries")
        .delete()
        .eq("id", entryId);

    if (error) {
        console.error(error);
        alert("There was a problem deleting the entry: " + error.message);
        return;
    }

    // Delete its associated Storage files.
    await removeStoredPhotos(
        Array.isArray(entry.photos) ? entry.photos : []
    );

    alert("Entry deleted.");

    await loadEntries();
}


// ========================================
// PHOTO LIGHTBOX
// ========================================

const photoLightbox = document.getElementById("photoLightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxCaption = document.getElementById("lightboxCaption");
const closeLightbox = document.getElementById("closeLightbox");

function openLightbox(photo) {
    if (!photoLightbox || !lightboxImage) return;

    lightboxImage.src = getPhotoUrl(photo.path);
    lightboxCaption.textContent = photo.caption || "";

    photoLightbox.style.display = "flex";
}

function hideLightbox() {
    if (!photoLightbox || !lightboxImage) return;

    photoLightbox.style.display = "none";
    lightboxImage.src = "";
    lightboxCaption.textContent = "";
}

if (closeLightbox) {
    closeLightbox.addEventListener("click", hideLightbox);
}

if (photoLightbox) {
    photoLightbox.addEventListener("click", function (event) {
        if (event.target === photoLightbox) {
            hideLightbox();
        }
    });
}

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        hideLightbox();
    }
});
