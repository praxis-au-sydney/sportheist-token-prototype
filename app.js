/* ============================================
   SportHeist Token Flow Prototype — app.js
   ============================================ */

'use strict';

// --- Mock data ---
// Conservation check: issued − burned = club + dscLab + members
// where members = membersAvail + membersLocked (see renderTotals)
const CLUBS = [
  { id: 'collingwood', name: 'Collingwood Magpies', club: 12400, dscLab: 46570, minted: 65000, burned: 2000 },
  { id: 'gsw', name: 'Golden State Warriors', club: 8100, dscLab: 17380, minted: 30000, burned: 1000 },
  { id: 'lakers', name: 'LA Lakers', club: 500, dscLab: 11480, minted: 15000, burned: 0 },
];

const REASON_CODES = {
  distribute: ['Member performance bonus', 'Club event prize', 'Weekly reward', 'Seasonal gift', 'Other'],
  gift: ['Operational funding', 'Event sponsorship', 'Club development', 'Community program', 'Other'],
  burn: ['Excess capacity', 'Expired tokens', 'Correction', 'Other'],
  refund: ['Incorrect charge', 'Proposal cancelled', 'System error', 'Vote reversal', 'Other'],
};

const CLUB_CONFIG = {
  collingwood: { voteCost: 50, likeCost: 10, ideaCost: 100 },
  gsw:        { voteCost: 40, likeCost: 5,  ideaCost: 80  },
  lakers:     { voteCost: 30, likeCost: 5,  ideaCost: 60  },
};

const PLATFORM_CONFIG = {
  tokenPriceAUD: 0.10,
  expiryDays: 365,
  distributionCap: 500,
  seasonEndDate: '2026-12-31',
};

const MEMBERS = {
  collingwood: [
    { id: 'm1', name: 'Alex Johnson', available: 1200 },
    { id: 'm2', name: 'Sarah Chen', available: 850 },
    { id: 'm3', name: 'Marcus Webb', available: 620 },
    { id: 'm4', name: 'Priya Nair', available: 300 },
    { id: 'm5', name: 'Tom Gallagher', available: 240 },
  ],
  gsw: [
    { id: 'm1', name: 'Jordan Davis', available: 980 },
    { id: 'm2', name: 'Kenji Tanaka', available: 750 },
    { id: 'm3', name: 'Aisha Williams', available: 540 },
    { id: 'm4', name: 'Diego Herrera', available: 330 },
    { id: 'm5', name: 'Emma Thompson', available: 200 },
  ],
  lakers: [
    { id: 'm1', name: 'Caleb Brown', available: 820 },
    { id: 'm2', name: 'Nina Park', available: 640 },
    { id: 'm3', name: 'Ryan O\'Brien', available: 480 },
    { id: 'm4', name: 'Leila Hassan', available: 280 },
    { id: 'm5', name: 'Felix Müller', available: 180 },
  ],
};

const TX_HISTORY = {
  member: [
    { id: 1,  title: 'Credit Top Up',    meta: '20 Apr 2026 · Stripe',                        amount: '+200', type: 'in',     txType: 'topup'    },
    { id: 2,  title: 'Club Distribution',meta: '18 Apr 2026 · Weekly reward',                 amount: '+150', type: 'in',     txType: 'distribute' },
    { id: 3,  title: 'Vote Locked',      meta: '16 Apr 2026 · Proposal #90',                  amount: '-50',  type: 'locked', txType: 'vote',    note: 'In progress · tokens locked' },
    { id: 4,  title: 'Vote Completed',   meta: '14 Apr 2026 · Proposal #88',                  amount: '-50',  type: 'out',    txType: 'vote',    onchain: true, note: 'Spent on-chain → DSC Lab' },
    { id: 5,  title: 'Like Locked',      meta: '12 Apr 2026 · Post #47',                      amount: '-10',  type: 'locked', txType: 'like',    note: 'In progress · tokens locked' },
    { id: 6,  title: 'Idea Lapsed',      meta: '10 Apr 2026 · Idea #23',                      amount: '+10',  type: 'in',     txType: 'lapsed',  note: '10 voter tokens returned · 10 sponsor tokens forfeited' },
    { id: 7,  title: 'Refund',           meta: '08 Apr 2026 · Incorrect charge · Club Admin', amount: '+50',  type: 'in',     txType: 'refund'   },
    { id: 8,  title: 'Vote Vetoed',      meta: '06 Apr 2026 · Proposal #85',                  amount: '+50',  type: 'in',     txType: 'vote',    note: 'Tokens unlocked and returned' },
    { id: 9,  title: 'Credit Top Up',    meta: '05 Apr 2026 · Stripe',                        amount: '+100', type: 'in',     txType: 'topup'    },
    { id: 10, title: 'Idea Cancelled',   meta: '03 Apr 2026 · Idea #20',                      amount: '-20',  type: 'out',    txType: 'idea',    onchain: true, note: 'Forfeited on-chain → DSC Lab' },
  ],
  club: [
    { id: 1,  title: 'DSC Lab Gift',           meta: '14 Apr 2026 · Operational funding',            amount: '+5000', amountNum: 5000, type: 'in',  activityType: 'gift',      memberId: null, memberName: null,         memberIds: null,                        date: '2026-04-14' },
    { id: 2,  title: 'Distributed to Members', meta: '12 Apr 2026 · Performance bonus · 3 members', amount: '-3200', amountNum: 3200, type: 'out', activityType: 'distribute', memberId: null, memberName: null,         memberIds: ['m1', 'm2', 'm3'],          date: '2026-04-12' },
    { id: 3,  title: 'Vote: Support',          meta: '11 Apr 2026 · Proposal #88 · Alex Johnson',   amount: '-50',   amountNum: 50,   type: 'out', activityType: 'vote',       memberId: 'm1', memberName: 'Alex Johnson',   memberIds: null,                        date: '2026-04-11' },
    { id: 4,  title: 'DSC Lab Gift',           meta: '10 Apr 2026 · Event sponsorship',             amount: '+2000', amountNum: 2000, type: 'in',  activityType: 'gift',      memberId: null, memberName: null,         memberIds: null,                        date: '2026-04-10' },
    { id: 5,  title: 'Credit Purchase',        meta: '08 Apr 2026 · Stripe · Sarah Chen',           amount: '+500',  amountNum: 500,  type: 'in',  activityType: 'purchase',   memberId: 'm2', memberName: 'Sarah Chen',     memberIds: null,                        date: '2026-04-08' },
    { id: 6,  title: 'Idea Started',           meta: '07 Apr 2026 · Idea #45 · Marcus Webb',        amount: '-20',   amountNum: 20,   type: 'out', activityType: 'idea',       memberId: 'm3', memberName: 'Marcus Webb',    memberIds: null,                        date: '2026-04-07' },
    { id: 7,  title: 'Like to Veto',           meta: '06 Apr 2026 · Proposal #85 · Priya Nair',     amount: '-10',   amountNum: 10,   type: 'out', activityType: 'like',       memberId: 'm4', memberName: 'Priya Nair',     memberIds: null,                        date: '2026-04-06' },
    { id: 8,  title: 'Distributed to Members', meta: '05 Apr 2026 · Weekly reward · 5 members',    amount: '-1800', amountNum: 1800, type: 'out', activityType: 'distribute', memberId: null, memberName: null,         memberIds: ['m1', 'm2', 'm3', 'm4', 'm5'], date: '2026-04-05' },
    { id: 9,  title: 'Vote: Support',          meta: '03 Apr 2026 · Proposal #82 · Tom Gallagher', amount: '-50',   amountNum: 50,   type: 'out', activityType: 'vote',       memberId: 'm5', memberName: 'Tom Gallagher',  memberIds: null,                        date: '2026-04-03' },
    { id: 10, title: 'Credit Purchase',        meta: '01 Apr 2026 · Stripe · Alex Johnson',        amount: '+200',  amountNum: 200,  type: 'in',  activityType: 'purchase',   memberId: 'm1', memberName: 'Alex Johnson',   memberIds: null,                        date: '2026-04-01' },
    { id: 11, title: 'Vote Failed',            meta: '28 Mar 2026 · Proposal #76 · Sarah Chen',     amount: '-50',   amountNum: 50,   type: 'out', activityType: 'vote',       memberId: 'm2', memberName: 'Sarah Chen',     memberIds: null,  date: '2026-03-28', errorFlag: 'insufficient_credits', reasonCode: 'system_adjustment' },
    { id: 12, title: 'Duplicate Charge',       meta: '25 Mar 2026 · Like #77 · Priya Nair',         amount: '-10',   amountNum: 10,   type: 'out', activityType: 'like',       memberId: 'm4', memberName: 'Priya Nair',     memberIds: null,  date: '2026-03-25', errorFlag: 'duplicate_charge', reasonCode: 'compensation' },
    { id: 13, title: 'Distribute Failed',      meta: '20 Mar 2026 · System error · 2 members',     amount: '-400',  amountNum: 400,  type: 'out', activityType: 'distribute', memberId: null, memberName: null,         memberIds: ['m3', 'm5'], date: '2026-03-20', errorFlag: 'failed_tx', reasonCode: 'system_adjustment' },
  ],
  dscLab: [
    { id: 1, title: 'Received from Spend', meta: '14 Apr 2026 · Activities', amount: '+1200', type: 'in' },
    { id: 2, title: 'Transferred to Club', meta: '12 Apr 2026 · Collingwood Magpies', amount: '-5000', type: 'out' },
    { id: 3, title: 'Burned', meta: '10 Apr 2026 · Correction', amount: '-500', type: 'out' },
    { id: 4, title: 'Received from Spend', meta: '08 Apr 2026 · Activities', amount: '+800', type: 'in' },
    { id: 5, title: 'Transferred to Club', meta: '05 Apr 2026 · Golden State Warriors', amount: '-3000', type: 'out' },
  ],
};

