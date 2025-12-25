import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- State Variables ---
let currentUser = null;
let allMovies = []; // Store fetched movies for client-side filtering/sorting

// --- DOM Elements ---
// Auth
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const authMessage = document.getElementById('auth-message');
const userEmailSpan = document.getElementById('user-email'); // NEW
const btnLogout = document.getElementById('btn-logout');

// App Controls
const searchInput = document.getElementById('search-movie');
// const sortSelect = document.getElementById('sort-movie'); // Removed
const loadingIndicator = document.getElementById('loading-indicator');
const loadingOverlay = document.getElementById('loading-overlay');
const btnAddMovie = document.getElementById('btn-add-movie'); // NEW

// Dropdown Elements
const dropdownToggle = document.getElementById('dropdown-toggle');
const dropdownMenu = document.getElementById('dropdown-menu');
const dropdownSelected = document.getElementById('dropdown-selected');
const dropdownContainer = document.getElementById('sort-dropdown');
let currentSortValue = 'recent'; // Default sort

// Modal - Add Movie
const addMovieModal = document.getElementById('add-movie-modal'); // NEW
const btnCloseModal = document.getElementById('btn-close-modal'); // NEW

// Modal - Review
const reviewModal = document.getElementById('review-modal');
const btnCloseReview = document.getElementById('btn-close-review');
const reviewForm = document.getElementById('review-form');
let currentReviewMovieId = null;

// Modal - Display Review
const reviewDisplayModal = document.getElementById('review-display-modal');
const btnCloseDisplay = document.getElementById('btn-close-display');

// Modal - Delete
const deleteModal = document.getElementById('delete-modal');
const btnCloseDelete = document.getElementById('btn-close-delete');
const btnCancelDelete = document.getElementById('btn-cancel-delete');
const btnConfirmDelete = document.getElementById('btn-confirm-delete');
let currentDeleteMovieId = null;

// File Upload Elements
const fileInput = document.getElementById('movie-poster-file');
const uploadContent = document.querySelector('.upload-content');
const filePreviewContainer = document.getElementById('file-preview-container');
const filePreviewImage = document.getElementById('file-preview-image');
const fileNameText = document.getElementById('file-name-text');

// Toast Container
const toastContainer = document.getElementById('toast-container');

// Watchlist
const movieForm = document.getElementById("movie-watchlist");
const movieListContainer = document.getElementById("movie-list-container");
const judulContainer = document.getElementById("judul-container");

// --- Initialization ---
async function init() {
    // Check initial session
    const { data: { session } } = await supabase.auth.getSession();
    handleAuthStateChange(session);

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
        handleAuthStateChange(session);
    });
}

function handleAuthStateChange(session) {
    if (session) {
        currentUser = session.user;
        userEmailSpan.textContent = currentUser.email; // UPDATE
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        fetchMovies();
    } else {
        currentUser = null;
        allMovies = [];
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
        movieListContainer.innerHTML = '';
    }
}

// --- Auth Functions ---

// Toggle Tabs
tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    formLogin.classList.remove('hidden');
    formRegister.classList.add('hidden');
    authMessage.textContent = '';
});

tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    formRegister.classList.remove('hidden');
    formLogin.classList.add('hidden');
    authMessage.textContent = '';
});

// Login
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
        showToast(error.message, 'error');
        authMessage.textContent = `Login Error: ${error.message}`; // Keep text too for clarity on auth screen
        authMessage.style.color = '#dc3545';
    } else {
        authMessage.textContent = '';
        showToast('Login successful!', 'success');
    }
});

// Register
formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
        showToast(error.message, 'error');
        authMessage.textContent = `Register Error: ${error.message}`;
        authMessage.style.color = '#dc3545';
    } else {
        showToast('Registration successful! Please login.', 'success');
        authMessage.textContent = 'Registration successful! Please check your email (if confirmation enabled) or login.';
        authMessage.style.color = '#28a745';
        // Auto switch to login tab
        tabLogin.click();
    }
});

