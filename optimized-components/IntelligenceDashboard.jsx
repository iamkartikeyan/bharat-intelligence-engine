// ==================== OPTIMIZED INTELLIGENCE DASHBOARD ====================
import React, { 
    useState, 
    useEffect, 
    useCallback, 
    useMemo, 
    useRef, 
    memo,
    Suspense,
    lazy
} from 'react';

// ==================== OPTIMIZATIONS & UTILITIES ====================

// Debounce hook for performance optimization
const useDebounce = (value, delay) => {
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

// Throttle hook for scroll events
const useThrottle = (fn, delay) => {
    const timeoutRef = useRef(null);
    
    return useCallback((...args) => {
        if (timeoutRef.current) return;
        
        timeoutRef.current = setTimeout(() => {
            fn(...args);
            timeoutRef.current = null;
        }, delay);
    }, [fn, delay]);
};

// Performance monitor for 60 FPS
const usePerformanceMonitor = () => {
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

// ==================== ERROR BOUNDARY ====================
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false, 
            error: null,
            errorInfo: null,
            retryCount: 0
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
        
        // Log error for analytics
        console.error('Dashboard Error:', error, errorInfo);
    }

    retry = () => {
        this.setState({ 
            hasError: false, 
            error: null, 
            errorInfo: null,
            retryCount: this.state.retryCount + 1
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div 
                    style={{
                        padding: '2rem',
                        textAlign: 'center',
                        background: '#1a1a1a',
                        color: '#fff',
                        borderRadius: '8px',
                        border: '1px solid #ff3366'
                    }}
                    role="alert"
                    aria-live="assertive"
                >
                    <h2>🚨 Dashboard Error</h2>
                    <p>Something went wrong while rendering the intelligence dashboard.</p>
                    <details style={{ marginTop: '1rem', textAlign: 'left' }}>
                        <summary>Error Details</summary>
                        <pre style={{ fontSize: '0.8rem', overflow: 'auto', marginTop: '0.5rem' }}>
                            {this.state.error && this.state.error.toString()}
                        </pre>
                    </details>
                    <button 
                        onClick={this.retry}
                        style={{
                            marginTop: '1rem',
                            padding: '0.5rem 1rem',
                            background: '#ff6600',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#fff',
                            cursor: 'pointer'
                        }}
                        aria-label="Retry loading dashboard"
                    >
                        🔄 Retry ({this.state.retryCount})
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

// ==================== LOADING SPINNER ====================
const LoadingSpinner = memo(({ message = "Loading..." }) => (
    <div 
        style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            background: '#0a1628',
            borderRadius: '8px',
            minHeight: '200px'
        }}
        role="status"
        aria-live="polite"
        aria-label={message}
    >
        <div 
            style={{
                width: '40px',
                height: '40px',
                border: '3px solid #333',
                borderTop: '3px solid #ff6600',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
            }}
        />
        <p style={{ 
            color: '#fff', 
            marginTop: '1rem',
            fontSize: '0.9rem'
        }}>
            {message}
        </p>
        <style>{`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `}</style>
    </div>
));

LoadingSpinner.displayName = 'LoadingSpinner';

// ==================== OPTIMIZED SEARCH COMPONENT ====================
const SearchInput = memo(({ onSearch, placeholder, ariaLabel }) => {
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebounce(query, 300);

    useEffect(() => {
        if (debouncedQuery.trim()) {
            onSearch(debouncedQuery.trim());
        }
    }, [debouncedQuery, onSearch]);

    const handleChange = useCallback((e) => {
        setQuery(e.target.value);
    }, []);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query.trim());
        }
    }, [query, onSearch]);

    const handleKeyDown = useCallback((e) => {
        // Enhanced keyboard navigation
        if (e.key === 'Escape') {
            setQuery('');
        }
    }, []);

    return (
        <form onSubmit={handleSubmit} role="search">
            <input
                type="search"
                value={query}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                aria-label={ariaLabel}
                style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: '#0a1628',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#ff6600'}
                onBlur={(e) => e.target.style.borderColor = '#333'}
            />
        </form>
    );
});