// --- Mutable wallet state ---
const walletState = {
  member: { available: 3210, locked: 820 },
  club: { balance: 12400 },
};

// --- Active activities list ---
let activities = [];

// --- State ---
let activeClub = CLUBS[0];
let activeTab = 'member';
let selectedMemberIds = new Set();
let selectedTxIds = new Set();
let activeFilters = { member: '', types: [], dateFrom: '', dateTo: '', amountMin: '', amountMax: '' };
let distributeMode = 'distribute';
let memberOwedAmounts = {}; // populated during compensate flow: memberId → tokens owed
let activeAdminSection = 'club-settings';
let recoveryFilters = { types: [], dateFrom: '', dateTo: '', amountMin: '', error: '', reason: '', contextId: '' };
let derivedMembers = [];
let recoveryMode = 'distribute';

// --- Helpers ---
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function fmt(n) {
  return n.toLocaleString('en-AU');
}

// --- Tab switching ---
function initTabs() {
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
      $$('.tab-panel').forEach(p => p.classList.toggle('active', p.dataset.tab === activeTab));
      render();
    });
  });
}

// --- Show/hide elements per tab ---
function renderVisibility() {
  const isDscLab = activeTab === 'dsclab';
  const isClub = activeTab === 'club';
  const isMember = activeTab === 'member';
  const isAdmin = activeTab === 'admin';

  // Ecosystem diagram: DSC Lab only
  $('#ecosystem-diagram').style.display = isDscLab ? 'block' : 'none';

  // Club picker: Club + DSC Lab + Admin
  $('#club-picker-wrap').style.display = (isClub || isDscLab || isAdmin) ? 'block' : 'none';

  // Totals strip: Club + DSC Lab
  $('#totals-strip').style.display = (isClub || isDscLab) ? 'grid' : 'none';
}

// --- Club picker ---
function initClubPicker() {
  const btn = $('#club-picker-btn');
  const dropdown = $('#club-picker-dropdown');

  btn.addEventListener('click', () => {
    const isOpen = dropdown.classList.toggle('open');
    btn.classList.toggle('open', isOpen);
  });

  document.addEventListener('click', e => {
    if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
      btn.classList.remove('open');
    }
  });

  $$('.club-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const club = CLUBS.find(c => c.id === opt.dataset.id);
      if (!club) return;
      activeClub = club;
      // Sync member wallet to the selected club's baseline
      const m = CLUB_MEMBERS[club.id] || { avail: 0, locked: 0 };
      walletState.member.available = m.avail;
      walletState.member.locked = m.locked;
      dropdown.classList.remove('open');
      btn.classList.remove('open');
      selectedTxIds = new Set();
      renderClubPicker();
      renderTotals();
      renderClubView();
      renderDscLabView();
      updateCompensateBar();
      if (activeTab === 'admin') renderAdminView();
    });
  });
}

function renderClubPicker() {
  const btn = $('#club-picker-btn');
  btn.querySelector('.club-name').textContent = activeClub.name;
  const dots = btn.querySelector('.club-dots');
  const isClub = activeTab === 'club';
  const memberCount = (MEMBERS[activeClub.id] || []).length;

  if (isClub) {
    dots.innerHTML = `<span>Club Wallet: ${fmt(activeClub.club)}</span><span> · </span><span>${memberCount} members</span>`;
  } else {
    dots.innerHTML = `
      <span>Club: ${fmt(activeClub.club)}</span>
      <span> · </span>
      <span>DSC Lab: ${fmt(activeClub.dscLab)}</span>
      <span> · </span>
      <span style="color:var(--green-500)">↑${fmt(activeClub.minted)}</span>
      <span>/</span>
      <span style="color:var(--red-500)">↓${fmt(activeClub.burned)}</span>
    `;
  }

  $$('.club-option').forEach(opt => {
    const club = CLUBS.find(c => c.id === opt.dataset.id);
    if (!club) return;
    const count = (MEMBERS[club.id] || []).length;
    opt.querySelector('.club-option-name').textContent = club.name;
    if (isClub) {
      opt.querySelector('.club-option-meta').innerHTML = `
        <span>Club Wallet: <strong>${fmt(club.club)}</strong></span>
        <span>${count} members</span>
      `;
    } else {
      opt.querySelector('.club-option-meta').innerHTML = `
        <span>Club: <strong>${fmt(club.club)}</strong></span>
        <span>DSC Lab: <strong>${fmt(club.dscLab)}</strong></span>
        <span><span class="up">↑${fmt(club.minted)}</span> / <span class="down">↓${fmt(club.burned)}</span></span>
      `;
    }
    opt.classList.toggle('selected', club.id === activeClub.id);
  });
}

// --- Totals strip ---
// Conservation: issued − burned = club + dscLab + membersAvail + membersLocked
const CLUB_MEMBERS = {
  collingwood: { avail: 3210, locked: 820 },
  gsw: { avail: 2800, locked: 720 },
  lakers: { avail: 2400, locked: 620 },
};

function renderTotals() {
  const isClub = activeTab === 'club';
  const membersAvail = walletState.member.available;
  const membersLocked = walletState.member.locked;
  const membersTotal = membersAvail + membersLocked;
  const circulating = activeClub.club + activeClub.dscLab + membersTotal;
  const memberCount = (MEMBERS[activeClub.id] || []).length;
  const strip = $('#totals-strip');
  const cards = $$('.totals-card');

  if (isClub) {
    strip.style.gridTemplateColumns = 'repeat(2, 1fr)';
    cards[1].style.display = 'none';
    cards[3].style.display = 'none';
    cards[0].querySelector('.totals-card-label').textContent = 'Club Wallet';
    cards[0].querySelector('.totals-card-value').textContent = fmt(activeClub.club);
    cards[2].querySelector('.totals-card-label').textContent = 'Total Members';
    cards[2].querySelector('.totals-card-value').textContent = memberCount;
    const sub2 = cards[2].querySelector('.totals-card-sub');
    if (sub2) sub2.textContent = '';
  } else {
    strip.style.gridTemplateColumns = '';
    cards[1].style.display = '';
    cards[3].style.display = '';
    const defs = [
      { label: 'Club Wallet', value: fmt(activeClub.club) },
      { label: 'DSC Lab', value: fmt(activeClub.dscLab) },
      { label: 'Members', value: fmt(membersAvail) + ' available', sub: fmt(membersLocked) + ' locked' },
      { label: 'Circulating', value: fmt(circulating) },
    ];
    cards.forEach((card, i) => {
      card.querySelector('.totals-card-label').textContent = defs[i].label;
      card.querySelector('.totals-card-value').textContent = defs[i].value;
      const sub = card.querySelector('.totals-card-sub');
      if (sub) sub.textContent = defs[i].sub || '';
    });
  }
}

// --- Ecosystem SVG (DSC Lab tab only) ---
function renderDiagram() {
  const svg = $('#ecosystem-svg');
  if (!svg) return;
  // Update dynamic balance values in the SVG
  const dscEl = svg.querySelector('#diagram-dsc-balance');
  const clubEl = svg.querySelector('#diagram-club-balance');
  const availEl = svg.querySelector('#diagram-avail');
  const lockedEl = svg.querySelector('#diagram-locked');
  if (dscEl) dscEl.textContent = fmt(activeClub.dscLab);
  if (clubEl) clubEl.textContent = fmt(activeClub.club);
  if (availEl) availEl.textContent = fmt(walletState.member.available);
  if (lockedEl) lockedEl.textContent = fmt(walletState.member.locked);
}

// --- Transaction rendering ---
const TX_TYPE_LABELS = {
  topup:    'Top-Up',
  distribute: 'Received',
  vote:     'Vote',
  like:     'Like',
  idea:     'Idea',
  lapsed:   'Lapsed',
  refund:   'Refund',
};

function txIcon(type) {
  const map = { in: 'in', out: 'out', locked: 'locked', offchain: 'offchain', onchain: 'onchain' };
  return map[type] || 'offchain';
}

