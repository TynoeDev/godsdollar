/**
 * Service Worker Registration Script
 * Initializes the service worker and handles communication
 */

// Service worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/service-worker.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);

                // Notify when service worker is ready
                if (registration.active) {
                    console.log('ServiceWorker already active');
                }
            })
            .catch(function(err) {
                console.error('ServiceWorker registration failed: ', err);
            });
    });
}

// Helper class to manage service worker communication
class CryptoServiceWorkerManager {
    constructor() {
        this.serviceWorkerReady = false;
        this.activeCoins = ['bitcoin']; // Default coin

        // Check if service worker is already controlling the page
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            this.serviceWorkerReady = true;
        }

        // Set up event listeners for service worker
        this._setupEventListeners();
    }

    /**
     * Set up event listeners for service worker messages
     */
    _setupEventListeners() {
        if (!navigator.serviceWorker) return;

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (!event.data) return;

            if (event.data.type === 'CRYPTO_DATA_UPDATE') {
                this._handleCryptoDataUpdate(event.data.data);
            } else if (event.data.type === 'INTERVAL_UPDATED') {
                console.log(`Update interval changed to ${event.data.interval}ms`);
            }
        });

        // If service worker becomes active during this page load
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            this.serviceWorkerReady = true;
        });
    }

    /**
     * Handle cryptocurrency data updates from service worker
     */
    _handleCryptoDataUpdate(dataArray) {
        if (!dataArray || !dataArray.length) return;

        // Find and update the widget with new data
        if (window.compactCryptoWidget) {
            dataArray.forEach(coinData => {
                // Only update if it's the currently displayed coin
                if (coinData.id === window.compactCryptoWidget.currentCoin) {
                    window.compactCryptoWidget.updateWidgetWithData(coinData);
                }
            });
        }
    }

    /**
     * Start background updates for cryptocurrencies
     */
    startBackgroundUpdates(coins = null, interval = null) {
        if (!this.serviceWorkerReady || !navigator.serviceWorker.controller) return;

        // Set active coins
        this.activeCoins = coins || this.activeCoins;

        // Send message to service worker
        navigator.serviceWorker.controller.postMessage({
            type: 'START_BACKGROUND_UPDATES',
            coins: this.activeCoins,
            interval: interval
        });
    }

    /**
     * Update the background fetch interval
     */
    updateInterval(interval) {
        if (!this.serviceWorkerReady || !navigator.serviceWorker.controller) return;

        // Send message to service worker
        navigator.serviceWorker.controller.postMessage({
            type: 'SET_UPDATE_INTERVAL',
            interval: interval
        });
    }

    /**
     * Stop background updates
     */
    stopBackgroundUpdates() {
        if (!this.serviceWorkerReady || !navigator.serviceWorker.controller) return;

        // Send message to service worker
        navigator.serviceWorker.controller.postMessage({
            type: 'STOP_BACKGROUND_UPDATES'
        });
    }

    /**
     * Update coins being monitored
     */
    updateCoins(coins) {
        if (!coins || !coins.length) return;

        this.activeCoins = coins;

        // Restart updates with new coins
        this.startBackgroundUpdates(coins);
    }
}

// Create global instance
window.cryptoServiceWorker = new CryptoServiceWorkerManager();