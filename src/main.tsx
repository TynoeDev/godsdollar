import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/scrollbar.css'
import { initScrollGlowEffect } from './lib/scrollbar-glow'

// Initialize the scrollbar glow effect when the app starts
document.addEventListener('DOMContentLoaded', () => {
  initScrollGlowEffect();
});

createRoot(document.getElementById("root")!).render(<App />);
