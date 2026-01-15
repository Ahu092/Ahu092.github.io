// NJ Transit Misery Tracker - Main Application

// NJ Transit Lines with fun nicknames
const LINES = {
    'Northeast Corridor': { nickname: 'aka "The NEC-essary Evil"', color: '#d93a30' },
    'North Jersey Coast': { nickname: 'aka "Shore Thing... Eventually"', color: '#00a4e4' },
    'Raritan Valley': { nickname: 'aka "The Rarely On Time"', color: '#faa634' },
    'Morris & Essex': { nickname: 'aka "More Delays & Excuses"', color: '#00a651' },
    'Main/Bergen': { nickname: 'aka "The Main Problem"', color: '#a0218c' },
    'Montclair-Boonton': { nickname: 'aka "Mont-where?"', color: '#e66b5b' },
    'Pascack Valley': { nickname: 'aka "Pass-on-the-schedule"', color: '#8e258d' },
    'Port Jervis': { nickname: 'aka "Port of No Return"', color: '#ff7900' },
    'Atlantic City': { nickname: 'aka "Gamble On Arrival"', color: '#005695' },
    'Gladstone Branch': { nickname: 'aka "Glad-to-wait"', color: '#00a651' },
    'Morristown Line': { nickname: 'aka "Morris-wait-town"', color: '#00a651' },
    'Princeton Branch': { nickname: 'aka "The Dinky Delay"', color: '#d93a30' }
};

// Delay causes with sarcastic translations
const CAUSE_TRANSLATIONS = {
    'Equipment': 'The train broke down (again)',
    'Crew Availability': 'Nobody showed up to drive',
    'Signal Problems': 'Our namesake!',
    'Track Work': 'We forgot to maintain things',
    'Weather': 'A light breeze derailed our plans',
    'Police Activity': 'Something happened somewhere',
    'Trespasser': 'Someone where they shouldn\'t be',
    'Medical Emergency': 'Someone needed help',
    'Switch Problems': 'The switches have commitment issues',
    'Amtrak': 'Blame Amtrak (our favorite)',
    'Power Problems': 'Electricity is hard',
    'Unknown': 'Your guess is as good as ours'
};

// Fun facts about NJ Transit
const FUN_FACTS = [
    { emoji: '🚂', text: 'NJ Transit is the <span class="fact-highlight">3rd largest transit system</span> in the US. Third place in delays too?' },
    { emoji: '👥', text: 'NJ Transit serves about <span class="fact-highlight">90,000 rail riders daily</span>. That\'s 90,000 potential eye-rolls.' },
    { emoji: '🛤️', text: 'The system has <span class="fact-highlight">166 stations</span> across 12 lines. Each one a unique delay opportunity.' },
    { emoji: '💰', text: 'A monthly pass can cost over <span class="fact-highlight">$500</span> for longer zones. Premium pricing for... this?' },
    { emoji: '🎰', text: 'The Atlantic City Line connects NYC to casinos. <span class="fact-highlight">The real gamble is whether it runs on time.</span>' },
    { emoji: '🚇', text: 'NJ Transit shares tracks with Amtrak, which means <span class="fact-highlight">double the excuses</span> for delays.' },
    { emoji: '📍', text: 'Penn Station NY is the busiest station, handling <span class="fact-highlight">NJT, Amtrak, and LIRR</span>. Chaos central.' },
    { emoji: '🎭', text: '"Due to Amtrak delays" is the <span class="fact-highlight">most popular excuse</span> in NJT history (probably).' }
];

