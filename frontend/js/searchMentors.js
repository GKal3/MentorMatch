// Script per la ricerca dei mentor
document.addEventListener('DOMContentLoaded', async () => {
    const searchBtn = document.querySelector('.search-btn');
    const searchInput = document.querySelector('.search-input');
    const categorySelect = document.querySelector('select[name="category"]');
    const languageSelect = document.querySelector('select[name="language"]');
    const priceSelect = document.querySelector('select[name="price"]');

    // Carica le categorie e le lingue dal database
    await loadCategoriesAndLanguages();

    if (searchBtn) {
        searchBtn.addEventListener('click', async () => {
            await searchMentors();
        });
    }

    // Cerca anche con Enter
    if (searchInput) {
        searchInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                await searchMentors();
            }
        });
    }

    async function loadCategoriesAndLanguages() {
        try {
            // Carica un mentor qualsiasi per ottenere le opzioni disponibili
            const response = await fetch('/api/mentee/search?settore=&lingua=&prezzo_max=', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                const mentors = result.data || [];
                
                // Estrai le categorie univoche dai mentor
                const categories = [...new Set(mentors
                    .map(m => m.Settore)
                    .filter(s => s && s !== ''))];
                
                // Estrai le lingue univoche dai mentor
                const languages = [...new Set(mentors
                    .map(m => m.Lingua)
                    .filter(l => l && l !== ''))];

                // Popola il select delle categorie
                populateSelect(categorySelect, categories);
                
                // Popola il select delle lingue
                populateSelect(languageSelect, languages);
                
                // Popola anche i category chips
                loadCategoryChips(categories);
            }
        } catch (error) {
            console.error('Errore nel caricamento delle categorie e lingue:', error);
        }
    }

    function populateSelect(selectElement, items) {
        if (!selectElement) return;
        
        // Rimuovi le opzioni tranne la prima
        const firstOption = selectElement.querySelector('option');
        selectElement.innerHTML = '';
        if (firstOption) {
            selectElement.appendChild(firstOption.cloneNode(true));
        }

        // Aggiungi le nuove opzioni
        if (Array.isArray(items)) {
            items.sort().forEach(item => {
                const option = document.createElement('option');
                option.value = item;
                option.textContent = item;
                selectElement.appendChild(option);
            });
        }
    }

    function loadCategoryChips(categories) {
        const categoriesContainer = document.querySelector('.categories');
        if (!categoriesContainer) return;
        
        // Svuota i chips attuali
        categoriesContainer.innerHTML = '';
        
        // Aggiungi i nuovi chips
        if (Array.isArray(categories)) {
            categories.sort().forEach((cat, index) => {
                const chip = document.createElement('div');
                chip.className = 'category-chip' + (index === 0 ? ' active' : '');
                chip.textContent = cat;
                chip.addEventListener('click', () => {
                    // Deseleziona tutti gli altri chips
                    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    // Imposta il filtro della categoria
                    categorySelect.value = cat;
                });
                categoriesContainer.appendChild(chip);
            });
        }
    }

    async function searchMentors() {
        try {
            // Costruisci i parametri di ricerca
            const params = new URLSearchParams();
            
            const category = categorySelect?.value;
            const language = languageSelect?.value;
            const priceRange = priceSelect?.value;
            const searchTerm = searchInput?.value;

            if (category && category !== 'All Categories') {
                params.append('settore', category);
            }

            if (language && language !== 'All Languages') {
                params.append('lingua', language);
            }
            
            if (priceRange && priceRange !== 'All Prices') {
                // Estrai il prezzo massimo dal range
                const maxPrice = priceRange.match(/€(\d+)/)?.[1];
                if (maxPrice) {
                    params.append('prezzo_max', maxPrice);
                }
            }

            if (searchTerm) {
                params.append('search', searchTerm);
            }

            // Effettua la chiamata API
            const response = await fetch(`/api/mentee/search?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                
                // Salva i risultati nel sessionStorage per passarli alla pagina mentorList
                sessionStorage.setItem('mentorResults', JSON.stringify(result.data));
                
                // Redirect alla pagina mentorList
                window.location.href = '/pages/mentorList.html';
            } else {
                const error = await response.json();
                console.error('Errore nella ricerca:', error);
                alert('Errore durante la ricerca: ' + (error.message || 'Riprova.'));
            }
        } catch (error) {
            console.error('Errore completo:', error);
            alert('Errore di connessione: ' + error.message);
        }
    }
});