function renderTxList(selector, txs) {
  const list = $(selector);
  if (!txs || txs.length === 0) {
    list.innerHTML = '<div class="empty-state">No transactions yet</div>';
    return;
  }
  list.innerHTML = txs.map(tx => {
    const iconClass = tx.onchain ? 'onchain' : txIcon(tx.type);
    const iconSymbol = tx.onchain ? '⛓' : (tx.type === 'in' ? '↑' : tx.type === 'locked' ? '○' : '↓');
    const amountClass = tx.amount.startsWith('+') ? 'positive' : tx.type === 'locked' ? 'amber' : 'negative';
    const badge = tx.txType ? `<span class="tx-type-badge tx-type-${tx.txType}">${TX_TYPE_LABELS[tx.txType] || tx.txType}</span>` : '';
    const chainBadge = tx.onchain ? '<span class="tx-onchain-badge">On-chain</span>' : '';
    const badgeRow = (badge || chainBadge) ? `<div class="tx-badges">${badge}${chainBadge}</div>` : '';
    return `
      <div class="tx-item">
        <div class="tx-icon ${iconClass}">${iconSymbol}</div>
        <div class="tx-info">
          <div class="tx-title">${tx.title}</div>
          ${badgeRow}
          <div class="tx-meta">${tx.meta}${tx.note ? ' · ' + tx.note : ''}</div>
        </div>
        <div class="tx-amount ${amountClass}">${tx.amount}</div>
      </div>
    `;
  }).join('');
}

// --- Member View ---
function renderMemberView() {
  const avail = walletState.member.available;
  const locked = walletState.member.locked;

  // Wallet balances
  $('#member-avail').textContent = fmt(avail);
  $('#member-locked').textContent = fmt(locked);

  // Transactions
  renderTxList('#member-tx-list', TX_HISTORY.member);

  // Auto top-up toggle state
  const toggle = $('#auto-topup-toggle');
  toggle.checked = localStorage.getItem('autoTopup') === 'true';
  toggle.addEventListener('change', () => {
    localStorage.setItem('autoTopup', toggle.checked);
  }, { once: true });
}

// --- Club View ---
function renderClubView() {
  walletState.club.balance = activeClub.club;
  $('#club-balance').textContent = fmt(activeClub.club);
  renderClubTxList();
}

// --- DSC Lab: All-Clubs Overview ---
function renderClubOverview() {
  const wrap = $('#club-overview-table');
  if (!wrap) return;

  wrap.innerHTML = CLUBS.map(c => {
    const m = CLUB_MEMBERS[c.id] || { avail: 0, locked: 0 };
    const membersTotal = m.avail + m.locked;
    const isActive = c.id === activeClub.id;
    return `
      <div class="club-overview-row${isActive ? ' co-active' : ''}">
        <div class="club-overview-name">
          ${c.name}
          ${isActive ? '<span class="co-selected-badge">Selected</span>' : ''}
        </div>
        <div class="club-overview-stats">
          <div class="co-stat">
            <span class="co-stat-label">DSC Lab</span>
            <span class="co-stat-value co-purple">${fmt(c.dscLab)}</span>
          </div>
          <div class="co-stat">
            <span class="co-stat-label">Club Wallet</span>
            <span class="co-stat-value co-green">${fmt(c.club)}</span>
          </div>
          <div class="co-stat">
            <span class="co-stat-label">Members</span>
            <span class="co-stat-value">${fmt(membersTotal)}</span>
          </div>
          <div class="co-stat">
            <span class="co-stat-label">Issued</span>
            <span class="co-stat-value co-up">↑${fmt(c.minted)}</span>
          </div>
          <div class="co-stat">
            <span class="co-stat-label">Burned</span>
            <span class="co-stat-value co-down">↓${fmt(c.burned)}</span>
          </div>
        </div>
        <button class="btn btn-outline btn-sm co-gift-btn" data-club-id="${c.id}">Gift</button>
      </div>
    `;
  }).join('');
}

// --- DSC Lab View ---
function renderDscLabView() {
  renderClubOverview();

  // Wallet (selected club)
  $('#dsclab-balance').textContent = fmt(activeClub.dscLab);
  $('#dsclab-minted').textContent = '↑' + fmt(activeClub.minted);
  $('#dsclab-burned').textContent = '↓' + fmt(activeClub.burned);

  // Transactions
  renderTxList('#dsclab-tx-list', TX_HISTORY.dscLab);
}

// --- Modal helpers ---
function openModal(id) {
  $(`#${id}`).classList.add('open');
}

function closeModal(id) {
  $(`#${id}`).classList.remove('open');
}

// --- Activity panel (Member View) ---
const ACTIVITY_LABELS = { idea: 'Idea', vote: 'Proposal', like: 'Like to Veto' };

function getActivityCosts() {
  const cfg = CLUB_CONFIG[activeClub.id] || CLUB_CONFIG.collingwood;
  return { idea: cfg.ideaCost, vote: cfg.voteCost, like: cfg.likeCost };
}

function populateActivityModal() {
  const costs = getActivityCosts();
  $('#activity-type').innerHTML = [
    { value: 'idea', label: `Idea (${costs.idea} tokens)` },
    { value: 'vote', label: `Vote / Proposal (${costs.vote} tokens)` },
    { value: 'like', label: `Like / Like-to-veto (${costs.like} tokens)` },
  ].map(o => `<option value="${o.value}">${o.label}</option>`).join('');
}

