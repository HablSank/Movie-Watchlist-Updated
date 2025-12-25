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
const btnLogout = document.getElementById('btn-logout');

// App Controls
const searchInput = document.getElementById('search-movie');
const sortSelect = document.getElementById('sort-movie');
const loadingIndicator = document.getElementById('loading-indicator');
const loadingOverlay = document.getElementById('loading-overlay');

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

// --- App Functions ---

function setLoading(isLoading) {
    if (isLoading) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

function checkEmptyState() {
    if (movieListContainer.children.length === 0) {
        // Only show "Empty" if we aren't loading and have no movies to show
        // But for now, simple check is fine
        judulContainer.textContent = "Daftar Film Kosong 🍿";
    } else {
        judulContainer.textContent = "Daftar Film";
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
             judulContainer.textContent = "Tidak ada hasil pencarian";
        } else {
             judulContainer.textContent = "Daftar Film Kosong 🍿";
        }
    } else {
        judulContainer.textContent = "Daftar Film";
    }

    movies.forEach(movie => {
        const movieCard = document.createElement("div");
        movieCard.classList.add("movie-card");
        if (movie.is_watched) {
            movieCard.classList.add("watched");
        }

        movieCard.innerHTML = `
            <div class="movie-card-content">
                <img src="${movie.poster_url || 'https://placehold.co/100x150?text=No+Image'}" alt="Poster Film ${movie.title}">
                <div class="movie-details">
                    <h3>${movie.title}</h3>
                    <p>Tahun: ${movie.year}</p>
                    <p>Rating: ${movie.rating} / 10</p>
                </div>
            </div>
        `;

        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add("card-buttons");

        const btnWatched = document.createElement("button");
        btnWatched.textContent = "Sudah Ditonton";
        btnWatched.classList.add("btnWatched");
        btnWatched.addEventListener("click", () => toggleWatched(movie.id, movie.is_watched));

        const btnDelete = document.createElement("button");
        btnDelete.textContent = "Hapus";
        btnDelete.classList.add("btnDelete");
        btnDelete.addEventListener("click", () => deleteMovie(movie.id, movie.title));

        buttonContainer.appendChild(btnWatched);
        buttonContainer.appendChild(btnDelete);

        movieCard.appendChild(buttonContainer);
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
    if (confirm(`Yakin ingin menghapus film "${title}"?`)) {
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
