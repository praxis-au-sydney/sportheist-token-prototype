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
    { id: 1, title: 'DSC Lab Gift', meta: '14 Apr 2026 · Gift reason', amount: '+5000', type: 'in' },
    { id: 2, title: 'Distributed to Members', meta: '12 Apr 2026 · 8 members', amount: '-3200', type: 'out' },
    { id: 3, title: 'DSC Lab Gift', meta: '10 Apr 2026 · Gift reason', amount: '+2000', type: 'in' },
    { id: 4, title: 'Credit Purchase', meta: '08 Apr 2026 · Stripe', amount: '+5000', type: 'in' },
    { id: 5, title: 'Distributed to Members', meta: '05 Apr 2026 · 5 members', amount: '-1800', type: 'out' },
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
      renderVisibility();
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
      renderClubPicker();
      renderTotals();
      renderClubView();
      renderDscLabView();
    });
  });
}

function renderClubPicker() {
  const btn = $('#club-picker-btn');
  btn.querySelector('.club-name').textContent = activeClub.name;

  const dots = btn.querySelector('.club-dots');
  dots.innerHTML = `
    <span>Club: ${fmt(activeClub.club)}</span>
    <span>·</span>
    <span>DSC Lab: ${fmt(activeClub.dscLab)}</span>
    <span>·</span>
    <span style="color:var(--green-500)">↑${fmt(activeClub.minted)}</span>
    <span>/</span>
    <span style="color:var(--red-500)">↓${fmt(activeClub.burned)}</span>
  `;

  $$('.club-option').forEach(opt => {
    const club = CLUBS.find(c => c.id === opt.dataset.id);
    if (!club) return;
    opt.querySelector('.club-option-name').textContent = club.name;
    opt.querySelector('.club-option-meta').innerHTML = `
      <span>Club: <strong>${fmt(club.club)}</strong></span>
      <span>DSC Lab: <strong>${fmt(club.dscLab)}</strong></span>
      <span><span class="up">↑${fmt(club.minted)}</span> / <span class="down">↓${fmt(club.burned)}</span></span>
    `;
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
  const membersAvail = walletState.member.available;
  const membersLocked = walletState.member.locked;
  const membersTotal = membersAvail + membersLocked;
  const circulating = activeClub.club + activeClub.dscLab + membersTotal;

  const cards = [
    { label: 'Club Wallet', value: fmt(activeClub.club) },
    { label: 'DSC Lab', value: fmt(activeClub.dscLab) },
    { label: 'Members', value: fmt(membersAvail) + ' available', sub: fmt(membersLocked) + ' locked' },
    { label: 'Circulating', value: fmt(circulating) },
  ];

  $$('.totals-card').forEach((card, i) => {
    card.querySelector('.totals-card-value').textContent = cards[i].value;
    card.querySelector('.totals-card-label').textContent = cards[i].label;
    const sub = card.querySelector('.totals-card-sub');
    if (sub) sub.textContent = cards[i].sub || '';
  });
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
  const clubBalance = activeClub.club;
  walletState.club.balance = activeClub.club; // keep in sync

  // Wallet
  $('#club-balance').textContent = fmt(clubBalance);

  // Transactions
  renderTxList('#club-tx-list', TX_HISTORY.club);
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
        type: 'in',
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
  $('#btn-distribute').addEventListener('click', () => openModal('distribute-modal'));

  // Re-auth flow for distribute
  $('#btn-distribute-confirm').addEventListener('click', () => {
    const password = $('#distribute-password').value;
    const amount = parseInt($('#distribute-amount').value, 10);

    if (!password) {
      alert('Password required for this action');
      return;
    }
    if (!amount || amount < 1) {
      alert('Please enter a valid amount per member');
      return;
    }
    if (activeClub.club < amount) {
      alert(`Not enough club tokens. Need ${amount}, have ${activeClub.club}.`);
      return;
    }

    // Transfer: Club → Member available
    activeClub.club -= amount;
    walletState.member.available += amount;

    addTx('club', {
      title: 'Distributed to Members',
      meta: new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · Member reward',
      amount: `-${amount}`,
      type: 'out',
    });
    addTx('member', {
      title: 'Club Distribution',
      meta: new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · Received from club',
      amount: `+${amount}`,
      type: 'in',
    });

    $('#distribute-amount').value = '';
    $('#distribute-password').value = '';
    closeModal('distribute-modal');
    render();

    const badge = document.createElement('div');
    badge.style.cssText = 'position:fixed;top:70px;right:24px;background:var(--indigo-600);color:white;z-index:100;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600;animation:fadeOut 2s forwards';
    badge.textContent = `Distributed ${amount} tokens to members`;
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
      type: 'in',
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

  // Populate reason selects
  $('#distribute-reason').innerHTML = REASON_CODES.distribute.map(r => `<option value="${r}">${r}</option>`).join('');
  $('#gift-reason').innerHTML = REASON_CODES.gift.map(r => `<option value="${r}">${r}</option>`).join('');
  $('#burn-reason').innerHTML = REASON_CODES.burn.map(r => `<option value="${r}">${r}</option>`).join('');
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
  render();

  // Add fadeOut keyframe
  const style = document.createElement('style');
  style.textContent = `@keyframes fadeOut { 0%{opacity:1} 70%{opacity:1} 100%{opacity:0} }`;
  document.head.appendChild(style);
});