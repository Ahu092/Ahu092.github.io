// LIRR Misery Tracker - Main Application
// Fetches data from NY Open Data (Socrata API) and displays misery stats

const API_BASE = 'https://data.ny.gov/resource/e32g-kbe9.json';

// LIRR Branch data with fun nicknames
const BRANCHES = {
    'Port Washington': { nickname: 'aka "The Port of Broken Dreams"', color: '#dc3545' },
    'Oyster Bay': { nickname: 'aka "Shell Shocked"', color: '#fd7e14' },
    'Ronkonkoma': { nickname: 'aka "The Ronk-ocalypse"', color: '#ffc107' },
    'Montauk': { nickname: 'aka "The Long Haul of Pain"', color: '#20c997' },
    'Long Beach': { nickname: 'aka "Beach, Please"', color: '#0dcaf0' },
    'Hempstead': { nickname: 'aka "Hemp-wait-forever"', color: '#6f42c1' },
    'Babylon': { nickname: 'aka "Ancient Ruins of Reliability"', color: '#d63384' },
    'Far Rockaway': { nickname: 'aka "Far From On Time"', color: '#198754' },
    'West Hempstead': { nickname: 'aka "West of Expectations"', color: '#0d6efd' },
    'City Terminal Zone': { nickname: 'aka "The Bottleneck"', color: '#adb5bd' }
};

// Delay causes with sarcastic translations
const CAUSE_TRANSLATIONS = {
    'LIRR Mechanical': 'Our trains are falling apart',
    'LIRR Electrical': 'Someone forgot to pay the electric bill',
    'LIRR Right of Way': 'Something on the tracks (probably another excuse)',
    'LIRR Crew': 'Staff called in sick of this job',
    'LIRR Other': 'We genuinely have no idea',
    'LIRR Passenger': 'You people held the doors again',
    'Customer': 'Blame the passengers!',
    'Police': 'Someone did something somewhere',
    'Weather': 'Nature is against us',
    'Amtrak': 'Blame Amtrak',
    'NJ Transit': 'Blame NJ Transit',
    'Unknown': 'Mystery delay (spooky)',
    'Other': 'Creative excuse pending'
};

// Fun facts about LIRR
const FUN_FACTS = [
    { emoji: '🚂', text: 'The LIRR is the <span class="fact-highlight">oldest railroad</span> in the US still operating under its original name (since 1834). Some say the delays are just as old.' },
    { emoji: '👥', text: 'The LIRR carries about <span class="fact-highlight">300,000 riders daily</span>. That\'s 300,000 people simultaneously sighing.' },
    { emoji: '🛤️', text: 'The system has <span class="fact-highlight">124 stations</span> across 11 branches. Each one a unique opportunity for delays.' },
    { emoji: '⏱️', text: 'The MTA considers a train "on time" if it\'s within <span class="fact-highlight">5 minutes 59 seconds</span>. Generous, right?' },
    { emoji: '💰', text: 'A monthly LIRR pass can cost over <span class="fact-highlight">$400</span>. Premium pricing for economy service!' },
    { emoji: '🏆', text: 'The LIRR is the <span class="fact-highlight">busiest commuter railroad</span> in North America. #1 in delays too?' },
    { emoji: '📍', text: 'Penn Station handles <span class="fact-highlight">600,000+ passengers daily</span>, making it the busiest station in the Western Hemisphere.' },
    { emoji: '🎭', text: 'The phrase "due to train traffic ahead" has been heard approximately <span class="fact-highlight">47 billion times</span> (estimated).' }
];

