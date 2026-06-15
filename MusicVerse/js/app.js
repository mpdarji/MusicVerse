// ── CONFIG ────────────────────────────────────────────────────────────────────
// List of artists to load albums from TheAudioDB (free tier)
const ARTISTS = ['Coldplay', 'Adele', 'Ed Sheeran', 'Taylor Swift', 'The Weeknd'];
const API_BASE = 'https://www.theaudiodb.com/api/v1/json/2/searchalbum.php?s=';

// ── STATE ─────────────────────────────────────────────────────────────────────
let allAlbums = [];       // full dataset fetched from API
let filtered  = [];       // currently displayed subset

// ── DOM REFS ──────────────────────────────────────────────────────────────────
const container    = document.getElementById('musicContainer');
const searchInput  = document.getElementById('searchInput');
const sortSelect   = document.getElementById('sortSelect');
const genreFilter  = document.getElementById('genreFilter');
const resetBtn     = document.getElementById('resetBtn');
const resultCount  = document.getElementById('resultCount');
const noResults    = document.getElementById('noResults');
const loadingState = document.getElementById('loadingState');
const modal        = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');

// ── FETCH ─────────────────────────────────────────────────────────────────────
async function loadAllAlbums() {
  showLoading(true);

  // Fetch all artists in parallel
  const promises = ARTISTS.map(artist =>
    fetch(API_BASE + encodeURIComponent(artist))
      .then(r => r.json())
      .then(data => data.album || [])
      .catch(() => [])          // if one artist fails, skip gracefully
  );

  const results = await Promise.all(promises);
  allAlbums = results.flat().filter(a => a && a.strAlbum);

  showLoading(false);
  populateGenreFilter();
  applyFilters();
}

// ── GENRE DROPDOWN ────────────────────────────────────────────────────────────
function populateGenreFilter() {
  const genres = [...new Set(
    allAlbums.map(a => a.strGenre).filter(Boolean)
  )].sort();

  genres.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = g;
    genreFilter.appendChild(opt);
  });
}

// ── FILTER + SORT ─────────────────────────────────────────────────────────────
function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();
  const genre = genreFilter.value;
  const sort  = sortSelect.value;

  filtered = allAlbums.filter(a => {
    const matchSearch = !query ||
      (a.strArtist || '').toLowerCase().includes(query) ||
      (a.strAlbum  || '').toLowerCase().includes(query);
    const matchGenre = genre === 'all' || a.strGenre === genre;
    return matchSearch && matchGenre;
  });

  // Sort
  filtered.sort((a, b) => {
    switch (sort) {
      case 'year-desc': return (b.intYearReleased || 0) - (a.intYearReleased || 0);
      case 'year-asc':  return (a.intYearReleased || 0) - (b.intYearReleased || 0);
      case 'name-asc':  return (a.strAlbum || '').localeCompare(b.strAlbum || '');
      case 'name-desc': return (b.strAlbum || '').localeCompare(a.strAlbum || '');
      default:          return 0;
    }
  });

  renderCards(filtered);
  updateResultCount(filtered.length);
  noResults.classList.toggle('hidden', filtered.length > 0);
}

