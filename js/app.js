/**
 * APP.JS - Główna logika aplikacji kulinarnej "Smakosz & Co."
 * Obsługa nawigacji, koszyka, grupowania składników, trybu sklepowego, planera i lodówki
 */

// Stan aplikacji
const state = {
  activeTab: 'topka',
  cart: JSON.parse(localStorage.getItem('kuchnia_cart') || '[]'), // { recipeId, servings }
  boughtItems: JSON.parse(localStorage.getItem('kuchnia_bought') || '[]'), // array of unique item keys
  customGroceries: JSON.parse(localStorage.getItem('kuchnia_custom_groceries') || '[]'),
  removedIngredients: JSON.parse(localStorage.getItem('kuchnia_removed_ingr') || '[]'),
  favorites: JSON.parse(localStorage.getItem('kuchnia_favs') || '[]'),
  weeklyPlan: JSON.parse(localStorage.getItem('kuchnia_weekly_plan') || '{}'),
  filters: {
    category: 'all',
    cuisine: 'all',
    difficulty: 'all',
    maxTime: 'all',
    search: ''
  },
  fridgeSelected: ['Jajka', 'Czosnek', 'Pomidory pelati w puszce'],
  shopMode: false,
  hideBought: false,
  timerInterval: null,
  timerSecondsLeft: 0,
  currentModalRecipe: null,
  currentModalServings: 4
};

// Zapisywanie do localStorage
function saveState() {
  localStorage.setItem('kuchnia_cart', JSON.stringify(state.cart));
  localStorage.setItem('kuchnia_bought', JSON.stringify(state.boughtItems));
  localStorage.setItem('kuchnia_custom_groceries', JSON.stringify(state.customGroceries));
  localStorage.setItem('kuchnia_removed_ingr', JSON.stringify(state.removedIngredients));
  localStorage.setItem('kuchnia_favs', JSON.stringify(state.favorites));
  localStorage.setItem('kuchnia_weekly_plan', JSON.stringify(state.weeklyPlan));
}

// Inicjalizacja po załadowaniu DOM
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initSearchAndFilters();
  initCartListeners();
  initFridgeAssistant();
  initWeeklyPlanner();
  initTimer();
  updateCartBadge();
  renderActiveView();

  // Domyślny koszyk z 2 pysznymi daniami, jeśli koszyk jest zupełnie pusty przy pierwszym uruchomieniu
  if (state.cart.length === 0 && !localStorage.getItem('kuchnia_visited')) {
    state.cart = [
      { recipeId: 'ragu-bolognese', servings: 4 },
      { recipeId: 'pancakes-puszyste', servings: 2 }
    ];
    saveState();
    updateCartBadge();
  }
  localStorage.setItem('kuchnia_visited', 'true');
});

/* ========================================================
   NAWIGACJA MIĘDZY PODSTRONAMI
   ======================================================== */
function initNavigation() {
  const navButtons = document.querySelectorAll('[data-nav-target]');
  navButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.getAttribute('data-nav-target');
      switchView(target);
    });
  });

  // Obsługa hasha w URL (#topka, #przepisy, #koszyk itp.)
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (['topka', 'przepisy', 'lodowka', 'planer', 'koszyk'].includes(hash)) {
      switchView(hash, false);
    }
  });

  if (window.location.hash) {
    const hash = window.location.hash.replace('#', '');
    if (['topka', 'przepisy', 'lodowka', 'planer', 'koszyk'].includes(hash)) {
      switchView(hash, false);
    }
  }
}

function switchView(viewName, updateHash = true) {
  state.activeTab = viewName;
  if (updateHash) {
    window.location.hash = viewName;
  }

  // Zaktualizuj przyciski w menu
  document.querySelectorAll('[data-nav-target]').forEach(btn => {
    if (btn.getAttribute('data-nav-target') === viewName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Przełącz widoczność sekcji
  const views = ['topka', 'przepisy', 'lodowka', 'planer', 'koszyk'];
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) {
      if (v === viewName) {
        el.classList.remove('hidden');
        el.classList.add('fade-in');
      } else {
        el.classList.add('hidden');
        el.classList.remove('fade-in');
      }
    }
  });

  // Zamknij menu mobilne jeśli było otwarte
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
    mobileMenu.classList.add('hidden');
  }

  // Przewiń do góry
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Wyrenderuj zawartość aktywnego widoku
  renderActiveView();
}

function renderActiveView() {
  switch (state.activeTab) {
    case 'topka':
      renderTopkaView();
      break;
    case 'przepisy':
      renderCatalogView();
      break;
    case 'lodowka':
      renderFridgeView();
      break;
    case 'planer':
      renderPlannerView();
      break;
    case 'koszyk':
      renderCartView();
      break;
  }
}

/* ========================================================
   WIDOK 1: TOPKA & POLECANE
   ======================================================== */
function renderTopkaView() {
  const container = document.getElementById('top-recipes-grid');
  const quickContainer = document.getElementById('quick-recipes-grid');
  if (!container) return;

  // Dania oznaczone jako isTop
  const topRecipes = RECIPES_DATA.filter(r => r.isTop);
  container.innerHTML = topRecipes.map(recipe => createRecipeCardHTML(recipe, true)).join('');

  // Szybkie dania (czas <= 25 min)
  if (quickContainer) {
    const quickRecipes = RECIPES_DATA.filter(r => r.time <= 25).slice(0, 4);
    quickContainer.innerHTML = quickRecipes.map(recipe => createRecipeCardHTML(recipe)).join('');
  }

  attachCardEvents();
}

/* ========================================================
   WIDOK 2: KATALOG I ZBIÓR PRZEPISÓW
   ======================================================== */