// Logout
btnLogout.addEventListener('click', async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
    showToast('Logged out successfully', 'success');
});

// --- Modal Functions ---

// Add Movie
btnAddMovie.addEventListener('click', () => {
    addMovieModal.showModal();
});

btnCloseModal.addEventListener('click', () => {
    addMovieModal.close();
});

addMovieModal.addEventListener('click', (event) => {
    if (event.target === addMovieModal) addMovieModal.close();
});

// Review Modal
btnCloseReview.addEventListener('click', () => {
    reviewModal.close();
});

reviewModal.addEventListener('click', (event) => {
    if (event.target === reviewModal) reviewModal.close();
});

// Display Review Modal
btnCloseDisplay.addEventListener('click', () => {
    reviewDisplayModal.close();
});

reviewDisplayModal.addEventListener('click', (event) => {
    if (event.target === reviewDisplayModal) reviewDisplayModal.close();
});

// Delete Modal
btnCloseDelete.addEventListener('click', () => {
    deleteModal.close();
});

btnCancelDelete.addEventListener('click', () => {
    deleteModal.close();
});

deleteModal.addEventListener('click', (event) => {
    if (event.target === deleteModal) deleteModal.close();
});

btnConfirmDelete.addEventListener('click', () => {
    if (currentDeleteMovieId) {
        performDelete(currentDeleteMovieId);
        deleteModal.close();
    }
});

// File Upload Logic (Preview)
fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        // Show Preview
        const reader = new FileReader();
        reader.onload = function(e) {
            filePreviewImage.src = e.target.result;
            fileNameText.textContent = file.name;

            // Toggle Visibility
            uploadContent.classList.add('hidden');
            filePreviewContainer.classList.remove('hidden');
        }
        reader.readAsDataURL(file);
    } else {
        // Reset
        uploadContent.classList.remove('hidden');
        filePreviewContainer.classList.add('hidden');
        filePreviewImage.src = '';
        fileNameText.textContent = '';
    }
});

// Reset File Input when Modal Closes
function resetFileInput() {
    fileInput.value = '';
    uploadContent.classList.remove('hidden');
    filePreviewContainer.classList.add('hidden');
    filePreviewImage.src = '';
    fileNameText.textContent = '';
}

// --- App Functions ---

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // Icon based on type
    const icon = type === 'success'
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';

    toast.innerHTML = `${icon}<span>${message}</span>`;

    toastContainer.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3000);
}

