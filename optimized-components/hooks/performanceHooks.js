// ==================== PERFORMANCE HOOKS ====================

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Debounce hook - Delays execution until after delay has elapsed
 * Useful for search inputs, resize handlers, API calls
 * 
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {any} - Debounced value
 */
export const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

/**
 * Throttle hook - Limits execution frequency
 * Useful for scroll handlers, mouse move events
 * 
 * @param {Function} fn - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Throttled function
 */
export const useThrottle = (fn, delay) => {
    const timeoutRef = useRef(null);
    
    return useCallback((...args) => {
        if (timeoutRef.current) return;
        
        timeoutRef.current = setTimeout(() => {
            fn(...args);
            timeoutRef.current = null;
        }, delay);
    }, [fn, delay]);
};

/**
 * Performance monitor hook - Tracks FPS for optimization
 * Warns when performance drops below acceptable levels
 * 
 * @returns {number} - Current FPS
 */
export const usePerformanceMonitor = () => {
    const frameRef = useRef();
    const fpsRef = useRef(0);
    const lastTimeRef = useRef(performance.now());
    const framesRef = useRef(0);

    useEffect(() => {
        const measureFPS = () => {
            const now = performance.now();
            const delta = now - lastTimeRef.current;
            
            if (delta >= 1000) {
                fpsRef.current = Math.round((framesRef.current * 1000) / delta);
                framesRef.current = 0;
                lastTimeRef.current = now;
                
                // Performance warning
                if (fpsRef.current < 30 && fpsRef.current > 0) {
                    console.warn(`🐌 Low FPS detected: ${fpsRef.current}fps. Consider optimizing.`);
                }
            }
            
            framesRef.current++;
            frameRef.current = requestAnimationFrame(measureFPS);
        };

        frameRef.current = requestAnimationFrame(measureFPS);

        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
        };
    }, []);

    return fpsRef.current;
};

/**
 * Network status hook - Monitors online/offline status
 * Useful for handling connectivity issues
 * 
 * @returns {boolean} - Online status
 */
export const useNetworkStatus = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            console.log('🌐 Connection restored');
        };
        
        const handleOffline = () => {
            setIsOnline(false);
            console.warn('📡 Connection lost - switching to offline mode');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
};

/**
 * Local storage hook with error handling
 * Safely manages localStorage with fallback
 * 
 * @param {string} key - Storage key
 * @param {any} initialValue - Initial value if not found
 * @returns {[any, Function]} - [value, setValue]
 */
export const useLocalStorage = (key, initialValue) => {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.warn(`Failed to read localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    const setValue = useCallback((value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(`Failed to set localStorage key "${key}":`, error);
        }
    }, [key, storedValue]);

    return [storedValue, setValue];
};

/**
 * Intersection observer hook for lazy loading
 * Detects when elements enter viewport
 * 
 * @param {Object} options - IntersectionObserver options
 * @returns {[Function, boolean]} - [ref setter, isIntersecting]
 */
export const useIntersectionObserver = (options = {}) => {
    const [isIntersecting, setIsIntersecting] = useState(false);
    const [element, setElement] = useState(null);

    useEffect(() => {
        if (!element) return;

        const observer = new IntersectionObserver(([entry]) => {
            setIsIntersecting(entry.isIntersecting);
        }, {
            threshold: 0.1,
            rootMargin: '50px',
            ...options
        });

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [element, options]);

    return [setElement, isIntersecting];
};

/**
 * Window size hook for responsive design
 * Tracks window dimensions with throttling
 * 
 * @returns {Object} - { width, height, isMobile, isTablet, isDesktop }
 */
export const useWindowSize = () => {
    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    const throttledResize = useThrottle(() => {
        setWindowSize({
            width: window.innerWidth,
            height: window.innerHeight,
        });
    }, 100);

    useEffect(() => {
        window.addEventListener('resize', throttledResize);
        return () => window.removeEventListener('resize', throttledResize);
    }, [throttledResize]);

    return {
        ...windowSize,
        isMobile: windowSize.width < 768,
        isTablet: windowSize.width >= 768 && windowSize.width < 1024,
        isDesktop: windowSize.width >= 1024
    };
};

/**
 * Previous value hook - Tracks previous value of a state/prop
 * Useful for animations and comparisons
 * 
 * @param {any} value - Current value
 * @returns {any} - Previous value
 */
export const usePrevious = (value) => {
    const ref = useRef();
    
    useEffect(() => {
        ref.current = value;
    });
    
    return ref.current;
};

/**
 * Async state hook with loading and error handling
 * Manages async operations with built-in states
 * 
 * @param {Function} asyncFunction - Async function to execute
 * @param {Array} dependencies - Dependencies array
 * @returns {Object} - { data, loading, error, refetch }
 */
export const useAsync = (asyncFunction, dependencies = []) => {
    const [state, setState] = useState({
        data: null,
        loading: true,
        error: null
    });

    const execute = useCallback(async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        try {
            const result = await asyncFunction();
            setState({ data: result, loading: false, error: null });
        } catch (error) {
            setState({ data: null, loading: false, error });
            console.error('Async operation failed:', error);
        }
    }, dependencies);

    useEffect(() => {
        execute();
    }, [execute]);

    return {
        ...state,
        refetch: execute
    };
};

/**
 * Click outside hook - Detects clicks outside element
 * Useful for modals, dropdowns, tooltips
 * 
 * @param {Function} callback - Function to call on outside click
 * @returns {Function} - Ref setter for the element
 */
export const useClickOutside = (callback) => {
    const ref = useRef();

    useEffect(() => {
        const handleClick = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                callback();
            }
        };

        document.addEventListener('mousedown', handleClick);
        document.addEventListener('touchstart', handleClick);

        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('touchstart', handleClick);
        };
    }, [callback]);

    return ref;
};
