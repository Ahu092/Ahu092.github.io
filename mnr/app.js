// Metro-North Misery Tracker - Main Application

const API_BASE = 'https://data.ny.gov/resource/pz6f-jsc3.json';

// Metro-North Lines with fun nicknames
const LINES = {
    'Hudson Line': { nickname: 'aka "The Hudson Crawl"', color: '#009b3a' },
    'Harlem Line': { nickname: 'aka "Harlem Shuffle"', color: '#0039a6' },
    'New Haven Line': { nickname: 'aka "New Haven\'t Arrived"', color: '#ee0034' },
    'New Canaan Branch': { nickname: 'aka "New Can\'t-get-there"', color: '#ee0034' },
    'Danbury Branch': { nickname: 'aka "Dan-buried in delays"', color: '#ee0034' },
    'Waterbury Branch': { nickname: 'aka "Water-we-waiting-for"', color: '#ee0034' },
    'Wassaic Branch': { nickname: 'aka "Was-late"', color: '#0039a6' }
};

// Delay causes with sarcastic translations
const CAUSE_TRANSLATIONS = {
    'MNR Mechanical': 'Our trains are vintage (not in a good way)',
    'MNR Electrical': 'Third rail having a bad day',
    'MNR Right of Way': 'Something on the tracks',
    'MNR Crew': 'Crew scheduling is an art form',
    'MNR Other': 'Creative excuse loading...',
    'Weather': 'Leaves on the track (classic)',
    'Police Activity': 'Something happened',
    'Customer': 'Door holders unite',
    'Amtrak': 'Blame the neighbors',
    'Signal Problems': 'Our namesake strikes again',
    'Switch Failure': 'Switches have feelings too',
    'Unknown': 'Mystery delay theater'
};

// Fun facts about Metro-North
const FUN_FACTS = [
    { emoji: '🚂', text: 'Metro-North is the <span class="fact-highlight">2nd busiest commuter railroad</span> in the US (behind LIRR). Silver medal in suffering!' },
    { emoji: '👥', text: 'Metro-North carries about <span class="fact-highlight">87,000 riders daily</span>. That\'s 87,000 people checking their watches.' },
    { emoji: '🛤️', text: 'The system has <span class="fact-highlight">124 stations</span> across 5 main lines plus branches. Lots of platforms to wait on.' },
    { emoji: '🏛️', text: 'Grand Central Terminal is <span class="fact-highlight">over 100 years old</span> and still the crown jewel. The trains? Less jewel-like.' },
    { emoji: '💰', text: 'A monthly pass can cost over <span class="fact-highlight">$450</span>. Premium vibes, sometimes premium delays.' },
    { emoji: '🍂', text: 'Metro-North invented the <span class="fact-highlight">"slippery rail" excuse</span>. Leaves are the eternal enemy.' },
    { emoji: '📍', text: 'The Hudson Line runs along the <span class="fact-highlight">Hudson River</span>. Beautiful views while you wait.' },
    { emoji: '🎭', text: 'Metro-North is considered the <span class="fact-highlight">"nicer" MTA railroad</span>. Low bar, but still.' }
];

// Sample data for Metro-North lines
// Calibrated so typical day ~30-40 (MNR is generally more reliable)
const SAMPLE_DATA = {
    'Hudson Line': { avgDelay: 3.8, delayedTrains: 42, cancelledTrains: 2, worstDelay: 18, miseryScore: 34 },
    'Harlem Line': { avgDelay: 3.5, delayedTrains: 38, cancelledTrains: 1, worstDelay: 16, miseryScore: 32 },
    'New Haven Line': { avgDelay: 4.2, delayedTrains: 55, cancelledTrains: 3, worstDelay: 22, miseryScore: 38 },
    'New Canaan Branch': { avgDelay: 3.0, delayedTrains: 15, cancelledTrains: 1, worstDelay: 12, miseryScore: 28 },
    'Danbury Branch': { avgDelay: 3.2, delayedTrains: 18, cancelledTrains: 1, worstDelay: 14, miseryScore: 29 },
    'Waterbury Branch': { avgDelay: 3.5, delayedTrains: 12, cancelledTrains: 1, worstDelay: 15, miseryScore: 30 },
    'Wassaic Branch': { avgDelay: 3.8, delayedTrains: 20, cancelledTrains: 1, worstDelay: 18, miseryScore: 32 }
};

const SAMPLE_CAUSES = [
    { cause: 'MNR Mechanical', percent: 22 },
    { cause: 'Signal Problems', percent: 18 },
    { cause: 'Weather', percent: 16 },
    { cause: 'MNR Crew', percent: 14 },
    { cause: 'Customer', percent: 12 },
    { cause: 'Switch Failure', percent: 10 },
    { cause: 'MNR Other', percent: 8 }
];

