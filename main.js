import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const movieForm = document.getElementById("movie-watchlist");
const movieListContainer = document.getElementById("movie-list-container");
const judulContainer = document.getElementById("judul-container");

function checkEmptyState() {
    if (movieListContainer.children.length === 0) {
        judulContainer.textContent = "Daftar Film Kosong 🍿";
    } else {
        judulContainer.textContent = "Daftar Film";
    }
}

async function fetchMovies() {
    const { data, error } = await supabase
        .from('movies')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        console.error('Error fetching movies:', error);
        return;
    }

    renderMovies(data);
}

function renderMovies(movies) {
    movieListContainer.innerHTML = '';

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

    checkEmptyState();
}

async function toggleWatched(id, currentStatus) {
    const { error } = await supabase
        .from('movies')
        .update({ is_watched: !currentStatus })
        .eq('id', id);

    if (error) {
        console.error('Error toggling watched status:', error);
    } else {
        fetchMovies();
    }
}

async function deleteMovie(id, title) {
    if (confirm(`Yakin ingin menghapus film "${title}"?`)) {
        const { error } = await supabase
            .from('movies')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting movie:', error);
        } else {
            fetchMovies();
        }
    }
}

movieForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const title = document.getElementById("movie-title").value;
    const year = document.getElementById("movie-year").value;
    const rating = document.getElementById("movie-rating").value;
    let poster = document.getElementById("movie-poster").value;

    if (poster.trim() === "") {
        poster = null;
    }

    const { error } = await supabase
        .from('movies')
        .insert([{ title, year, rating, poster_url: poster }]);

    if (error) {
        console.error('Error adding movie:', error);
    } else {
        movieForm.reset();
        fetchMovies();
    }
});

// Initial fetch
fetchMovies();
