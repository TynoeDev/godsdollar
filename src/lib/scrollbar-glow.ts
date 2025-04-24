/**
 * Scrollbar glow effect based on scroll speed
 * Adds a glowing effect to scrollbars based on how fast the user is scrolling
 */

// Track scroll speed and timing
let lastScrollTop = 0;
let lastScrollTime = Date.now();
let scrollSpeed = 0;

// Store timeouts for cleanup
interface ExtendedElement extends HTMLElement {
  scrollTimeout?: number;
}

/**
 * Initialize the scrollbar glow effect
 * Adds event listeners to track scroll speed and apply glow effects
 */
export const initScrollGlowEffect = (): void => {
  // Apply to all scrollable elements
  document.addEventListener('scroll', handleScroll, true);
};

/**
 * Handle scroll events and calculate speed to apply appropriate glow effects
 */
const handleScroll = (event: Event): void => {
  // Make sure we have a valid target that could have scroll properties
  const target = event.target as Node;
  if (!isScrollableElement(target)) {
    return;
  }
  
  const element = target as ExtendedElement;
  const scrollTop = getScrollTop(target);
  
  // Calculate scroll speed
  const now = Date.now();
  const timeDiff = now - lastScrollTime;
  
  if (timeDiff > 0) {
    // Calculate pixels per millisecond
    scrollSpeed = Math.abs(scrollTop - lastScrollTop) / timeDiff;
    
    // Apply CSS class based on speed threshold
    if (scrollSpeed > 0.2) {
      element.classList.add('intense-scroll');
      
      // Remove the class after a delay to create pulsing effect
      if (element.scrollTimeout) {
        clearTimeout(element.scrollTimeout);
      }
      
      element.scrollTimeout = window.setTimeout(() => {
        element.classList.remove('intense-scroll');
      }, 300);
    }
  }
  
  // Update values for next calculation
  lastScrollTop = scrollTop;
  lastScrollTime = now;
};

/**
 * Check if an element is scrollable and has the necessary properties
 */
const isScrollableElement = (node: Node): boolean => {
  return node instanceof HTMLElement && 'classList' in node;
};

/**
 * Get the current scroll position from various possible sources
 */
const getScrollTop = (target: Node): number => {
  if (target === document) {
    return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }
  
  if (target instanceof HTMLElement && 'scrollTop' in target) {
    return target.scrollTop;
  }
  
  return 0;
};

/**
 * Clean up function to remove event listeners
 */
export const cleanupScrollGlowEffect = (): void => {
  document.removeEventListener('scroll', handleScroll, true);
};
