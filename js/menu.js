/**
 * ════════════════════════════════════════════════════════════════════════════
 * SOUK BRAWL - Menu System
 * Handles menu navigation and screen transitions
 * ════════════════════════════════════════════════════════════════════════════
 */

class MenuSystem {
  constructor() {
    this.menuItems = [];
    this.selectedIndex = 0;
    this.isNavigating = false;
    this.currentScreen = 'main';

    this.initializeMenu();
    this.setupInputHandlers();
  }

  /**
   * Initialize menu items
   */
  initializeMenu() {
    const menuNav = Utils.DOM.select('#main-menu');
    if (!menuNav) {
      console.error('Menu navigation not found');
      return;
    }

    // Get all menu items
    this.menuItems = Utils.DOM.selectAll('.menu-item');
    Utils.Debug.log('Menu items found:', this.menuItems.length);

    // Set first item as active
    if (this.menuItems.length > 0) {
      this.selectItem(0);
    }

    // Add click handlers to menu items
    this.menuItems.forEach((item, index) => {
      item.addEventListener('click', () => this.selectAndNavigate(index));
      item.addEventListener('keydown', (e) => this.handleMenuKeydown(e, index));
    });
  }

  /**
   * Setup input handlers
   */
  setupInputHandlers() {
    // Listen for keyboard input
    Utils.Event.on('input:keydown', (event) => {
      this.handleMenuInput(event.detail.key);
    });

    // Update input state each frame
    setInterval(() => {
      if (window.inputSystem) {
        window.inputSystem.update();
      }
    }, 1000 / 60); // 60 FPS
  }

  /**
   * Handle menu input
   */
  handleMenuInput(key) {
    if (this.isNavigating) return;

    const keys = GameConfig.KEYS;

    switch (key) {
      case keys.UP.toLowerCase():
        this.moveUp();
        break;
      case keys.DOWN.toLowerCase():
        this.moveDown();
        break;
      case keys.SELECT.toLowerCase():
        this.confirmSelection();
        break;
      case keys.BACK.toLowerCase():
        this.goBack();
        break;
    }
  }

  /**
   * Move selection up
   */
  moveUp() {
    const newIndex = (this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length;
    this.selectItem(newIndex);
    this.playSound('menu_move');
  }

  /**
   * Move selection down
   */
  moveDown() {
    const newIndex = (this.selectedIndex + 1) % this.menuItems.length;
    this.selectItem(newIndex);
    this.playSound('menu_move');
  }

  /**
   * Select a menu item by index
   */
  selectItem(index) {
    // Deselect previous item
    if (this.menuItems[this.selectedIndex]) {
      Utils.DOM.removeClass(this.menuItems[this.selectedIndex], 'active');
    }

    // Select new item
    this.selectedIndex = index;
    if (this.menuItems[this.selectedIndex]) {
      Utils.DOM.addClass(this.menuItems[this.selectedIndex], 'active');
      Utils.Debug.log('Selected menu item:', this.selectedIndex);
    }
  }

  /**
   * Select and navigate to an item
   */
  selectAndNavigate(index) {
    this.selectItem(index);
    this.confirmSelection();
  }

  /**
   * Confirm selection and navigate
   */
  confirmSelection() {
    const selectedItem = this.menuItems[this.selectedIndex];
    if (!selectedItem) return;

    this.isNavigating = true;
    const href = selectedItem.getAttribute('href');
    const action = selectedItem.getAttribute('data-action');

    this.playSound('menu_select');
    Utils.Event.emit('menu:selected', { action, href });

    // Navigate after a short delay for visual feedback
    setTimeout(() => {
      if (href) {
        window.location.href = href;
      }
    }, 300);
  }

  /**
   * Go back (unused in main menu, but useful for submenus)
   */
  goBack() {
    this.playSound('menu_back');
    Utils.Event.emit('menu:back');
  }

  /**
   * Handle keyboard on menu items
   */
  handleMenuKeydown(event, index) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectAndNavigate(index);
    }
  }

  /**
   * Play sound effect (placeholder)
   */
  playSound(soundName) {
    // Sound playback would be implemented here
    // For now, just log it
    Utils.Debug.log('Sound:', soundName);
  }

  /**
   * Transition to another screen
   */
  transitionToScreen(screenName) {
    const currentScreen = Utils.DOM.select(`#screen-${this.currentScreen}`);
    const nextScreen = Utils.DOM.select(`#screen-${screenName}`);

    if (currentScreen && nextScreen) {
      Utils.DOM.removeClass(currentScreen, 'active');
      Utils.DOM.addClass(nextScreen, 'active');
      this.currentScreen = screenName;
      this.isNavigating = false;
      Utils.Debug.log('Transitioned to screen:', screenName);
    }
  }

  /**
   * Update character showcase
   */
  updateCharacterShowcase(characterId) {
    const character = GameConfig.CHARACTERS[characterId.toUpperCase()];
    if (!character) return;

    const spriteImg = Utils.DOM.select('#hero-sprite-img');
    const heroName = Utils.DOM.select('.hero-name');
    const heroNameAr = Utils.DOM.select('.hero-name-ar');
    const heroOrigin = Utils.DOM.select('.hero-origin');

    if (spriteImg) spriteImg.src = character.assets.idle;
    if (heroName) heroName.textContent = character.name;
    if (heroNameAr) heroNameAr.textContent = character.nameAR;
    if (heroOrigin) heroOrigin.textContent = character.origin;

    this.playSound('character_select');
  }
}

// Initialize menu system
let menuSystem = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    menuSystem = new MenuSystem();
    window.menuSystem = menuSystem;
  });
} else {
  menuSystem = new MenuSystem();
  window.menuSystem = menuSystem;
}