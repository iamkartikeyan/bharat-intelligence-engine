with open('bharat-intelligence-engine.html', 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# Fix 1: Add menuGroups definition inside Sidebar
OLD1 = """        const Sidebar = ({ collapsed, setCollapsed, activeMenu, setActiveMenu }) => {
            const menuItems = [
                { id: 'dashboard', label: 'Dashboard', icon: '🌐' },
                { id: 'knowledge', label: 'Knowledge Graph', icon: '🕸️' },
                { id: 'geopolitics', label: 'Geopolitics', icon: '🏴' },
                { id: 'economics', label: 'Economics', icon: '📊' },
                { id: 'defense', label: 'Defense Intel', icon: '🛡️' },
                { id: 'technology', label: 'Technology', icon: '💻' },
                { id: 'climate', label: 'Climate', icon: '🌱' },
                { id: 'society', label: 'Society', icon: '👥' },
                { id: 'settings', label: 'Settings', icon: '⚙️' },
            ];"""

NEW1 = """        const Sidebar = ({ collapsed, setCollapsed, activeMenu, setActiveMenu }) => {
            const menuGroups = [
                { label: 'OVERVIEW', items: [
                    { id: 'dashboard', label: 'Dashboard', icon: '🌐' },
                    { id: 'intel-graph', label: 'Intel Graph', icon: '🕸️' },
                    { id: 'knowledge', label: 'Knowledge', icon: '📚' },
                ]},
                { label: 'DOMAINS', items: [
                    { id: 'geopolitics', label: 'Geopolitics', icon: '🏴' },
                    { id: 'economics', label: 'Economics', icon: '📊' },
                    { id: 'defense', label: 'Defense Intel', icon: '🛡️' },
                    { id: 'technology', label: 'Technology', icon: '💻' },
                    { id: 'climate', label: 'Climate', icon: '🌱' },
                    { id: 'society', label: 'Society', icon: '👥' },
                ]},
                { label: 'INTELLIGENCE', items: [
                    { id: 'country-intel', label: 'Country Intel', icon: '🗺️' },
                    { id: 'ai-suite', label: 'AI Suite', icon: '🤖' },
                    { id: 'tactical-map', label: 'Tactical Map', icon: '🗾' },
                    { id: 'achievements', label: 'Achievements', icon: '🏆' },
                ]},
                { label: 'SYSTEM', items: [
                    { id: 'settings', label: 'Settings', icon: '⚙️' },
                ]},
            ];
            const menuItems = menuGroups.flatMap(g => g.items);"""

if OLD1 in c:
    c = c.replace(OLD1, NEW1, 1)
    print('OK Fix1: menuGroups defined')
    changes += 1
else:
    print('SKIP Fix1: already done or not found')

# Fix 2: Change sidebar render to use groups
OLD2 = """                    <div style={styles.menu}>
                        {menuItems.map(item => (
                            <div
                                key={item.id}
                                style={{
                                    ...styles.menuItem,
                                    ...(activeMenu === item.id ? styles.menuItemActive : {})
                                }}
                                onClick={() => setActiveMenu(item.id)}
                            >
                                <span style={styles.icon}>{item.icon}</span>
                                {!collapsed && <span>{item.label}</span>}
                            </div>
                        ))}
                    </div>"""

NEW2 = """                    <div style={styles.menu}>
                        {menuGroups.map(group => (
                            <div key={group.label}>
                                {!collapsed && (
                                    <div style={{ padding: '0.6rem 1.2rem 0.2rem', fontSize: '0.62rem', fontWeight: 700, color: '#555', letterSpacing: '0.1em', userSelect: 'none' }}>
                                        {group.label}
                                    </div>
                                )}
                                {group.items.map(item => (
                                    <div key={item.id}
                                        style={{ ...styles.menuItem, ...(activeMenu === item.id ? styles.menuItemActive : {}) }}
                                        onClick={() => setActiveMenu(item.id)}
                                        title={collapsed ? item.label : ''}
                                    >
                                        <span style={styles.icon}>{item.icon}</span>
                                        {!collapsed && <span>{item.label}</span>}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>"""

if OLD2 in c:
    c = c.replace(OLD2, NEW2, 1)
    print('OK Fix2: sidebar render uses groups')
    changes += 1
else:
    print('SKIP Fix2')

# Fix 3: App getActiveView
OLD3 = """            // Derive active view from menu
            const getActiveView = () => {
                if (activeMenu === 'knowledge') return 'graph';
                if (activeMenu === 'economics') return 'economics';
                if (activeMenu === 'geopolitics') return 'geopolitics';
                if (activeMenu === 'defense') return 'defense';
                if (activeMenu === 'technology') return 'technology';
                if (activeMenu === 'climate') return 'climate';
                if (activeMenu === 'society') return 'society';
                if (activeMenu === 'settings') return 'settings';
                return 'globe';
            };"""

NEW3 = """            const getActiveView = () => {
                if (activeMenu === 'knowledge') return 'graph';
                if (activeMenu === 'intel-graph') return 'intel-graph';
                if (activeMenu === 'economics') return 'economics';
                if (activeMenu === 'geopolitics') return 'geopolitics';
                if (activeMenu === 'defense') return 'defense';
                if (activeMenu === 'technology') return 'technology';
                if (activeMenu === 'climate') return 'climate';
                if (activeMenu === 'society') return 'society';
                if (activeMenu === 'settings') return 'settings';
                if (activeMenu === 'ai-suite') return 'ai-suite';
                if (activeMenu === 'achievements') return 'achievements';
                if (activeMenu === 'country-intel') return 'country-intel';
                if (activeMenu === 'tactical-map') return 'tactical-map';
                return 'globe';
            };"""

if OLD3 in c:
    c = c.replace(OLD3, NEW3, 1)
    print('OK Fix3: getActiveView expanded')
    changes += 1
else:
    print('SKIP Fix3')

# Fix 4: fullPageViews
OLD4 = "            const fullPageViews = ['economics', 'geopolitics', 'defense', 'technology', 'climate', 'society', 'settings'];"
NEW4 = "            const fullPageViews = ['economics', 'geopolitics', 'defense', 'technology', 'climate', 'society', 'settings', 'intel-graph', 'ai-suite', 'achievements', 'country-intel', 'tactical-map'];"
if OLD4 in c:
    c = c.replace(OLD4, NEW4, 1)
    print('OK Fix4: fullPageViews expanded')
    changes += 1
else:
    print('SKIP Fix4')

# Fix 5: App render views
OLD5 = "                        {activeView === 'settings' && <SettingsPanel />}\n\n                        {/* Globe / Graph views */}"
NEW5 = """                        {activeView === 'settings' && <SettingsPanel />}
                        {activeView === 'intel-graph' && <IntelligenceGraph />}
                        {activeView === 'ai-suite' && <AIIntelligenceSuite />}
                        {activeView === 'achievements' && <GamificationDashboard />}
                        {activeView === 'country-intel' && <CountryIntelPanel />}
                        {activeView === 'tactical-map' && <TacticalMap />}

                        {/* Globe / Graph views */}"""
if OLD5 in c:
    c = c.replace(OLD5, NEW5, 1)
    print('OK Fix5: App view renders added')
    changes += 1
else:
    print('SKIP Fix5')

# Fix 6: App useEffect
OLD6 = """            useEffect(() => {
                // Hide loading screen after component mounts
                setTimeout(() => {
                    document.getElementById('loadingScreen').classList.add('hidden');
                }, 2000);
            }, []);"""
NEW6 = """            useEffect(() => {
                setTimeout(() => {
                    document.getElementById('loadingScreen').classList.add('hidden');
                }, 2000);
                const handler = (e) => { if (e.detail && e.detail.view) setActiveMenu(e.detail.view); };
                window.addEventListener('bie:navigate', handler);
                return () => window.removeEventListener('bie:navigate', handler);
            }, []);"""
if OLD6 in c:
    c = c.replace(OLD6, NEW6, 1)
    print('OK Fix6: App useEffect updated')
    changes += 1
else:
    print('SKIP Fix6')

with open('bharat-intelligence-engine.html', 'w', encoding='utf-8') as f:
    f.write(c)

print(f'\nTotal changes: {changes}')
print(f'Lines: {len(c.splitlines())}')
print(f'menuGroups defined: {"menuGroups =" in c}')
print(f'ai-suite present: {"ai-suite" in c}')
print(f'menuGroups.map present: {"menuGroups.map" in c}')