// State
let currentLine = 'Hudson Line';
let lineData = { ...SAMPLE_DATA };
let isUsingLiveData = false;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    initLineSelector();
    initTimeCalculator();
    renderFunFacts();
    fetchLiveData();
    updateDisplay();
    initKonamiCode();
});

// Fetch live data from NY Open Data API
async function fetchLiveData() {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

        const query = encodeURIComponent(`date >= '${dateStr}'`);
        const response = await fetch(
            `${API_BASE}?$where=${query}&$limit=5000`,
            {
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) throw new Error('API request failed');

        const data = await response.json();

        if (data && data.length > 0) {
            processLiveData(data);
            isUsingLiveData = true;
            console.log('Using live data from NY Open Data');
        }
    } catch (error) {
        console.log('Using sample data (API unavailable):', error.message);
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
    const lineStats = {};
    const causeCounts = {};

    data.forEach(record => {
        const line = record.line || record.branch || 'Unknown';
        const delay = parseFloat(record.delay_minutes) || 0;
        const isCancelled = record.cancelled === 'Y' || record.cancelled === 'true';
        const cause = record.delay_category || 'Unknown';

        if (!lineStats[line]) {
            lineStats[line] = {
                delays: [],
                cancelledCount: 0,
                totalTrains: 0
            };
        }

        lineStats[line].totalTrains++;
        if (delay > 0) lineStats[line].delays.push(delay);
        if (isCancelled) lineStats[line].cancelledCount++;

        causeCounts[cause] = (causeCounts[cause] || 0) + 1;
    });

    Object.keys(lineStats).forEach(line => {
        const stats = lineStats[line];
        const delays = stats.delays;

        if (delays.length > 0) {
            const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length;
            const worstDelay = Math.max(...delays);

            const delayRatio = delays.length / stats.totalTrains;
            const miseryScore = Math.min(100, Math.round(
                (avgDelay * 1.5) +
                (delayRatio * 25) +
                (stats.cancelledCount * 0.8) +
                (worstDelay / 8) +
                12  // Lower base for MNR (it's "nicer")
            ));

            lineData[line] = {
                avgDelay: Math.round(avgDelay * 10) / 10,
                delayedTrains: delays.length,
                cancelledTrains: stats.cancelledCount,
                worstDelay: Math.round(worstDelay),
                miseryScore: miseryScore
            };
        }
    });

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

// Initialize line selector buttons
function initLineSelector() {
    const grid = document.getElementById('branchGrid');

    Object.keys(LINES).forEach(line => {
        const btn = document.createElement('button');
        btn.className = `branch-btn ${line === currentLine ? 'active' : ''}`;
        btn.innerHTML = `
            <span class="branch-name">${line}</span>
            <span class="branch-status">Tap to view stats</span>
            <span class="branch-score" id="score-${line.replace(/[\s\/&]/g, '-')}">--</span>
        `;
        btn.onclick = () => selectLine(line, btn);
        grid.appendChild(btn);
    });
}

// Select a line
function selectLine(line, btn) {
    currentLine = line;

    document.querySelectorAll('.branch-btn').forEach(b => {
        b.classList.remove('active');
    });
    btn.classList.add('active');

    updateDisplay();
    document.getElementById('statsDashboard').scrollIntoView({ behavior: 'smooth' });
}

// Update all displays
function updateDisplay() {
    const data = lineData[currentLine] || SAMPLE_DATA['Hudson Line'];

    updateHeroAnswer(data.miseryScore);

    Object.keys(lineData).forEach(line => {
        const scoreEl = document.getElementById(`score-${line.replace(/[\s\/&]/g, '-')}`);
        if (scoreEl && lineData[line]) {
            scoreEl.textContent = lineData[line].miseryScore;
        }
    });

    updateMiseryMeter(data.miseryScore);

    document.getElementById('selectedBranchName').textContent = currentLine;
    document.getElementById('branchNickname').textContent = LINES[currentLine]?.nickname || '';

    updateStatCard('avgDelay', data.avgDelay, getSnarkyComment('avgDelay', data.avgDelay));
    updateStatCard('delayedTrains', data.delayedTrains, getSnarkyComment('delayedTrains', data.delayedTrains));
    updateStatCard('cancelledTrains', data.cancelledTrains, getSnarkyComment('cancelledTrains', data.cancelledTrains));
    updateStatCard('worstDelay', data.worstDelay, getSnarkyComment('worstDelay', data.worstDelay));

    updateTimeWasted(data.avgDelay);
    renderCausesChart();
    renderLeaderboard();
    updateShareText(data.miseryScore);
}

// Update hero answer based on misery score
function updateHeroAnswer(score) {
    const answerText = document.querySelector('.answer-text');
    const answerSubtext = document.querySelector('.answer-subtext');

    let answer, subtext;

    if (score >= 80) {
        answer = 'DISASTER';
        subtext = '(even MNR can fail)';
    } else if (score >= 65) {
        answer = 'YES';
        subtext = '(so much for "nicer")';
    } else if (score >= 50) {
        answer = 'KINDA';
        subtext = '(could be worse)';
    } else if (score >= 35) {
        answer = 'MEH';
        subtext = '(average MNR day)';
    } else {
        answer = 'NOT BAD';
        subtext = '(MNR doing MNR things)';
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

    animateValue(scoreEl, 0, score, 1000);
}

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

function updateStatCard(id, value, context) {
    document.getElementById(id).textContent = value;
    document.getElementById(`${id}Context`).textContent = context;
}

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

function initTimeCalculator() {
    const select = document.getElementById('commuteFreq');
    select.addEventListener('change', () => {
        const data = lineData[currentLine] || SAMPLE_DATA['Hudson Line'];
        updateTimeWasted(data.avgDelay);
    });
}

function updateTimeWasted(avgDelay) {
    const daysPerWeek = parseInt(document.getElementById('commuteFreq').value);
    const weeksPerYear = 50;
    const roundTrips = 2;

    const yearlyDelayMinutes = avgDelay * daysPerWeek * weeksPerYear * roundTrips;
    const yearlyHours = Math.round(yearlyDelayMinutes / 60 * 10) / 10;
    const yearlyMoney = Math.round(yearlyHours * 50);

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

function renderLeaderboard() {
    const container = document.getElementById('leaderboardTable');

    const sorted = Object.entries(lineData)
        .sort((a, b) => b[1].miseryScore - a[1].miseryScore);

    container.innerHTML = sorted.map(([line, data], index) => {
        const rank = index + 1;
        let rankClass = '';
        let rankEmoji = rank;

        if (rank === 1) { rankClass = 'gold'; rankEmoji = '🥇'; }
        else if (rank === 2) { rankClass = 'silver'; rankEmoji = '🥈'; }
        else if (rank === 3) { rankClass = 'bronze'; rankEmoji = '🥉'; }

        const trend = Math.random() > 0.5 ? 'up' : 'down';
        const trendValue = Math.floor(Math.random() * 5) + 1;

        return `
            <div class="leaderboard-row ${rank <= 3 ? 'top-3' : ''}" onclick="selectLineFromLeaderboard('${line}')">
                <span class="rank ${rankClass}">${rankEmoji}</span>
                <span class="leaderboard-branch">${line}</span>
                <span class="leaderboard-score">${data.miseryScore}</span>
                <span class="leaderboard-trend trend-${trend}">${trend === 'up' ? '↑' : '↓'}${trendValue}</span>
            </div>
        `;
    }).join('');
}

function selectLineFromLeaderboard(line) {
    currentLine = line;

    document.querySelectorAll('.branch-btn').forEach(btn => {
        const lineName = btn.querySelector('.branch-name').textContent;
        btn.classList.toggle('active', lineName === line);
    });

    updateDisplay();
    document.getElementById('statsDashboard').scrollIntoView({ behavior: 'smooth' });
}

function renderFunFacts() {
    const container = document.getElementById('factsCarousel');

    container.innerHTML = FUN_FACTS.map(fact => `
        <div class="fact-card">
            <div class="fact-emoji">${fact.emoji}</div>
            <p class="fact-text">${fact.text}</p>
        </div>
    `).join('');
}

function updateShareText(score) {
    const shareText = `My Metro-North line (${currentLine}) has a Misery Index of ${score}/100. How's yours? 🚂`;
    document.getElementById('shareText').textContent = `"${shareText}"`;
}

function shareTwitter() {
    const data = lineData[currentLine] || SAMPLE_DATA['Hudson Line'];
    const text = encodeURIComponent(
        `My Metro-North line (${currentLine}) has a Misery Index of ${data.miseryScore}/100. ` +
        `Avg delay: ${data.avgDelay} mins. 🚂 #MetroNorth #NYCCommute`
    );
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
}

function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        const btn = document.querySelector('.share-btn.copy');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = originalText, 2000);
    });
}

function initKonamiCode() {
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;

    document.addEventListener('keydown', (e) => {
        if (e.key === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                document.body.classList.toggle('konami-active');
                konamiIndex = 0;

                const heroAnswer = document.querySelector('.answer-text');
                heroAnswer.textContent = heroAnswer.textContent === 'NOT BAD' ? 'ACTUALLY YES' : 'NOT BAD';
            }
        } else {
            konamiIndex = 0;
        }
    });
}

window.selectLineFromLeaderboard = selectLineFromLeaderboard;
window.shareTwitter = shareTwitter;
window.copyLink = copyLink;
