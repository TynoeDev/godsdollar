/**
 * Database Search Handler
 * Provides search functionality for accessing database records with glassmorphism styling
 */

class DBSearchHandler {
    constructor() {
        this.searchResults = [];
        this.selectedDatabase = null;
        this.availableDatabases = [
            { id: 'crypto', name: 'Cryptocurrency Database', tables: ['coins', 'markets', 'exchanges', 'trends'] },
            { id: 'projects', name: 'Projects Database', tables: ['active_projects', 'archived_projects', 'funding'] },
            { id: 'users', name: 'User Database', tables: ['users', 'wallets', 'transactions'] }
        ];
    }

    /**
     * Initialize the database search component
     * @param {string} containerId - ID of the container element
     * @param {object} options - Configuration options
     */
    initSearchComponent(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container not found: ${containerId}`);
            return;
        }

        // Create search component DOM
        this.createSearchDOM(container, options);

        // Add event listeners
        this.setupEventListeners(containerId);
    }

    /**
     * Create the search component DOM structure
     */
    createSearchDOM(container, options) {
            container.innerHTML = `
            <div class="db-search-component glass-effect">
                <div class="search-header">
                    <h3><i class="fas fa-database"></i> Database Access</h3>
                    ${options.showDatabaseSelector !== false ? `
                    <div class="database-selector">
                        <label for="database-select">Select Database:</label>
                        <div class="custom-select">
                            <select id="database-select" class="glass-select">
                                <option value="">Select a database...</option>
                                ${this.availableDatabases.map(db => 
                                    `<option value="${db.id}">${db.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>` : ''}
                </div>
                
                <div class="search-body">
                    <div class="search-input-container">
                        <div class="glass-search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" id="db-search-input" placeholder="Search database..." class="glass-input">
                            <button id="db-search-button" class="glass-button">
                                <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="advanced-search-toggle">
                        <button id="advanced-search-toggle" class="text-button">
                            Advanced Search <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                    
                    <div id="advanced-search-panel" class="advanced-search-panel" style="display: none;">
                        <div class="advanced-search-row">
                            <div class="advanced-search-field">
                                <label for="search-field">Field:</label>
                                <select id="search-field" class="glass-select">
                                    <option value="all">All Fields</option>
                                    <option value="name">Name</option>
                                    <option value="id">ID</option>
                                    <option value="category">Category</option>
                                </select>
                            </div>
                            
                            <div class="advanced-search-operator">
                                <label for="search-operator">Operator:</label>
                                <select id="search-operator" class="glass-select">
                                    <option value="contains">Contains</option>
                                    <option value="equals">Equals</option>
                                    <option value="startsWith">Starts With</option>
                                    <option value="endsWith">Ends With</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="advanced-search-row">
                            <div class="filter-options">
                                <label>
                                    <input type="checkbox" id="case-sensitive"> Case Sensitive
                                </label>
                                
                                <label>
                                    <input type="checkbox" id="exact-match"> Exact Match
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="search-results" id="search-results">
                    <div class="results-message" id="results-message">
                        Enter a search query to find database records
                    </div>
                    <div class="results-list" id="results-list"></div>
                </div>
                
                <div class="search-footer">
                    <div class="search-stats" id="search-stats"></div>
                    ${options.showHelp !== false ? `
                    <button id="search-help-button" class="icon-button">
                        <i class="fas fa-question-circle"></i>
                    </button>` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Set up event listeners for search functionality
     */
    setupEventListeners(containerId) {
        const container = document.getElementById(containerId);
        
        // Database selector
        const databaseSelect = container.querySelector('#database-select');
        if (databaseSelect) {
            databaseSelect.addEventListener('change', (e) => {
                this.selectedDatabase = e.target.value;
                this.updateFieldOptions();
            });
        }
        
        // Search button
        const searchButton = container.querySelector('#db-search-button');
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                this.performSearch();
            });
        }
        
        // Enter key in search input
        const searchInput = container.querySelector('#db-search-input');
        if (searchInput) {
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }
        
        // Advanced search toggle
        const advancedToggle = container.querySelector('#advanced-search-toggle');
        const advancedPanel = container.querySelector('#advanced-search-panel');
        
        if (advancedToggle && advancedPanel) {
            advancedToggle.addEventListener('click', () => {
                const isHidden = advancedPanel.style.display === 'none';
                advancedPanel.style.display = isHidden ? 'block' : 'none';
                advancedToggle.innerHTML = isHidden ? 
                    'Advanced Search <i class="fas fa-chevron-up"></i>' : 
                    'Advanced Search <i class="fas fa-chevron-down"></i>';
            });
        }
        
        // Help button
        const helpButton = container.querySelector('#search-help-button');
        if (helpButton) {
            helpButton.addEventListener('click', () => {
                this.showHelpModal();
            });
        }
    }
    
    /**
     * Update field options based on selected database
     */
    updateFieldOptions() {
        if (!this.selectedDatabase) return;
        
        const fieldSelect = document.getElementById('search-field');
        if (!fieldSelect) return;
        
        // Clear existing options except the first one
        while (fieldSelect.options.length > 1) {
            fieldSelect.remove(1);
        }
        
        // Find the selected database
        const database = this.availableDatabases.find(db => db.id === this.selectedDatabase);
        if (!database) return;
        
        // Add common fields
        const commonFields = ['name', 'id', 'category', 'description', 'status'];
        commonFields.forEach(field => {
            const option = document.createElement('option');
            option.value = field;
            option.textContent = field.charAt(0).toUpperCase() + field.slice(1);
            fieldSelect.appendChild(option);
        });
        
        // Reset results
        const resultsMessage = document.getElementById('results-message');
        if (resultsMessage) {
            resultsMessage.textContent = `Database "${database.name}" selected. Enter a search query.`;
        }
    }
    
    /**
     * Perform search based on input values
     */
    performSearch() {
        const searchInput = document.getElementById('db-search-input');
        if (!searchInput || !searchInput.value.trim()) {
            this.showError('Please enter a search term');
            return;
        }
        
        const searchTerm = searchInput.value.trim();
        const database = this.selectedDatabase || 'all';
        
        // Get advanced search options if panel is visible
        const advancedPanel = document.getElementById('advanced-search-panel');
        let advancedOptions = {};
        
        if (advancedPanel && advancedPanel.style.display !== 'none') {
            const field = document.getElementById('search-field').value;
            const operator = document.getElementById('search-operator').value;
            const caseSensitive = document.getElementById('case-sensitive').checked;
            const exactMatch = document.getElementById('exact-match').checked;
            
            advancedOptions = { field, operator, caseSensitive, exactMatch };
        }
        
        // Show loading state
        this.setResultsMessage('Searching database...');
        
        // In a real application, this would call an API or query a database
        // For this example, we'll simulate a search with a setTimeout
        setTimeout(() => {
            this.simulateSearch(searchTerm, database, advancedOptions);
        }, 800);
    }
    
    /**
     * Simulate search results (would be replaced with actual API calls in production)
     */
    simulateSearch(searchTerm, database, options) {
        // Generate some mock results
        const results = [];
        const resultCount = Math.floor(Math.random() * 10) + 1;
        
        for (let i = 1; i <= resultCount; i++) {
            results.push({
                id: `item-${Math.floor(Math.random() * 1000)}`,
                name: `Result ${i} for "${searchTerm}"`,
                description: `This is a simulated search result for the term "${searchTerm}" in the ${database} database`,
                score: Math.floor(Math.random() * 100) / 100
            });
        }
        
        this.searchResults = results;
        this.displaySearchResults();
    }
    
    /**
     * Display search results in the results panel
     */
    displaySearchResults() {
        const resultsElement = document.getElementById('results-list');
        const resultsMessage = document.getElementById('results-message');
        const searchStats = document.getElementById('search-stats');
        
        if (!resultsElement || !resultsMessage || !searchStats) return;
        
        if (this.searchResults.length === 0) {
            resultsMessage.textContent = 'No results found. Try a different search term.';
            resultsElement.innerHTML = '';
            searchStats.textContent = '0 results';
            return;
        }
        
        resultsMessage.textContent = `${this.searchResults.length} results found:`;
        searchStats.textContent = `${this.searchResults.length} results`;
        
        // Create results HTML
        let resultsHTML = '';
        this.searchResults.forEach(result => {
            resultsHTML += `
                <div class="result-item glass-card" data-id="${result.id}">
                    <div class="result-header">
                        <h4>${result.name}</h4>
                        <span class="result-score">${Math.round(result.score * 100)}% match</span>
                    </div>
                    <p>${result.description}</p>
                    <div class="result-actions">
                        <button class="view-button glass-button-small">View Details</button>
                        <button class="select-button glass-button-small">Select</button>
                    </div>
                </div>
            `;
        });
        
        resultsElement.innerHTML = resultsHTML;
        
        // Add event listeners to buttons
        resultsElement.querySelectorAll('.view-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const resultId = e.target.closest('.result-item').dataset.id;
                this.viewResultDetails(resultId);
            });
        });
        
        resultsElement.querySelectorAll('.select-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const resultId = e.target.closest('.result-item').dataset.id;
                this.selectResult(resultId);
            });
        });
    }
    
    /**
     * Show an error message
     */
    showError(message) {
        const resultsMessage = document.getElementById('results-message');
        if (!resultsMessage) return;
        
        resultsMessage.innerHTML = `<span class="error-message">${message}</span>`;
    }
    
    /**
     * Set results message
     */
    setResultsMessage(message) {
        const resultsMessage = document.getElementById('results-message');
        if (!resultsMessage) return;
        
        resultsMessage.textContent = message;
    }
    
    /**
     * View details of a selected result
     */
    viewResultDetails(resultId) {
        const result = this.searchResults.find(r => r.id === resultId);
        if (!result) return;
        
        alert(`Viewing details for: ${result.name}`);
        // In a real application, this would open a modal or navigate to a details page
    }
    
    /**
     * Select a result for further processing
     */
    selectResult(resultId) {
        const result = this.searchResults.find(r => r.id === resultId);
        if (!result) return;
        
        // Set as selected result
        alert(`Selected: ${result.name}`);
        // In a real application, this would do something with the selected item
    }
    
    /**
     * Show help modal with search tips
     */
    showHelpModal() {
        // Create modal element
        const modalContainer = document.createElement('div');
        modalContainer.className = 'glass-modal-container';
        
        modalContainer.innerHTML = `
            <div class="glass-modal">
                <div class="modal-header">
                    <h3>Search Help</h3>
                    <button class="close-button">&times;</button>
                </div>
                <div class="modal-body">
                    <h4>Search Tips</h4>
                    <ul>
                        <li>Use keywords to find specific items</li>
                        <li>Enclose phrases in quotes for exact matches</li>
                        <li>Use AND, OR operators to combine terms</li>
                        <li>Use the Advanced Search for more specific queries</li>
                    </ul>
                    
                    <h4>Available Databases</h4>
                    <ul>
                        ${this.availableDatabases.map(db => 
                            `<li>${db.name} - Contains tables: ${db.tables.join(', ')}</li>`
                        ).join('')}
                    </ul>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(modalContainer);
        
        // Add event listener to close button
        const closeButton = modalContainer.querySelector('.close-button');
        closeButton.addEventListener('click', () => {
            document.body.removeChild(modalContainer);
        });
        
        // Close modal when clicking outside
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) {
                document.body.removeChild(modalContainer);
            }
        });
    }
}

// Create global instance for easier access
const dbSearchHandler = new DBSearchHandler();