function renderActivityPanel() {
  const panel = $('#activity-panel');
  if (!panel) return;

  if (activities.length === 0) {
    panel.style.display = 'none';
    return;
  }

  panel.style.display = 'block';

  panel.innerHTML = activities.map(a => {
    const titleMap = {
      idea: `Idea: ${a.desc.slice(0, 40) || 'Untitled'}${a.desc.length > 40 ? '…' : ''}`,
      vote: `Proposal #${a.id.toString().slice(-4)}`,
      like: 'Like to Veto',
    };
    return `
      <div class="activity-card">
        <div class="activity-panel-header">
          <div class="activity-title">${titleMap[a.type] || 'Activity'}</div>
          <span class="activity-badge in-progress">In Progress</span>
        </div>
        <div class="activity-meta"><strong>${a.cost}</strong> tokens locked</div>
        <div class="activity-indicator">
          <span class="activity-chip support"><span class="dot"></span>${a.support} votes</span>
          <span class="activity-chip reject"><span class="dot"></span>${a.reject} reject</span>
          <span class="activity-chip like"><span class="dot"></span>${a.like} likes</span>
        </div>
        <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--gray-100);">
          <div class="section-title" style="margin-bottom:8px;">Simulate Outcome (demo)</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-outline sim-btn" data-action="complete" data-id="${a.id}" style="font-size:12px;padding:5px 12px;">Complete ✓</button>
            <button class="btn btn-outline sim-btn" data-action="vetoed" data-id="${a.id}" style="font-size:12px;padding:5px 12px;">Vetoed ✗</button>
            <button class="btn btn-outline sim-btn" data-action="lapsed" data-id="${a.id}" style="font-size:12px;padding:5px 12px;">Lapsed ○</button>
            <button class="btn btn-outline sim-btn" data-action="cancelled" data-id="${a.id}" style="font-size:12px;padding:5px 12px;">Cancelled ✕</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function initActivityHandlers() {
  $('#btn-start-activity').addEventListener('click', () => {
    populateActivityModal();
    openModal('activity-modal');
  });

  $('#btn-start-activity-confirm').addEventListener('click', () => {
    const type = $('#activity-type').value;
    const desc = $('#activity-desc').value;
    const cost = getActivityCosts()[type] || 0;

    if (walletState.member.available < cost) {
      alert(`Not enough available tokens. Need ${cost}, have ${walletState.member.available}.`);
      return;
    }

    walletState.member.available -= cost;
    walletState.member.locked += cost;

    const activity = {
      id: Date.now(),
      type,
      cost,
      desc,
      support: type === 'vote' ? 3 : 0,
      reject: type === 'vote' ? 1 : 0,
      like: type === 'vote' ? 2 : type === 'idea' ? 4 : 0,
    };
    activities.push(activity);

    addTx('member', {
      title: `${ACTIVITY_LABELS[type]} Started`,
      meta: new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) + (desc ? ' · ' + desc.slice(0, 30) : ''),
      amount: `-${cost}`,
      type: 'locked',
      txType: type,
      note: 'In progress · tokens locked',
    });

    $('#activity-desc').value = '';
    closeModal('activity-modal');
    render();
  });

  // Single delegated listener handles outcome buttons for all activities
  $('#activity-panel').addEventListener('click', e => {
    const btn = e.target.closest('.sim-btn');
    if (!btn) return;

    const id = parseInt(btn.dataset.id);
    const action = btn.dataset.action;
    const idx = activities.findIndex(a => a.id === id);
    if (idx === -1) return;

    const a = activities[idx];

    if (action === 'complete') {
      walletState.member.locked -= a.cost;
      activeClub.dscLab += a.cost;
      addTx('member', { title: `${ACTIVITY_LABELS[a.type]} Completed`, meta: 'Tokens spent → DSC Lab', amount: `-${a.cost}`, type: 'out', txType: a.type, onchain: true, note: 'Spent on-chain → DSC Lab' });
    } else if (action === 'vetoed') {
      walletState.member.available += a.cost;
      walletState.member.locked -= a.cost;
      addTx('member', { title: `${ACTIVITY_LABELS[a.type]} Vetoed`, meta: 'Tokens unlocked and returned', amount: `+${a.cost}`, type: 'in', txType: a.type });
    } else if (action === 'lapsed') {
      const half = Math.floor(a.cost / 2);
      walletState.member.available += a.cost - half;
      walletState.member.locked -= a.cost;
      activeClub.dscLab += half;
      addTx('member', { title: `${ACTIVITY_LABELS[a.type]} Lapsed`, meta: `${half} sponsor tokens forfeited`, amount: `+${a.cost - half}`, type: 'in', txType: 'lapsed', note: `${a.cost - half} voter tokens returned · ${half} forfeited` });
    } else if (action === 'cancelled') {
      walletState.member.locked -= a.cost;
      activeClub.dscLab += a.cost;
      addTx('member', { title: `${ACTIVITY_LABELS[a.type]} Cancelled`, meta: 'Sponsor forfeit → DSC Lab', amount: `-${a.cost}`, type: 'out', txType: a.type, onchain: true, note: 'Forfeited on-chain → DSC Lab' });
    }

    activities.splice(idx, 1);
    render();
  });
}

function addTx(scope, tx) {
  TX_HISTORY[scope].unshift({ id: Date.now(), ...tx });
}

// --- Club TX filter helpers ---
function getFilteredClubTxs() {
  const f = activeFilters;
  return TX_HISTORY.club.filter(tx => {
    if (f.member) {
      if (!tx.memberName) return false;
      if (!tx.memberName.toLowerCase().includes(f.member.toLowerCase())) return false;
    }
    if (f.types.length > 0 && (!tx.activityType || !f.types.includes(tx.activityType))) return false;
    if (f.dateFrom && tx.date && tx.date < f.dateFrom) return false;
    if (f.dateTo && tx.date && tx.date > f.dateTo) return false;
    const minAmt = f.amountMin !== '' ? parseInt(f.amountMin, 10) : null;
    const maxAmt = f.amountMax !== '' ? parseInt(f.amountMax, 10) : null;
    if (minAmt !== null && tx.amountNum !== undefined && tx.amountNum < minAmt) return false;
    if (maxAmt !== null && tx.amountNum !== undefined && tx.amountNum > maxAmt) return false;
    return true;
  });
}

function clearFilters() {
  activeFilters = { member: '', types: [], dateFrom: '', dateTo: '', amountMin: '', amountMax: '' };
  const els = ['#filter-member', '#filter-date-from', '#filter-date-to', '#filter-amount-min', '#filter-amount-max'];
  els.forEach(sel => { const el = $(sel); if (el) el.value = ''; });
  $$('.type-chip').forEach(c => c.classList.toggle('active', c.dataset.type === 'all'));
  updateFilterBadge();
  renderClubTxList();
}

function updateFilterBadge() {
  const f = activeFilters;
  const count = (f.member ? 1 : 0) + f.types.length + (f.dateFrom ? 1 : 0) + (f.dateTo ? 1 : 0) + (f.amountMin !== '' ? 1 : 0) + (f.amountMax !== '' ? 1 : 0);
  const badge = $('#filter-active-count');
  if (!badge) return;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

function renderClubTxList() {
  const filtered = getFilteredClubTxs();
  const total = TX_HISTORY.club.length;
  const hasFilter = activeFilters.member || activeFilters.types.length > 0 || activeFilters.dateFrom || activeFilters.dateTo || activeFilters.amountMin !== '' || activeFilters.amountMax !== '';

  const countEl = $('#filter-result-count');
  if (countEl) countEl.textContent = hasFilter ? `Showing ${filtered.length} of ${total}` : '';

  const list = $('#club-tx-list');
  if (!list) return;

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state">No transactions match these filters. <a href="#" id="filter-clear-inline" style="color:var(--indigo-600);">Clear filters</a></div>';
    const inlineLink = list.querySelector('#filter-clear-inline');
    if (inlineLink) inlineLink.addEventListener('click', e => { e.preventDefault(); clearFilters(); });
    return;
  }

  list.innerHTML = filtered.map(tx => `
    <div class="tx-item selectable${selectedTxIds.has(tx.id) ? ' tx-selected' : ''}" data-tx-id="${tx.id}">
      <input type="checkbox" class="tx-checkbox" ${selectedTxIds.has(tx.id) ? 'checked' : ''} tabindex="-1">
      <div class="tx-icon ${txIcon(tx.type)}">${tx.type === 'in' ? '↑' : tx.type === 'out' ? '↓' : '○'}</div>
      <div class="tx-info">
        <div class="tx-title">${tx.title}</div>
        <div class="tx-meta">${tx.meta}${tx.note ? ' · ' + tx.note : ''}</div>
      </div>
      <div class="tx-amount ${tx.amount.startsWith('+') ? 'positive' : 'negative'}">${tx.amount}</div>
    </div>
  `).join('');
}

function updateCompensateBar() {
  const bar = $('#compensate-bar');
  if (!bar) return;
  if (selectedTxIds.size === 0) { bar.style.display = 'none'; return; }

  const uniqueMembers = new Set();
  TX_HISTORY.club.forEach(tx => {
    if (!selectedTxIds.has(tx.id)) return;
    if (tx.memberId) uniqueMembers.add(tx.memberId);
    if (tx.memberIds) tx.memberIds.forEach(id => uniqueMembers.add(id));
  });

  const summary = $('#compensate-summary');
  if (summary) summary.textContent = `${selectedTxIds.size} transaction${selectedTxIds.size !== 1 ? 's' : ''} selected · ${uniqueMembers.size} unique member${uniqueMembers.size !== 1 ? 's' : ''}`;
  bar.style.display = 'flex';
}

// --- Compensation amount suggestion ---
function calcSuggestedCompensation(selectedIds) {
  const perMember = {};

  TX_HISTORY.club.forEach(tx => {
    if (!selectedIds.has(tx.id) || !tx.amountNum || tx.type !== 'out') return;
    if (tx.memberId) {
      perMember[tx.memberId] = (perMember[tx.memberId] || 0) + tx.amountNum;
    } else if (tx.memberIds && tx.memberIds.length > 0) {
      const each = Math.round(tx.amountNum / tx.memberIds.length);
      tx.memberIds.forEach(id => { perMember[id] = (perMember[id] || 0) + each; });
    }
  });

  const amounts = Object.values(perMember);
  if (amounts.length === 0) return { amount: null, note: null, perMember: {} };

  const allSame = amounts.every(a => a === amounts[0]);
  const suggested = allSame ? amounts[0] : Math.max(...amounts);
  const note = allSame
    ? 'Matches original charge for each member'
    : `Amounts vary by member — using maximum · adjust if needed`;

  return { amount: suggested, note, perMember };
}

// --- Open distribute/compensate modal ---
function openDistributeModal(options = {}) {
  const mode = options.mode || 'distribute';
  distributeMode = mode;

  $('#distribute-modal .modal-title').textContent = mode === 'compensate' ? 'Compensate Members' : 'Distribute to Members';
  $('#btn-distribute-confirm').textContent = mode === 'compensate' ? 'Send Compensation' : 'Distribute Tokens';

  const reasons = mode === 'compensate' ? REASON_CODES.refund : REASON_CODES.distribute;
  $('#distribute-reason').innerHTML = reasons.map(r => `<option value="${r}">${r}</option>`).join('');

  selectedMemberIds = new Set(options.preselectedIds || []);
  memberOwedAmounts = options.perMember || {};
  $('#member-search').value = '';

  const amountInput = $('#distribute-amount');
  const amountHint = $('#distribute-amount-hint');
  if (mode === 'compensate' && options.amount) {
    amountInput.value = options.amount;
    if (amountHint) {
      amountHint.textContent = `Auto-suggested from selected transactions · ${options.note || ''}`;
      amountHint.style.display = 'block';
    }
  } else {
    amountInput.value = '';
    if (amountHint) amountHint.style.display = 'none';
  }

  renderMemberTable();
  updateDistributeSummary();
  openModal('distribute-modal');
}

// --- Member table (Distribute modal) ---
function renderMemberTable(filter = '') {
  const wrap = $('#member-table-wrap');
  if (!wrap) return;
  const members = MEMBERS[activeClub.id] || [];
  const lower = filter.toLowerCase().trim();
  const filtered = lower ? members.filter(m => m.name.toLowerCase().includes(lower)) : members;

  if (filtered.length === 0) {
    wrap.innerHTML = '<div style="padding:12px 16px;text-align:center;font-size:12px;color:var(--gray-500);">No members found</div>';
    return;
  }

  wrap.innerHTML = filtered.map(m => {
    const owed = memberOwedAmounts[m.id];
    const owedTag = owed ? `<span class="member-row-owed">Owed ${fmt(owed)}</span>` : '';
    return `
      <div class="member-row${selectedMemberIds.has(m.id) ? ' selected' : ''}" data-member-id="${m.id}">
        <input type="checkbox" ${selectedMemberIds.has(m.id) ? 'checked' : ''} style="cursor:pointer;flex-shrink:0;" tabindex="-1">
        <span class="member-row-name">${m.name}</span>
        ${owedTag}
        <span class="member-row-balance">${fmt(m.available)} avail</span>
      </div>
    `;
  }).join('');
}

function updateDistributeSummary() {
  const count = selectedMemberIds.size;
  const amountEl = $('#distribute-amount');
  const amount = amountEl ? (parseInt(amountEl.value, 10) || 0) : 0;
  const countEl = $('#distribute-selected-count');
  const totalEl = $('#distribute-total');
  if (countEl) countEl.textContent = `${count} member${count !== 1 ? 's' : ''} selected`;
  if (totalEl) totalEl.textContent = fmt(count * amount);
}

function initModals() {
  // Close on overlay click
  $$('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  // Close buttons (× icon)
  $$('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal-overlay').classList.remove('open');
    });
  });

  // Cancel buttons
  $$('.modal-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal-overlay').classList.remove('open');
    });
  });

  // Purchase modal (Member)
  $('#btn-purchase').addEventListener('click', () => openModal('purchase-modal'));

  // Club Purchase Credits (same modal, pre-filled context)
  $('#btn-club-purchase').addEventListener('click', () => openModal('purchase-modal'));

  // Purchase confirm
  $('#btn-purchase-confirm').addEventListener('click', () => {
    const amount = parseInt($('#purchase-amount').value, 10);
    if (!amount || amount < 1) {
      alert('Please enter a valid amount');
      return;
    }
    // Determine who is purchasing: check which tab is active
    // Update active tab's wallet
    if (activeTab === 'member') {
      walletState.member.available += amount;
      walletState.member.available = Math.min(walletState.member.available, 100000); // cap for demo
      activeClub.minted += amount;
      TX_HISTORY.member.unshift({
        id: Date.now(),
        title: 'Credit Top Up',
        meta: new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · Stripe',
        amount: '+' + amount,
        type: 'in',
        txType: 'topup',
      });
    } else if (activeTab === 'club') {
      walletState.club.balance += amount;
      activeClub.club += amount;
      activeClub.minted += amount;
      TX_HISTORY.club.unshift({
        id: Date.now(),
        title: 'Credit Purchase',
        meta: new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · Stripe',
        amount: '+' + amount,
        amountNum: amount,
        type: 'in',
        activityType: 'purchase',
        memberId: null,
        memberName: null,
        memberIds: null,
        date: new Date().toISOString().slice(0, 10),
      });
    }
    $('#purchase-amount').value = '';
    closeModal('purchase-modal');
    render();
    // Flash confirmation
    const badge = document.createElement('div');
    badge.textContent = `Purchased ${amount} tokens`;
    badge.style.cssText = 'position:fixed;top:70px;right:24px;background:var(--green-500);color:white;z-index:100;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600;animation:fadeOut 2s forwards';
    document.body.appendChild(badge);
    setTimeout(() => badge.remove(), 2000);
  });

  // Distribute modal (Club)
  $('#btn-distribute').addEventListener('click', () => {
    openDistributeModal({ mode: 'distribute' });
  });

  // Member table — delegated row click (toggle selection)
  $('#member-table-wrap').addEventListener('click', e => {
    const row = e.target.closest('.member-row');
    if (!row) return;
    const id = row.dataset.memberId;
    if (selectedMemberIds.has(id)) {
      selectedMemberIds.delete(id);
    } else {
      selectedMemberIds.add(id);
    }
    renderMemberTable($('#member-search').value);
    updateDistributeSummary();
  });

  // Search filter
  $('#member-search').addEventListener('input', e => {
    renderMemberTable(e.target.value);
  });

  // Live total preview on amount change
  $('#distribute-amount').addEventListener('input', updateDistributeSummary);

  // Re-auth + distribute confirm
  $('#btn-distribute-confirm').addEventListener('click', () => {
    const password = $('#distribute-password').value;
    const amount = parseInt($('#distribute-amount').value, 10);

    if (selectedMemberIds.size === 0) {
      alert('Please select at least one member.');
      return;
    }
    if (!password) {
      alert('Password required for this action.');
      return;
    }
    if (!amount || amount < 1) {
      alert('Please enter a valid amount per member.');
      return;
    }
    const total = selectedMemberIds.size * amount;
    if (activeClub.club < total) {
      alert(`Not enough club tokens. Need ${total} (${selectedMemberIds.size} × ${amount}), have ${activeClub.club}.`);
      return;
    }

    // Transfer: Club → selected member wallets
    activeClub.club -= total;
    walletState.member.available += total;

    (MEMBERS[activeClub.id] || []).forEach(m => {
      if (selectedMemberIds.has(m.id)) m.available += amount;
    });

    const count = selectedMemberIds.size;
    const isCompensate = distributeMode === 'compensate';
    const today = new Date().toISOString().slice(0, 10);
    const dateLabel = new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });

    addTx('club', {
      title: isCompensate ? 'Compensation Sent' : 'Distributed to Members',
      meta: dateLabel + ` · ${count} member${count !== 1 ? 's' : ''}`,
      amount: `-${total}`,
      amountNum: total,
      type: 'out',
      activityType: isCompensate ? 'refund' : 'distribute',
      memberId: null,
      memberName: null,
      memberIds: [...selectedMemberIds],
      date: today,
    });
    addTx('member', {
      title: isCompensate ? 'Refund' : 'Club Distribution',
      meta: dateLabel + (isCompensate ? ' · Refund from club' : ' · Received from club'),
      amount: `+${amount}`,
      type: 'in',
      txType: isCompensate ? 'refund' : 'distribute',
    });

    selectedMemberIds = new Set();
    $('#distribute-amount').value = '';
    $('#distribute-password').value = '';
    closeModal('distribute-modal');
    render();

    const badge = document.createElement('div');
    badge.style.cssText = 'position:fixed;top:70px;right:24px;background:var(--indigo-600);color:white;z-index:100;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600;animation:fadeOut 2s forwards';
    badge.textContent = isCompensate
      ? `Sent ${amount} compensation to ${count} member${count !== 1 ? 's' : ''}`
      : `Distributed ${amount} tokens to ${count} member${count !== 1 ? 's' : ''}`;
    document.body.appendChild(badge);
    setTimeout(() => badge.remove(), 2000);
  });

  // Gift modal (DSC Lab) — from action row
  $('#btn-gift').addEventListener('click', () => {
    $('#gift-club').value = activeClub.name;
    openModal('gift-modal');
  });

  // Gift buttons inside the all-clubs overview table
  document.addEventListener('click', e => {
    const btn = e.target.closest('.co-gift-btn');
    if (!btn) return;
    const club = CLUBS.find(c => c.id === btn.dataset.clubId);
    if (!club) return;
    activeClub = club;
    renderClubPicker();
    renderTotals();
    renderDscLabView();
    $('#gift-club').value = club.name;
    openModal('gift-modal');
  });

  $('#btn-gift-confirm').addEventListener('click', () => {
    const password = $('#gift-password').value;
    const amount = parseInt($('#gift-amount').value, 10);

    if (!password) {
      alert('Password required for this action');
      return;
    }
    if (!amount || amount < 1) {
      alert('Please enter a valid amount');
      return;
    }
    if (activeClub.dscLab < amount) {
      alert(`Not enough DSC Lab tokens. Need ${amount}, have ${activeClub.dscLab}.`);
      return;
    }

    // Transfer: DSC Lab → Club
    activeClub.dscLab -= amount;
    activeClub.club += amount;

    addTx('dscLab', {
      title: 'Transferred to Club',
      meta: new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' + activeClub.name,
      amount: `-${amount}`,
      type: 'out',
    });
    addTx('club', {
      title: 'DSC Lab Gift',
      meta: new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · Gift from DSC Lab',
      amount: `+${amount}`,
      amountNum: amount,
      type: 'in',
      activityType: 'gift',
      memberId: null,
      memberName: null,
      memberIds: null,
      date: new Date().toISOString().slice(0, 10),
    });

    $('#gift-amount').value = '';
    $('#gift-password').value = '';
    closeModal('gift-modal');
    render();

    const badge = document.createElement('div');
    badge.style.cssText = 'position:fixed;top:70px;right:24px;background:var(--green-500);color:white;z-index:100;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600;animation:fadeOut 2s forwards';
    badge.textContent = `Gifted ${amount} tokens to ${activeClub.name}`;
    document.body.appendChild(badge);
    setTimeout(() => badge.remove(), 2000);
  });

  // Burn modal (DSC Lab)
  $('#btn-burn').addEventListener('click', () => openModal('burn-modal'));

  $('#btn-burn-confirm').addEventListener('click', () => {
    const password = $('#burn-password').value;
    const amount = parseInt($('#burn-amount').value, 10);

    if (!password) {
      alert('Password required for this action');
      return;
    }
    if (!amount || amount < 1) {
      alert('Please enter a valid amount');
      return;
    }
    if (activeClub.dscLab < amount) {
      alert(`Not enough DSC Lab tokens. Need ${amount}, have ${activeClub.dscLab}.`);
      return;
    }

    // Burn: remove from DSC Lab, increment burned counter
    activeClub.dscLab -= amount;
    activeClub.burned += amount;

    addTx('dscLab', {
      title: 'Burned',
      meta: new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' + $('#burn-reason').value,
      amount: `-${amount}`,
      type: 'out',
    });

    $('#burn-amount').value = '';
    $('#burn-password').value = '';
    closeModal('burn-modal');
    render();

    const badge = document.createElement('div');
    badge.style.cssText = 'position:fixed;top:70px;right:24px;background:var(--red-500);color:white;z-index:100;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600;animation:fadeOut 2s forwards';
    badge.textContent = `Burned ${amount} tokens permanently`;
    document.body.appendChild(badge);
    setTimeout(() => badge.remove(), 2000);
  });

  // Populate reason selects (gift + burn; distribute is handled by openDistributeModal)
  $('#gift-reason').innerHTML = REASON_CODES.gift.map(r => `<option value="${r}">${r}</option>`).join('');
  $('#burn-reason').innerHTML = REASON_CODES.burn.map(r => `<option value="${r}">${r}</option>`).join('');
}

// --- Club filter bar + TX selection + compensate bar wiring ---
function initClubFilters() {
  $('#filter-member').addEventListener('input', e => {
    activeFilters.member = e.target.value;
    updateFilterBadge();
    renderClubTxList();
  });

  $('#filter-date-from').addEventListener('change', e => {
    activeFilters.dateFrom = e.target.value;
    updateFilterBadge();
    renderClubTxList();
  });

  $('#filter-date-to').addEventListener('change', e => {
    activeFilters.dateTo = e.target.value;
    updateFilterBadge();
    renderClubTxList();
  });

  $('#filter-amount-min').addEventListener('input', e => {
    activeFilters.amountMin = e.target.value;
    updateFilterBadge();
    renderClubTxList();
  });

  $('#filter-amount-max').addEventListener('input', e => {
    activeFilters.amountMax = e.target.value;
    updateFilterBadge();
    renderClubTxList();
  });

  $('#filter-type-chips').addEventListener('click', e => {
    const chip = e.target.closest('.type-chip');
    if (!chip) return;
    const type = chip.dataset.type;
    if (type === 'all') {
      activeFilters.types = [];
    } else {
      const idx = activeFilters.types.indexOf(type);
      if (idx === -1) activeFilters.types.push(type);
      else activeFilters.types.splice(idx, 1);
    }
    $$('.type-chip').forEach(c => {
      if (c.dataset.type === 'all') c.classList.toggle('active', activeFilters.types.length === 0);
      else c.classList.toggle('active', activeFilters.types.includes(c.dataset.type));
    });
    updateFilterBadge();
    renderClubTxList();
  });

  $('#filter-clear').addEventListener('click', e => { e.preventDefault(); clearFilters(); });

  $('#select-all-tx').addEventListener('change', e => {
    const filtered = getFilteredClubTxs();
    if (e.target.checked) filtered.forEach(tx => selectedTxIds.add(tx.id));
    else filtered.forEach(tx => selectedTxIds.delete(tx.id));
    renderClubTxList();
    updateCompensateBar();
  });

  $('#club-tx-list').addEventListener('click', e => {
    const row = e.target.closest('.tx-item[data-tx-id]');
    if (!row) return;
    const rawId = row.dataset.txId;
    const numId = parseInt(rawId, 10);
    const id = isNaN(numId) ? rawId : numId;
    if (selectedTxIds.has(id)) selectedTxIds.delete(id);
    else selectedTxIds.add(id);
    renderClubTxList();
    updateCompensateBar();
  });

  $('#compensate-clear').addEventListener('click', e => {
    e.preventDefault();
    selectedTxIds = new Set();
    $('#select-all-tx').checked = false;
    renderClubTxList();
    updateCompensateBar();
  });

  $('#btn-compensate').addEventListener('click', () => {
    const uniqueMembers = new Set();
    TX_HISTORY.club.forEach(tx => {
      if (!selectedTxIds.has(tx.id)) return;
      if (tx.memberId) uniqueMembers.add(tx.memberId);
      if (tx.memberIds) tx.memberIds.forEach(id => uniqueMembers.add(id));
    });
    if (uniqueMembers.size === 0) {
      alert('No members identified in the selected transactions. Select rows with member activity.');
      return;
    }
    const suggestion = calcSuggestedCompensation(selectedTxIds);
    openDistributeModal({
      mode: 'compensate',
      preselectedIds: [...uniqueMembers],
      amount: suggestion.amount,
      note: suggestion.note,
      perMember: suggestion.perMember,
    });
  });
}

// --- Admin Config View ---

function renderAdminView() {
  renderAdminSubNav();

  // Show/hide sections
  const sections = {
    'club-settings': '#admin-club-settings',
    'platform-settings': '#admin-platform-settings',
    'recovery': '#admin-recovery',
  };
  Object.entries(sections).forEach(([key, sel]) => {
    $(sel).style.display = key === activeAdminSection ? 'block' : 'none';
  });

  if (activeAdminSection === 'club-settings') renderClubSettings();
  if (activeAdminSection === 'platform-settings') renderPlatformSettings();
  if (activeAdminSection === 'recovery') renderRecoveryView();
}

function renderAdminSubNav() {
  $$('#admin-sub-nav .admin-sub-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === activeAdminSection);
  });
}

// --- Club Settings ---
function renderClubSettings() {
  const cfg = CLUB_CONFIG[activeClub.id] || CLUB_CONFIG.collingwood;
  $('#club-settings-club-name').textContent = activeClub.name;

  const fields = [
    { key: 'voteCost', label: 'Vote Cost', desc: 'Tokens locked when a member votes on a proposal' },
    { key: 'likeCost',  label: 'Like Cost',  desc: 'Tokens locked when a member likes/vetoes' },
    { key: 'ideaCost',  label: 'Idea Cost',  desc: 'Tokens locked when a member submits an idea (sponsor + voter)' },
  ];

  $('#club-settings-body').innerHTML = fields.map(f => {
    const val = cfg[f.key];
    const impact = calcCostImpact(val, f.key);
    return `
      <div class="settings-field">
        <div class="sf-main">
          <span class="sf-label">${f.label}</span>
          <span class="sf-desc">${f.desc}</span>
          <div class="sf-input-wrap">
            <input type="number" class="sf-input" data-config-key="${f.key}" value="${val}" min="1" max="1000">
            <span class="sf-unit">credits</span>
          </div>
          <div class="impact-preview ${impact.css}">${impact.text}</div>
        </div>
      </div>
    `;
  }).join('');

  $('#club-settings-saved').textContent = '';
}

function calcCostImpact(newCost, key) {
  const members = MEMBERS[activeClub.id] || [];
  if (members.length === 0) return { css: 'impact-ok', text: '✓ No members in this club' };

  const blocked = members.filter(m => m.available < newCost);
  if (blocked.length === 0) return { css: 'impact-ok', text: '✓ All members can afford this' };

  const names = blocked.slice(0, 3).map(m => m.name).join(', ');
  const suffix = blocked.length > 3 ? ` and ${blocked.length - 3} more` : '';
  return {
    css: 'impact-warn',
    text: `⚠ ${blocked.length} member${blocked.length !== 1 ? 's' : ''} (${names}${suffix}) ha${blocked.length === 1 ? 's' : 've'} < ${newCost} credits and cannot ${key === 'voteCost' ? 'vote' : key === 'likeCost' ? 'like' : 'submit ideas'}`,
  };
}

// --- Platform Settings ---
function renderPlatformSettings() {
  const cfg = PLATFORM_CONFIG;
  const fields = [
    {
      key: 'tokenPriceAUD', label: 'Token Price', unit: 'AUD per token',
      desc: 'Fiat price members pay via Stripe per token',
      impact: () => {
        const p = cfg.tokenPriceAUD;
        return { css: 'impact-info', text: `ℹ 100 tokens = $${(100 * p).toFixed(2)} · 500 tokens = $${(500 * p).toFixed(2)} · 1,000 tokens = $${(1000 * p).toFixed(2)}` };
      },
    },
    {
      key: 'expiryDays', label: 'Token Expiry', unit: 'days after season end',
      desc: 'Days before tokens expire after the season ends',
      impact: () => {
        const d = cfg.expiryDays;
        const end = new Date(cfg.seasonEndDate);
        const expiry = new Date(end.getTime() + d * 86400000);
        return { css: 'impact-info', text: `ℹ Expiry deadline: ${expiry.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}` };
      },
    },
    {
      key: 'distributionCap', label: 'Distribution Cap', unit: 'tokens per event',
      desc: 'Maximum tokens the club can distribute in a single event',
      impact: () => {
        const cap = cfg.distributionCap;
        const maxHist = TX_HISTORY.club
          .filter(tx => tx.activityType === 'distribute')
          .reduce((max, tx) => Math.max(max, tx.amountNum || 0), 0);
        if (maxHist === 0) return { css: 'impact-ok', text: '✓ No prior distributions to compare' };
        if (cap >= maxHist) return { css: 'impact-ok', text: `✓ Largest prior distribution was ${maxHist} tokens` };
        return { css: 'impact-warn', text: `⚠ Largest prior distribution was ${maxHist} tokens — this cap would block it` };
      },
    },
    {
      key: 'seasonEndDate', label: 'Season End Date', unit: '',
      desc: 'Date the current season ends. Expiry is calculated from this date.',
      impact: () => {
        return { css: 'impact-info', text: `ℹ Expiry deadline: tokens expire ${cfg.expiryDays} days after this date` };
      },
    },
  ];

  $('#platform-settings-body').innerHTML = fields.map(f => {
    const val = cfg[f.key];
    const impact = f.impact();
    return `
      <div class="settings-field">
        <div class="sf-main">
          <span class="sf-label">${f.label}</span>
          <span class="sf-desc">${f.desc}</span>
          <div class="sf-input-wrap">
            <input type="${f.key === 'seasonEndDate' ? 'date' : 'number'}"
                   class="sf-input"
                   data-config-key="${f.key}"
                   value="${val}"
                   ${f.key === 'tokenPriceAUD' ? 'step="0.01" min="0.01"' : ''}
                   ${f.key === 'expiryDays' ? 'min="1" max="3650"' : ''}
                   ${f.key === 'distributionCap' ? 'min="1"' : ''}>
            ${f.unit ? `<span class="sf-unit">${f.unit}</span>` : ''}
          </div>
          <div class="impact-preview ${impact.css}" id="impact-${f.key}">${impact.text}</div>
        </div>
      </div>
    `;
  }).join('');

  $('#platform-settings-saved').textContent = '';
}

function updatePlatformImpacts() {
  const cfg = PLATFORM_CONFIG;
  const impacts = {
    tokenPriceAUD: () => {
      const p = cfg.tokenPriceAUD;
      return { css: 'impact-info', text: `ℹ 100 tokens = $${(100 * p).toFixed(2)} · 500 tokens = $${(500 * p).toFixed(2)} · 1,000 tokens = $${(1000 * p).toFixed(2)}` };
    },
    expiryDays: () => {
      const d = cfg.expiryDays;
      const end = new Date(cfg.seasonEndDate);
      const expiry = new Date(end.getTime() + d * 86400000);
      return { css: 'impact-info', text: `ℹ Expiry deadline: ${expiry.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}` };
    },
    distributionCap: () => {
      const cap = cfg.distributionCap;
      const maxHist = TX_HISTORY.club
        .filter(tx => tx.activityType === 'distribute')
        .reduce((max, tx) => Math.max(max, tx.amountNum || 0), 0);
      if (maxHist === 0) return { css: 'impact-ok', text: '✓ No prior distributions to compare' };
      if (cap >= maxHist) return { css: 'impact-ok', text: `✓ Largest prior distribution was ${maxHist} tokens` };
      return { css: 'impact-warn', text: `⚠ Largest prior distribution was ${maxHist} tokens — this cap would block it` };
    },
    seasonEndDate: () => {
      return { css: 'impact-info', text: `ℹ Expiry deadline: tokens expire ${cfg.expiryDays} days after this date` };
    },
  };
  Object.entries(impacts).forEach(([key, fn]) => {
    const el = $('#impact-' + key);
    if (!el) return;
    const impact = fn();
    el.className = 'impact-preview ' + impact.css;
    el.textContent = impact.text;
  });
}

// --- Recovery Actions ---
function renderRecoveryView() {
  // Update chip active states
  $$('#rf-type-chips .rf-chip').forEach(c => {
    const type = c.dataset.type;
    if (type === 'all') c.classList.toggle('active', recoveryFilters.types.length === 0);
    else c.classList.toggle('active', recoveryFilters.types.includes(type));
  });

  // Set input values
  const els = {
    '#rf-date-from': recoveryFilters.dateFrom,
    '#rf-date-to': recoveryFilters.dateTo,
    '#rf-amount-min': recoveryFilters.amountMin,
    '#rf-error': recoveryFilters.error,
    '#rf-reason': recoveryFilters.reason,
    '#rf-context-id': recoveryFilters.contextId,
  };
  Object.entries(els).forEach(([sel, val]) => { const el = $(sel); if (el && el !== document.activeElement) el.value = val; });

  // Member results
  if (derivedMembers.length > 0) {
    renderRecoveryResults();
  } else {
    $('#recovery-results').style.display = 'none';
  }
}

function renderRecoveryResults() {
  $('#recovery-results').style.display = 'block';

  // Summary
  const totalTx = derivedMembers.reduce((s, m) => s + m.txCount, 0);
  $('#rr-summary').textContent = `${derivedMembers.length} member${derivedMembers.length !== 1 ? 's' : ''} · from ${totalTx} transaction${totalTx !== 1 ? 's' : ''}`;

  // Member table
  $('#rr-member-table').innerHTML = derivedMembers.map(m => `
    <div class="rr-member-row">
      <span class="rr-member-name">${m.name}</span>
      <span class="rr-member-tx-count">${m.txCount} transaction${m.txCount !== 1 ? 's' : ''}</span>
      <span class="rr-member-credits">${fmt(m.totalCredits)} credits affected</span>
    </div>
  `).join('');

  // Action panel
  renderRecoveryActionPanel();
}

function renderRecoveryActionPanel() {
  // Mode toggle
  $$('.rap-toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === recoveryMode));

  // Source wallet
  const sourceLabel = recoveryMode === 'distribute' ? 'Club Wallet' : 'DSC Lab Wallet';
  const sourceBalance = recoveryMode === 'distribute' ? activeClub.club : activeClub.dscLab;
  $('#rap-source').textContent = `Source: ${sourceLabel} (${fmt(sourceBalance)} available)`;

  // Reasons
  const reasons = recoveryMode === 'distribute' ? REASON_CODES.distribute : REASON_CODES.refund;
  const reasonSel = $('#rap-reason');
  if (reasonSel) reasonSel.innerHTML = reasons.map(r => `<option value="${r}">${r}</option>`).join('');

  // Button text
  $('#btn-recovery-confirm').textContent = recoveryMode === 'distribute' ? 'Confirm Distribute' : 'Confirm Refund';

  // Impact preview
  const amount = parseInt($('#rap-amount').value, 10) || 0;
  const total = derivedMembers.length * amount;
  const impactEl = $('#rap-impact');
  if (amount > 0 && derivedMembers.length > 0) {
    if (total > sourceBalance) {
      impactEl.className = 'rap-impact rap-impact-warn';
      impactEl.textContent = `⚠ Total: ${fmt(total)} credits needed · ${sourceLabel} has ${fmt(sourceBalance)} — insufficient`;
    } else {
      impactEl.className = 'rap-impact rap-impact-ok';
      impactEl.textContent = `✓ Total: ${fmt(total)} credits · ${sourceLabel} has ${fmt(sourceBalance)} · ${fmt(sourceBalance - total)} remaining after`;
    }
  } else {
    impactEl.className = 'rap-impact';
    impactEl.textContent = '';
  }
}

// --- Recovery: filter transactions and derive members ---
function findAffectedMembers() {
  const f = recoveryFilters;
  const filtered = TX_HISTORY.club.filter(tx => {
    if (f.types.length > 0 && (!tx.activityType || !f.types.includes(tx.activityType))) return false;
    if (f.dateFrom && tx.date && tx.date < f.dateFrom) return false;
    if (f.dateTo && tx.date && tx.date > f.dateTo) return false;
    const minAmt = f.amountMin !== '' ? parseInt(f.amountMin, 10) : null;
    if (minAmt !== null && tx.amountNum !== undefined && tx.amountNum < minAmt) return false;
    if (f.error && tx.errorFlag !== f.error) return false;
    if (f.reason && tx.reasonCode !== f.reason) return false;
    if (f.contextId) {
      const cid = f.contextId.toLowerCase().replace('#', '');
      if (!tx.meta || !tx.meta.toLowerCase().includes(cid)) return false;
    }
    return true;
  });

  // Derive unique members
  const memberMap = {};
  filtered.forEach(tx => {
    if (tx.memberId) {
      if (!memberMap[tx.memberId]) memberMap[tx.memberId] = { id: tx.memberId, name: tx.memberName || tx.memberId, txCount: 0, totalCredits: 0 };
      memberMap[tx.memberId].txCount++;
      memberMap[tx.memberId].totalCredits += Math.abs(tx.amountNum || 0);
    }
    if (tx.memberIds) {
      tx.memberIds.forEach(id => {
        if (!memberMap[id]) {
          const m = (MEMBERS[activeClub.id] || []).find(mb => mb.id === id);
          memberMap[id] = { id, name: m ? m.name : id, txCount: 0, totalCredits: 0 };
        }
        memberMap[id].txCount++;
        memberMap[id].totalCredits += Math.abs((tx.amountNum || 0) / tx.memberIds.length);
      });
    }
  });

  derivedMembers = Object.values(memberMap);
  renderRecoveryView();
}

// --- Admin event handlers ---
function initAdminHandlers() {
  // Sub-nav switching
  $('#admin-sub-nav').addEventListener('click', e => {
    const btn = e.target.closest('.admin-sub-nav-btn');
    if (!btn) return;
    activeAdminSection = btn.dataset.section;
    renderAdminView();
  });

  // Club Settings: live impact calculation on input
  $('#club-settings-body').addEventListener('input', e => {
    const input = e.target.closest('.sf-input');
    if (!input) return;
    const key = input.dataset.configKey;
    const val = parseInt(input.value, 10) || 0;
    const impact = calcCostImpact(val, key);
    const field = input.closest('.settings-field');
    const preview = field.querySelector('.impact-preview');
    if (preview) {
      preview.className = 'impact-preview ' + impact.css;
      preview.textContent = impact.text;
    }
  });

  // Save Club Settings
  $('#btn-save-club-settings').addEventListener('click', () => {
    const inputs = $$('#club-settings-body .sf-input');
    inputs.forEach(inp => {
      const key = inp.dataset.configKey;
      const val = parseInt(inp.value, 10) || 0;
      CLUB_CONFIG[activeClub.id][key] = val;
    });
    addTx('club', {
      title: 'Config Change',
      meta: new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · Activity costs updated',
      amount: '—',
      type: 'offchain',
      activityType: 'config_change',
    });
    const el = $('#club-settings-saved');
    el.textContent = 'Saved · ' + new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
    setTimeout(() => { el.textContent = ''; }, 3000);
    renderClubView();
  });

  // Platform Settings: live impact on input
  $('#platform-settings-body').addEventListener('input', e => {
    const input = e.target.closest('.sf-input');
    if (!input) return;
    const key = input.dataset.configKey;
    if (key === 'tokenPriceAUD') PLATFORM_CONFIG.tokenPriceAUD = parseFloat(input.value) || 0;
    if (key === 'expiryDays') PLATFORM_CONFIG.expiryDays = parseInt(input.value, 10) || 0;
    if (key === 'distributionCap') PLATFORM_CONFIG.distributionCap = parseInt(input.value, 10) || 0;
    if (key === 'seasonEndDate') PLATFORM_CONFIG.seasonEndDate = input.value;
    updatePlatformImpacts();
  });

  // Save Platform Settings
  $('#btn-save-platform-settings').addEventListener('click', () => {
    const el = $('#platform-settings-saved');
    el.textContent = 'Saved · ' + new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
    setTimeout(() => { el.textContent = ''; }, 3000);
  });

  // Recovery: type chips
  $('#rf-type-chips').addEventListener('click', e => {
    const chip = e.target.closest('.rf-chip');
    if (!chip) return;
    const type = chip.dataset.type;
    if (type === 'all') {
      recoveryFilters.types = [];
    } else {
      const idx = recoveryFilters.types.indexOf(type);
      if (idx === -1) recoveryFilters.types.push(type);
      else recoveryFilters.types.splice(idx, 1);
    }
    renderRecoveryView();
  });

  // Recovery: filter inputs
  ['#rf-date-from', '#rf-date-to', '#rf-amount-min'].forEach(sel => {
    const el = $(sel);
    if (el) {
      el.addEventListener('input', () => {
        const key = sel === '#rf-date-from' ? 'dateFrom' : sel === '#rf-date-to' ? 'dateTo' : 'amountMin';
        recoveryFilters[key] = el.value;
      });
    }
  });

  $('#rf-error').addEventListener('change', e => { recoveryFilters.error = e.target.value; });
  $('#rf-reason').addEventListener('change', e => { recoveryFilters.reason = e.target.value; });
  $('#rf-context-id').addEventListener('input', e => { recoveryFilters.contextId = e.target.value; });

  // Find Members
  $('#btn-find-members').addEventListener('click', () => findAffectedMembers());

  // Clear results
  $('#rr-clear').addEventListener('click', e => {
    e.preventDefault();
    derivedMembers = [];
    renderRecoveryView();
  });

  // Recovery mode toggle
  $('#recovery-action-panel').addEventListener('click', e => {
    const btn = e.target.closest('.rap-toggle-btn');
    if (!btn) return;
    recoveryMode = btn.dataset.mode;
    $('#rap-amount').value = '';
    renderRecoveryActionPanel();
  });

  // Amount input → live impact
  $('#rap-amount').addEventListener('input', renderRecoveryActionPanel);

  // Confirm distribute/refund
  $('#btn-recovery-confirm').addEventListener('click', () => {
    const amount = parseInt($('#rap-amount').value, 10);
    const password = $('#rap-password').value;
    const reason = $('#rap-reason').value;

    if (derivedMembers.length === 0) { alert('No members to act on. Run Find Members first.'); return; }
    if (!password) { alert('Password required for this action.'); return; }
    if (!amount || amount < 1) { alert('Please enter a valid amount per member.'); return; }

    const total = derivedMembers.length * amount;
    const isDistribute = recoveryMode === 'distribute';
    const sourceLabel = isDistribute ? 'Club Wallet' : 'DSC Lab Wallet';
    const sourceBalance = isDistribute ? activeClub.club : activeClub.dscLab;

    if (sourceBalance < total) {
      alert(`Not enough tokens. Need ${total}, ${sourceLabel} has ${sourceBalance}.`);
      return;
    }

    // Execute transfer
    const today = new Date().toISOString().slice(0, 10);
    const dateLabel = new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
    const batchId = Date.now();

    if (isDistribute) {
      activeClub.club -= total;
      walletState.member.available += total;
      (MEMBERS[activeClub.id] || []).forEach(m => {
        const found = derivedMembers.find(dm => dm.id === m.id);
        if (found) m.available += amount;
      });
    } else {
      activeClub.dscLab -= total;
      walletState.member.available += total;
      (MEMBERS[activeClub.id] || []).forEach(m => {
        const found = derivedMembers.find(dm => dm.id === m.id);
        if (found) m.available += amount;
      });
    }

    addTx('club', {
      title: isDistribute ? 'Recovery: Distributed' : 'Recovery: Refunded',
      meta: dateLabel + ` · ${derivedMembers.length} member${derivedMembers.length !== 1 ? 's' : ''} · ${reason}`,
      amount: `-${total}`,
      amountNum: total,
      type: 'out',
      activityType: isDistribute ? 'distribute' : 'refund',
      memberIds: derivedMembers.map(m => m.id),
      date: today,
      batchId,
    });

    if (!isDistribute) {
      addTx('dscLab', {
        title: 'Recovery Refund Sent',
        meta: dateLabel + ` · ${derivedMembers.length} member${derivedMembers.length !== 1 ? 's' : ''}`,
        amount: `-${total}`,
        type: 'out',
      });
    }

    addTx('member', {
      title: isDistribute ? 'Admin Distribution' : 'Admin Refund',
      meta: dateLabel + ` · ${reason}`,
      amount: `+${amount}`,
      type: 'in',
      txType: isDistribute ? 'distribute' : 'refund',
    });

    // Reset
    const actedCount = derivedMembers.length;
    derivedMembers = [];
    $('#rap-amount').value = '';
    $('#rap-password').value = '';

    render();
    renderAdminView();

    const badge = document.createElement('div');
    badge.style.cssText = 'position:fixed;top:70px;right:24px;background:var(--indigo-600);color:white;z-index:100;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600;animation:fadeOut 2s forwards';
    badge.textContent = isDistribute
      ? `Distributed ${amount} tokens to ${actedCount} members`
      : `Refunded ${amount} tokens to ${actedCount} members`;
    document.body.appendChild(badge);
    setTimeout(() => badge.remove(), 2000);
  });
}

// --- Master render ---
function render() {
  renderVisibility();
  renderDiagram();
  renderClubPicker();
  renderTotals();
  renderMemberView();
  renderClubView();
  renderDscLabView();
  renderActivityPanel();
  if (activeTab === 'admin') renderAdminView();
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initClubPicker();
  initModals();
  initActivityHandlers();
  initClubFilters();
  initAdminHandlers();
  render();

  // Add fadeOut keyframe
  const style = document.createElement('style');
  style.textContent = `@keyframes fadeOut { 0%{opacity:1} 70%{opacity:1} 100%{opacity:0} }`;
  document.head.appendChild(style);
});