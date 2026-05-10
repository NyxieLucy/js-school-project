/**
 * ════════════════════════════════════════════════════════════════════════════
 * SOUK BRAWL - Utility Functions
 * Common helper functions and utilities
 * ════════════════════════════════════════════════════════════════════════════
 */

const Utils = {
  /**
   * DOM Utilities
   */
  DOM: {
    /**
     * Safely select a single element
     */
    select(selector) {
      try {
        const element = document.querySelector(selector);
        if (!element) {
          console.warn(`Element not found: ${selector}`);
        }
        return element;
      } catch (error) {
        console.error(`Invalid selector: ${selector}`, error);
        return null;
      }
    },

    /**
     * Safely select multiple elements
     */
    selectAll(selector) {
      try {
        return Array.from(document.querySelectorAll(selector));
      } catch (error) {
        console.error(`Invalid selector: ${selector}`, error);
        return [];
      }
    },

    /**
     * Add class(es) to element
     */
    addClass(element, ...classes) {
      if (!element) return;
      element.classList.add(...classes);
    },

    /**
     * Remove class(es) from element
     */
    removeClass(element, ...classes) {
      if (!element) return;
      element.classList.remove(...classes);
    },

    /**
     * Toggle class on element
     */
    toggleClass(element, className) {
      if (!element) return;
      element.classList.toggle(className);
    },

    /**
     * Check if element has class
     */
    hasClass(element, className) {
      return element?.classList.contains(className) ?? false;
    },

    /**
     * Set multiple attributes
     */
    setAttributes(element, attributes) {
      if (!element) return;
      Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    },

    /**
     * Show element
     */
    show(element) {
      if (!element) return;
      element.style.display = '';
    },

    /**
     * Hide element
     */
    hide(element) {
      if (!element) return;
      element.style.display = 'none';
    },
  },

  /**
   * Math Utilities
   */
  Math: {
    /**
     * Clamp value between min and max
     */
    clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    },

    /**
     * Linear interpolation
     */
    lerp(start, end, t) {
      return start + (end - start) * t;
    },

    /**
     * Random integer between min and max (inclusive)
     */
    randomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Random float between min and max
     */
    randomFloat(min, max) {
      return Math.random() * (max - min) + min;
    },

    /**
     * Random boolean with given probability (0-1)
     */
    randomBool(probability = 0.5) {
      return Math.random() < probability;
    },

    /**
     * Distance between two points
     */
    distance(x1, y1, x2, y2) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * Angle between two points (in radians)
     */
    angle(x1, y1, x2, y2) {
      return Math.atan2(y2 - y1, x2 - x1);
    },
  },

  /**
   * String Utilities
   */
  String: {
    /**
     * Capitalize first letter
     */
    capitalize(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    },

    /**
     * Convert to kebab-case
     */
    toKebab(str) {
      return str
        .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2')
        .toLowerCase();
    },

    /**
     * Convert to camelCase
     */
    toCamel(str) {
      return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    },

    /**
     * Pad string with zeros
     */
    padZero(str, length) {
      return String(str).padStart(length, '0');
    },

    /**
     * Format time as MM:SS
     */
    formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${Utils.String.padZero(mins, 2)}:${Utils.String.padZero(secs, 2)}`;
    },
  },

  /**
   * Storage Utilities
   */
  Storage: {
    /**
     * Get item from localStorage
     */
    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (error) {
        console.error(`Failed to get storage item: ${key}`, error);
        return defaultValue;
      }
    },

    /**
     * Set item in localStorage
     */
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error(`Failed to set storage item: ${key}`, error);
        return false;
      }
    },

    /**
     * Remove item from localStorage
     */
    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error(`Failed to remove storage item: ${key}`, error);
        return false;
      }
    },

    /**
     * Clear all localStorage items
     */
    clear() {
      try {
        localStorage.clear();
        return true;
      } catch (error) {
        console.error('Failed to clear storage', error);
        return false;
      }
    },
  },

  /**
   * Animation Utilities
   */
  Animation: {
    /**
     * Smooth animation loop using requestAnimationFrame
     */
    loop(callback) {
      let animationId;
      let isRunning = true;

      const frame = (timestamp) => {
        if (isRunning) {
          callback(timestamp);
          animationId = requestAnimationFrame(frame);
        }
      };

      animationId = requestAnimationFrame(frame);

      return {
        stop() {
          isRunning = false;
          cancelAnimationFrame(animationId);
        },
        start() {
          isRunning = true;
          animationId = requestAnimationFrame(frame);
        },
      };
    },

    /**
     * Simple delay timer
     */
    delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },

    /**
     * Debounce function calls
     */
    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    /**
     * Throttle function calls
     */
    throttle(func, limit) {
      let inThrottle;
      return function(...args) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => (inThrottle = false), limit);
        }
      };
    },
  },

  /**
   * Event Utilities
   */
  Event: {
    /**
     * Create and dispatch custom event
     */
    emit(eventName, detail = {}) {
      const event = new CustomEvent(eventName, { detail });
      document.dispatchEvent(event);
    },

    /**
     * Listen for custom event
     */
    on(eventName, callback) {
      document.addEventListener(eventName, callback);
      // Return unsubscribe function
      return () => {
        document.removeEventListener(eventName, callback);
      };
    },

    /**
     * One-time event listener
     */
    once(eventName, callback) {
      const handler = (event) => {
        callback(event);
        document.removeEventListener(eventName, handler);
      };
      document.addEventListener(eventName, handler);
    },
  },

  /**
   * Debug Utilities
   */
  Debug: {
    /**
     * Safe console.log that respects debug mode
     */
    log(...args) {
      if (GameConfig?.DEBUG) {
        console.log('[SOUK BRAWL]', ...args);
      }
    },

    /**
     * Performance measurement
     */
    measurePerformance(label, callback) {
      if (!GameConfig?.DEBUG) {
        return callback();
      }
      console.time(label);
      const result = callback();
      console.timeEnd(label);
      return result;
    },
  },
};

// Make utilities globally accessible
if (typeof window !== 'undefined') {
  window.Utils = Utils;
}