function setLoading(isLoading) {
    if (isLoading) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

async function fetchMovies() {
    if (!currentUser) return;

    loadingIndicator.classList.remove('hidden');

    // FETCH: Filter by user_id
    const { data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('id', { ascending: false });

    loadingIndicator.classList.add('hidden');

    if (error) {
        console.error('Error fetching movies:', error);
        showToast('Failed to load movies', 'error');
        return;
    }

    allMovies = data;
    renderMovies();
}

// Logic for Search & Sort
function getProcessedMovies() {
    let processed = [...allMovies];

    // Filter
    const query = searchInput.value.toLowerCase();
    if (query) {
        processed = processed.filter(m => m.title.toLowerCase().includes(query));
    }

    // Sort
    const sortBy = currentSortValue;
    if (sortBy === 'rating_desc') {
        // Sort nulls to bottom
        processed.sort((a, b) => {
            const rA = a.rating || 0;
            const rB = b.rating || 0;
            return rB - rA;
        });
    } else if (sortBy === 'year_desc') {
        processed.sort((a, b) => b.year - a.year);
    } else {
        // default: recent (id desc)
        processed.sort((a, b) => b.id - a.id);
    }

    return processed;
}

function renderMovies() {
    const movies = getProcessedMovies();
    movieListContainer.innerHTML = '';

    if (movies.length === 0) {
        if (searchInput.value) {
             judulContainer.textContent = "No matching movies found";
        } else {
             judulContainer.textContent = "Your list is empty. Add a movie!";
        }
    } else {
        judulContainer.textContent = `My List (${movies.length})`;
    }

    movies.forEach(movie => {
        const movieCard = document.createElement("div");
        movieCard.classList.add("movie-card");
        if (movie.is_watched) {
            movieCard.classList.add("watched");
        }

        const posterSrc = movie.poster_url || 'https://placehold.co/300x450/1e1e1e/FFF?text=No+Poster';

        // Show Rating only if watched
        const ratingBadge = movie.is_watched && movie.rating !== null
            ? `<span class="rating-badge">⭐ ${movie.rating}</span>`
            : `<span class="rating-badge" style="opacity: 0.5;">Plan to Watch</span>`;

        // Review Icon if reviewed
        const reviewIcon = movie.is_watched
            ? `<button class="action-btn btn-review" title="Read Review">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
               </button>`
            : '';

        // NEW CARD STRUCTURE (Icons Only)
        movieCard.innerHTML = `
            <div class="card-poster" style="background-image: url('${posterSrc}')">
                ${ratingBadge} <!-- Badge moved to image area -->
                <div class="card-overlay">
                    <button class="action-btn btn-watched ${movie.is_watched ? 'active' : ''}" title="${movie.is_watched ? 'Reset Status' : 'Rate & Review'}">
                        ${movie.is_watched
                            ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>'
                            : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>'
                        }
                    </button>
                    ${reviewIcon}
                    <button class="action-btn btn-delete" title="Delete Movie">
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    </button>
                </div>
            </div>
            <div class="card-info">
                <div class="info-top">
                    <h3 title="${movie.title}">${movie.title}</h3>
                </div>
                <div class="info-bottom">
                    <span class="year">${movie.year}</span>
                </div>
            </div>
        `;

        // Attach listeners
        const btnWatched = movieCard.querySelector('.btn-watched');
        btnWatched.addEventListener("click", (e) => {
            e.stopPropagation();
            handleWatchedClick(movie);
        });

        const btnDelete = movieCard.querySelector('.btn-delete');
        btnDelete.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteMovie(movie.id, movie.title);
        });

        const btnReview = movieCard.querySelector('.btn-review');
        if (btnReview) {
            btnReview.addEventListener("click", (e) => {
                e.stopPropagation();
                showReviewDisplay(movie);
            });
        }

        movieListContainer.appendChild(movieCard);
    });
}

// Event Listeners for Controls
searchInput.addEventListener('input', renderMovies);

// Dropdown Logic
dropdownToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('hidden');
    dropdownContainer.classList.toggle('open');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!dropdownContainer.contains(e.target)) {
        dropdownMenu.classList.add('hidden');
        dropdownContainer.classList.remove('open');
    }
});

// Handle Option Click
dropdownMenu.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (li) {
        const value = li.getAttribute('data-value');
        const text = li.textContent;

        currentSortValue = value;
        dropdownSelected.textContent = text;

        // Update Active State
        document.querySelectorAll('.dropdown-menu li').forEach(item => item.classList.remove('active'));
        li.classList.add('active');

        // Close Dropdown
        dropdownMenu.classList.add('hidden');
        dropdownContainer.classList.remove('open');

        // Re-render
        renderMovies();
    }
});


// Logic for Review Flow
function handleWatchedClick(movie) {
    if (movie.is_watched) {
        // Already watched: Toggle OFF (Reset)
        resetMovieStatus(movie.id);
    } else {
        // Unwatched: Open Review Modal
        openReviewModal(movie.id);
    }
}

function openReviewModal(id) {
    currentReviewMovieId = id;
    document.getElementById('review-rating').value = '';
    document.getElementById('review-text').value = '';
    reviewModal.showModal();
}