SearchInput.displayName = 'SearchInput';

// ==================== OPTIMIZED NEWS FEED ====================
const NewsFeed = memo(() => {
    const [filter, setFilter] = useState('All');
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const scrollRef = useRef(null);

    // Throttled scroll handler
    const handleScroll = useThrottle(useCallback(() => {
        // Implement virtual scrolling for large datasets
        const element = scrollRef.current;
        if (element) {
            const { scrollTop, scrollHeight, clientHeight } = element;
            if (scrollTop + clientHeight >= scrollHeight - 100) {
                // Load more news if needed
                console.log('Load more news');
            }
        }
    }, []), 100);

    useEffect(() => {
        const element = scrollRef.current;
        if (element) {
            element.addEventListener('scroll', handleScroll, { passive: true });
            return () => element.removeEventListener('scroll', handleScroll);
        }
    }, [handleScroll]);

    const loadNews = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Mock API call with proper error handling
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const mockNews = [
                {
                    id: '1',
                    title: 'Economic Growth Projections Show Positive Trend',
                    description: 'Latest indicators suggest sustained economic recovery across major sectors.',
                    category: 'economic',
                    priority: 'HIGH',
                    sentiment: 0.3,
                    source: 'Economic Times',
                    timeAgo: '2 hours ago'
                },
                {
                    id: '2',
                    title: 'Defense Cooperation Agreement Signed',
                    description: 'Strategic partnership strengthened with key allies in the region.',
                    category: 'defense',
                    priority: 'MEDIUM',
                    sentiment: 0.1,
                    source: 'Defense Journal',
                    timeAgo: '4 hours ago'
                },
                {
                    id: '3',
                    title: 'Geopolitical Tensions Rise in Eastern Region',
                    description: 'Diplomatic efforts continue to address regional security concerns.',
                    category: 'geopolitics',
                    priority: 'HIGH',
                    sentiment: -0.2,
                    source: 'Geopolitical Analysis',
                    timeAgo: '6 hours ago'
                }
            ];
            
            setNews(mockNews);
        } catch (err) {
            console.error("Failed to load news:", err);
            setError("Failed to load news. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadNews();
        
        // Auto-refresh every 15 minutes with cleanup
        const interval = setInterval(loadNews, 900000);
        return () => clearInterval(interval);
    }, [loadNews]);

    const handleRetry = useCallback(() => {
        setRetryCount(prev => prev + 1);
        loadNews();
    }, [loadNews]);

    const filteredNews = useMemo(() => {
        if (filter === 'All') return news;
        return news.filter(n => n.category === filter.toLowerCase());
    }, [news, filter]);

    const getCategoryColor = useCallback((category) => {
        const colors = {
            defense: '#00d4ff',
            economic: '#00ff88',
            geopolitics: '#ff6600',
            domestic: '#9b59b6',
            general: '#777'
        };
        return colors[category] || '#777';
    }, []);

    const getPriorityColor = useCallback((priority) => {
        const colors = {
            HIGH: '#ff3366',
            MEDIUM: '#ffaa00',
            LOW: '#00ff88'
        };
        return colors[priority] || '#777';
    }, []);

    const styles = {
        container: {
            background: '#1a1a1a',
            borderRadius: '8px',
            padding: '1.5rem',
            border: '1px solid #333',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '400px'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid #333'
        },
        title: {
            fontSize: '1.2rem',
            fontWeight: 600,
            color: '#fff',
            fontFamily: 'Orbitron, sans-serif'
        },
        refreshBtn: {
            padding: '0.4rem 0.8rem',
            background: 'transparent',
            border: '1px solid #00d4ff',
            borderRadius: '4px',
            color: '#00d4ff',
            cursor: 'pointer',
            fontSize: '0.75rem',
            transition: 'all 0.3s ease'
        },
        filters: {
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
            marginBottom: '1rem'
        },
        filterBtn: {
            padding: '0.4rem 0.8rem',
            background: 'transparent',
            border: '1px solid #333',
            borderRadius: '4px',
            color: '#999',
            cursor: 'pointer',
            fontSize: '0.75rem',
            transition: 'all 0.3s ease'
        },
        feed: {
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            paddingRight: '0.5rem'
        },
        newsItem: {
            padding: '1rem',
            background: '#0a1628',
            borderRadius: '6px',
            borderLeft: '4px solid',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
        }
    };

    return (
        <div style={styles.container} role="region" aria-label="Intelligence News Feed">
            <div style={styles.header}>
                <h2 style={styles.title}>LIVE INTELLIGENCE FEED</h2>
                <button 
                    style={styles.refreshBtn}
                    onClick={handleRetry}
                    disabled={loading}
                    aria-label={`Refresh news feed (${retryCount} retries)`}
                >
                    {loading ? '⟳ Loading...' : '↻ Refresh'}
                </button>
            </div>
            
            <div style={styles.filters} role="tablist" aria-label="News category filters">
                {['All', 'Defense', 'Economic', 'Geopolitics', 'Domestic'].map(f => (
                    <button
                        key={f}
                        role="tab"
                        aria-selected={filter === f}
                        style={{
                            ...styles.filterBtn,
                            ...(filter === f ? {
                                background: '#ff6600',
                                color: '#fff',
                                borderColor: '#ff6600'
                            } : {})
                        }}
                        onClick={() => setFilter(f)}
                    >
                        {f}
                    </button>
                ))}
            </div>
            
            <div 
                style={styles.feed} 
                ref={scrollRef}
                role="main"
                aria-label={`News articles (${filteredNews.length} items)`}
                aria-live="polite"
                aria-busy={loading}
            >
                {loading ? (
                    <LoadingSpinner message="Loading intelligence data..." />
                ) : error ? (
                    <div 
                        style={{
                            padding: '1rem',
                            background: 'rgba(255, 51, 102, 0.1)',
                            borderRadius: '6px',
                            color: '#ff3366',
                            textAlign: 'center'
                        }}
                        role="alert"
                        aria-live="assertive"
                    >
                        <p>{error}</p>
                        <button 
                            onClick={handleRetry}
                            style={{
                                marginTop: '0.5rem',
                                padding: '0.3rem 0.6rem',
                                background: '#ff3366',
                                border: 'none',
                                borderRadius: '4px',
                                color: '#fff',
                                cursor: 'pointer'
                            }}
                        >
                            Retry
                        </button>
                    </div>
                ) : filteredNews.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        color: '#999',
                        padding: '2rem'
                    }}>
                        No news available for "{filter}"
                    </div>
                ) : (
                    filteredNews.map((article) => (
                        <article 
                            key={article.id}
                            style={{
                                ...styles.newsItem,
                                borderLeftColor: getCategoryColor(article.category)
                            }}
                            tabIndex="0"
                            role="button"
                            aria-label={`Read article: ${article.title}`}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    // Handle article click
                                    console.log('Article clicked:', article.title);
                                }
                            }}
                        >
                            <div style={{
                                fontSize: '0.7rem',
                                color: '#999',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                marginBottom: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <span style={{ 
                                    color: getCategoryColor(article.category),
                                    fontWeight: 600 
                                }}>
                                    {article.category.toUpperCase()}
                                </span>
                                <span>
                                    {article.sentiment > 0.2 ? '✓ Positive' : 
                                     article.sentiment < -0.2 ? '✗ Negative' : '● Neutral'}
                                </span>
                            </div>
                            
                            <h3 style={{
                                fontSize: '0.95rem',
                                fontWeight: 500,
                                color: '#fff',
                                marginBottom: '0.5rem',
                                lineHeight: '1.3'
                            }}>
                                {article.title}
                            </h3>
                            
                            {article.description && (
                                <p style={{
                                    fontSize: '0.85rem',
                                    color: '#ccc',
                                    marginBottom: '0.5rem',
                                    lineHeight: '1.4'
                                }}>
                                    {article.description.length > 120 
                                        ? `${article.description.substring(0, 120)}...` 
                                        : article.description
                                    }
                                </p>
                            )}
                            
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.75rem',
                                color: '#999',
                                flexWrap: 'wrap',
                                gap: '0.5rem'
                            }}>
                                <span>{article.source}</span>
                                <span style={{
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '3px',
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    background: getPriorityColor(article.priority) + '20',
                                    color: getPriorityColor(article.priority)
                                }}>
                                    {article.priority} Priority
                                </span>
                                <time dateTime={new Date().toISOString()}>
                                    {article.timeAgo}
                                </time>
                            </div>
                        </article>
                    ))
                )}
            </div>
        </div>
    );
});

