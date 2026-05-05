/* ============================================
   SportHeist Token Flow Prototype — app.js
   ============================================ */

'use strict';

// --- Mock data ---
// Conservation check: minted − burned = club + dscLab + members
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
    { id: 1, title: 'Credit Top Up', meta: '14 Apr 2026 · Stripe', amount: '+200', type: 'in' },
    { id: 2, title: 'Vote: Support', meta: '12 Apr 2026 · Proposal #88', amount: '-50', type: 'out', locked: false },
    { id: 3, title: 'Idea Lapsed', meta: '10 Apr 2026 · Idea #23', amount: '+50', type: 'in', note: 'Voter tokens returned' },
    { id: 4, title: 'Like became Vote', meta: '08 Apr 2026 · Proposal #85', amount: '-25', type: 'out', locked: true },
    { id: 5, title: 'Credit Top Up', meta: '05 Apr 2026 · Stripe', amount: '+100', type: 'in' },
    { id: 6, title: 'Proposal Completed', meta: '03 Apr 2026 · Proposal #82', amount: '-50', type: 'out', locked: false },
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

  // Ecosystem diagram: DSC Lab only
  $('#ecosystem-diagram').style.display = isDscLab ? 'block' : 'none';

  // Club picker: Club + DSC Lab
  $('#club-picker-wrap').style.display = (isClub || isDscLab) ? 'block' : 'none';

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
// Conservation: minted − burned = club + dscLab + membersAvail + membersLocked
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
function txIcon(type) {
  const map = { in: 'in', out: 'out', locked: 'locked', offchain: 'offchain' };
  return map[type] || 'offchain';
}

function renderTxList(selector, txs) {
  const list = $(selector);
  if (!txs || txs.length === 0) {
    list.innerHTML = '<div class="empty-state">No transactions yet</div>';
    return;
  }
  list.innerHTML = txs.map(tx => `
    <div class="tx-item">
      <div class="tx-icon ${txIcon(tx.type)}">${tx.type === 'in' ? '↑' : tx.type === 'out' ? '↓' : '○'}</div>
      <div class="tx-info">
        <div class="tx-title">${tx.title}</div>
        <div class="tx-meta">${tx.meta}${tx.note ? ' · ' + tx.note : ''}</div>
      </div>
      <div class="tx-amount ${tx.amount.startsWith('+') ? 'positive' : 'negative'}">${tx.amount}</div>
    </div>
  `).join('');
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

// --- DSC Lab View ---
function renderDscLabView() {
  const dscBalance = activeClub.dscLab;

  // Wallet
  $('#dsclab-balance').textContent = fmt(dscBalance);
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
const ACTIVITY_COSTS = { idea: 20, vote: 50, like: 10 };
const ACTIVITY_LABELS = { idea: 'Idea', vote: 'Proposal', like: 'Like to Veto' };

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
  $('#btn-start-activity').addEventListener('click', () => openModal('activity-modal'));

  $('#btn-start-activity-confirm').addEventListener('click', () => {
    const type = $('#activity-type').value;
    const desc = $('#activity-desc').value;
    const cost = ACTIVITY_COSTS[type] || 0;

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
      note: 'Tokens moved to Locked',
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
      addTx('member', { title: `${ACTIVITY_LABELS[a.type]} Completed`, meta: 'Tokens spent → DSC Lab', amount: `-${a.cost}`, type: 'out' });
    } else if (action === 'vetoed') {
      walletState.member.available += a.cost;
      walletState.member.locked -= a.cost;
      addTx('member', { title: `${ACTIVITY_LABELS[a.type]} Vetoed`, meta: 'Tokens unlocked', amount: `+${a.cost}`, type: 'in' });
    } else if (action === 'lapsed') {
      const half = Math.floor(a.cost / 2);
      walletState.member.available += a.cost - half;
      walletState.member.locked -= a.cost;
      activeClub.dscLab += half;
      addTx('member', { title: `${ACTIVITY_LABELS[a.type]} Lapsed`, meta: `${half} sponsor tokens forfeited`, amount: `+${a.cost - half}`, type: 'in' });
    } else if (action === 'cancelled') {
      walletState.member.locked -= a.cost;
      activeClub.dscLab += a.cost;
      addTx('member', { title: `${ACTIVITY_LABELS[a.type]} Cancelled`, meta: 'Sponsor forfeit → DSC Lab', amount: `-${a.cost}`, type: 'out' });
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

// --- Open distribute/compensate modal ---
function openDistributeModal(options = {}) {
  const mode = options.mode || 'distribute';
  distributeMode = mode;

  $('#distribute-modal .modal-title').textContent = mode === 'compensate' ? 'Compensate Members' : 'Distribute to Members';
  $('#btn-distribute-confirm').textContent = mode === 'compensate' ? 'Send Compensation' : 'Distribute Tokens';

  const reasons = mode === 'compensate' ? REASON_CODES.refund : REASON_CODES.distribute;
  $('#distribute-reason').innerHTML = reasons.map(r => `<option value="${r}">${r}</option>`).join('');

  selectedMemberIds = new Set(options.preselectedIds || []);
  $('#member-search').value = '';
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

  wrap.innerHTML = filtered.map(m => `
    <div class="member-row${selectedMemberIds.has(m.id) ? ' selected' : ''}" data-member-id="${m.id}">
      <input type="checkbox" ${selectedMemberIds.has(m.id) ? 'checked' : ''} style="cursor:pointer;flex-shrink:0;" tabindex="-1">
      <span class="member-row-name">${m.name}</span>
      <span class="member-row-balance">${fmt(m.available)} avail</span>
    </div>
  `).join('');
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
      title: isCompensate ? 'Compensation Received' : 'Club Distribution',
      meta: dateLabel + (isCompensate ? ' · Refund from club' : ' · Received from club'),
      amount: `+${amount}`,
      type: 'in',
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

  // Gift modal (DSC Lab)
  $('#btn-gift').addEventListener('click', () => {
    $('#gift-club').value = activeClub.name;
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
  $('#btn-filter-toggle').addEventListener('click', () => {
    const bar = $('#club-filter-bar');
    bar.style.display = bar.style.display === 'none' ? 'block' : 'none';
  });

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
    openDistributeModal({ mode: 'compensate', preselectedIds: [...uniqueMembers] });
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
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initClubPicker();
  initModals();
  initActivityHandlers();
  initClubFilters();
  render();

  // Add fadeOut keyframe
  const style = document.createElement('style');
  style.textContent = `@keyframes fadeOut { 0%{opacity:1} 70%{opacity:1} 100%{opacity:0} }`;
  document.head.appendChild(style);
});