// ── RENDER ────────────────────────────────────────────────────────────────────
function renderCards(albums) {
  container.innerHTML = '';

  albums.forEach(album => {
    const card = document.createElement('div');
    card.className = 'card';

    // Image section
    const imgWrap = document.createElement('div');
    imgWrap.className = 'card-img-wrap';

    if (album.strAlbumThumb) {
      const img = document.createElement('img');
      img.src = album.strAlbumThumb;
      img.alt = album.strAlbum;
      img.loading = 'lazy';
      img.onerror = () => {
        imgWrap.innerHTML = '<div class="card-img-placeholder">🎵</div>';
      };
      imgWrap.appendChild(img);
    } else {
      imgWrap.innerHTML = '<div class="card-img-placeholder">🎵</div>';
    }

    if (album.intYearReleased) {
      const badge = document.createElement('span');
      badge.className = 'card-year-badge';
      badge.textContent = album.intYearReleased;
      imgWrap.appendChild(badge);
    }

    // Card body — 4+ fields: album, artist, genre, label
    const body = document.createElement('div');
    body.className = 'card-body';

    body.innerHTML = `
      <div class="card-album">${album.strAlbum || 'Unknown Album'}</div>
      <div class="card-artist">${album.strArtist || 'Unknown Artist'}</div>
      <div class="card-meta">
        ${album.strGenre  ? `<span class="tag">${album.strGenre}</span>` : ''}
        ${album.strLabel  ? `<span class="tag label-tag">${album.strLabel}</span>` : ''}
      </div>
    `;

    // Details button
    const footer = document.createElement('div');
    footer.className = 'card-footer';
    const btn = document.createElement('button');
    btn.className = 'details-btn';
    btn.textContent = 'View Details';
    btn.addEventListener('click', () => openModal(album));
    footer.appendChild(btn);

    card.appendChild(imgWrap);
    card.appendChild(body);
    card.appendChild(footer);
    container.appendChild(card);
  });
}

// ── RESULT COUNT ──────────────────────────────────────────────────────────────
function updateResultCount(count) {
  if (allAlbums.length === 0) {
    resultCount.innerHTML = '';
    return;
  }
  resultCount.innerHTML = count === allAlbums.length
    ? `Showing <strong>${count}</strong> albums`
    : `Showing <strong>${count}</strong> of <strong>${allAlbums.length}</strong> albums`;
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
function openModal(album) {
  modalContent.innerHTML = `
    ${album.strAlbumThumb
      ? `<img class="modal-img" src="${album.strAlbumThumb}" alt="${album.strAlbum}" onerror="this.outerHTML='<div class=\\'modal-img-placeholder\\'>🎵</div>'">`
      : '<div class="modal-img-placeholder">🎵</div>'
    }
    <div class="modal-body">
      <div class="modal-artist">${album.strArtist || ''}</div>
      <div class="modal-title">${album.strAlbum || 'Unknown Album'}</div>
      <div class="modal-tags">
        ${album.strGenre ? `<span class="tag">${album.strGenre}</span>` : ''}
        ${album.strMood  ? `<span class="tag">${album.strMood}</span>`  : ''}
        ${album.strSpeed ? `<span class="tag">${album.strSpeed}</span>` : ''}
      </div>

      <div class="modal-row"><span>Year Released</span><span>${album.intYearReleased || '—'}</span></div>
      <div class="modal-row"><span>Record Label</span><span>${album.strLabel || '—'}</span></div>
      <div class="modal-row"><span>Country</span><span>${album.strArtistCountry || '—'}</span></div>
      <div class="modal-row"><span>Tracks</span><span>${album.intTracks || '—'}</span></div>

      ${album.strDescriptionEN
        ? `<div class="modal-desc">${album.strDescriptionEN.slice(0, 400)}${album.strDescriptionEN.length > 400 ? '…' : ''}</div>`
        : ''}
    </div>
  `;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.add('hidden');
  document.body.style.overflow = '';
}

// Close modal with Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// ── RESET ─────────────────────────────────────────────────────────────────────
function resetAll() {
  searchInput.value  = '';
  sortSelect.value   = 'default';
  genreFilter.value  = 'all';
  applyFilters();
}

// ── LOADING STATE ─────────────────────────────────────────────────────────────
function showLoading(show) {
  loadingState.classList.toggle('hidden', !show);
  container.classList.toggle('hidden', show);
}

// ── EVENT LISTENERS ───────────────────────────────────────────────────────────
searchInput.addEventListener('input',  applyFilters);
sortSelect.addEventListener('change',  applyFilters);
genreFilter.addEventListener('change', applyFilters);
resetBtn.addEventListener('click',     resetAll);

// ── INIT ──────────────────────────────────────────────────────────────────────
loadAllAlbums();
