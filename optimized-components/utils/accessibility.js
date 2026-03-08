// ==================== ACCESSIBILITY UTILITIES ====================

/**
 * ARIA live region announcer
 * Announces messages to screen readers
 */
class AriaAnnouncer {
    constructor() {
        this.createLiveRegion();
    }

    createLiveRegion() {
        // Remove existing live region if present
        const existing = document.getElementById('aria-live-region');
        if (existing) {
            existing.remove();
        }

        // Create new live region
        const liveRegion = document.createElement('div');
        liveRegion.id = 'aria-live-region';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.position = 'absolute';
        liveRegion.style.left = '-10000px';
        liveRegion.style.width = '1px';
        liveRegion.style.height = '1px';
        liveRegion.style.overflow = 'hidden';
        
        document.body.appendChild(liveRegion);
        this.liveRegion = liveRegion;
    }

    announce(message, priority = 'polite') {
        if (!this.liveRegion) {
            this.createLiveRegion();
        }

        // Set priority (polite or assertive)
        this.liveRegion.setAttribute('aria-live', priority);
        
        // Clear and set new message
        this.liveRegion.textContent = '';
        setTimeout(() => {
            this.liveRegion.textContent = message;
        }, 100);

        // Log for debugging
        console.log(`🔊 Screen reader announcement (${priority}):`, message);
    }

    announceError(message) {
        this.announce(`Error: ${message}`, 'assertive');
    }

    announceSuccess(message) {
        this.announce(`Success: ${message}`, 'polite');
    }

    announceLoading(message = 'Loading') {
        this.announce(`${message}, please wait`, 'polite');
    }

    announceLoadingComplete(message = 'Content loaded') {
        this.announce(message, 'polite');
    }
}

// Global announcer instance
export const ariaAnnouncer = new AriaAnnouncer();

/**
 * Keyboard navigation utilities
 */
export const KeyboardNav = {
    KEYS: {
        ENTER: 'Enter',
        SPACE: ' ',
        ESCAPE: 'Escape',
        TAB: 'Tab',
        ARROW_UP: 'ArrowUp',
        ARROW_DOWN: 'ArrowDown',
        ARROW_LEFT: 'ArrowLeft',
        ARROW_RIGHT: 'ArrowRight',
        HOME: 'Home',
        END: 'End'
    },

    /**
     * Handle button-like keyboard interactions
     */
    handleButtonKeyDown: (event, onClick) => {
        if (event.key === KeyboardNav.KEYS.ENTER || event.key === KeyboardNav.KEYS.SPACE) {
            event.preventDefault();
            onClick();
        }
    },

    /**
     * Handle list navigation
     */
    handleListKeyDown: (event, currentIndex, maxIndex, onSelect, onMove) => {
        let newIndex = currentIndex;

        switch (event.key) {
            case KeyboardNav.KEYS.ARROW_UP:
                event.preventDefault();
                newIndex = currentIndex > 0 ? currentIndex - 1 : maxIndex;
                break;
            case KeyboardNav.KEYS.ARROW_DOWN:
                event.preventDefault();
                newIndex = currentIndex < maxIndex ? currentIndex + 1 : 0;
                break;
            case KeyboardNav.KEYS.HOME:
                event.preventDefault();
                newIndex = 0;
                break;
            case KeyboardNav.KEYS.END:
                event.preventDefault();
                newIndex = maxIndex;
                break;
            case KeyboardNav.KEYS.ENTER:
            case KeyboardNav.KEYS.SPACE:
                event.preventDefault();
                onSelect && onSelect(currentIndex);
                return;
            default:
                return;
        }

        onMove && onMove(newIndex);
    },

    /**
     * Trap focus within an element
     */
    trapFocus: (containerElement) => {
        const focusableElements = containerElement.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const handleTabKey = (e) => {
            if (e.key === KeyboardNav.KEYS.TAB) {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };

        containerElement.addEventListener('keydown', handleTabKey);
        
        // Focus first element
        firstElement?.focus();

        // Return cleanup function
        return () => {
            containerElement.removeEventListener('keydown', handleTabKey);
        };
    }
};

/**
 * Focus management utilities
 */
export const FocusManager = {
    /**
     * Save current focus to restore later
     */
    saveFocus: () => {
        return document.activeElement;
    },

    /**
     * Restore previously saved focus
     */
    restoreFocus: (element) => {
        if (element && element.focus) {
            element.focus();
        }
    },

    /**
     * Move focus to element with announcement
     */
    moveFocusTo: (selector, announceMessage) => {
        const element = document.querySelector(selector);
        if (element) {
            element.focus();
            if (announceMessage) {
                ariaAnnouncer.announce(announceMessage);
            }
            return true;
        }
        return false;
    },

    /**
     * Check if element is focusable
     */
    isFocusable: (element) => {
        if (!element) return false;
        
        const focusableSelectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])'
        ];

        return focusableSelectors.some(selector => 
            element.matches(selector) && 
            element.offsetParent !== null
        );
    }
};