function initSearchAndFilters() {
  // Wyszukiwarka tekstowa
  const searchInput = document.getElementById('recipe-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.filters.search = e.target.value.toLowerCase().trim();
      renderCatalogView();
    });
  }

  // Szybka wyszukiwarka w nagłówku
  const headerSearchInput = document.getElementById('header-search-input');
  if (headerSearchInput) {
    headerSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const val = headerSearchInput.value.trim();
        state.filters.search = val.toLowerCase();
        if (searchInput) searchInput.value = val;
        switchView('przepisy');
      }
    });
  }

  // Przyciski kategorii
  const categoryFilters = document.getElementById('category-filter-bar');
  if (categoryFilters) {
    categoryFilters.innerHTML = RECIPE_CATEGORIES.map(cat => `
      <button data-category="${cat.id}" class="category-pill flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
        state.filters.category === cat.id
          ? 'bg-rose-600 text-white shadow-md shadow-rose-200'
          : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
      }">
        <span>${cat.icon}</span>
        <span>${cat.label}</span>
      </button>
    `).join('');

    categoryFilters.querySelectorAll('.category-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-category');
        state.filters.category = cat;
        initSearchAndFilters();
        renderCatalogView();
      });
    });
  }

  // Filtr kuchni
  const cuisineSelect = document.getElementById('filter-cuisine');
  if (cuisineSelect) {
    cuisineSelect.addEventListener('change', (e) => {
      state.filters.cuisine = e.target.value;
      renderCatalogView();
    });
  }

  // Filtr trudności
  const difficultySelect = document.getElementById('filter-difficulty');
  if (difficultySelect) {
    difficultySelect.addEventListener('change', (e) => {
      state.filters.difficulty = e.target.value;
      renderCatalogView();
    });
  }

  // Filtr czasu
  const timeSelect = document.getElementById('filter-time');
  if (timeSelect) {
    timeSelect.addEventListener('change', (e) => {
      state.filters.maxTime = e.target.value;
      renderCatalogView();
    });
  }

  // Reset filtrów
  const resetBtn = document.getElementById('btn-reset-filters');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.filters = {
        category: 'all',
        cuisine: 'all',
        difficulty: 'all',
        maxTime: 'all',
        search: ''
      };
      if (searchInput) searchInput.value = '';
      if (cuisineSelect) cuisineSelect.value = 'all';
      if (difficultySelect) difficultySelect.value = 'all';
      if (timeSelect) timeSelect.value = 'all';
      initSearchAndFilters();
      renderCatalogView();
    });
  }
}

