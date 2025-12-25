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
const sortSelect = document.getElementById('sort-movie');
const loadingIndicator = document.getElementById('loading-indicator');
const loadingOverlay = document.getElementById('loading-overlay');
const btnAddMovie = document.getElementById('btn-add-movie'); // NEW

// Modal
const addMovieModal = document.getElementById('add-movie-modal'); // NEW
const btnCloseModal = document.getElementById('btn-close-modal'); // NEW

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
        authMessage.textContent = `Login Error: ${error.message}`;
        authMessage.style.color = '#dc3545';
    } else {
        authMessage.textContent = '';
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
        authMessage.textContent = `Register Error: ${error.message}`;
        authMessage.style.color = '#dc3545';
    } else {
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
});

// --- Modal Functions ---
btnAddMovie.addEventListener('click', () => {
    addMovieModal.showModal();
});

btnCloseModal.addEventListener('click', () => {
    addMovieModal.close();
});

addMovieModal.addEventListener('click', (event) => {
    // Close when clicking outside
    if (event.target === addMovieModal) {
        addMovieModal.close();
    }
});


// --- App Functions ---

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
    const sortBy = sortSelect.value;
    if (sortBy === 'rating_desc') {
        processed.sort((a, b) => b.rating - a.rating);
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

        // NEW CARD STRUCTURE
        movieCard.innerHTML = `
            <div class="card-poster" style="background-image: url('${posterSrc}')">
                <div class="card-overlay">
                    <button class="action-btn btn-watched ${movie.is_watched ? 'active' : ''}" title="Toggle Watched">
                        ${movie.is_watched
                            ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
                            : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>'
                        }
                    </button>
                    <button class="action-btn btn-delete" title="Delete Movie">
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
            <div class="card-info">
                <div class="info-top">
                    <h3 title="${movie.title}">${movie.title}</h3>
                    <span class="rating-badge">${movie.rating}</span>
                </div>
                <div class="info-bottom">
                    <span class="year">${movie.year}</span>
                </div>
            </div>
        `;

        // Attach listeners
        const btnWatched = movieCard.querySelector('.btn-watched');
        btnWatched.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent card click
            toggleWatched(movie.id, movie.is_watched);
        });

        const btnDelete = movieCard.querySelector('.btn-delete');
        btnDelete.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent card click
            deleteMovie(movie.id, movie.title);
        });

        movieListContainer.appendChild(movieCard);
    });
}

// Event Listeners for Controls
searchInput.addEventListener('input', renderMovies);
sortSelect.addEventListener('change', renderMovies);


async function toggleWatched(id, currentStatus) {
    const { error } = await supabase
        .from('movies')
        .update({ is_watched: !currentStatus })
        .eq('id', id)
        .eq('user_id', currentUser.id); // Ensure ownership

    if (error) {
        console.error('Error toggling watched status:', error);
    } else {
        // Update local state to avoid full refetch
        const movie = allMovies.find(m => m.id === id);
        if (movie) movie.is_watched = !currentStatus;
        renderMovies();
    }
}

async function deleteMovie(id, title) {
    if (confirm(`Are you sure you want to remove "${title}"?`)) {
        const { error } = await supabase
            .from('movies')
            .delete()
            .eq('id', id)
            .eq('user_id', currentUser.id); // Ensure ownership

        if (error) {
            console.error('Error deleting movie:', error);
        } else {
             // Update local state
            allMovies = allMovies.filter(m => m.id !== id);
            renderMovies();
        }
    }
}

movieForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    if (!currentUser) {
        alert("You must be logged in to add movies.");
        return;
    }

    const title = document.getElementById("movie-title").value;
    const year = document.getElementById("movie-year").value;
    const rating = parseFloat(document.getElementById("movie-rating").value); // Parse float
    let poster = document.getElementById("movie-poster").value;

    if (poster.trim() === "") {
        poster = null;
    }

    // INSERT: Include user_id
    const { data, error } = await supabase
        .from('movies')
        .insert([{
            title,
            year,
            rating,
            poster_url: poster,
            user_id: currentUser.id
        }])
        .select();

    if (error) {
        console.error('Error adding movie:', error);
    } else {
        movieForm.reset();
        addMovieModal.close(); // NEW: Close modal on success
        // Add new movie to local list
        if (data && data.length > 0) {
            allMovies.unshift(data[0]);
            renderMovies();
        } else {
            // Fallback if data not returned
            fetchMovies();
        }
    }
});

// Start app
init();