// Sample data for NJ Transit lines
// Calibrated so typical day ~35-45, bad day ~60-75, disaster ~80+
const SAMPLE_DATA = {
    'Northeast Corridor': { avgDelay: 5.8, delayedTrains: 85, cancelledTrains: 4, worstDelay: 32, miseryScore: 48 },
    'North Jersey Coast': { avgDelay: 4.5, delayedTrains: 52, cancelledTrains: 3, worstDelay: 25, miseryScore: 41 },
    'Raritan Valley': { avgDelay: 5.2, delayedTrains: 48, cancelledTrains: 2, worstDelay: 28, miseryScore: 43 },
    'Morris & Essex': { avgDelay: 4.8, delayedTrains: 62, cancelledTrains: 3, worstDelay: 24, miseryScore: 42 },
    'Main/Bergen': { avgDelay: 4.2, delayedTrains: 38, cancelledTrains: 2, worstDelay: 20, miseryScore: 37 },
    'Montclair-Boonton': { avgDelay: 4.5, delayedTrains: 35, cancelledTrains: 2, worstDelay: 22, miseryScore: 38 },
    'Pascack Valley': { avgDelay: 3.8, delayedTrains: 28, cancelledTrains: 1, worstDelay: 18, miseryScore: 33 },
    'Port Jervis': { avgDelay: 5.5, delayedTrains: 32, cancelledTrains: 2, worstDelay: 35, miseryScore: 44 },
    'Atlantic City': { avgDelay: 4.0, delayedTrains: 25, cancelledTrains: 1, worstDelay: 20, miseryScore: 35 },
    'Gladstone Branch': { avgDelay: 3.5, delayedTrains: 18, cancelledTrains: 1, worstDelay: 15, miseryScore: 30 },
    'Morristown Line': { avgDelay: 4.6, delayedTrains: 55, cancelledTrains: 3, worstDelay: 26, miseryScore: 42 },
    'Princeton Branch': { avgDelay: 3.2, delayedTrains: 12, cancelledTrains: 0, worstDelay: 12, miseryScore: 28 }
};

const SAMPLE_CAUSES = [
    { cause: 'Amtrak', percent: 24 },
    { cause: 'Equipment', percent: 20 },
    { cause: 'Signal Problems', percent: 18 },
    { cause: 'Crew Availability', percent: 14 },
    { cause: 'Track Work', percent: 10 },
    { cause: 'Weather', percent: 8 },
    { cause: 'Switch Problems', percent: 6 }
];

// State
let currentLine = 'Northeast Corridor';
let lineData = { ...SAMPLE_DATA };

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    initLineSelector();
    initTimeCalculator();
    renderFunFacts();
    updateDisplay();
    initKonamiCode();
});

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

    // Update active button
    document.querySelectorAll('.branch-btn').forEach(b => {
        b.classList.remove('active');
    });
    btn.classList.add('active');

    updateDisplay();

    // Smooth scroll to stats
    document.getElementById('statsDashboard').scrollIntoView({ behavior: 'smooth' });
}

// Update all displays
function updateDisplay() {
    const data = lineData[currentLine] || SAMPLE_DATA['Northeast Corridor'];

    // Update hero answer based on overall misery
    updateHeroAnswer(data.miseryScore);

    // Update line scores on buttons
    Object.keys(lineData).forEach(line => {
        const scoreEl = document.getElementById(`score-${line.replace(/[\s\/&]/g, '-')}`);
        if (scoreEl && lineData[line]) {
            scoreEl.textContent = lineData[line].miseryScore;
        }
    });

    // Update misery meter
    updateMiseryMeter(data.miseryScore);

    // Update line title
    document.getElementById('selectedBranchName').textContent = currentLine;
    document.getElementById('branchNickname').textContent = LINES[currentLine]?.nickname || '';

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
        const data = lineData[currentLine] || SAMPLE_DATA['Northeast Corridor'];
        updateTimeWasted(data.avgDelay);
    });
}

// Update time wasted calculations
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

// Render causes chart
function renderCausesChart() {
    const container = document.getElementById('causesChart');
    const causes = SAMPLE_CAUSES;

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

// Select line from leaderboard
function selectLineFromLeaderboard(line) {
    currentLine = line;

    document.querySelectorAll('.branch-btn').forEach(btn => {
        const lineName = btn.querySelector('.branch-name').textContent;
        btn.classList.toggle('active', lineName === line);
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
    const shareText = `My NJ Transit line (${currentLine}) has a Misery Index of ${score}/100. How's yours? 🚂😤`;
    document.getElementById('shareText').textContent = `"${shareText}"`;
}

// Share on Twitter/X
function shareTwitter() {
    const data = lineData[currentLine] || SAMPLE_DATA['Northeast Corridor'];
    const text = encodeURIComponent(
        `My NJ Transit line (${currentLine}) has a Misery Index of ${data.miseryScore}/100. ` +
        `Avg delay: ${data.avgDelay} mins. How's yours? 🚂😤 #NJTransit #NYCCommute`
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

                const heroAnswer = document.querySelector('.answer-text');
                heroAnswer.textContent = heroAnswer.textContent === 'YES' ? 'ALWAYS' : 'YES';
            }
        } else {
            konamiIndex = 0;
        }
    });
}

// Make functions available globally
window.selectLineFromLeaderboard = selectLineFromLeaderboard;
window.shareTwitter = shareTwitter;
window.copyLink = copyLink;