NewsFeed.displayName = 'NewsFeed';

// ==================== OPTIMIZED AI CHAT INTERFACE ====================
const AIChat = memo(() => {
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showHindi, setShowHindi] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const debouncedQuery = useDebounce(query, 300);
    const inputRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus management
    const focusInput = useCallback(() => {
        inputRef.current?.focus();
    }, []);

    const handleSend = useCallback(async () => {
        if (!query.trim() || loading) return;

        const userMessage = { 
            id: Date.now(),
            role: 'user', 
            content: query.trim(),
            timestamp: new Date()
        };
        
        setMessages(prev => [...prev, userMessage]);
        setQuery('');
        setLoading(true);

        try {
            // Simulate AI processing with proper error handling
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const assistantMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: showHindi 
                    ? `आपके प्रश्न का उत्तर: "${query}" - डेटा प्रोसेसिंग पूर्ण।`
                    : `Analysis complete for: "${query}". Here's what I found...`,
                intent: 'DATA_QUERY',
                confidence: 0.85,
                timestamp: new Date()
            };
            
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('AI Chat Error:', error);
            const errorMessage = {
                id: Date.now() + 2,
                role: 'assistant',
                content: showHindi 
                    ? 'क्षमा करें, एक त्रुटि हुई है। कृपया पुनः प्रयास करें।'
                    : 'Sorry, I encountered an error. Please try again.',
                isError: true,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
            focusInput();
        }
    }, [query, loading, showHindi, focusInput]);

    const handleKeyPress = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
        if (e.key === 'Escape') {
            setIsMinimized(true);
        }
    }, [handleSend]);

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    const styles = {
        container: {
            position: 'fixed',
            bottom: 0,
            left: '70px',
            right: 0,
            background: '#1a1a1a',
            borderTop: '2px solid #333',
            padding: '1rem 2rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            zIndex: 800,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
            transform: isMinimized ? 'translateY(100%)' : 'translateY(0)',
            transition: 'transform 0.3s ease'
        },
        minimizeBtn: {
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            background: 'transparent',
            border: 'none',
            color: '#999',
            cursor: 'pointer',
            fontSize: '1rem'
        },
        input: {
            flex: 1,
            padding: '0.75rem 1rem',
            background: '#0a1628',
            border: '1px solid #333',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.95rem',
            outline: 'none',
            transition: 'border-color 0.2s ease',
            resize: 'none',
            minHeight: '44px'
        },
        button: {
            padding: '0.75rem 1.5rem',
            background: '#ff6600',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            minWidth: '100px',
            fontSize: '0.9rem'
        },
        langToggle: {
            padding: '0.5rem 1rem',
            background: '#00d4ff',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.85rem',
            transition: 'all 0.3s ease'
        },
        messages: {
            position: 'fixed',
            bottom: '80px',
            left: '90px',
            right: '20px',
            maxHeight: '400px',
            overflowY: 'auto',
            background: '#1a1a1a',
            borderRadius: '8px',
            padding: '1rem',
            display: messages.length > 0 && !isMinimized ? 'block' : 'none',
            zIndex: 799,
            border: '1px solid #333'
        }
    };

    return (
        <>
            {/* Minimized toggle button */}
            {isMinimized && (
                <button
                    style={{
                        position: 'fixed',
                        bottom: '20px',
                        right: '20px',
                        padding: '1rem',
                        background: '#ff6600',
                        border: 'none',
                        borderRadius: '50%',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '1.5rem',
                        zIndex: 801,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                        animation: 'pulse 2s infinite'
                    }}
                    onClick={() => setIsMinimized(false)}
                    aria-label="Open AI Chat"
                >
                    💬
                </button>
            )}

            {/* Messages container */}
            {messages.length > 0 && !isMinimized && (
                <div 
                    style={styles.messages}
                    role="log"
                    aria-label="Chat messages"
                    aria-live="polite"
                >
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '1rem',
                        paddingBottom: '0.5rem',
                        borderBottom: '1px solid #333'
                    }}>
                        <h3 style={{ color: '#fff', margin: 0, fontSize: '1rem' }}>
                            AI Intelligence Assistant
                        </h3>
                        <button
                            onClick={clearMessages}
                            style={{
                                background: 'transparent',
                                border: '1px solid #666',
                                borderRadius: '4px',
                                color: '#666',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                padding: '0.25rem 0.5rem'
                            }}
                            aria-label="Clear chat history"
                        >
                            Clear
                        </button>
                    </div>
                    
                    {messages.map((msg) => (
                        <div 
                            key={msg.id}
                            style={{
                                padding: '0.75rem',
                                marginBottom: '0.5rem',
                                borderRadius: '6px',
                                background: msg.role === 'user' ? '#ff6600' : 
                                           msg.isError ? '#ff336620' : '#0a1628',
                                color: msg.isError ? '#ff3366' : '#fff',
                                marginLeft: msg.role === 'user' ? '20%' : '0',
                                marginRight: msg.role === 'assistant' ? '20%' : '0'
                            }}
                            role={msg.role === 'assistant' ? 'status' : undefined}
                            aria-label={`${msg.role === 'user' ? 'You' : 'AI'} said: ${msg.content}`}
                        >
                            {msg.role === 'assistant' && msg.intent && (
                                <div style={{
                                    display: 'inline-block',
                                    padding: '0.2rem 0.5rem',
                                    background: '#00d4ff30',
                                    color: '#00d4ff',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    marginBottom: '0.5rem'
                                }}>
                                    {msg.intent} ({Math.round(msg.confidence * 100)}%)
                                </div>
                            )}
                            <div>{msg.content}</div>
                            <div style={{
                                fontSize: '0.7rem',
                                color: '#999',
                                marginTop: '0.25rem'
                            }}>
                                {msg.timestamp.toLocaleTimeString()}
                            </div>
                        </div>
                    ))}
                    
                    <div ref={messagesEndRef} />
                </div>
            )}

            {/* Chat input */}
            <div style={styles.container}>
                <button
                    style={styles.minimizeBtn}
                    onClick={() => setIsMinimized(true)}
                    aria-label="Minimize chat"
                >
                    ▼
                </button>
                
                <textarea
                    ref={inputRef}
                    placeholder={showHindi 
                        ? "GDP, जनसंख्या, या देशों की तुलना के बारे में पूछें..."
                        : "Ask about GDP, population, compare countries, trade relations..."
                    }
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyPress}
                    style={{
                        ...styles.input,
                        borderColor: inputRef.current === document.activeElement ? '#ff6600' : '#333'
                    }}
                    rows="1"
                    disabled={loading}
                    aria-label="AI chat input"
                    aria-describedby="chat-help"
                />
                
                <button 
                    onClick={() => setShowHindi(!showHindi)}
                    style={styles.langToggle}
                    title={showHindi ? "Switch to English" : "Switch to Hindi"}
                    aria-label={showHindi ? "Switch to English" : "Switch to Hindi"}
                >
                    {showHindi ? 'EN' : 'हि'}
                </button>
                
                <button 
                    onClick={handleSend}
                    disabled={loading || !query.trim()}
                    style={{
                        ...styles.button,
                        opacity: loading || !query.trim() ? 0.5 : 1,
                        cursor: loading || !query.trim() ? 'not-allowed' : 'pointer'
                    }}
                    aria-label="Send message"
                >
                    {loading ? (
                        <>
                            <span style={{ 
                                display: 'inline-block', 
                                animation: 'spin 1s linear infinite',
                                marginRight: '0.5rem'
                            }}>⟳</span>
                            Processing...
                        </>
                    ) : 'Analyze'}
                </button>
            </div>
            
            <div 
                id="chat-help" 
                style={{ display: 'none' }}
            >
                Press Enter to send, Shift+Enter for new line, Escape to minimize
            </div>
        </>
    );
});