async function resetMovieStatus(id) {
    const { error } = await supabase
        .from('movies')
        .update({
            is_watched: false,
            rating: null,
            review: null
        })
        .eq('id', id)
        .eq('user_id', currentUser.id);

    if (error) {
        showToast('Failed to reset status', 'error');
    } else {
        // Local Update
        const movie = allMovies.find(m => m.id === id);
        if (movie) {
            movie.is_watched = false;
            movie.rating = null;
            movie.review = null;
        }
        renderMovies();
        showToast('Movie marked as Unwatched', 'success');
    }
}

// Review Form Submit
reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentReviewMovieId) return;

    const rating = parseFloat(document.getElementById('review-rating').value);
    const review = document.getElementById('review-text').value;

    const { error } = await supabase
        .from('movies')
        .update({
            is_watched: true,
            rating: rating,
            review: review
        })
        .eq('id', currentReviewMovieId)
        .eq('user_id', currentUser.id);

    if (error) {
        showToast('Failed to save review', 'error');
    } else {
        // Local Update
        const movie = allMovies.find(m => m.id === currentReviewMovieId);
        if (movie) {
            movie.is_watched = true;
            movie.rating = rating;
            movie.review = review;
        }
        reviewModal.close();
        renderMovies();
        showToast('Review saved!', 'success');
    }
});

function showReviewDisplay(movie) {
    document.getElementById('display-movie-title').textContent = movie.title;
    document.getElementById('display-rating').textContent = movie.rating;
    document.getElementById('display-review-text').textContent = movie.review || "No review text.";
    reviewDisplayModal.showModal();
}

// Delete Logic
function deleteMovie(id, title) {
    currentDeleteMovieId = id;
    document.getElementById('delete-movie-title').textContent = title;
    deleteModal.showModal();
}

async function performDelete(id) {
    const { error } = await supabase
        .from('movies')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUser.id); // Ensure ownership

    if (error) {
        console.error('Error deleting movie:', error);
        showToast('Failed to delete movie', 'error');
    } else {
            // Update local state
        allMovies = allMovies.filter(m => m.id !== id);
        renderMovies();
        showToast('Movie deleted', 'success');
    }
}

// Add Movie Submit
movieForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    if (!currentUser) {
        showToast("You must be logged in to add movies.", 'error');
        return;
    }

    const title = document.getElementById("movie-title").value;
    const year = document.getElementById("movie-year").value;
    // Rating input removed from Add Form
    const posterFile = document.getElementById("movie-poster-file").files[0];
    const submitBtn = document.getElementById("btn-submit-movie");

    let posterUrl = null;

    // Loading State
    submitBtn.disabled = true;
    submitBtn.textContent = "Uploading...";

    try {
        // Upload Image if selected
        if (posterFile) {
            const fileExt = posterFile.name.split('.').pop();
            const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;

            // Step A: Upload
            const { error: uploadError } = await supabase.storage
                .from('posters')
                .upload(fileName, posterFile);

            if (uploadError) {
                throw new Error(`Upload failed: ${uploadError.message}`);
            }

            // Step B: Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('posters')
                .getPublicUrl(fileName);

            posterUrl = publicUrl;
        }

        // INSERT: Include user_id & uploaded poster_url
        // Default: is_watched = false, rating = null
        const { data, error } = await supabase
            .from('movies')
            .insert([{
                title,
                year,
                rating: null,
                is_watched: false,
                poster_url: posterUrl,
                user_id: currentUser.id
            }])
            .select();

        if (error) {
            throw error;
        }

        // Success
        movieForm.reset();
        resetFileInput(); // Reset preview
        addMovieModal.close();
        showToast('Movie added successfully!', 'success');

        // Add new movie to local list
        if (data && data.length > 0) {
            allMovies.unshift(data[0]);
            renderMovies();
        } else {
            fetchMovies();
        }

    } catch (error) {
        console.error('Error adding movie:', error);
        showToast(error.message, 'error');
    } finally {
        // Reset Button
        submitBtn.disabled = false;
        submitBtn.textContent = "Add to Collection";
    }
});

// Start app
init();