/**
 * ARIA attribute helpers
 */
export const AriaHelpers = {
    /**
     * Generate unique ID for ARIA relationships
     */
    generateId: (prefix = 'aria') => {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Get standard ARIA attributes for buttons
     */
    getButtonProps: (label, pressed, disabled, describedBy) => ({
        role: 'button',
        'aria-label': label,
        'aria-pressed': pressed !== undefined ? pressed : undefined,
        'aria-disabled': disabled || undefined,
        'aria-describedby': describedBy || undefined,
        tabIndex: disabled ? -1 : 0
    }),

    /**
     * Get standard ARIA attributes for status/alerts
     */
    getStatusProps: (level = 'polite') => ({
        role: 'status',
        'aria-live': level,
        'aria-atomic': 'true'
    }),

    /**
     * Get standard ARIA attributes for alerts
     */
    getAlertProps: () => ({
        role: 'alert',
        'aria-live': 'assertive',
        'aria-atomic': 'true'
    }),

    /**
     * Get standard ARIA attributes for tabs
     */
    getTabProps: (selected, controls, describedBy) => ({
        role: 'tab',
        'aria-selected': selected,
        'aria-controls': controls,
        'aria-describedby': describedBy || undefined,
        tabIndex: selected ? 0 : -1
    }),

    /**
     * Get standard ARIA attributes for tab panels
     */
    getTabPanelProps: (labelledBy, hidden) => ({
        role: 'tabpanel',
        'aria-labelledby': labelledBy,
        'aria-hidden': hidden || undefined,
        tabIndex: hidden ? -1 : 0
    }),

    /**
     * Get standard ARIA attributes for lists
     */
    getListProps: (label, itemCount) => ({
        role: 'list',
        'aria-label': label,
        'aria-setsize': itemCount || undefined
    }),

    /**
     * Get standard ARIA attributes for list items
     */
    getListItemProps: (position, setSize, selected) => ({
        role: 'listitem',
        'aria-posinset': position || undefined,
        'aria-setsize': setSize || undefined,
        'aria-selected': selected || undefined
    })
};

/**
 * Color contrast utilities for accessibility
 */
export const ColorUtils = {
    /**
     * Calculate luminance of a color
     */
    getLuminance: (color) => {
        // Convert hex to RGB
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        // Calculate relative luminance
        const [rL, gL, bL] = [r, g, b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });

        return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
    },

    /**
     * Calculate contrast ratio between two colors
     */
    getContrastRatio: (color1, color2) => {
        const lum1 = ColorUtils.getLuminance(color1);
        const lum2 = ColorUtils.getLuminance(color2);
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        return (brightest + 0.05) / (darkest + 0.05);
    },

    /**
     * Check if color combination meets WCAG contrast requirements
     */
    meetsContrastRequirement: (foreground, background, level = 'AA', size = 'normal') => {
        const ratio = ColorUtils.getContrastRatio(foreground, background);
        const minRatio = level === 'AAA' 
            ? (size === 'large' ? 4.5 : 7) 
            : (size === 'large' ? 3 : 4.5);
        return ratio >= minRatio;
    }
};

/**
 * Accessibility testing helpers for development
 */
export const A11yTesting = {
    /**
     * Log accessibility information for debugging
     */
    logAccessibilityInfo: (element) => {
        if (process.env.NODE_ENV !== 'development') return;

        const info = {
            tagName: element.tagName,
            role: element.getAttribute('role'),
            ariaLabel: element.getAttribute('aria-label'),
            ariaLabelledBy: element.getAttribute('aria-labelledby'),
            ariaDescribedBy: element.getAttribute('aria-describedby'),
            tabIndex: element.tabIndex,
            isFocusable: FocusManager.isFocusable(element)
        };

        console.log('♿ Accessibility Info:', info);
    },

    /**
     * Check for common accessibility issues
     */
    validateElement: (element) => {
        const issues = [];

        // Check for missing alt text on images
        if (element.tagName === 'IMG' && !element.alt) {
            issues.push('Missing alt attribute on image');
        }

        // Check for buttons without labels
        if (element.tagName === 'BUTTON' && !element.textContent.trim() && !element.getAttribute('aria-label')) {
            issues.push('Button has no accessible label');
        }

        // Check for interactive elements without focus indicator
        if (FocusManager.isFocusable(element)) {
            const style = window.getComputedStyle(element);
            if (style.outlineStyle === 'none' && !style.boxShadow) {
                issues.push('Interactive element may lack focus indicator');
            }
        }

        if (issues.length > 0) {
            console.warn('♿ Accessibility Issues:', issues, element);
        }

        return issues;
    }
};