AIChat.displayName = 'AIChat';

// ==================== MAIN OPTIMIZED APP ====================
const IntelligenceDashboard = () => {
    const [activeView, setActiveView] = useState('dashboard');
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const fps = usePerformanceMonitor();

    // Network status monitoring
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Performance warning
    useEffect(() => {
        if (fps > 0 && fps < 30) {
            console.warn(`Low FPS detected: ${fps}. Consider optimizing animations.`);
        }
    }, [fps]);

    const styles = {
        app: {
            minHeight: '100vh',
            background: '#0a1628',
            color: '#fff',
            position: 'relative',
            fontFamily: 'Rajdhani, sans-serif'
        },
        performanceIndicator: {
            position: 'fixed',
            top: '10px',
            right: '10px',
            padding: '0.5rem',
            background: fps < 30 ? '#ff3366' : fps < 50 ? '#ffaa00' : '#00ff88',
            borderRadius: '4px',
            fontSize: '0.75rem',
            zIndex: 1000,
            opacity: 0.8
        },
        offlineIndicator: {
            position: 'fixed',
            top: '50px',
            right: '10px',
            padding: '0.5rem',
            background: '#ff3366',
            borderRadius: '4px',
            fontSize: '0.75rem',
            zIndex: 1000
        }
    };

    return (
        <ErrorBoundary>
            <div style={styles.app}>
                {/* Performance monitor */}
                {process.env.NODE_ENV === 'development' && (
                    <div style={styles.performanceIndicator}>
                        FPS: {fps}
                    </div>
                )}
                
                {/* Offline indicator */}
                {!isOnline && (
                    <div style={styles.offlineIndicator} role="alert">
                        📶 Offline Mode
                    </div>
                )}

                {/* Main dashboard content */}
                <main style={{ padding: '2rem' }}>
                    <Suspense fallback={<LoadingSpinner message="Loading Dashboard..." />}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 1fr',
                            gap: '2rem',
                            minHeight: '80vh'
                        }}>
                            <NewsFeed />
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem'
                            }}>
                                <div style={{
                                    background: '#1a1a1a',
                                    borderRadius: '8px',
                                    padding: '1.5rem',
                                    border: '1px solid #333',
                                    textAlign: 'center'
                                }}>
                                    <h2 style={{ color: '#ff6600', marginBottom: '1rem' }}>
                                        System Status
                                    </h2>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <div style={{ color: '#00ff88', fontSize: '2rem' }}>92%</div>
                                            <div style={{ color: '#999' }}>Operational</div>
                                        </div>
                                        <div>
                                            <div style={{ color: '#00d4ff', fontSize: '2rem' }}>{fps}</div>
                                            <div style={{ color: '#999' }}>FPS</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Suspense>
                </main>

                {/* AI Chat Interface */}
                <AIChat />
            </div>
        </ErrorBoundary>
    );
};

export default IntelligenceDashboard;
