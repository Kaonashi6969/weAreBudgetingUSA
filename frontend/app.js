// ============================================
// CHEAPEST GROCERY BASKET - APP LOGIC
// ============================================

// DOM Elements
const groceryInput = document.getElementById('groceryInput');
const searchBtn = document.getElementById('searchBtn');
const resetBtn = document.getElementById('resetBtn');
const errorDismissBtn = document.getElementById('errorDismissBtn');
const suggestionBtns = document.querySelectorAll('.suggestion-btn');

const loadingState = document.getElementById('loadingState');
const resultsSection = document.getElementById('resultsSection');
const errorSection = document.getElementById('errorSection');
const inputSection = document.querySelector('.input-section');

const bestStore = document.getElementById('bestStore');
const totalPrice = document.getElementById('totalPrice');
const itemsList = document.getElementById('itemsList');
const matchInfo = document.getElementById('matchInfo');
const errorMessage = document.getElementById('errorMessage');
const storeCheckboxes = document.getElementById('storeCheckboxes');

const API_BASE = '/api';

// ============================================
// EVENT LISTENERS
// ============================================

searchBtn.addEventListener('click', handleSearch);
resetBtn.addEventListener('click', handleReset);
errorDismissBtn.addEventListener('click', handleErrorDismiss);
groceryInput.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') handleSearch();
});

// Quick suggestion buttons
suggestionBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.dataset.item;
    groceryInput.value += (groceryInput.value ? '\n' : '') + item;
    groceryInput.focus();
  });
});

// ============================================
// STORE SELECTION
// ============================================

async function loadStores() {
  try {
    const response = await fetch(`${API_BASE}/stores`);
    if (!response.ok) throw new Error('Failed to load stores');
    const stores = await response.json();
    
    storeCheckboxes.innerHTML = '';
    stores.forEach(store => {
      const label = document.createElement('label');
      label.className = 'store-checkbox-label';
      label.innerHTML = `
        <input type="checkbox" name="selectedStores" value="${store.id}" checked>
        <span>${escapeHtml(store.name)}</span>
      `;
      storeCheckboxes.appendChild(label);
    });
  } catch (err) {
    console.error('Error loading stores:', err);
    storeCheckboxes.innerHTML = '<span class="text-error">Error loading stores</span>';
  }
}

function getSelectedStores() {
  const checkboxes = document.querySelectorAll('input[name="selectedStores"]:checked');
  return Array.from(checkboxes).map(cb => cb.value);
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

async function handleSearch() {
  const items = groceryInput.value.trim();
  const selectedStores = getSelectedStores();

  if (!items) {
    showError('Please enter at least one grocery item');
    return;
  }

  if (selectedStores.length === 0) {
    showError('Please select at least one store');
    return;
  }

  searchBtn.disabled = true;
  searchBtn.textContent = '🔄 Searching...';

  try {
    showLoading();
    const result = await fetchBasket(items, selectedStores);

    if (result.success) {
      displayResults(result);
    } else {
      showError(result.message || 'Failed to find prices for these items');
    }
  } catch (err) {
    console.error('Search error:', err);
    showError('An error occurred while searching. Please try again.');
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = '🔍 Find Cheapest';
  }
}

async function fetchBasket(items, stores) {
  const response = await fetch(`${API_BASE}/basket`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, selectedStores: stores })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }

  return await response.json();
}

// ============================================
// DISPLAY RESULTS
// ============================================

function displayResults(result) {
  hideAllSections();
  resultsSection.classList.remove('hidden');

  // 1. Updated summary section to show "Basket Totals" per store
  const best = result.bestStore;
  const others = result.otherStores || [];
  
  // Clear any existing store total cards if we add them, 
  // but for now let's focus on the item-by-item comparison
  
  if (best) {
    bestStore.textContent = `${best.name} (Cheapest)`;
    totalPrice.textContent = `${best.total} Ft`;
    
    // 2. NEW: Replace the old "itemsList" with a more detailed "Top 3 Offers" per searched item
    itemsList.innerHTML = '';
    
    if (result.productDetails && result.productDetails.length > 0) {
      result.productDetails.forEach(detail => {
        const productGroup = document.createElement('div');
        productGroup.className = 'product-group';
        
        productGroup.innerHTML = `
          <div class="product-search-header">
            <h4>🔍 Search: "${escapeHtml(detail.userInput)}"</h4>
            <p class="best-match-label">Best match: ${escapeHtml(detail.product)}</p>
          </div>
          <div class="offers-grid">
            ${detail.offers.map((offer, idx) => `
              <div class="offer-card ${idx === 0 ? 'cheapest-offer' : ''}">
                <div class="offer-store">${escapeHtml(offer.store)}</div>
                <div class="offer-name">${escapeHtml(offer.name)}</div>
                <div class="offer-price">${offer.price} Ft</div>
                <a href="${offer.url}" target="_blank" class="offer-link">View in Store 🔗</a>
              </div>
            `).join('')}
          </div>
        `;
        itemsList.appendChild(productGroup);
      });
    }

    matchInfo.textContent = `✓ Found prices for ${result.itemCount} items`;
  } else {
    bestStore.textContent = 'No stores found';
    totalPrice.textContent = '0 Ft';
    itemsList.innerHTML = '<div class="item-row">No matching products found in database.</div>';
    matchInfo.textContent = '⚠️ Try different search terms (e.g., csirkemell, tej, tojás)';
  }

  // Scroll to results
  setTimeout(() => {
    resultsSection.scrollIntoView({ behavior: 'smooth' });
  }, 100);
}

// ============================================
// STATE MANAGEMENT
// ============================================

function showLoading() {
  hideAllSections();
  loadingState.classList.remove('hidden');
}

function showError(message) {
  hideAllSections();
  errorSection.classList.remove('hidden');
  errorMessage.textContent = message;
}

function hideAllSections() {
  loadingState.classList.add('hidden');
  resultsSection.classList.add('hidden');
  errorSection.classList.add('hidden');
  inputSection.classList.remove('hidden');
}

function handleReset() {
  groceryInput.value = '';
  groceryInput.focus();
  hideAllSections();
  inputSection.classList.remove('hidden');
}

function handleErrorDismiss() {
  hideAllSections();
  inputSection.classList.remove('hidden');
  groceryInput.focus();
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
  console.log('🛒 Cheapest Basket App initializing...');
  await loadStores();
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