// Sample/fallback data for when API fails
// Calibrated so typical day ~35-45, bad day ~60-75, disaster ~80+
const SAMPLE_DATA = {
    'Port Washington': { avgDelay: 4.2, delayedTrains: 45, cancelledTrains: 2, worstDelay: 18, miseryScore: 38 },
    'Oyster Bay': { avgDelay: 3.8, delayedTrains: 32, cancelledTrains: 1, worstDelay: 15, miseryScore: 34 },
    'Ronkonkoma': { avgDelay: 5.5, delayedTrains: 78, cancelledTrains: 4, worstDelay: 28, miseryScore: 47 },
    'Montauk': { avgDelay: 6.2, delayedTrains: 42, cancelledTrains: 3, worstDelay: 35, miseryScore: 44 },
    'Long Beach': { avgDelay: 3.5, delayedTrains: 38, cancelledTrains: 1, worstDelay: 14, miseryScore: 32 },
    'Hempstead': { avgDelay: 4.8, delayedTrains: 52, cancelledTrains: 2, worstDelay: 22, miseryScore: 41 },
    'Babylon': { avgDelay: 5.8, delayedTrains: 95, cancelledTrains: 5, worstDelay: 32, miseryScore: 52 },
    'Far Rockaway': { avgDelay: 4.0, delayedTrains: 35, cancelledTrains: 1, worstDelay: 16, miseryScore: 35 },
    'West Hempstead': { avgDelay: 3.6, delayedTrains: 28, cancelledTrains: 1, worstDelay: 12, miseryScore: 31 },
    'City Terminal Zone': { avgDelay: 6.5, delayedTrains: 110, cancelledTrains: 6, worstDelay: 42, miseryScore: 58 }
};

const SAMPLE_CAUSES = [
    { cause: 'LIRR Mechanical', percent: 28 },
    { cause: 'LIRR Electrical', percent: 19 },
    { cause: 'Customer', percent: 16 },
    { cause: 'LIRR Crew', percent: 12 },
    { cause: 'Weather', percent: 10 },
    { cause: 'Amtrak', percent: 8 },
    { cause: 'LIRR Other', percent: 7 }
];

// State
let currentBranch = 'Port Washington';
let branchData = { ...SAMPLE_DATA };
let isUsingLiveData = false;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    initBranchSelector();
    initTimeCalculator();
    renderFunFacts();
    fetchLiveData();
    updateDisplay();
    initKonamiCode();
});