function renderCatalogView() {
  const container = document.getElementById('all-recipes-grid');
  const countBadge = document.getElementById('catalog-results-count');
  if (!container) return;

  const filtered = RECIPES_DATA.filter(recipe => {
    // Kategoria
    if (state.filters.category !== 'all' && recipe.category !== state.filters.category) {
      return false;
    }
    // Kuchnia
    if (state.filters.cuisine !== 'all' && recipe.cuisine !== state.filters.cuisine) {
      return false;
    }
    // Trudność
    if (state.filters.difficulty !== 'all' && recipe.difficulty !== state.filters.difficulty) {
      return false;
    }
    // Czas
    if (state.filters.maxTime !== 'all') {
      const max = parseInt(state.filters.maxTime);
      if (recipe.time > max) return false;
    }
    // Wyszukiwanie tekstowe (tytuł, opis, składniki, tagi)
    if (state.filters.search) {
      const term = state.filters.search;
      const inTitle = recipe.title.toLowerCase().includes(term);
      const inDesc = recipe.description.toLowerCase().includes(term);
      const inTags = recipe.tags.some(t => t.toLowerCase().includes(term));
      const inIngr = recipe.ingredients.some(i => i.name.toLowerCase().includes(term));
      if (!inTitle && !inDesc && !inTags && !inIngr) return false;
    }
    return true;
  });

  if (countBadge) {
    countBadge.textContent = `${filtered.length} ${getPolishRecipeNoun(filtered.length)}`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center">
        <div class="text-6xl mb-4">🔍</div>
        <h3 class="text-xl font-bold text-stone-800 mb-2">Brak przepisów spełniających kryteria</h3>
        <p class="text-stone-500 max-w-md mx-auto mb-6">Spróbuj zmienić filtry lub wpisać inną frazę wyszukiwania.</p>
        <button id="btn-clear-search-empty" class="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium transition-all shadow-md">
          Wyczyść wszystkie filtry
        </button>
      </div>
    `;
    const clearBtn = document.getElementById('btn-clear-search-empty');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        document.getElementById('btn-reset-filters')?.click();
      });
    }
    return;
  }

  container.innerHTML = filtered.map(recipe => createRecipeCardHTML(recipe)).join('');
  attachCardEvents();
}

function getPolishRecipeNoun(count) {
  if (count === 1) return 'przepis';
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'przepisy';
  return 'przepisów';
}

/* ========================================================
   KREACJA KARTY PRZEPISU (HTML)
   ======================================================== */
function createRecipeCardHTML(recipe, isFeatured = false) {
  const isInCart = state.cart.some(item => item.recipeId === recipe.id);
  const isFav = state.favorites.includes(recipe.id);

  const difficultyColors = {
    'Łatwy': 'bg-emerald-100 text-emerald-800',
    'Średni': 'bg-amber-100 text-amber-800',
    'Zaawansowany': 'bg-rose-100 text-rose-800'
  };

  return `
    <article class="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 card-hover-effect flex flex-col border border-stone-200/80 group">
      <!-- Obrazek i nakładki -->
      <div class="relative h-52 sm:h-56 overflow-hidden cursor-pointer" onclick="openRecipeModal('${recipe.id}')">
        <img 
          src="${recipe.image}" 
          alt="${recipe.title}"
          loading="lazy"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onerror="this.src='https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=800&q=80'"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80"></div>
        
        <!-- Pływające etykiety na zdjęciu -->
        <div class="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span class="badge-tag ${difficultyColors[recipe.difficulty] || 'bg-stone-100 text-stone-800'} shadow-sm">
            ${recipe.difficulty}
          </span>
          ${recipe.isChefSpecial ? `
            <span class="badge-tag bg-amber-500 text-white shadow-sm flex items-center gap-1">
              ⭐ Wybór Szefa
            </span>
          ` : ''}
        </div>

        <div class="absolute top-3 right-3">
          <button 
            type="button"
            onclick="toggleFavorite('${recipe.id}', event)" 
            class="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-stone-700 hover:text-rose-600 transition-colors shadow-sm"
            title="Dodaj do ulubionych"
          >
            ${isFav ? '❤️' : '🤍'}
          </button>
        </div>

        <div class="absolute bottom-3 left-3 right-3 text-white flex justify-between items-center text-xs font-medium">
          <span class="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
            ⏱️ ${recipe.time} min
          </span>
          <span class="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
            🔥 ${recipe.calories} kcal
          </span>
          <span class="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full text-amber-300">
            ★ ${recipe.rating} (${recipe.reviewsCount})
          </span>
        </div>
      </div>

      <!-- Treść karty -->
      <div class="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-2 text-xs font-semibold text-rose-600 mb-1.5 uppercase tracking-wider">
            <span>${getCuisineName(recipe.cuisine)}</span>
            <span>•</span>
            <span>${recipe.category}</span>
          </div>

          <h3 
            onclick="openRecipeModal('${recipe.id}')"
            class="font-bold text-lg text-stone-900 group-hover:text-rose-600 transition-colors cursor-pointer line-clamp-1 mb-2"
          >
            ${recipe.title}
          </h3>

          <p class="text-stone-500 text-xs sm:text-sm line-clamp-2 mb-4 leading-relaxed">
            ${recipe.subtitle || recipe.description}
          </p>

          <!-- Tagi -->
          <div class="flex flex-wrap gap-1 mb-4">
            ${recipe.tags.slice(0, 3).map(tag => `
              <span class="text-[11px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md">#${tag}</span>
            `).join('')}
          </div>
        </div>

        <!-- Stopka karty z przyciskiem do koszyka -->
        <div class="pt-3 border-t border-stone-100 flex items-center gap-2">
          <button 
            type="button"
            onclick="openRecipeModal('${recipe.id}')"
            class="flex-1 px-3 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors text-center"
          >
            Szczegóły
          </button>
          
          <button 
            type="button"
            onclick="toggleCartRecipe('${recipe.id}', event)"
            class="flex-1 px-3 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm ${
              isInCart 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }"
          >
            <span>${isInCart ? '✓ W koszyku' : '+ Do koszyka'}</span>
          </button>
        </div>
      </div>
    </article>
  `;
}

function getCuisineName(cuisineKey) {
  const match = CUISINE_TYPES.find(c => c.id === cuisineKey);
  return match ? match.label.replace(/^[^\s]+ /, '') : cuisineKey;
}

function attachCardEvents() {
  // Event listeners są już przypisane inline przez onclick dla wygody i niezawodności
}

/* ========================================================
   MODAL ZE SZCZEGÓŁAMI PRZEPISU
   ======================================================== */
function openRecipeModal(recipeId) {
  const recipe = RECIPES_DATA.find(r => r.id === recipeId);
  if (!recipe) return;

  state.currentModalRecipe = recipe;
  
  // Sprawdź czy to danie jest już w koszyku z określoną liczbą porcji
  const cartItem = state.cart.find(i => i.recipeId === recipeId);
  state.currentModalServings = cartItem ? cartItem.servings : recipe.defaultServings;

  const modalContainer = document.getElementById('recipe-modal-container');
  if (!modalContainer) return;

  renderModalContent();
  modalContainer.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeRecipeModal() {
  const modalContainer = document.getElementById('recipe-modal-container');
  if (modalContainer) {
    modalContainer.classList.add('hidden');
  }
  document.body.style.overflow = '';
  state.currentModalRecipe = null;
}

function adjustModalServings(delta) {
  if (!state.currentModalRecipe) return;
  const newServings = state.currentModalServings + delta;
  if (newServings >= 1 && newServings <= 20) {
    state.currentModalServings = newServings;
    renderModalContent();
  }
}

function renderModalContent() {
  const recipe = state.currentModalRecipe;
  const modalContent = document.getElementById('recipe-modal-content');
  if (!recipe || !modalContent) return;

  const servingsRatio = state.currentModalServings / recipe.defaultServings;
  const isInCart = state.cart.some(i => i.recipeId === recipe.id);

  modalContent.innerHTML = `
    <!-- Nagłówek modala ze zdjęciem -->
    <div class="relative h-64 sm:h-80 w-full overflow-hidden">
      <img 
        src="${recipe.image}" 
        alt="${recipe.title}" 
        class="w-full h-full object-cover"
        onerror="this.src='https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=800&q=80'"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20"></div>

      <!-- Przycisk zamknięcia -->
      <button 
        type="button"
        onclick="closeRecipeModal()" 
        class="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-colors text-xl font-bold backdrop-blur-md z-10"
      >
        ✕
      </button>

      <!-- Tytuł i metadane -->
      <div class="absolute bottom-6 left-6 right-6 text-white">
        <div class="flex items-center gap-2 mb-2 text-xs font-semibold tracking-wider uppercase text-rose-300">
          <span>${getCuisineName(recipe.cuisine)}</span>
          <span>•</span>
          <span>${recipe.category}</span>
          <span>•</span>
          <span>${recipe.difficulty}</span>
        </div>
        <h2 class="text-2xl sm:text-3xl font-extrabold mb-2 text-white serif-font">${recipe.title}</h2>
        <div class="flex flex-wrap gap-4 text-xs sm:text-sm font-medium text-stone-200">
          <span>⏱️ Czas: <strong>${recipe.time} min</strong></span>
          <span>🔥 Kalorie: <strong>${recipe.calories} kcal/porcję</strong></span>
          <span>★ Ocena: <strong class="text-amber-300">${recipe.rating}</strong> (${recipe.reviewsCount} opinii)</span>
        </div>
      </div>
    </div>

    <!-- Ciało modala -->
    <div class="p-6 sm:p-8 space-y-8">
      <!-- Opis dania -->
      <div class="text-stone-600 text-sm sm:text-base leading-relaxed bg-stone-50 p-4 rounded-xl border border-stone-200/60">
        ${recipe.description}
      </div>

      <!-- Panel składników z przelicznikiem porcji -->
      <div class="bg-amber-50/60 p-6 rounded-2xl border border-amber-200/70">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 class="text-xl font-bold text-stone-800 flex items-center gap-2">
              <span>🛒</span> Składniki na danie
            </h3>
            <p class="text-xs text-stone-500">Ilości przeliczają się automatycznie do wybranej liczby porcji</p>
          </div>

          <!-- Przelicznik porcji -->
          <div class="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-stone-200">
            <span class="text-xs font-bold text-stone-500 uppercase">Liczba porcji:</span>
            <button 
              onclick="adjustModalServings(-1)" 
              class="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold flex items-center justify-center transition-colors"
            >
              -
            </button>
            <span class="font-extrabold text-stone-900 text-base w-6 text-center">${state.currentModalServings}</span>
            <button 
              onclick="adjustModalServings(1)" 
              class="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold flex items-center justify-center transition-colors"
            >
              +
            </button>
          </div>
        </div>

        <!-- Lista składników w kolumnach -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${recipe.ingredients.map(ingr => {
            const scaledAmount = formatAmount(ingr.amount * servingsRatio);
            return `
              <div class="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-stone-100 shadow-2xs">
                <span class="text-sm font-medium text-stone-800 flex items-center gap-2">
                  <span class="text-xs text-stone-400">•</span>
                  ${ingr.name}
                </span>
                <span class="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg">
                  ${scaledAmount} ${ingr.unit}
                </span>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Akcja dodania do koszyka z poziomu modala -->
        <div class="mt-6 pt-4 border-t border-amber-200/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="text-xs text-stone-500">
            ${isInCart ? 'To danie znajduje się już w Twoim koszyku zakupowym.' : 'Możesz dodać wszystkie te składniki do wspólnej listy zakupów.'}
          </div>
          <button 
            type="button"
            onclick="addModalRecipeToCart()" 
            class="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 ${
              isInCart ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
            }"
          >
            <span>${isInCart ? '✓ Zaktualizuj porcje w koszyku' : '🛒 Dodaj do listy zakupów'}</span>
          </button>
        </div>
      </div>

      <!-- Krok po kroku przygotowania -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-stone-800 flex items-center gap-2">
            <span>👨‍🍳</span> Sposób przygotowania
          </h3>
          <span class="text-xs text-stone-400">Możesz odhaczać wykonane kroki</span>
        </div>

        <ol class="space-y-3">
          ${recipe.steps.map((step, idx) => `
            <li class="flex items-start gap-3 p-3.5 rounded-xl bg-stone-50/80 border border-stone-200/60 hover:bg-stone-50 transition-colors">
              <input 
                type="checkbox" 
                id="step-${idx}" 
                class="mt-1 w-4 h-4 rounded text-rose-600 border-stone-300 focus:ring-rose-500 cursor-pointer"
                onchange="this.nextElementSibling.classList.toggle('line-through'); this.nextElementSibling.classList.toggle('text-stone-400');"
              />
              <label for="step-${idx}" class="text-sm text-stone-700 leading-relaxed cursor-pointer select-none">
                <strong class="text-stone-900 font-bold mr-1">Krok ${idx + 1}:</strong> ${step}
              </label>
            </li>
          `).join('')}
        </ol>
      </div>

      <!-- Minutnik kuchenny (Kitchen Timer) -->
      <div class="bg-gradient-to-r from-stone-900 to-stone-800 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div>
          <h4 class="font-bold text-base flex items-center gap-2">
            <span>⏲️</span> Minutnik Kuchenny
          </h4>
          <p class="text-xs text-stone-300">Włącz odliczanie, by nie przypalić dania w piekarniku</p>
        </div>

        <div class="flex items-center gap-3">
          <div id="timer-display-box" class="font-mono text-2xl font-bold bg-black/40 px-4 py-2 rounded-xl border border-stone-700 timer-display">
            00:00
          </div>
          <div class="flex items-center gap-2">
            <button onclick="startQuickTimer(5)" class="px-2.5 py-1.5 bg-stone-700 hover:bg-stone-600 text-xs font-semibold rounded-lg transition-colors">5 min</button>
            <button onclick="startQuickTimer(10)" class="px-2.5 py-1.5 bg-stone-700 hover:bg-stone-600 text-xs font-semibold rounded-lg transition-colors">10 min</button>
            <button onclick="startQuickTimer(20)" class="px-2.5 py-1.5 bg-stone-700 hover:bg-stone-600 text-xs font-semibold rounded-lg transition-colors">20 min</button>
            <button onclick="resetTimer()" class="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-xs font-semibold rounded-lg transition-colors">Reset</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function addModalRecipeToCart() {
  if (!state.currentModalRecipe) return;
  const id = state.currentModalRecipe.id;
  const existingIdx = state.cart.findIndex(i => i.recipeId === id);

  if (existingIdx >= 0) {
    state.cart[existingIdx].servings = state.currentModalServings;
  } else {
    state.cart.push({ recipeId: id, servings: state.currentModalServings });
  }

  saveState();
  updateCartBadge();
  renderModalContent();
  showToastNotification(`Zaktualizowano koszyk: ${state.currentModalRecipe.title} (${state.currentModalServings} porcji)`);
}

/* ========================================================
   WIDOK 3: "CO MAM W LODÓWCE?" (GENERATOR RESZTEK)
   ======================================================== */
const POPULAR_FRIDGE_ITEMS = [
  'Jajka', 'Czosnek', 'Cebula żółta', 'Pomidory pelati w puszce', 
  'Makaron Penne lub Fusilli', 'Pierś z kurczaka', 'Parmezan (Parmigiano Reggiano)', 
  'Mleczko kokosowe (min. 80% ekstraktu)', 'Ziemniaki (odmiana mączysta, typ B lub C)',
  'Awokado', 'Ser Feta', 'Oliwa z oliwek extra virgin', 'Boczek wędzony', 'Mąka pszenna'
];

function initFridgeAssistant() {
  // Możliwość dodawania własnego składnika do lodówki
  const addBtn = document.getElementById('btn-add-fridge-item');
  const input = document.getElementById('fridge-custom-input');
  if (addBtn && input) {
    const handleAdd = () => {
      const val = input.value.trim();
      if (val && !state.fridgeSelected.includes(val)) {
        state.fridgeSelected.push(val);
        input.value = '';
        renderFridgeView();
      }
    };
    addBtn.addEventListener('click', handleAdd);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAdd(); });
  }
}

function renderFridgeView() {
  const tagsContainer = document.getElementById('fridge-tags-container');
  const resultsContainer = document.getElementById('fridge-matched-recipes');
  if (!tagsContainer || !resultsContainer) return;

  // Renderowanie tagów składników w lodówce
  tagsContainer.innerHTML = POPULAR_FRIDGE_ITEMS.map(item => {
    const isSelected = state.fridgeSelected.includes(item);
    return `
      <button 
        type="button"
        onclick="toggleFridgeIngredient('${item}')"
        class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
          isSelected 
            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' 
            : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
        }"
      >
        <span>${isSelected ? '✓' : '+'}</span>
        <span>${item}</span>
      </button>
    `;
  }).join('');

  // Wyliczanie dopasowania przepisów
  const matched = RECIPES_DATA.map(recipe => {
    const totalCount = recipe.ingredients.length;
    let haveCount = 0;
    const missing = [];

    recipe.ingredients.forEach(ingr => {
      const hasIt = state.fridgeSelected.some(selected => 
        ingr.name.toLowerCase().includes(selected.toLowerCase()) || 
        selected.toLowerCase().includes(ingr.name.toLowerCase())
      );
      if (hasIt) {
        haveCount++;
      } else {
        missing.push(ingr);
      }
    });

    const percent = Math.round((haveCount / totalCount) * 100);
    return { recipe, percent, haveCount, totalCount, missing };
  })
  .sort((a, b) => b.percent - a.percent);

  // Wyświetlenie wyników
  resultsContainer.innerHTML = matched.slice(0, 6).map(item => `
    <div class="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-bold uppercase tracking-wider text-stone-400">${item.recipe.category}</span>
          <span class="text-xs font-extrabold px-3 py-1 rounded-full ${
            item.percent >= 50 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }">
            ${item.percent}% składników masz w domu
          </span>
        </div>

        <h4 
          onclick="openRecipeModal('${item.recipe.id}')"
          class="font-bold text-stone-900 text-lg hover:text-rose-600 cursor-pointer mb-2 line-clamp-1"
        >
          ${item.recipe.title}
        </h4>

        <!-- Pasek postępu składników -->
        <div class="w-full bg-stone-100 h-2 rounded-full overflow-hidden mb-4">
          <div class="bg-emerald-500 h-full rounded-full" style="width: ${item.percent}%"></div>
        </div>

        <p class="text-xs text-stone-500 mb-2">
          Posiadasz: <strong>${item.haveCount} z ${item.totalCount}</strong> składników.
        </p>

        <div class="text-xs text-stone-500 mb-4">
          <strong class="text-stone-700">Brakuje:</strong> 
          ${item.missing.slice(0, 3).map(m => `<span class="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded mx-0.5">${m.name}</span>`).join('')}
          ${item.missing.length > 3 ? `<span class="text-stone-400">+${item.missing.length - 3} innych</span>` : ''}
        </div>
      </div>

      <div class="pt-3 border-t border-stone-100 flex items-center gap-2">
        <button 
          onclick="openRecipeModal('${item.recipe.id}')" 
          class="flex-1 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors text-center"
        >
          Przepis
        </button>
        <button 
          onclick="toggleCartRecipe('${item.recipe.id}')" 
          class="flex-1 py-2 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm text-center"
        >
          + Do listy zakupów
        </button>
      </div>
    </div>
  `).join('');
}

function toggleFridgeIngredient(name) {
  const idx = state.fridgeSelected.indexOf(name);
  if (idx >= 0) {
    state.fridgeSelected.splice(idx, 1);
  } else {
    state.fridgeSelected.push(name);
  }
  renderFridgeView();
}

/* ========================================================
   WIDOK 4: PLANER MENU TYGODNIOWEGO
   ======================================================== */
const DAYS_OF_WEEK = [
  { id: 'pon', label: 'Poniedziałek' },
  { id: 'wt', label: 'Wtorek' },
  { id: 'sr', label: 'Środa' },
  { id: 'czw', label: 'Czwartek' },
  { id: 'pt', label: 'Piątek' },
  { id: 'sob', label: 'Sobota' },
  { id: 'nd', label: 'Niedziela' }
];

function initWeeklyPlanner() {
  const addAllBtn = document.getElementById('btn-add-week-to-cart');
  if (addAllBtn) {
    addAllBtn.addEventListener('click', () => {
      let addedCount = 0;
      Object.values(state.weeklyPlan).forEach(recipeId => {
        if (recipeId && !state.cart.some(i => i.recipeId === recipeId)) {
          state.cart.push({ recipeId, servings: 4 });
          addedCount++;
        }
      });
      saveState();
      updateCartBadge();
      showToastNotification(`Dodano ${addedCount} dań z planera tygodniowego do koszyka zakupów!`);
      switchView('koszyk');
    });
  }

  const clearPlannerBtn = document.getElementById('btn-clear-planner');
  if (clearPlannerBtn) {
    clearPlannerBtn.addEventListener('click', () => {
      state.weeklyPlan = {};
      saveState();
      renderPlannerView();
      showToastNotification('Wyczyszczono planer tygodniowy.');
    });
  }
}

function renderPlannerView() {
  const container = document.getElementById('weekly-planner-grid');
  if (!container) return;

  container.innerHTML = DAYS_OF_WEEK.map(day => {
    const plannedId = state.weeklyPlan[day.id];
    const recipe = plannedId ? RECIPES_DATA.find(r => r.id === plannedId) : null;

    return `
      <div class="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-3 border-b border-stone-100 pb-2">
            <h4 class="font-extrabold text-stone-900 text-base flex items-center gap-1.5">
              <span>📅</span> ${day.label}
            </h4>
            ${recipe ? `
              <button 
                onclick="removeRecipeFromDay('${day.id}')" 
                class="text-xs text-rose-500 hover:text-rose-700 font-bold"
                title="Usuń z tego dnia"
              >
                Usuń
              </button>
            ` : ''}
          </div>

          ${recipe ? `
            <div class="relative rounded-xl overflow-hidden mb-3 h-32 cursor-pointer" onclick="openRecipeModal('${recipe.id}')">
              <img src="${recipe.image}" alt="${recipe.title}" class="w-full h-full object-cover" />
              <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent"></div>
              <span class="absolute bottom-2 left-2 text-xs font-bold text-white">${recipe.time} min</span>
            </div>
            <h5 class="font-bold text-sm text-stone-800 line-clamp-1 mb-1">${recipe.title}</h5>
            <p class="text-xs text-stone-400 mb-3">${recipe.category} • ${recipe.calories} kcal</p>
          ` : `
            <div class="py-8 px-4 border-2 border-dashed border-stone-200 rounded-xl text-center mb-3">
              <p class="text-xs text-stone-400 mb-2">Brak zaplanowanego dania</p>
              <span class="text-2xl">🍲</span>
            </div>
          `}
        </div>

        <div>
          <select 
            onchange="assignRecipeToDay('${day.id}', this.value)" 
            class="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl p-2.5 font-medium text-stone-700 outline-none focus:border-rose-500"
          >
            <option value="">+ Przypisz przepis z bazy...</option>
            ${RECIPES_DATA.map(r => `
              <option value="${r.id}" ${plannedId === r.id ? 'selected' : ''}>
                ${r.title} (${r.time}m)
              </option>
            `).join('')}
          </select>
        </div>
      </div>
    `;
  }).join('');
}

function assignRecipeToDay(dayId, recipeId) {
  if (recipeId) {
    state.weeklyPlan[dayId] = recipeId;
  } else {
    delete state.weeklyPlan[dayId];
  }
  saveState();
  renderPlannerView();
}

function removeRecipeFromDay(dayId) {
  delete state.weeklyPlan[dayId];
  saveState();
  renderPlannerView();
}

/* ========================================================
   WIDOK 5: KOSZYK & INTELIGENTNA LISTA ZAKUPÓW
   ======================================================== */
function initCartListeners() {
  // Przełącznik trybu sklepowego (Shop Mode)
  const shopModeBtn = document.getElementById('btn-toggle-shop-mode');
  if (shopModeBtn) {
    shopModeBtn.addEventListener('click', () => {
      state.shopMode = !state.shopMode;
      document.body.classList.toggle('shop-mode-active', state.shopMode);
      shopModeBtn.classList.toggle('bg-emerald-600', state.shopMode);
      shopModeBtn.classList.toggle('text-white', state.shopMode);
      shopModeBtn.textContent = state.shopMode ? '🛒 Wyłącz Tryb Sklepowy' : '🛒 Włącz Tryb Sklepowy';
      renderCartView();
    });
  }

  // Przełącznik ukrywania kupionych
  const toggleHideBoughtBtn = document.getElementById('btn-toggle-hide-bought');
  if (toggleHideBoughtBtn) {
    toggleHideBoughtBtn.addEventListener('click', () => {
      state.hideBought = !state.hideBought;
      toggleHideBoughtBtn.textContent = state.hideBought ? '👁️ Pokaż kupione' : '👁️ Ukryj kupione';
      renderCartView();
    });
  }

  // Wyczyść kupione
  const clearBoughtBtn = document.getElementById('btn-clear-bought');
  if (clearBoughtBtn) {
    clearBoughtBtn.addEventListener('click', () => {
      if (confirm('Czy chcesz zresetować status kupionych produktów?')) {
        state.boughtItems = [];
        saveState();
        renderCartView();
        showToastNotification('Zresetowano odznaczone zakupy.');
      }
    });
  }

  // Opróżnij cały koszyk
  const emptyCartBtn = document.getElementById('btn-empty-cart');
  if (emptyCartBtn) {
    emptyCartBtn.addEventListener('click', () => {
      if (confirm('Czy na pewno chcesz usunąć wszystkie dania z koszyka?')) {
        state.cart = [];
        state.boughtItems = [];
        state.customGroceries = [];
        state.removedIngredients = [];
        saveState();
        updateCartBadge();
        renderCartView();
        showToastNotification('Koszyk został opróżniony.');
      }
    });
  }

  // Kopiuj listę na telefon / WhatsApp
  const copyBtn = document.getElementById('btn-copy-grocery-list');
  if (copyBtn) {
    copyBtn.addEventListener('click', copyGroceryListToClipboard);
  }

  // Drukuj listę
  const printBtn = document.getElementById('btn-print-grocery-list');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // Dodawanie własnego produktu do listy zakupów
  const addCustomBtn = document.getElementById('btn-add-custom-grocery');
  const customNameInput = document.getElementById('custom-grocery-name');
  const customCatSelect = document.getElementById('custom-grocery-cat');
  const customAmountInput = document.getElementById('custom-grocery-amount');

  if (addCustomBtn && customNameInput) {
    const handleAddCustom = () => {
      const name = customNameInput.value.trim();
      if (!name) return;

      const category = customCatSelect ? customCatSelect.value : 'Inne';
      const amountStr = customAmountInput ? customAmountInput.value.trim() : '';

      state.customGroceries.push({
        id: 'custom-' + Date.now(),
        name: name,
        category: category,
        amountText: amountStr || '1 szt.',
        bought: false
      });

      customNameInput.value = '';
      if (customAmountInput) customAmountInput.value = '';
      saveState();
      renderCartView();
      showToastNotification(`Dodano "${name}" do listy zakupów`);
    };

    addCustomBtn.addEventListener('click', handleAddCustom);
    customNameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAddCustom(); });
  }
}

// Konsolidacja i sumowanie składników ze wszystkich dań w koszyku
function getConsolidatedIngredients() {
  const consolidated = {}; // key: normalizedName -> { name, amount, unit, category, sourceRecipes: [] }

  state.cart.forEach(item => {
    const recipe = RECIPES_DATA.find(r => r.id === item.recipeId);
    if (!recipe) return;

    const ratio = item.servings / recipe.defaultServings;

    recipe.ingredients.forEach(ingr => {
      const cleanKey = ingr.name.trim().toLowerCase();

      // Jeśli użytkownik usunął ten składnik ręcznie, pomijamy go
      if (state.removedIngredients.includes(cleanKey)) return;

      if (!consolidated[cleanKey]) {
        consolidated[cleanKey] = {
          name: ingr.name,
          amount: ingr.amount * ratio,
          unit: ingr.unit,
          category: ingr.category || 'Inne',
          sourceRecipes: [recipe.title]
        };
      } else {
        // Jeśli jednostka się zgadza, sumujemy ilości!
        if (consolidated[cleanKey].unit === ingr.unit) {
          consolidated[cleanKey].amount += (ingr.amount * ratio);
        }
        if (!consolidated[cleanKey].sourceRecipes.includes(recipe.title)) {
          consolidated[cleanKey].sourceRecipes.push(recipe.title);
        }
      }
    });
  });

  return Object.values(consolidated);
}

function renderCartView() {
  const cartMealsContainer = document.getElementById('cart-selected-recipes');
  const groceryCategoriesContainer = document.getElementById('grocery-departments-container');
  const emptyStateEl = document.getElementById('cart-empty-state');
  const cartContentEl = document.getElementById('cart-content-wrapper');
  const progressText = document.getElementById('shopping-progress-text');
  const progressFill = document.getElementById('shopping-progress-fill');

  if (!cartMealsContainer || !groceryCategoriesContainer) return;

  if (state.cart.length === 0 && state.customGroceries.length === 0) {
    if (emptyStateEl) emptyStateEl.classList.remove('hidden');
    if (cartContentEl) cartContentEl.classList.add('hidden');
    return;
  }

  if (emptyStateEl) emptyStateEl.classList.add('hidden');
  if (cartContentEl) cartContentEl.classList.remove('hidden');

  // 1. Renderowanie listy wybranych dań w koszyku
  cartMealsContainer.innerHTML = state.cart.map(item => {
    const recipe = RECIPES_DATA.find(r => r.id === item.recipeId);
    if (!recipe) return '';

    return `
      <div class="flex items-center justify-between p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <img 
            src="${recipe.image}" 
            alt="${recipe.title}" 
            class="w-14 h-14 rounded-xl object-cover shrink-0" 
            onerror="this.src='https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=800&q=80'"
          />
          <div class="min-w-0">
            <h4 class="font-bold text-stone-900 text-sm truncate">${recipe.title}</h4>
            <span class="text-xs text-stone-500">${recipe.category} • ${recipe.time} min</span>
          </div>
        </div>

        <div class="flex items-center gap-3 shrink-0">
          <!-- Licznik porcji w koszyku -->
          <div class="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-stone-200 shadow-2xs">
            <button 
              onclick="changeCartServings('${recipe.id}', -1)"
              class="w-6 h-6 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center text-xs"
            >
              -
            </button>
            <span class="text-xs font-extrabold w-5 text-center text-stone-900">${item.servings}</span>
            <button 
              onclick="changeCartServings('${recipe.id}', 1)"
              class="w-6 h-6 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center text-xs"
            >
              +
            </button>
            <span class="text-[10px] text-stone-400 ml-0.5">porcji</span>
          </div>

          <!-- Usuń z koszyka -->
          <button 
            onclick="removeRecipeFromCart('${recipe.id}')"
            class="w-8 h-8 rounded-xl bg-white hover:bg-rose-50 text-stone-400 hover:text-rose-600 border border-stone-200 flex items-center justify-center transition-colors"
            title="Usuń to danie z koszyka"
          >
            ✕
          </button>
        </div>
      </div>
    `;
  }).join('');

  // 2. Renderowanie skonsolidowanej listy składników według działów w sklepie
  const consolidatedIngredients = getConsolidatedIngredients();

  // Licznik postępu zakupów
  let totalItemsCount = 0;
  let boughtItemsCount = 0;

  // Grupuj składniki według INGREDIENT_CATEGORIES
  const categorized = {};
  INGREDIENT_CATEGORIES.forEach(cat => {
    categorized[cat.id] = [];
  });

  // Dodaj składniki z przepisów
  consolidatedIngredients.forEach(ingr => {
    const targetCat = categorized[ingr.category] ? ingr.category : 'Inne';
    const itemKey = ingr.name.trim().toLowerCase();
    const isBought = state.boughtItems.includes(itemKey);

    totalItemsCount++;
    if (isBought) boughtItemsCount++;

    if (!state.hideBought || !isBought) {
      categorized[targetCat].push({
        id: itemKey,
        name: ingr.name,
        amount: formatAmount(ingr.amount),
        unit: ingr.unit,
        sourceRecipes: ingr.sourceRecipes,
        isBought: isBought,
        isCustom: false
      });
    }
  });

  // Dodaj własne produkty użytkownika
  state.customGroceries.forEach(custom => {
    const targetCat = categorized[custom.category] ? custom.category : 'Inne';
    const isBought = custom.bought;

    totalItemsCount++;
    if (isBought) boughtItemsCount++;

    if (!state.hideBought || !isBought) {
      categorized[targetCat].push({
        id: custom.id,
        name: custom.name,
        amount: custom.amountText,
        unit: '',
        sourceRecipes: ['Twój własny produkt'],
        isBought: isBought,
        isCustom: true
      });
    }
  });

  // Zaktualizuj pasek postępu
  const progressPercent = totalItemsCount > 0 ? Math.round((boughtItemsCount / totalItemsCount) * 100) : 0;
  if (progressFill) progressFill.style.width = `${progressPercent}%`;
  if (progressText) {
    progressText.innerHTML = `
      <span>W koszyku w sklepie: <strong>${boughtItemsCount}</strong> z <strong>${totalItemsCount}</strong> produktów (${progressPercent}%)</span>
      ${state.removedIngredients.length > 0 ? `
        <button onclick="restoreRemovedIngredients()" class="ml-3 text-xs text-rose-600 hover:text-rose-700 underline font-semibold">
          Przywróć usunięte (${state.removedIngredients.length})
        </button>
      ` : ''}
    `;
  }

  // Generowanie kart poszczególnych działów sklepu
  groceryCategoriesContainer.innerHTML = INGREDIENT_CATEGORIES.map(cat => {
    const items = categorized[cat.id] || [];
    if (items.length === 0) return '';

    return `
      <div class="grocery-category-card bg-white rounded-2xl p-5 border border-stone-200/90 shadow-sm">
        <div class="flex items-center justify-between mb-4 border-b border-stone-100 pb-3">
          <div class="flex items-center gap-2.5">
            <span class="text-2xl">${cat.icon}</span>
            <div>
              <h3 class="font-extrabold text-stone-900 text-base leading-tight">${cat.label}</h3>
              <span class="text-xs text-stone-400 font-medium">${items.length} ${getPolishProductNoun(items.length)}</span>
            </div>
          </div>
          <span class="text-xs font-bold px-2.5 py-1 rounded-full ${cat.color}">
            Dział sklepu
          </span>
        </div>

        <ul class="space-y-2">
          ${items.map(item => `
            <li class="grocery-item flex items-center justify-between p-3 rounded-xl border border-stone-100 bg-stone-50/60 hover:bg-stone-50 transition-all ${item.isBought ? 'bought' : ''}">
              <div class="flex items-center gap-3 min-w-0">
                <input 
                  type="checkbox" 
                  ${item.isBought ? 'checked' : ''}
                  onchange="toggleItemBought('${item.id}', ${item.isCustom})"
                  class="grocery-checkbox shrink-0"
                  title="Włóż do fizycznego koszyka"
                />
                <div class="min-w-0">
                  <span class="item-text font-bold text-sm text-stone-800 block truncate ${item.isBought ? 'line-through text-stone-400' : ''}">
                    ${item.name}
                  </span>
                  <span class="text-[11px] text-stone-400 block truncate">
                    ${item.sourceRecipes.join(', ')}
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <span class="text-xs font-extrabold text-stone-900 bg-white px-2.5 py-1 rounded-lg border border-stone-200 shadow-2xs">
                  ${item.amount} ${item.unit}
                </span>

                <!-- Usunięcie składnika (np. mam już w domu) -->
                <button 
                  onclick="deleteGroceryItem('${item.id}', ${item.isCustom})"
                  class="w-7 h-7 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors text-xs font-bold"
                  title="Mam to w domu (usuń z listy)"
                >
                  ✕
                </button>
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }).join('');
}

function getPolishProductNoun(count) {
  if (count === 1) return 'produkt';
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'produkty';
  return 'produktów';
}

function toggleItemBought(itemId, isCustom) {
  if (isCustom) {
    const custom = state.customGroceries.find(c => c.id === itemId);
    if (custom) {
      custom.bought = !custom.bought;
    }
  } else {
    const idx = state.boughtItems.indexOf(itemId);
    if (idx >= 0) {
      state.boughtItems.splice(idx, 1);
    } else {
      state.boughtItems.push(itemId);
    }
  }
  saveState();
  renderCartView();
}

function deleteGroceryItem(itemId, isCustom) {
  if (isCustom) {
    state.customGroceries = state.customGroceries.filter(c => c.id !== itemId);
  } else {
    if (!state.removedIngredients.includes(itemId)) {
      state.removedIngredients.push(itemId);
    }
  }
  saveState();
  renderCartView();
  showToastNotification('Usunięto pozycję z listy zakupów.');
}

function restoreRemovedIngredients() {
  state.removedIngredients = [];
  saveState();
  renderCartView();
  showToastNotification('Przywrócono wszystkie ukryte składniki do listy.');
}

function toggleCartRecipe(recipeId, event) {
  if (event) event.stopPropagation();

  const idx = state.cart.findIndex(i => i.recipeId === recipeId);
  const recipe = RECIPES_DATA.find(r => r.id === recipeId);

  if (idx >= 0) {
    state.cart.splice(idx, 1);
    showToastNotification(`Usunięto z koszyka: ${recipe ? recipe.title : ''}`);
  } else {
    state.cart.push({ recipeId: recipeId, servings: recipe ? recipe.defaultServings : 4 });
    showToastNotification(`Dodano do koszyka: ${recipe ? recipe.title : ''}`);
  }

  saveState();
  updateCartBadge();
  renderActiveView();
}

function changeCartServings(recipeId, delta) {
  const item = state.cart.find(i => i.recipeId === recipeId);
  if (!item) return;

  const newServings = item.servings + delta;
  if (newServings >= 1 && newServings <= 30) {
    item.servings = newServings;
    saveState();
    renderCartView();
  }
}

function removeRecipeFromCart(recipeId) {
  state.cart = state.cart.filter(i => i.recipeId !== recipeId);
  saveState();
  updateCartBadge();
  renderCartView();
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge-count');
  if (!badge) return;

  const count = state.cart.length;
  badge.textContent = count;
  badge.classList.remove('hidden');

  badge.classList.remove('badge-bounce');
  void badge.offsetWidth;
  badge.classList.add('badge-bounce');
}

function toggleFavorite(recipeId, event) {
  if (event) event.stopPropagation();

  const idx = state.favorites.indexOf(recipeId);
  if (idx >= 0) {
    state.favorites.splice(idx, 1);
  } else {
    state.favorites.push(recipeId);
  }

  saveState();
  renderActiveView();
}

/* ========================================================
   EKSPORT I KOPIOWANIE LISTY ZAKUPÓW DO SCHOWKA
   ======================================================== */
function copyGroceryListToClipboard() {
  const ingredients = getConsolidatedIngredients();
  if (ingredients.length === 0 && state.customGroceries.length === 0) {
    alert('Koszyk jest pusty!');
    return;
  }

  let text = `🛒 LISTA ZAKUPÓW - SMAKOSZ & CO.\n`;
  text += `Dania: ${state.cart.map(c => {
    const r = RECIPES_DATA.find(x => x.id === c.recipeId);
    return r ? `${r.title} (${c.servings} porcji)` : '';
  }).filter(Boolean).join(', ')}\n\n`;

  // Grupuj po kategoriach
  INGREDIENT_CATEGORIES.forEach(cat => {
    const inCat = ingredients.filter(i => i.category === cat.id);
    const customInCat = state.customGroceries.filter(c => c.category === cat.id);

    if (inCat.length > 0 || customInCat.length > 0) {
      text += `📍 ${cat.icon} ${cat.label.toUpperCase()}:\n`;
      inCat.forEach(item => {
        const isBought = state.boughtItems.includes(item.name.toLowerCase());
        text += `  ${isBought ? '✅' : '⬜'} ${item.name} - ${formatAmount(item.amount)} ${item.unit}\n`;
      });
      customInCat.forEach(item => {
        text += `  ${item.bought ? '✅' : '⬜'} ${item.name} - ${item.amountText}\n`;
      });
      text += '\n';
    }
  });

  text += `Wygenerowano z aplikacji kulinarnej. Smacznego! 🍽️`;

  navigator.clipboard.writeText(text).then(() => {
    showToastNotification('📋 Skopiowano kompletną listę zakupów do schowka! Możesz wkleić ją w SMS / WhatsApp.');
  }).catch(() => {
    alert('Skopiowano listę do schowka.');
  });
}

/* ========================================================
   MINUTNIK KUCHENNY (WEB AUDIO API BEEP)
   ======================================================== */
function initTimer() {
  // nic specjalnego do preloadingu
}

function startQuickTimer(minutes) {
  clearInterval(state.timerInterval);
  state.timerSecondsLeft = minutes * 60;
  updateTimerDisplay();

  state.timerInterval = setInterval(() => {
    state.timerSecondsLeft--;
    updateTimerDisplay();

    if (state.timerSecondsLeft <= 0) {
      clearInterval(state.timerInterval);
      playTimerAlarm();
      alert('⏰ DING DING DING! Czas minął! Twoje danie jest gotowe!');
    }
  }, 1000);
}

function resetTimer() {
  clearInterval(state.timerInterval);
  state.timerSecondsLeft = 0;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const display = document.getElementById('timer-display-box');
  if (!display) return;

  const mins = Math.floor(state.timerSecondsLeft / 60);
  const secs = state.timerSecondsLeft % 60;
  display.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function playTimerAlarm() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    osc.frequency.setValueAtTime(1174.66, audioCtx.currentTime + 0.2); // D6
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.8);
  } catch (e) {
    console.log('Audio notification played');
  }
}

/* ========================================================
   POMOCNICZE: TOAST NOTIFICATIONS & FORMATOWANIE
   ======================================================== */
function showToastNotification(message) {
  const toast = document.getElementById('toast-notification');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove('hidden', 'opacity-0');
  toast.classList.add('opacity-100');

  setTimeout(() => {
    toast.classList.add('opacity-0');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 300);
  }, 2800);
}

function formatAmount(num) {
  if (num === undefined || num === null) return '';
  if (Number.isInteger(num)) return num;
  return Number(num.toFixed(1));
}