// Fetch live data from NY Open Data API
async function fetchLiveData() {
    try {
        // Fetch recent data - Socrata returns newest first by default
        // We'll filter by date client-side since field names vary
        const response = await fetch(
            `${API_BASE}?$limit=5000&$order=:id DESC`,
            {
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) throw new Error(`API request failed: ${response.status}`);

        const data = await response.json();

        if (data && data.length > 0) {
            // Filter to last 30 days client-side
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const recentData = data.filter(record => {
                // Try common date field names
                const dateVal = record.date || record.delay_date || record.service_date || record.period;
                if (!dateVal) return true; // Include if no date field
                const recordDate = new Date(dateVal);
                return recordDate >= thirtyDaysAgo;
            });

            processLiveData(recentData.length > 0 ? recentData : data);
            isUsingLiveData = true;
            console.log(`Using live data from NY Open Data (${recentData.length} records)`);
        }
    } catch (error) {
        console.log('Using sample data (API unavailable):', error.message);
        // Continue with sample data - already loaded
    }

    // Update badge to show data source
    const badge = document.getElementById('dataBadge');
    if (isUsingLiveData) {
        badge.textContent = 'LIVE DATA';
        badge.title = 'Real-time data from NY Open Data';
    } else {
        badge.textContent = 'SAMPLE DATA';
        badge.title = 'Using sample data (API unavailable)';
    }

    updateDisplay();
}

// Process live API data
function processLiveData(data) {
    const branchStats = {};
    const causeCounts = {};

    // Log first record to debug field names
    if (data.length > 0) {
        console.log('Sample record fields:', Object.keys(data[0]));
        console.log('Sample record:', data[0]);
    }

    // Group data by branch
    data.forEach(record => {
        // Try various field name formats (Socrata can use different naming conventions)
        const branch = record.branch || record.Branch || record.line || record.Line || 'Unknown';
        const delay = parseFloat(record.delay_minutes || record.delay || record.minutes_late || record.Delay || 0);
        const isCancelled = (record.cancelled || record.Cancelled || record.status || '')
            .toString().toUpperCase().includes('CANCEL');
        const cause = record.delay_category || record.cause || record.reason || record.Cause || 'Unknown';

        if (!branchStats[branch]) {
            branchStats[branch] = {
                delays: [],
                cancelledCount: 0,
                totalTrains: 0
            };
        }

        branchStats[branch].totalTrains++;
        if (delay > 0) branchStats[branch].delays.push(delay);
        if (isCancelled) branchStats[branch].cancelledCount++;

        // Track causes
        if (cause && cause !== 'Unknown') {
            causeCounts[cause] = (causeCounts[cause] || 0) + 1;
        }
    });

    // Calculate stats for each branch
    Object.keys(branchStats).forEach(branch => {
        const stats = branchStats[branch];
        const delays = stats.delays;

        if (delays.length > 0) {
            const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length;
            const worstDelay = Math.max(...delays);

            // Calculate misery score (weighted formula)
            // Calibrated: typical day ~35-45, bad day ~60-75, disaster ~80+
            const delayRatio = delays.length / stats.totalTrains;
            const miseryScore = Math.min(100, Math.round(
                (avgDelay * 1.5) +                    // 5 min avg = 7.5 pts
                (delayRatio * 25) +                   // 20% delayed = 5 pts
                (stats.cancelledCount * 0.8) +        // 5 cancelled = 4 pts
                (worstDelay / 8) +                    // 40 min worst = 5 pts
                15                                     // Base misery (it's LIRR after all)
            ));

            branchData[branch] = {
                avgDelay: Math.round(avgDelay * 10) / 10,
                delayedTrains: delays.length,
                cancelledTrains: stats.cancelledCount,
                worstDelay: Math.round(worstDelay),
                miseryScore: miseryScore
            };
        }
    });

    // Process causes
    const totalCauses = Object.values(causeCounts).reduce((a, b) => a + b, 0);
    const sortedCauses = Object.entries(causeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7)
        .map(([cause, count]) => ({
            cause,
            percent: Math.round((count / totalCauses) * 100)
        }));

    if (sortedCauses.length > 0) {
        window.liveCauses = sortedCauses;
    }
}

// Initialize branch selector buttons
function initBranchSelector() {
    const grid = document.getElementById('branchGrid');

    Object.keys(BRANCHES).forEach(branch => {
        const btn = document.createElement('button');
        btn.className = `branch-btn ${branch === currentBranch ? 'active' : ''}`;
        btn.innerHTML = `
            <span class="branch-name">${branch}</span>
            <span class="branch-status">Tap to view stats</span>
            <span class="branch-score" id="score-${branch.replace(/\s/g, '-')}">--</span>
        `;
        btn.onclick = () => selectBranch(branch);
        grid.appendChild(btn);
    });
}

// Select a branch
function selectBranch(branch) {
    currentBranch = branch;

    // Update active button
    document.querySelectorAll('.branch-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.branch-btn').classList.add('active');

    updateDisplay();

    // Smooth scroll to stats
    document.getElementById('statsDashboard').scrollIntoView({ behavior: 'smooth' });
}

// Update all displays
function updateDisplay() {
    const data = branchData[currentBranch] || SAMPLE_DATA['Port Washington'];

    // Update hero answer based on overall misery
    updateHeroAnswer(data.miseryScore);

    // Update branch scores on buttons
    Object.keys(branchData).forEach(branch => {
        const scoreEl = document.getElementById(`score-${branch.replace(/\s/g, '-')}`);
        if (scoreEl && branchData[branch]) {
            scoreEl.textContent = branchData[branch].miseryScore;
        }
    });

    // Update misery meter
    updateMiseryMeter(data.miseryScore);

    // Update branch title
    document.getElementById('selectedBranchName').textContent = currentBranch;
    document.getElementById('branchNickname').textContent = BRANCHES[currentBranch]?.nickname || '';

    // Update stat cards
    updateStatCard('avgDelay', data.avgDelay, getSnarkyComment('avgDelay', data.avgDelay));
    updateStatCard('delayedTrains', data.delayedTrains, getSnarkyComment('delayedTrains', data.delayedTrains));
    updateStatCard('cancelledTrains', data.cancelledTrains, getSnarkyComment('cancelledTrains', data.cancelledTrains));
    updateStatCard('worstDelay', data.worstDelay, getSnarkyComment('worstDelay', data.worstDelay));

    // Update time wasted
    updateTimeWasted(data.avgDelay);

    // Update causes chart
    renderCausesChart();

    // Update leaderboard
    renderLeaderboard();

    // Update share text
    updateShareText(data.miseryScore);
}

// Update hero answer based on misery score
function updateHeroAnswer(score) {
    const answerText = document.querySelector('.answer-text');
    const answerSubtext = document.querySelector('.answer-subtext');

    let answer, subtext;

    if (score >= 80) {
        answer = 'DISASTER';
        subtext = '(abandon all hope)';
    } else if (score >= 65) {
        answer = 'YES';
        subtext = '(very much so)';
    } else if (score >= 50) {
        answer = 'KINDA';
        subtext = '(par for the course)';
    } else if (score >= 35) {
        answer = 'MEH';
        subtext = '(tolerable... barely)';
    } else {
        answer = 'NOT BAD';
        subtext = '(suspicious...)';
    }

    answerText.textContent = answer;
    answerSubtext.textContent = subtext;
}

// Update misery meter
function updateMiseryMeter(score) {
    const fill = document.getElementById('miseryFill');
    const marker = document.getElementById('miseryMarker');
    const scoreEl = document.querySelector('.score-value');

    fill.style.width = `${100 - score}%`;
    marker.style.left = `${score}%`;

    // Animate score counting up
    animateValue(scoreEl, 0, score, 1000);
}

// Animate value counting
function animateValue(element, start, end, duration) {
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const current = Math.round(start + (end - start) * easeOutQuart(progress));
        element.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
}

// Update stat card
function updateStatCard(id, value, context) {
    document.getElementById(id).textContent = value;
    document.getElementById(`${id}Context`).textContent = context;
}

// Get snarky comments based on values
function getSnarkyComment(type, value) {
    const comments = {
        avgDelay: [
            { threshold: 12, comment: "Might as well walk" },
            { threshold: 8, comment: "Coffee's getting cold" },
            { threshold: 5, comment: "Fashionably late, always" },
            { threshold: 3, comment: "Could be worse... barely" },
            { threshold: 0, comment: "A minor miracle!" }
        ],
        delayedTrains: [
            { threshold: 100, comment: "They're more delayed than not" },
            { threshold: 70, comment: "That's a lot of sighing" },
            { threshold: 50, comment: "Par for the course" },
            { threshold: 30, comment: "Almost acceptable" },
            { threshold: 0, comment: "Suspiciously low" }
        ],
        cancelledTrains: [
            { threshold: 10, comment: "Ghost trains everywhere" },
            { threshold: 6, comment: "Now you see them, now you don't" },
            { threshold: 4, comment: "Poof, a few vanished" },
            { threshold: 2, comment: "Just a couple ghosts" },
            { threshold: 0, comment: "They actually all ran?" }
        ],
        worstDelay: [
            { threshold: 45, comment: "Someone aged waiting" },
            { threshold: 30, comment: "Movie-length delay" },
            { threshold: 20, comment: "Could've made dinner" },
            { threshold: 10, comment: "Just enough to ruin plans" },
            { threshold: 0, comment: "Getting lucky" }
        ]
    };

    const thresholds = comments[type] || [];
    for (const { threshold, comment } of thresholds) {
        if (value >= threshold) return comment;
    }
    return "";
}

// Initialize time calculator
function initTimeCalculator() {
    const select = document.getElementById('commuteFreq');
    select.addEventListener('change', () => {
        const data = branchData[currentBranch] || SAMPLE_DATA['Port Washington'];
        updateTimeWasted(data.avgDelay);
    });
}

// Update time wasted calculations
function updateTimeWasted(avgDelay) {
    const daysPerWeek = parseInt(document.getElementById('commuteFreq').value);
    const weeksPerYear = 50; // Accounting for vacation/holidays
    const roundTrips = 2; // To and from work

    const yearlyDelayMinutes = avgDelay * daysPerWeek * weeksPerYear * roundTrips;
    const yearlyHours = Math.round(yearlyDelayMinutes / 60 * 10) / 10;
    const yearlyMoney = Math.round(yearlyHours * 50);

    // Fun equivalents
    const equivalents = [
        { value: Math.round(yearlyHours / 0.75), label: 'Netflix episodes you could\'ve watched' },
        { value: Math.round(yearlyHours / 2), label: 'naps you missed' },
        { value: Math.round(yearlyHours / 1.5), label: 'gym sessions you could\'ve done' },
        { value: Math.round(yearlyHours * 2), label: 'cups of coffee that went cold' },
        { value: Math.round(yearlyHours / 10), label: 'books you could\'ve read' }
    ];

    const randomEquiv = equivalents[Math.floor(Math.random() * equivalents.length)];

    document.getElementById('yearlyHours').textContent = yearlyHours;
    document.getElementById('yearlyMoney').textContent = `$${yearlyMoney.toLocaleString()}`;
    document.getElementById('couldHave').textContent = randomEquiv.value;
    document.getElementById('couldHaveLabel').textContent = randomEquiv.label;
}

// Render causes chart
function renderCausesChart() {
    const container = document.getElementById('causesChart');
    const causes = window.liveCauses || SAMPLE_CAUSES;

    container.innerHTML = causes.map(({ cause, percent }) => {
        const displayCause = CAUSE_TRANSLATIONS[cause] || cause;
        return `
            <div class="cause-row">
                <span class="cause-label">${displayCause}</span>
                <div class="cause-bar-container">
                    <div class="cause-bar" style="width: ${percent}%">
                        <span class="cause-percent">${percent}%</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Render leaderboard
function renderLeaderboard() {
    const container = document.getElementById('leaderboardTable');

    // Sort branches by misery score
    const sorted = Object.entries(branchData)
        .sort((a, b) => b[1].miseryScore - a[1].miseryScore);

    container.innerHTML = sorted.map(([branch, data], index) => {
        const rank = index + 1;
        let rankClass = '';
        let rankEmoji = rank;

        if (rank === 1) { rankClass = 'gold'; rankEmoji = '🥇'; }
        else if (rank === 2) { rankClass = 'silver'; rankEmoji = '🥈'; }
        else if (rank === 3) { rankClass = 'bronze'; rankEmoji = '🥉'; }

        const trend = Math.random() > 0.5 ? 'up' : 'down';
        const trendValue = Math.floor(Math.random() * 5) + 1;

        return `
            <div class="leaderboard-row ${rank <= 3 ? 'top-3' : ''}" onclick="selectBranchFromLeaderboard('${branch}')">
                <span class="rank ${rankClass}">${rankEmoji}</span>
                <span class="leaderboard-branch">${branch}</span>
                <span class="leaderboard-score">${data.miseryScore}</span>
                <span class="leaderboard-trend trend-${trend}">${trend === 'up' ? '↑' : '↓'}${trendValue}</span>
            </div>
        `;
    }).join('');
}

// Select branch from leaderboard
function selectBranchFromLeaderboard(branch) {
    currentBranch = branch;

    // Update active button
    document.querySelectorAll('.branch-btn').forEach(btn => {
        const branchName = btn.querySelector('.branch-name').textContent;
        btn.classList.toggle('active', branchName === branch);
    });

    updateDisplay();
    document.getElementById('statsDashboard').scrollIntoView({ behavior: 'smooth' });
}

// Render fun facts
function renderFunFacts() {
    const container = document.getElementById('factsCarousel');

    container.innerHTML = FUN_FACTS.map(fact => `
        <div class="fact-card">
            <div class="fact-emoji">${fact.emoji}</div>
            <p class="fact-text">${fact.text}</p>
        </div>
    `).join('');
}

// Update share text
function updateShareText(score) {
    const shareText = `My LIRR branch (${currentBranch}) has a Misery Index of ${score}/100. How's yours? 🚂😤`;
    document.getElementById('shareText').textContent = `"${shareText}"`;
}

// Share on Twitter/X
function shareTwitter() {
    const data = branchData[currentBranch] || SAMPLE_DATA['Port Washington'];
    const text = encodeURIComponent(
        `My LIRR branch (${currentBranch}) has a Misery Index of ${data.miseryScore}/100. ` +
        `Avg delay: ${data.avgDelay} mins. How's yours? 🚂😤 #LIRR #NYCCommute`
    );
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
}

// Copy link
function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        const btn = document.querySelector('.share-btn.copy');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = originalText, 2000);
    });
}

// Easter egg: Konami code
function initKonamiCode() {
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;

    document.addEventListener('keydown', (e) => {
        if (e.key === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                document.body.classList.toggle('konami-active');
                konamiIndex = 0;

                // Update hero text for fun
                const heroAnswer = document.querySelector('.answer-text');
                heroAnswer.textContent = heroAnswer.textContent === 'YES' ? 'ALWAYS' : 'YES';
            }
        } else {
            konamiIndex = 0;
        }
    });
}

// Make functions available globally for onclick handlers
window.selectBranchFromLeaderboard = selectBranchFromLeaderboard;
window.shareTwitter = shareTwitter;
window.copyLink = copyLink;
