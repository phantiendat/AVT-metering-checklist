
        /* ============================================
           JAVASCRIPT - Application Logic
           ============================================

           DATA STRUCTURE:
           - initialChecklistData: Default checklist categories and tasks
           - SessionStorage keys: gas_metering_session_*

           AUTHENTICATION:
           - authenticate(role): Login with role (admin/client/view)
           - logout(): Clear session and reload

           MAIN FUNCTIONS:
           - renderChecklist(): Render all categories and tasks
           - updateProgress(): Calculate and display completion %
           - addCategory(): Add new category (admin only)
           - editCategory(): Edit category name (admin only)
           - deleteCategory(): Remove category (admin only)
           - addTask(): Add task to category (admin only)
           - deleteTask(): Remove task (admin only)
           - toggleTask(): Check/uncheck task
           - resetChecklist(): Clear all checked tasks

           FIREBASE REAL-TIME COLLABORATION:
           - Firebase Realtime Database for multi-user sync
           - Session-based collaboration with shareable URLs
        */

        // ============================================
        // FIREBASE CONFIGURATION
        // ============================================
        // TODO: Replace with your Firebase project config from console.firebase.google.com
        const firebaseConfig = {
  	apiKey: "AIzaSyB1JPEDWO6wqhf4Q353u4lDuGs6_C4hUzk",
  	authDomain: "avt-metering-checklist.firebaseapp.com",
  	databaseURL: "https://avt-metering-checklist-default-rtdb.asia-southeast1.firebasedatabase.app",
  	projectId: "avt-metering-checklist",
  	storageBucket: "avt-metering-checklist.firebasestorage.app",
  	messagingSenderId: "893770928066",
  	appId: "1:893770928066:web:2d98dd93794ddfbe66905b"
	};


        let db = null;
        let currentSessionId = null;
        let isFirebaseEnabled = false;

        // Initialize Firebase if config is valid
        try {
            if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
                firebase.initializeApp(firebaseConfig);
                db = firebase.database();
                isFirebaseEnabled = true;
                console.log("Firebase initialized successfully");
            }
        } catch (error) {
            console.warn("Firebase not configured. Running in local mode.", error);
        }

        const initialChecklistData = [
            {
                id: "cat_1",
                title: "Pre-Verification Checks",
                tasks: [
                    { id: "task_1_1", name: "Safety induction & permit obtained" },
                    { id: "task_1_2", name: "Calibration equipment verified & ready" },
                    { id: "task_1_3", name: "Metering system stable for testing" }
                ]
            },
            {
                id: "cat_2",
                title: "Flow Transmitter (FT) Verification",
                tasks: [
                    { id: "task_2_1", name: "FT1 - FC1 verification" },
                    { id: "task_2_2", name: "FT1 - FC2 verification" },
                    { id: "task_2_3", name: "FT2 - FC1 verification" },
                    { id: "task_2_4", name: "FT2 - FC2 verification" }
                ]
            },
            {
                id: "cat_3",
                title: "Temperature Transmitter (TT) Verification",
                tasks: [
                    { id: "task_3_1", name: "TT1 - FC1 verification" },
                    { id: "task_3_2", name: "TT1 - FC2 verification" },
                    { id: "task_3_3", name: "TT2 - FC1 verification" },
                    { id: "task_3_4", name: "TT2 - FC2 verification" }
                ]
            },
            {
                id: "cat_4",
                title: "Pressure Transmitter (PT) Verification",
                tasks: [
                    { id: "task_4_1", name: "PT1 - FC1 verification" },
                    { id: "task_4_2", name: "PT1 - FC2 verification" },
                    { id: "task_4_3", name: "PT2 - FC1 verification" },
                    { id: "task_4_4", name: "PT2 - FC2 verification" }
                ]
            },
            {
                id: "cat_5",
                title: "Gas Chromatograph (GC) & MA Verification",
                tasks: [
                    { id: "task_5_1", name: "GC1 verification" },
                    { id: "task_5_2", name: "GC2 verification" },
                    { id: "task_5_3", name: "MA verification" }
                ]
            },
            {
                id: "cat_6",
                title: "Finalization",
                tasks: [
                    { id: "task_6_1", name: "All verification data correctly saved" },
                    { id: "task_6_2", name: "Test sheets signed and uploaded" },
                    { id: "task_6_3", name: "Site left in original condition" }
                ]
            }
        ];

        let appState = {};
        let currentData = [];
        let currentUserRole = null; // 'client' or 'admin'
        let resetStep = 0;
        let actionContext = { type: '', catId: '', taskId: '' };
        let notesState = {};          // { 'task-{id}' | 'cat-{id}': { text, updatedAt, updatedBy } }
        let currentNoteTarget = null; // { type:'task'|'cat', id, title }

        // DOM Cache - Performance optimization to avoid repeated queries
        const domCache = {
            // Main containers
            categoriesContainer: null,
            sidebar: null,
            overlay: null,
            addCategoryContainer: null,

            // Dashboard metrics
            overallPercent: null,
            overallProgress: null,
            checklistTotal: null,
            checklistCount: null,
            checklistProgress: null,
            evidenceTotal: null,
            evidenceCount: null,
            evidenceProgress: null,

            // Modals
            authModal: null,
            actionModal: null,
            saveTemplateModal: null,
            templateLibraryModal: null,
            analyticsModal: null,

            // Auth modal elements
            username: null,
            password: null,
            authError: null,

            // Action modal elements
            actionTitle: null,
            actionInput: null,
            actionConfirmText: null,
            actionSubmitBtn: null,

            // Template modal elements
            templateName: null,
            templateDescription: null,
            templateList: null,

            // Session info
            sessionIdDisplay: null,
            shareButton: null,
            topbarSessionInfo: null,
            topbarSessionId: null,
            topbarUserRole: null,

            // Buttons
            saveTemplateBtn: null,
            loadTemplateBtn: null,
            exportPdfBtn: null,
            viewAnalyticsBtn: null,
            resetBtn: null,

            // Print elements
            printSessionInfo: null,
            printDateInfo: null,

            // Initialize all cached elements
            init() {
                // Main containers
                this.categoriesContainer = document.getElementById('categories-container');
                this.sidebar = document.getElementById('sidebar');
                this.overlay = document.getElementById('overlay');
                this.addCategoryContainer = document.getElementById('add-category-container');

                // Dashboard metrics
                this.overallPercent = document.getElementById('overall-percent');
                this.overallProgress = document.getElementById('overall-progress');
                this.checklistTotal = document.getElementById('checklist-total');
                this.checklistCount = document.getElementById('checklist-count');
                this.checklistProgress = document.getElementById('checklist-progress');
                this.evidenceTotal = document.getElementById('evidence-total');
                this.evidenceCount = document.getElementById('evidence-count');
                this.evidenceProgress = document.getElementById('evidence-progress');

                // Modals
                this.authModal = document.getElementById('auth-modal');
                this.actionModal = document.getElementById('action-modal');
                this.saveTemplateModal = document.getElementById('save-template-modal');
                this.templateLibraryModal = document.getElementById('template-library-modal');
                this.analyticsModal = document.getElementById('analytics-modal');

                // Auth modal elements
                this.username = document.getElementById('username');
                this.password = document.getElementById('password');
                this.authError = document.getElementById('auth-error');

                // Action modal elements
                this.actionTitle = document.getElementById('action-title');
                this.actionInput = document.getElementById('action-input');
                this.actionConfirmText = document.getElementById('action-confirm-text');
                this.actionSubmitBtn = document.getElementById('action-submit-btn');

                // Template modal elements
                this.templateName = document.getElementById('template-name');
                this.templateDescription = document.getElementById('template-description');
                this.templateList = document.getElementById('template-list');

                // Session info
                this.sessionIdDisplay = document.getElementById('session-id-display');
                this.shareButton = document.getElementById('share-button');
                this.topbarSessionInfo = document.getElementById('topbar-session-info');
                this.topbarSessionId = document.getElementById('topbar-session-id');
                this.topbarUserRole = document.getElementById('topbar-user-role');

                // Buttons
                this.saveTemplateBtn = document.getElementById('save-template-btn');
                this.loadTemplateBtn = document.getElementById('load-template-btn');
                this.exportPdfBtn = document.getElementById('export-pdf-btn');
                this.viewAnalyticsBtn = document.getElementById('view-analytics-btn');
                this.resetBtn = document.getElementById('reset-btn');

                // Print elements
                this.printSessionInfo = document.getElementById('print-session-info');
                this.printDateInfo = document.getElementById('print-date-info');
            }
        };

        // Firebase sync debouncing - Performance optimization
        let firebaseSyncTimeout = null;
        let dashboardUpdateTimeout = null;

        function debouncedFirebaseSync() {
            if (!isFirebaseEnabled || !currentSessionId || currentUserRole === 'view') return;

            clearTimeout(firebaseSyncTimeout);
            firebaseSyncTimeout = setTimeout(() => {
                db.ref(`sessions/${currentSessionId}/checklist`).set(currentData)
                    .catch(error => errorHandler.handleFirebaseError(error, 'Lưu checklist'));
                db.ref(`sessions/${currentSessionId}/checked`).set(appState)
                    .catch(error => errorHandler.handleFirebaseError(error, 'Lưu tiến độ'));
            }, 300);
        }

        function debouncedDashboardUpdate() {
            clearTimeout(dashboardUpdateTimeout);
            dashboardUpdateTimeout = setTimeout(() => {
                updateDashboard();
            }, 150);
        }

        // Track per-category update requests
        let pendingCatIds = new Set();
        let uiUpdateRafId = null;

        function debouncedUIUpdate(catId) {
            if (catId) pendingCatIds.add(catId);
            if (uiUpdateRafId) return; // already scheduled
            uiUpdateRafId = requestAnimationFrame(() => {
                // Only update progress counters — never rebuild DOM
                if (pendingCatIds.size > 0) {
                    pendingCatIds.forEach(id => updateSingleCategoryProgress(id));
                    pendingCatIds.clear();
                } else {
                    updateCategoryProgress();
                }
                updateDashboard();
                uiUpdateRafId = null;
            });
        }

        // ============================================
        // LOADING STATE MANAGEMENT
        // ============================================
        const loadingState = {
            overlay: null,

            init() {
                this.overlay = document.createElement('div');
                this.overlay.className = 'loading-overlay';
                this.overlay.innerHTML = `
                    <div class="loading-spinner"></div>
                    <div class="loading-text" id="loading-text">Đang tải...</div>
                `;
                document.body.appendChild(this.overlay);
            },

            show(message = 'Đang tải...') {
                if (this.overlay) {
                    document.getElementById('loading-text').textContent = message;
                    this.overlay.classList.add('active');
                }
            },

            hide() {
                if (this.overlay) {
                    this.overlay.classList.remove('active');
                }
            }
        };

        // Toast system defined below as window.showToast IIFE (line ~4826)

        // ============================================
        // OFFLINE DETECTION
        // ============================================
        window.addEventListener('online', () => {
            const indicator = document.querySelector('.offline-indicator');
            if (indicator) indicator.classList.remove('show');
            showToast('success', '🌐 Online', 'Đã kết nối lại');
        });

        window.addEventListener('offline', () => {
            let indicator = document.querySelector('.offline-indicator');
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.className = 'offline-indicator';
                indicator.innerHTML = '<i class="fas fa-wifi" style="margin-right: 8px;"></i>Bạn đang offline. Thay đổi sẽ được đồng bộ khi có kết nối.';
                document.body.appendChild(indicator);
            }
            indicator.classList.add('show');
        });

        // ============================================
        // ERROR HANDLER
        // ============================================
        const errorHandler = {
            logError(error, context = '') {
                console.error(`[AVT Error] ${context}:`, error);

                // Track error in analytics
                if (analyticsData) {
                    analyticsData.actions.push({
                        type: 'error',
                        context,
                        message: error.message,
                        timestamp: Date.now()
                    });
                }
            },

            showError(message, error = null) {
                if (error) this.logError(error, message);
                showToast(message, 'error', 5000);
            },

            handleFirebaseError(error, operation = 'Firebase operation') {
                const userMessage = {
                    'PERMISSION_DENIED': 'Bạn không có quyền thực hiện thao tác này.',
                    'NETWORK_ERROR': 'Lỗi mạng. Vui lòng kiểm tra kết nối.',
                    'DISCONNECTED': 'Mất kết nối đến server. Đang thử lại...'
                }[error.code] || `${operation} thất bại. Vui lòng thử lại.`;

                this.showError(userMessage, error);
            }
        };

        // ============================================
        // MODAL MANAGER
        // ============================================
        const modalManager = {
            modals: {},

            register(modalId) {
                const modal = document.getElementById(modalId);
                if (modal) {
                    this.modals[modalId] = modal;
                }
            },

            show(modalId) {
                const modal = this.modals[modalId];
                if (modal) {
                    modal.style.display = 'flex';
                    // Trap focus for accessibility
                    const firstInput = modal.querySelector('input, button, textarea');
                    if (firstInput) firstInput.focus();
                }
            },

            hide(modalId) {
                const modal = this.modals[modalId];
                if (modal) {
                    modal.style.display = 'none';
                }
            },

            hideAll() {
                Object.values(this.modals).forEach(modal => {
                    modal.style.display = 'none';
                });
            }
        };

        // ============================================
        // PROGRESS CALCULATION
        // ============================================
        function calculateProgress() {
            let totalTasks = 0;
            let checklistCompleted = 0;
            let evidenceCompleted = 0;
            let fullyCompletedTasks = 0;

            currentData.forEach(cat => {
                if (!cat.tasks) cat.tasks = [];
                cat.tasks.forEach(task => {
                    totalTasks++;
                    const state = appState[task.id] || { checklist: false, evidence: false };
                    if (state.checklist) checklistCompleted++;
                    if (state.evidence) evidenceCompleted++;
                    if (state.checklist && state.evidence) fullyCompletedTasks++;
                });
            });

            return {
                totalTasks,
                checklistCompleted,
                evidenceCompleted,
                fullyCompletedTasks,
                overallPercent: totalTasks === 0 ? '0.0' : (fullyCompletedTasks / totalTasks * 100).toFixed(1),
                checklistPercent: totalTasks === 0 ? 0 : Math.round((checklistCompleted / totalTasks) * 100),
                evidencePercent: totalTasks === 0 ? 0 : Math.round((evidenceCompleted / totalTasks) * 100)
            };
        }

        // ============================================
        // EVENT DELEGATION SYSTEM
        // ============================================
        function setupEventDelegation() {
            // Delegate all button clicks in categories container
            domCache.categoriesContainer.addEventListener('click', (e) => {
                const button = e.target.closest('[data-action]');
                if (!button) return;

                const action = button.dataset.action;
                const catId = button.dataset.catId;
                const taskId = button.dataset.taskId;

                switch(action) {
                    case 'edit-category': editCategory(catId); break;
                    case 'delete-category': deleteCategory(catId); break;
                    case 'edit-task': editTask(catId, taskId); break;
                    case 'delete-task': deleteTask(catId, taskId); break;
                    case 'add-task': addTask(catId); break;
                }
            });

            // Delegate checkbox changes
            // Enable event listener with optimized updates
            domCache.categoriesContainer.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox' && e.target.dataset.taskId) {
                    toggleTaskProperty(e.target.dataset.taskId, e.target.dataset.property);
                }
            });

            // Delegate add category button
            if (domCache.addCategoryContainer) {
                domCache.addCategoryContainer.addEventListener('click', (e) => {
                    const button = e.target.closest('[data-action="add-category"]');
                    if (button) addCategory();
                });
            }
        }

        // Analytics tracking
        let analyticsData = {
            sessionStart: null,
            actions: [],
            completionHistory: []
        };

        // ============================================
        // SESSION MANAGEMENT
        // ============================================
        function generateSessionId() {
            return Math.random().toString(36).substring(2, 8).toUpperCase();
        }

        function getSessionFromURL() {
            const params = new URLSearchParams(window.location.search);
            return params.get('session');
        }

        function createNewSession() {
            if (!isFirebaseEnabled) {
                alert('Firebase not configured. Please add your Firebase config to enable collaboration.');
                return;
            }
            closeTemplateLibrary();
            // Detach old listeners & reset state before creating new session
            teardownFirebaseListeners();
            appState = {};
            currentData = JSON.parse(JSON.stringify(initialChecklistData));
            currentSessionId = generateSessionId();
            const sessionRef = db.ref(`sessions/${currentSessionId}`);
            sessionRef.set({
                metadata: {
                    createdAt: Date.now(),
                    createdBy: currentUserRole || 'admin'
                },
                checklist: initialChecklistData,
                checked: {}
            });
            saveSessionToHistory(currentSessionId);
            updateURLWithSession();
            showSessionInfo();
            trackAction('session_new', { sessionId: currentSessionId });
        }

        function joinSession(sessionId) {
            if (!isFirebaseEnabled) return;
            // 1. Detach listeners from previous session immediately
            teardownFirebaseListeners();
            // 2. Clear in-memory state so old data never bleeds into new session UI
            appState = {};
            currentData = JSON.parse(JSON.stringify(initialChecklistData));
            // 3. Switch session
            currentSessionId = sessionId;
            saveSessionToHistory(sessionId);
            updateURLWithSession();
            // 4. Attach fresh listeners — Firebase will push the real data
            setupFirebaseListeners();
            showSessionInfo();
        }

        function updateURLWithSession() {
            const url = new URL(window.location);
            url.searchParams.set('session', currentSessionId);
            window.history.pushState({}, '', url);
        }

        function showSessionInfo() {
            if (domCache.topbarSessionInfo && domCache.topbarSessionId && currentSessionId) {
                domCache.topbarSessionId.textContent = currentSessionId;
                domCache.topbarSessionInfo.style.display = 'flex';
            }

            // ── Update topbar template name ──
            const tplNameEl = document.getElementById('topbar-template-name');
            if (tplNameEl) {
                const safeName = escapeHtml(window.currentTemplateName || '');
                const fullName = safeName && safeName !== 'Unknown Template'
                    ? `[Current Template: ${safeName}]`
                    : '';
                // Wrap in .tpl-inner so the marquee animation can scroll the text
                tplNameEl.innerHTML = fullName
                    ? `<span class="tpl-inner">${fullName}</span>`
                    : '';
                tplNameEl.title = fullName; // Hover tooltip shows full name
            }
            // ── Tier 4: Sync session into sidebar pill ──
            const pillSession = document.getElementById('sidebar-pill-session');
            if (pillSession && currentSessionId) {
                pillSession.textContent = 'Session: ' + currentSessionId;
            }
        }

        // ── Draws attention to the topbar template label: amber glow + marquee scroll ──
        function flashTemplateHighlight() {
            const el = document.getElementById('topbar-template-name');
            if (!el || !el.textContent.trim()) return;
            // Clear any in-flight animation first
            el.classList.remove('tpl-highlight');
            // Delay so the screen settles and the user reads the label before it animates
            setTimeout(() => {
                // Measure how much the text overflows the visible container
                const inner = el.querySelector('.tpl-inner');
                if (inner) {
                    // inner.scrollWidth = full natural text width (unclipped)
                    // el.clientWidth   = visible container width (inc. padding)
                    const overflow = inner.scrollWidth - el.clientWidth;
                    el.style.setProperty('--tpl-scroll', overflow > 0 ? `-${overflow}px` : '0px');
                }
                // Force reflow so animation restarts cleanly if called twice
                void el.offsetWidth;
                el.classList.add('tpl-highlight');
                // Auto-clean after animation completes
                el.addEventListener('animationend', () => {
                    el.classList.remove('tpl-highlight');
                    el.style.removeProperty('--tpl-scroll');
                }, { once: true });
            }, 2500); // 2.5s delay — let UI settle, then draw attention
        }

        // ── Draws attention to the sidebar user pill after login/re-login ──
        function flashUserPillHighlight() {
            const pill = document.getElementById('sidebar-user-pill');
            if (!pill || pill.style.display === 'none') return;
            // Clear any in-flight animation
            pill.classList.remove('user-pill-highlight');
            setTimeout(() => {
                void pill.offsetWidth; // force reflow
                pill.classList.add('user-pill-highlight');
                pill.addEventListener('animationend', () => {
                    pill.classList.remove('user-pill-highlight');
                }, { once: true });
            }, 2500); // same 2.5s delay as template highlight
        }

        function copyShareLink() {
            const shareURL = `${window.location.origin}${window.location.pathname}?session=${currentSessionId}`;
            navigator.clipboard.writeText(shareURL).then(() => {
                alert('Share link copied to clipboard!');
            });
        }

        // ============================================
        // SESSION HISTORY & RESUME
        // ============================================
        function saveSessionToHistory(sessionId, templateName) {
            if (!sessionId) return;
            try {
                const raw = localStorage.getItem('avt_session_history') || '[]';
                let history = JSON.parse(raw);
                // Preserve existing templateName if re-saving the same session without a name
                const existing = history.find(s => s.id === sessionId);
                const resolvedName = templateName || (existing && existing.templateName) || null;
                history = history.filter(s => s.id !== sessionId); // remove duplicate
                history.unshift({ id: sessionId, date: Date.now(), role: currentUserRole || 'admin', templateName: resolvedName });
                localStorage.setItem('avt_session_history', JSON.stringify(history.slice(0, 5)));
                localStorage.setItem('avt_last_session', sessionId);
            } catch(e) { /* silent */ }
        }

        function formatSessionDate(ts) {
            const d = new Date(ts), now = new Date();
            const diffH = Math.floor((now - d) / 3600000);
            const diffD = Math.floor((now - d) / 86400000);
            if (diffH < 1)  return 'Just now';
            if (diffH < 24) return diffH + 'h ago';
            if (diffD === 1) return 'Yesterday';
            if (diffD < 7)  return diffD + ' days ago';
            return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
        }

        // ── Fetch completion % from Firebase for a session (returns Promise<number|null>) ──
        // Reads only `metadata/overallProgress` — a single number persisted by
        // updateDashboard() on every progress change. Fast & cheap (1 small field).
        function fetchSessionProgress(sessionId) {
            if (!isFirebaseEnabled || !sessionId) return Promise.resolve(null);
            return db.ref(`sessions/${sessionId}/metadata/overallProgress`)
                .once('value')
                .then(snap => {
                    const val = snap.val();
                    if (val === null || val === undefined) return null;
                    // Preserve 1 decimal place — same format as the main layout gauge
                    return parseFloat(Number(val).toFixed(1));
                })
                .catch(() => null);
        }

        // ── Apply progress bar + pct to a set of elements ──
        function applyProgressUI(fillEl, pctEl, pct) {
            if (pct === null) {
                if (pctEl) pctEl.textContent = '—';
                return;
            }
            const isDone = pct >= 100;
            if (fillEl) {
                fillEl.style.width = pct + '%';
                if (isDone) fillEl.classList.add('done');
                else fillEl.classList.remove('done');
            }
            if (pctEl) {
                // Display with 1 decimal place (e.g. 9.8%) matching main layout gauge
                pctEl.textContent = Number(pct).toFixed(1) + '%';
                if (isDone) pctEl.classList.add('done');
                else pctEl.classList.remove('done');
            }
        }

        function showResumeModal() {
            if (!isFirebaseEnabled) { showTemplateLibrary(); return; }
            let history = [];
            try { history = JSON.parse(localStorage.getItem('avt_session_history') || '[]'); } catch(e) {}

            // view role: never redirect to Template Library — always show the ID input modal
            if (history.length === 0 && currentUserRole !== 'view') {
                showTemplateLibrary();
                return;
            }

            const modal = document.getElementById('resume-modal');
            const lastBlock = document.getElementById('resume-last-block');
            const historyBlock = document.getElementById('resume-history-block');

            // Last session card
            const last = history[0];
            document.getElementById('resume-last-id').textContent = last.id;
            document.getElementById('resume-last-date').textContent = formatSessionDate(last.date);
            // Template name badge
            const lastTplEl = document.getElementById('resume-last-template');
            const lastTplText = document.getElementById('resume-last-template-text');
            if (last.templateName) {
                lastTplText.textContent = last.templateName;
                lastTplEl.style.display = 'block';
            } else {
                lastTplEl.style.display = 'none';
            }
            // Reset last session progress to loading state
            const lastFill = document.getElementById('resume-last-progress-fill');
            const lastPct  = document.getElementById('resume-last-progress-pct');
            if (lastFill) lastFill.style.width = '0%';
            if (lastPct)  lastPct.textContent  = '\u2026';
            lastBlock.style.display = 'block';

            // Older sessions
            const others = history.slice(1, 3);
            if (others.length > 0) {
                document.getElementById('resume-history-list').innerHTML = others.map((s, i) => `
                    <div class="session-history-item">
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;align-items:baseline;gap:9px;flex-wrap:wrap;">
                                <span class="session-history-id">${s.id}</span>
                                <span class="session-history-date">${formatSessionDate(s.date)}</span>
                            </div>
                            ${s.templateName ? `<div><span class="session-history-tpl">📋 ${s.templateName}</span></div>` : ''}
                            <div class="session-progress-wrap">
                                <div class="session-progress-track">
                                    <div class="session-progress-fill" id="rh-fill-${i}"></div>
                                </div>
                                <span class="session-progress-pct" id="rh-pct-${i}">&hellip;</span>
                            </div>
                        </div>
                        <button class="modal-btn modal-btn-primary" style="padding:5px 14px;font-size:12px;min-width:72px;flex-shrink:0;"
                            onclick="resumeSessionById('${s.id}')">&#9654; Resume</button>
                    </div>
                `).join('');
                historyBlock.style.display = 'block';
            } else {
                historyBlock.style.display = 'none';
            }

            // Reset input & error
            document.getElementById('resume-session-input').value = '';
            document.getElementById('resume-error').textContent = '';

            // Adapt modal for view role: hide 'Start New Session', update subtitle
            const startFreshBtn = document.querySelector('#resume-modal .modal-btn-secondary');
            const resumeSubtitle = document.querySelector('#resume-modal .modal-subtitle');
            if (currentUserRole === 'view') {
                if (startFreshBtn) startFreshBtn.style.display = 'none';
                if (resumeSubtitle) resumeSubtitle.textContent = 'Enter a Session ID to join an existing checklist session.';
            } else {
                if (startFreshBtn) startFreshBtn.style.display = '';
                if (resumeSubtitle) resumeSubtitle.textContent = 'Pick up where you left off, or start a fresh checklist.';
            }

            modal.style.display = 'flex';

            // ── Async: fetch progress for all visible sessions, fill bars as data arrives ──
            fetchSessionProgress(last.id).then(pct => {
                applyProgressUI(
                    document.getElementById('resume-last-progress-fill'),
                    document.getElementById('resume-last-progress-pct'),
                    pct
                );
            });
            others.forEach((s, i) => {
                fetchSessionProgress(s.id).then(pct => {
                    applyProgressUI(
                        document.getElementById(`rh-fill-${i}`),
                        document.getElementById(`rh-pct-${i}`),
                        pct
                    );
                });
            });
        }

        function resumeSessionById(sessionId) {
            sessionId = (sessionId || '').trim().toUpperCase();
            if (sessionId.length < 4) { showResumeError('Please enter a valid Session ID.'); return; }
            document.getElementById('resume-error').textContent = '';

            // Check Firebase for existence
            const modal = document.getElementById('resume-modal');
            modal.style.display = 'none'; // hide while checking

            db.ref('sessions/' + sessionId).once('value', snap => {
                if (snap.exists()) {
                    joinSession(sessionId);
                    initApp();
                } else {
                    modal.style.display = 'flex';
                    showResumeError('Session "' + sessionId + '" not found. It may have been deleted.');
                }
            }, err => {
                modal.style.display = 'flex';
                showResumeError('Could not connect. Check your internet connection.');
            });
        }

        function resumeSessionFromInput() {
            const val = document.getElementById('resume-session-input').value;
            if (!val) { showResumeError('Enter a Session ID first.'); return; }
            resumeSessionById(val);
        }

        function showResumeError(msg) {
            const el = document.getElementById('resume-error');
            if (el) { el.textContent = msg; }
        }

        function closeResumeAndStartFresh() {
            modalManager.hide('resume-modal');
            _templateLibraryCalledFromResume = true;
            showTemplateLibrary();
        }

        // ============================================
        // DARK MODE
        // ============================================
        function toggleDarkMode() {
            const html = document.documentElement;
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? '' : 'dark';
            const icon = document.querySelector('#dark-mode-toggle i');

            if (newTheme === 'dark') {
                html.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                icon.className = 'fas fa-sun';
            } else {
                html.removeAttribute('data-theme');
                localStorage.removeItem('theme');
                icon.className = 'fas fa-moon';
            }
        }

        // Load theme on page load
        (function() {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
                const icon = document.querySelector('#dark-mode-toggle i');
                if (icon) icon.className = 'fas fa-sun';
            }
        })();

        // ============================================
        // FOCUS TRAP FOR MODALS
        // ============================================
        function trapFocus(modal) {
            const focusable = modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const first = focusable[0], last = focusable[focusable.length - 1];
            modal._trapHandler = (e) => {
                if (e.key !== 'Tab') return;
                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            };
            modal.addEventListener('keydown', modal._trapHandler);
            first?.focus();
        }

        function releaseFocus(modal, returnEl) {
            modal.removeEventListener('keydown', modal._trapHandler);
            returnEl?.focus();
        }

        // ============================================
        // TEMPLATE MANAGEMENT
        // ============================================
        function showSaveTemplateModal() {
            modalManager.show('save-template-modal');
            const overwriteContainer = document.getElementById('overwrite-template-container');
            const overwriteCheckbox  = document.getElementById('overwrite-template-checkbox');
            if (window.lastCreatedTemplateId) {
                // Show overwrite option with last template's name pre-filled
                if (overwriteContainer) overwriteContainer.style.display = 'block';
                if (overwriteCheckbox)  overwriteCheckbox.checked = false;
                // Pre-fill name/description so user can see what they created last
                if (domCache.templateName && window.lastCreatedTemplateName) {
                    domCache.templateName.value = window.lastCreatedTemplateName;
                } else {
                    domCache.templateName.value = '';
                }
            } else {
                if (overwriteContainer) overwriteContainer.style.display = 'none';
                if (overwriteCheckbox)  overwriteCheckbox.checked = false;
                domCache.templateName.value = '';
            }
            domCache.templateDescription.value = '';
            domCache.templateName.focus();
        }

        function closeSaveTemplateModal() {
            modalManager.hide('save-template-modal');
        }

        function handleSaveTemplate(event) {
            event.preventDefault();
            const name = domCache.templateName.value.trim();
            const description = domCache.templateDescription.value.trim();

            if (!name) {
                alert('Please enter a template name');
                return;
            }

            saveAsTemplate(name, description);
        }

        // Track the last template created in this session (for overwrite feature)
        window.lastCreatedTemplateId = null;
        window.lastCreatedTemplateName = null;
        window.lastCreatedTemplateShortId = null;

        function saveAsTemplate(name, description) {
            if (!isFirebaseEnabled) {
                alert('Firebase not configured. Cannot save template.');
                return;
            }

            const overwriteCheckbox = document.getElementById('overwrite-template-checkbox');
            const isOverwrite = overwriteCheckbox && overwriteCheckbox.checked && window.lastCreatedTemplateId;

            let firebaseKey, tplShortId;
            if (isOverwrite) {
                firebaseKey  = window.lastCreatedTemplateId;
                tplShortId   = window.lastCreatedTemplateShortId || ('TPL-' + Math.random().toString(36).substring(2, 6).toUpperCase());
            } else {
                firebaseKey  = 'template_' + generateId();
                tplShortId   = 'TPL-' + Math.random().toString(36).substring(2, 6).toUpperCase();
            }

            // ── Check for duplicate name in Firebase before saving ──
            db.ref('templates').once('value').then(snapshot => {
                const allTemplates = snapshot.val() || {};
                const nameLower = name.trim().toLowerCase();

                const duplicate = Object.entries(allTemplates).find(([key, t]) => {
                    // Skip the entry being overwritten in the same session
                    if (isOverwrite && key === firebaseKey) return false;
                    return (t.name || '').trim().toLowerCase() === nameLower;
                });

                if (duplicate) {
                    alert(`⚠️ A template named "${name}" already exists in the library.\n\nPlease choose a different name.`);
                    return; // Abort save
                }

                // ── Strip all checkbox states so template is always blank ──
                const cleanCategories = JSON.parse(JSON.stringify(currentData)).map(cat => {
                    if (cat.tasks) {
                        cat.tasks = cat.tasks.map(task => {
                            delete task.checklist;
                            delete task.evidence;
                            return task;
                        });
                    }
                    return cat;
                });

                const templateData = {
                    name: name,
                    description: description || '',
                    templateId: tplShortId,
                    categories: cleanCategories,
                    createdBy: currentUserRole || 'admin',
                    createdAt: Date.now(),
                    sessionOrigin: currentSessionId
                };

                db.ref(`templates/${firebaseKey}`).set(templateData)
                    .then(() => {
                        // Remember for potential overwrite in same session
                        window.lastCreatedTemplateId      = firebaseKey;
                        window.lastCreatedTemplateName    = name;
                        window.lastCreatedTemplateShortId = tplShortId;

                        // ── Update current session to reflect the new template ──
                        window.currentTemplateName = name;
                        window.currentTemplateId   = tplShortId;
                        if (typeof showSessionInfo === 'function') showSessionInfo();

                        closeSaveTemplateModal();
                        trackAction(isOverwrite ? 'template_overwrite' : 'template_save', { templateName: name, templateId: tplShortId });
                        alert(`Template "${name}" ${isOverwrite ? 'updated' : 'saved'} successfully!`);
                        // ── Highlight topbar template name after save ──
                        flashTemplateHighlight();
                    })
                    .catch((error) => {
                        alert('Error saving template: ' + error.message);
                    });
            }).catch(err => {
                alert('Error checking template names: ' + err.message);
            });
        }

        // ============================================
        // TEMPLATE LIBRARY
        // ============================================
        // Track if Template Library was opened from the Continue Session modal
        let _templateLibraryCalledFromResume = false;

        function showTemplateLibrary() {
            modalManager.show('template-library-modal');
            loadTemplateList();
        }

        function closeTemplateLibrary() {
            modalManager.hide('template-library-modal');
            // Reset selection state
            _selectedTemplateId = null;
            const applyBtn = document.getElementById('apply-template-btn');
            if (applyBtn) {
                applyBtn.disabled = true;
                applyBtn.style.opacity = '0.45';
                applyBtn.style.cursor = 'not-allowed';
            }
            // If opened from Continue Session → go back
            if (_templateLibraryCalledFromResume) {
                _templateLibraryCalledFromResume = false;
                modalManager.show('resume-modal');
            }
        }

        function loadTemplateList() {
            if (!isFirebaseEnabled) {
                domCache.templateList.innerHTML =
                    '<div style="text-align:center; color:var(--text-muted); padding:24px;">Firebase not configured.</div>';
                return;
            }

            db.ref('templates').once('value', (snapshot) => {
                const templates = snapshot.val();

                if (!templates) {
                    domCache.templateList.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:24px;">No templates saved yet.<br>Create a checklist and click "Save as Template".</div>';
                    return;
                }

                // Determine active template (matched by short TPL ID, with name fallback for legacy OLD-TPL templates)
                const activeTplId   = window.currentTemplateId   || null;
                const activeTplName = (window.currentTemplateName || '').trim().toLowerCase();

                let entries = Object.entries(templates).map(([id, t]) => {
                    const tId = t.templateId || 'OLD-TPL';
                    let isActive = false;
                    if (activeTplId && activeTplId !== 'OLD-TPL') {
                        // New-style: unique TPL-XXXX id — exact match
                        isActive = (tId === activeTplId);
                    } else if (activeTplName && activeTplName !== 'unknown template') {
                        // Legacy OLD-TPL: fall back to name comparison
                        isActive = (tId === 'OLD-TPL' || tId === activeTplId)
                                   && ((t.name || '').trim().toLowerCase() === activeTplName);
                    }
                    return { id, t, isActive };
                });

                // Sort: active template floats to top
                entries.sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));

                const items = entries.map(({ id, t, isActive }) => {
                    const date = new Date(t.createdAt).toLocaleDateString('en-AU', {day:'2-digit',month:'short',year:'numeric'});
                    const catCount = t.categories ? t.categories.length : 0;
                    const taskCount = t.categories ? t.categories.reduce((sum, c) => sum + (c.tasks ? c.tasks.length : 0), 0) : 0;
                    // Backward-compatible: old templates without templateId get 'OLD-TPL' badge
                    const tplBadge = t.templateId || 'OLD-TPL';
                    // Permission: expert can delete any; others can only delete templates they created in this session
                    const canDelete = currentUserRole === 'expert' || (t.sessionOrigin && t.sessionOrigin === currentSessionId);
                    const deleteBtnHtml = canDelete
                        ? `<button class="template-item-delete" onclick="event.stopPropagation(); deleteTemplate('${id}', '${escapeHtml(t.name).replace(/'/g,'&apos;')}')" title="Delete template" aria-label="Delete template"><i class="fas fa-trash-alt"></i></button>`
                        : '';
                    const activeBadge = isActive
                        ? `<span class="template-active-badge"><i class="fas fa-circle-check"></i> In Use</span>`
                        : '';
                    return `
                        <div class="template-item${isActive ? ' template-item--active' : ''}" onclick="selectTemplate('${id}')" data-template-id="${id}" data-firebase-key="${id}" data-template-short-id="${escapeHtml(tplBadge)}">
                            <div class="template-item-body">
                                <div class="template-item-name">
                                    <i class="fas fa-table-list" style="margin-right:8px; color:${isActive ? 'var(--success-color)' : 'var(--primary-color)'};"></i>
                                    <span class="template-id-badge" style="font-size:10px; font-family:monospace; background:rgba(0,168,232,0.15); color:var(--primary-accent); padding:2px 6px; border-radius:4px; margin-right:6px;">${escapeHtml(tplBadge)}</span>
                                    <span class="template-name">${escapeHtml(t.name)}</span>
                                    ${activeBadge}
                                </div>
                                ${t.description ? `<div class="template-item-meta" style="margin-bottom:3px;">${escapeHtml(t.description)}</div>` : ''}
                                <div class="template-item-meta"><i class="fas fa-layer-group" style="margin-right:4px; opacity:0.6;"></i>${catCount} categories &middot; ${taskCount} tasks &middot; ${date}</div>
                            </div>
                            ${deleteBtnHtml}
                        </div>
                    `;
                }).join('');

                domCache.templateList.innerHTML = items;
            });
        }

        function deleteTemplate(firebaseKey, templateName) {
            // ── Block deletion of the currently active template ──
            const activeTplId   = window.currentTemplateId   || null;
            const activeTplName = (window.currentTemplateName || '').trim().toLowerCase();

            // Read the short TPL-XXXX id from the DOM element
            const el = document.querySelector(`.template-item[data-firebase-key="${firebaseKey}"]`);
            const shortId = el ? el.dataset.templateShortId : null;

            const matchById   = shortId && activeTplId && (shortId === activeTplId);
            const matchByName = activeTplName && activeTplName !== 'unknown template'
                                && ((templateName || '').trim().toLowerCase() === activeTplName);

            if (matchById || matchByName) {
                alert(`❌ Cannot delete "${templateName}" because it is currently in use.\n\nPlease apply a different template first, then try again.`);
                return;
            }

            if (!confirm(`Are you sure you want to delete template "${templateName}"?`)) return;
            db.ref(`templates/${firebaseKey}`).remove()
                .then(() => {
                    trackAction('template_delete', { templateName: templateName });
                    loadTemplateList();
                })
                .catch(err => alert('Error deleting template: ' + err.message));
        }

        // Track which template the user has clicked/selected
        let _selectedTemplateId = null;

        function selectTemplate(templateId) {
            _selectedTemplateId = templateId;

            // Clear previous selection highlight
            document.querySelectorAll('.template-item--selected')
                .forEach(el => el.classList.remove('template-item--selected'));

            // Highlight newly selected item
            const item = document.querySelector(`.template-item[data-template-id="${templateId}"]`);
            if (item) item.classList.add('template-item--selected');

            // Enable the Apply button
            const applyBtn = document.getElementById('apply-template-btn');
            if (applyBtn) {
                applyBtn.disabled = false;
                applyBtn.style.opacity = '1';
                applyBtn.style.cursor = 'pointer';
            }
        }

        function applySelectedTemplate() {
            if (!_selectedTemplateId) return;
            loadTemplate(_selectedTemplateId);
        }

        function loadTemplate(templateId) {
            if (!isFirebaseEnabled) return;

            db.ref(`templates/${templateId}`).once('value', (snapshot) => {
                const template = snapshot.val();
                if (!template) {
                    alert('Template not found.');
                    return;
                }

                // Reset the flag BEFORE closing the library so that
                // closeTemplateLibrary() does NOT re-open the resume-modal
                // when the user just applied a template from the
                // "Start New Session → Template Library" flow.
                _templateLibraryCalledFromResume = false;
                closeTemplateLibrary();
                createSessionFromTemplate(template);
            });
        }

        function createSessionFromTemplate(template) {
            // Detach old listeners & reset state
            teardownFirebaseListeners();
            appState = {};
            currentData = JSON.parse(JSON.stringify(initialChecklistData));
            currentSessionId = generateSessionId();
            saveSessionToHistory(currentSessionId, template.name || null);

            // Store the Template ID & Name for this session (used in Support email body)
            // Backward-compatible: old templates without templateId use 'OLD-TPL'
            window.currentTemplateId   = template.templateId || 'OLD-TPL';
            window.currentTemplateName = template.name       || 'Unknown Template';

            const sessionRef = db.ref(`sessions/${currentSessionId}`);
            sessionRef.set({
                metadata: {
                    createdAt: Date.now(),
                    createdBy: currentUserRole || 'admin',
                    templateName: template.name,
                    templateId: window.currentTemplateId
                },
                checklist: template.categories,
                checked: {}
            });
            updateURLWithSession();
            showSessionInfo();
            setupFirebaseListeners();
            trackAction('template_load', { templateName: template.name, templateId: window.currentTemplateId });
            // ── Highlight topbar template name after applying a template ──
            flashTemplateHighlight();
        }

        // ============================================
        // FIREBASE REAL-TIME SYNC
        // ============================================

        // Track active listener ref for proper cleanup on session switch
        let activeSessionRef = null;

        function teardownFirebaseListeners() {
            if (activeSessionRef) {
                try {
                    activeSessionRef.child('checklist').off('value');
                    activeSessionRef.child('checked').off('value');
                    activeSessionRef.child('notes').off('value');
                } catch (e) { /* silent */ }
                activeSessionRef = null;
            }
        }

        function setupFirebaseListeners() {
            if (!isFirebaseEnabled || !currentSessionId) return;

            // Always detach previous listeners before attaching new ones
            teardownFirebaseListeners();

            const boundSessionId = currentSessionId; // capture for stale-callback guard
            const sessionRef = db.ref(`sessions/${boundSessionId}`);
            activeSessionRef = sessionRef;

            // ── Restore template name/id from Firebase metadata on reload ──
            sessionRef.child('metadata').once('value', (metaSnap) => {
                if (currentSessionId !== boundSessionId) return;
                const meta = metaSnap.val();
                if (meta) {
                    if (meta.templateName) {
                        window.currentTemplateName = meta.templateName;
                    }
                    if (meta.templateId) {
                        window.currentTemplateId = meta.templateId;
                    }
                    // Re-render topbar now that we have the template info
                    showSessionInfo();
                    // ── Highlight template name on page reload (same UX as apply/save) ──
                    flashTemplateHighlight();
                }
            });

            // Listen for checklist structure changes (add/delete tasks/categories)
            sessionRef.child('checklist').on('value', (snapshot) => {
                // Stale-callback guard: discard if we've already switched to another session
                if (currentSessionId !== boundSessionId) return;
                const data = snapshot.val();
                if (data) {
                    currentData = data;
                    syncStateWithData();
                    render();
                    updateAllNoteIndicators(); // refresh note indicators after DOM rebuild
                }
            });

            // Listen for checked state changes — in-place update only, NO full re-render
            sessionRef.child('checked').on('value', (snapshot) => {
                // Stale-callback guard
                if (currentSessionId !== boundSessionId) return;
                const newState = snapshot.val() || {};
                appState = newState;
                Object.keys(appState).forEach(taskId => updateTaskStyles(taskId));
                updateCategoryProgress();
                updateDashboard();
            });

            // Listen for notes changes — in-place indicator update only
            sessionRef.child('notes').on('value', (snapshot) => {
                if (currentSessionId !== boundSessionId) return;
                notesState = snapshot.val() || {};
                updateAllNoteIndicators();
            });
        }

        function updateCheckboxesFromFirebase(checked) {
            Object.keys(checked).forEach(taskId => {
                const checkbox = document.querySelector(`input[data-task-id="${taskId}"]`);
                if (checkbox) {
                    checkbox.checked = checked[taskId];
                }
            });
        }

        function syncToFirebase(path, data) {
            if (!isFirebaseEnabled || !currentSessionId) {
                // Fallback to sessionStorage
                sessionStorage.setItem(`gas_metering_${path}`, JSON.stringify(data));
                return;
            }
            db.ref(`sessions/${currentSessionId}/${path}`).set(data);
        }

        function syncCheckedTask(taskId, isChecked) {
            if (!isFirebaseEnabled || !currentSessionId) {
                const key = `gas_metering_checked_${taskId}`;
                if (isChecked) {
                    sessionStorage.setItem(key, 'true');
                } else {
                    sessionStorage.removeItem(key);
                }
                return;
            }
            db.ref(`sessions/${currentSessionId}/checked/${taskId}`).set(isChecked);
        }

        // ── Security: SHA-256 hash helper (Web Crypto API) ──
        async function hashPassword(plain) {
            const encoder = new TextEncoder();
            const data    = encoder.encode(plain);
            const hashBuf = await crypto.subtle.digest('SHA-256', data);
            return Array.from(new Uint8Array(hashBuf))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        }

        // Pre-computed SHA-256 of 'expert' (verified via PS [System.Security.Cryptography.SHA256])
        // SHA-256('expert') = c7d25387...684e8a19
        const EXPERT_HASH = 'c7d253870ab8de3825e3a9b5ee603e21abd0dfe62763e8e2fc1fc9f4684e8a19';

        // Login System
        async function handleLogin(e) {
            e.preventDefault();
            const user = domCache.username.value.trim().toLowerCase();
            const pass = domCache.password.value.trim();

            if (user === 'client' && pass === 'client') {
                authenticate('client');
            } else if (user === 'admin' && pass === 'admin') {
                authenticate('admin');
            } else if (user === 'expert') {
                // ── Security: compare hashed password, never the raw string ──
                const h = await hashPassword(pass);
                if (h === EXPERT_HASH) {
                    authenticate('expert');
                } else {
                    domCache.authError.textContent = 'Invalid username or password.';
                }
            } else if (user === 'view' && pass === 'view') {
                authenticate('view');
            } else {
                domCache.authError.textContent = 'Invalid username or password.';
            }
        }

        function authenticate(role) {
            currentUserRole = role;
            sessionStorage.setItem('gas_metering_session_role', role);
            modalManager.hide('auth-modal');

            // Analytics: Track session start
            if (!analyticsData.sessionStart) {
                analyticsData.sessionStart = Date.now();
            }
            trackAction('login', { role });

            applyRoleUI();

            // ── Highlight user pill so user notices who they are logged in as ──
            flashUserPillHighlight();

            // Check if joining existing session from URL
            const sessionFromURL = getSessionFromURL();
            if (sessionFromURL) {
                joinSession(sessionFromURL);
                initApp();
            } else if (isFirebaseEnabled && (role === 'admin' || role === 'client' || role === 'expert' || role === 'view')) {
                // All Firebase-enabled roles get the Resume Modal when no session in URL
                // This ensures Switch Session works correctly for every role including 'view'
                showResumeModal();
                initApp();
            } else {
                initApp();
            }
        }

        function logout() {
            trackAction('logout', { role: currentUserRole });
            sessionStorage.removeItem('gas_metering_session_role');
            currentUserRole = null;

            modalManager.show('auth-modal');
            domCache.username.value = '';
            domCache.password.value = '';
            domCache.authError.textContent = '';
        }

        function switchSession() {
            // Log the action before navigating away
            trackAction('session_switch', { fromSession: currentSessionId, role: currentUserRole });

            // Detach Firebase listeners to avoid ghost updates
            if (typeof teardownFirebaseListeners === 'function') {
                teardownFirebaseListeners();
            }

            // Navigate back to the clean base URL (no ?session= param)
            // The app will automatically show the Resume/Session modal on load
            const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
            window.location.href = cleanUrl;
        }

        function applyRoleUI() {
            const body = document.body;

            // Update user role display in topbar
            if (domCache.topbarUserRole) {
                const roleLabel = currentUserRole === 'expert' ? 'System Expert'
                    : currentUserRole === 'admin' ? 'Administrator'
                    : currentUserRole === 'client' ? 'Inspector'
                    : (currentUserRole || '-');
                domCache.topbarUserRole.textContent = roleLabel;
            }

            // ── Tier 4: Update sidebar-user-pill ──
            const pill = document.getElementById('sidebar-user-pill');
            const pillRole = document.getElementById('sidebar-pill-role');
            const pillName = document.getElementById('sidebar-pill-name');
            if (pill && pillRole && pillName) {
                const roleLabel = currentUserRole === 'expert' ? 'Expert'
                    : currentUserRole === 'admin' ? 'Administrator'
                    : currentUserRole === 'client' ? 'Inspector'
                    : 'Viewer';
                pillRole.textContent = roleLabel;
                pillName.textContent = currentUserRole === 'expert' ? 'System Expert'
                    : currentUserRole === 'admin' ? 'Admin User'
                    : currentUserRole === 'client' ? 'Field Inspector'
                    : 'View-Only';
                pill.style.display = 'block';
            }
            // Show/hide nav-item-v2 for Templates and Export
            const navTemplates = document.getElementById('nav-templates');
            const navExport = document.getElementById('nav-export');
            if (navTemplates) navTemplates.style.display = (currentUserRole === 'admin' || currentUserRole === 'client' || currentUserRole === 'expert') ? 'flex' : 'none';
            if (navExport) navExport.style.display = (currentUserRole === 'admin' || currentUserRole === 'client' || currentUserRole === 'expert') ? 'flex' : 'none';
            // Support button: always visible to all roles
            const navSupport = document.getElementById('nav-support');
            if (navSupport) navSupport.style.display = 'flex';

            // Show/hide Template buttons (admin and expert)
            if (domCache.saveTemplateBtn) {
                domCache.saveTemplateBtn.style.display = (currentUserRole === 'admin' || currentUserRole === 'expert') ? 'block' : 'none';
            }
            if (domCache.loadTemplateBtn) {
                domCache.loadTemplateBtn.style.display = (currentUserRole === 'admin' || currentUserRole === 'client' || currentUserRole === 'expert') ? 'block' : 'none';
            }

            // Show/hide Export PDF button (admin, expert, and client only)
            if (domCache.exportPdfBtn) {
                domCache.exportPdfBtn.style.display = (currentUserRole === 'admin' || currentUserRole === 'client' || currentUserRole === 'expert') ? 'flex' : 'none';
            }

            // Show/hide View Analytics button (admin and expert only)
            if (domCache.viewAnalyticsBtn) {
                domCache.viewAnalyticsBtn.style.display = (currentUserRole === 'admin' || currentUserRole === 'expert') ? 'flex' : 'none';
            }

            if (currentUserRole === 'admin' || currentUserRole === 'expert') {
                if (domCache.categoriesContainer) domCache.categoriesContainer.classList.add('admin-mode');
                if (domCache.addCategoryContainer) domCache.addCategoryContainer.classList.add('admin-mode');
                body.classList.remove('view-mode');
            } else if (currentUserRole === 'view') {
                if (domCache.categoriesContainer) domCache.categoriesContainer.classList.remove('admin-mode');
                if (domCache.addCategoryContainer) domCache.addCategoryContainer.classList.remove('admin-mode');
                body.classList.add('view-mode');
            } else {
                if (domCache.categoriesContainer) domCache.categoriesContainer.classList.remove('admin-mode');
                if (domCache.addCategoryContainer) domCache.addCategoryContainer.classList.remove('admin-mode');
                body.classList.remove('view-mode');
            }
        }

        // Initialize state
        function initApp() {
            // If Firebase session exists, data will be loaded via listeners
            if (isFirebaseEnabled && currentSessionId) {
                setupFirebaseListeners();
                return;
            }

            // Fallback to localStorage
            const savedData = localStorage.getItem('gas_metering_structure_v3');
            if (savedData) {
                try { currentData = JSON.parse(savedData); }
                catch (e) { currentData = JSON.parse(JSON.stringify(initialChecklistData)); }
            } else {
                currentData = JSON.parse(JSON.stringify(initialChecklistData));
            }

            // Load progress state
            const savedState = localStorage.getItem('gas_metering_state_v3');
            if (savedState) {
                try {
                    appState = JSON.parse(savedState);
                } catch (e) {
                    createNewState();
                }
            } else {
                createNewState();
            }

            // Re-sync state with data to ensure no orphans
            syncStateWithData();
            render();
        }

        function syncStateWithData() {
            currentData.forEach(cat => {
                if (!cat.tasks) cat.tasks = [];
                cat.tasks.forEach(task => {
                    if (!appState[task.id]) {
                        appState[task.id] = { checklist: false, evidence: false };
                    }
                });
            });
            saveDataAndState();
        }

        function createNewState() {
            appState = {};
            currentData.forEach(cat => {
                if (!cat.tasks) cat.tasks = [];
                cat.tasks.forEach(task => {
                    appState[task.id] = { checklist: false, evidence: false };
                });
            });

            // Clear all notes
            notesState = {};
            if (isFirebaseEnabled && currentSessionId) {
                db.ref(`sessions/${currentSessionId}/notes`).remove();
            }

            // Refresh note indicators in DOM
            document.querySelectorAll('[id^="note-btn-"]').forEach(btn => btn.classList.remove('has-note'));

            saveDataAndState();
        }

        function saveDataAndState() {
            try {
                // Save to localStorage as fallback
                localStorage.setItem('gas_metering_structure_v3', JSON.stringify(currentData));
                localStorage.setItem('gas_metering_state_v3', JSON.stringify(appState));

                // Sync to Firebase with debouncing (only if user has write permission)
                debouncedFirebaseSync();

                updateDashboard();
            } catch (error) {
                errorHandler.showError('Không thể lưu dữ liệu', error);
            }
        }

        // Toggling Progress
        function toggleTaskProperty(taskId, property) {
            if (!hasWritePermission()) return;
            if (!appState[taskId]) {
                appState[taskId] = { checklist: false, evidence: false };
            }
            appState[taskId][property] = !appState[taskId][property];

            // Immediate visual update for THIS task only (no layout reflow)
            const state = appState[taskId];
            const isFullyCompleted = state.checklist && state.evidence;
            const taskContainer = document.getElementById(`container-${taskId}`);
            const taskName = document.getElementById(`name-${taskId}`);

            if (taskContainer && taskName) {
                taskContainer.classList.toggle('is-completed', isFullyCompleted);
                taskName.classList.toggle('completed', isFullyCompleted);
            }

            // Find which category owns this task so we only update that one
            let ownerCatId = null;
            for (const cat of currentData) {
                if (cat.tasks.some(t => t.id === taskId)) {
                    ownerCatId = cat.id;
                    break;
                }
            }

            // Schedule targeted update — only the owning category + sidebar
            debouncedUIUpdate(ownerCatId);

            // Save data
            try {
                localStorage.setItem('gas_metering_structure_v3', JSON.stringify(currentData));
                localStorage.setItem('gas_metering_state_v3', JSON.stringify(appState));
                debouncedFirebaseSync();

                // Track meaningful action
                const taskObj = (() => {
                    for (const cat of currentData) {
                        const t = (cat.tasks || []).find(x => x.id === taskId);
                        if (t) return { name: t.name, catName: cat.name };
                    }
                    return null;
                })();
                if (taskObj) {
                    const newVal = appState[taskId][property];
                    const evtType = property === 'checklist'
                        ? (newVal ? 'checklist_check' : 'checklist_uncheck')
                        : (newVal ? 'evidence_add' : 'evidence_remove');
                    trackAction(evtType, { taskName: taskObj.name, catName: taskObj.catName });
                    trackCompletion();

                    // Toast notification
                    const taskShort = taskObj.name.length > 42
                        ? taskObj.name.slice(0, 42) + '…'
                        : taskObj.name;
                    if (property === 'checklist') {
                        if (newVal) {
                            showToast('success', '✅ Checked', taskShort);
                        } else {
                            showToast('uncheck', '↩ Unchecked', taskShort);
                        }
                    } else {
                        if (newVal) {
                            showToast('info', '📎 Evidence added', taskShort);
                        } else {
                            showToast('uncheck', '📎 Evidence removed', taskShort);
                        }
                    }
                }
            } catch (error) {
                errorHandler.showError('Không thể lưu dữ liệu', error);
            }
        }

        function updateTaskStyles(taskId) {
            const taskContainer = document.getElementById(`container-${taskId}`);
            const taskName = document.getElementById(`name-${taskId}`);

            if (!taskContainer || !taskName) return;

            const state = appState[taskId] || { checklist: false, evidence: false };
            const isFullyCompleted = state.checklist && state.evidence;

            // Batch DOM writes — class toggles
            taskContainer.classList.toggle('is-completed', isFullyCompleted);
            taskName.classList.toggle('completed', isFullyCompleted);

            // Sync checkbox .checked property AND aria-checked (needed for Firebase remote updates)
            const checklistInput = document.getElementById(`task-${taskId}-done`);
            const evidenceInput = document.getElementById(`task-${taskId}-evidence`);
            if (checklistInput) {
                checklistInput.checked = !!state.checklist;
                checklistInput.setAttribute('aria-checked', state.checklist ? 'true' : 'false');
            }
            if (evidenceInput) {
                evidenceInput.checked = !!state.evidence;
                evidenceInput.setAttribute('aria-checked', state.evidence ? 'true' : 'false');
            }
        }

        // ============================================
        // NOTE FUNCTIONS
        // ============================================

        // Count words (split on whitespace, ignore empty chunks)
        function countWords(text) {
            const trimmed = text.trim();
            if (!trimmed) return 0;
            return trimmed.split(/\s+/).length;
        }

        /**
         * Open note modal for a task or category.
         * @param {string} type  - 'task' | 'cat'
         * @param {string} id    - task/cat id
         * @param {string} title - display title
         */
        function openNoteModal(type, id, title) {
            currentNoteTarget = { type, id, title };
            const key = `${type}-${id}`;
            const note = notesState[key] || {};
            const canEdit = currentUserRole === 'admin' || currentUserRole === 'client';

            // Header labels
            document.getElementById('note-modal-type-label').textContent =
                type === 'cat' ? '📁 Category Note' : '📋 Task Note';
            document.getElementById('note-modal-heading').textContent = title;

            // Show correct section
            document.getElementById('note-view-section').style.display  = canEdit ? 'none' : 'block';
            document.getElementById('note-edit-section').style.display  = canEdit ? 'block' : 'none';
            document.getElementById('note-action-row').style.display    = canEdit ? 'flex' : 'none';

            if (canEdit) {
                const ta = document.getElementById('note-textarea');
                ta.value = note.text || '';
                ta.classList.remove('over-limit');
                onNoteInput(ta);
                // Ctrl/Cmd+Enter hint in placeholder
            } else {
                // View role: show read-only
                const text = note.text || '';
                const textEl  = document.getElementById('note-readonly-text');
                const emptyEl = document.getElementById('note-readonly-empty');
                textEl.textContent = text;
                textEl.style.display  = text ? 'block' : 'none';
                emptyEl.style.display = text ? 'none'  : 'block';
            }

            // Meta: last edited
            const metaEl = document.getElementById('note-meta');
            if (note.updatedAt) {
                const d = new Date(note.updatedAt);
                const ds = d.toLocaleDateString('vi-VN') + ' ' +
                           d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                metaEl.textContent = `✏️ Last edited by ${note.updatedBy || 'unknown'} · ${ds}`;
                metaEl.style.display = 'block';
            } else {
                metaEl.style.display = 'none';
            }

            // Show modal (use flex because CSS rule sets display:none, must set display:flex)
            const modal = document.getElementById('note-modal');
            modal.style.display = 'flex';
            // Focus textarea for quick typing
            if (canEdit) {
                setTimeout(() => document.getElementById('note-textarea').focus(), 60);
            }
        }

        function closeNoteModal() {
            currentNoteTarget = null;
            document.getElementById('note-modal').style.display = 'none';
        }

        function onNoteInput(textarea) {
            const words    = countWords(textarea.value);
            const overLimit = words > 250;
            const countEl  = document.getElementById('note-word-count');
            const warnEl   = document.getElementById('note-word-warn');
            const saveBtn  = document.getElementById('note-save-btn');

            countEl.textContent  = `${words} / 250 words`;
            countEl.style.color  = overLimit ? '#e53935' : 'var(--text-muted)';
            warnEl.style.display = overLimit ? 'inline' : 'none';
            textarea.classList.toggle('over-limit', overLimit);
            if (saveBtn) {
                saveBtn.disabled     = overLimit;
                saveBtn.style.opacity = overLimit ? '0.5' : '1';
            }
        }

        function saveNote() {
            if (!currentNoteTarget) return;
            const ta     = document.getElementById('note-textarea');
            const rawText = ta.value;
            const text   = rawText.trim();

            if (countWords(rawText) > 250) return; // blocked

            const key = `${currentNoteTarget.type}-${currentNoteTarget.id}`;

            if (!text) {
                // Empty → delete note
                delete notesState[key];
                if (isFirebaseEnabled && currentSessionId) {
                    db.ref(`sessions/${currentSessionId}/notes/${key}`).remove();
                }
            } else {
                const noteData = {
                    text:      text,
                    updatedAt: Date.now(),
                    updatedBy: currentUserRole || 'user'
                };
                notesState[key] = noteData;
                if (isFirebaseEnabled && currentSessionId) {
                    db.ref(`sessions/${currentSessionId}/notes/${key}`).set(noteData);
                }
            }

            // Instantly reflect indicator (Firebase listener will also fire)
            updateNoteIndicator(currentNoteTarget.type, currentNoteTarget.id);

            // Track note save + toast
            if (text) {
                const taskObj = (() => {
                    if (currentNoteTarget.type !== 'task') return null;
                    for (const cat of currentData) {
                        const t = (cat.tasks || []).find(x => x.id === currentNoteTarget.id);
                        if (t) return { name: t.name, catName: cat.name };
                    }
                    return null;
                })();
                if (taskObj) trackAction('note_save', { taskName: taskObj.name, catName: taskObj.catName });
                const noteTitle = currentNoteTarget.title || '';
                const short = noteTitle.length > 40 ? noteTitle.slice(0, 40) + '…' : noteTitle;
                showToast('note', '📝 Note Saved', short);
            } else {
                const noteTitle = currentNoteTarget.title || '';
                trackAction('note_clear', { noteTarget: noteTitle });
                showToast('uncheck', '🗑️ Note Cleared', noteTitle);
            }

            closeNoteModal();
        }

        function updateNoteIndicator(type, id) {
            const key     = `${type}-${id}`;
            const note    = notesState[key];
            const hasNote = !!(note && note.text);
            const btn     = document.getElementById(`note-btn-${type}-${id}`);
            if (!btn) return;
            btn.classList.toggle('has-note', hasNote);
            if (hasNote) {
                // Build preview: first line, max 60 chars
                const firstLine = (note.text || '').split('\n')[0].trim();
                const preview   = firstLine.length > 60
                    ? firstLine.slice(0, 57) + '…'
                    : firstLine;
                btn.setAttribute('data-note-preview', preview);
            } else {
                btn.removeAttribute('data-note-preview');
            }
        }

        function updateAllNoteIndicators() {
            // Update tasks
            currentData.forEach(cat => {
                updateNoteIndicator('cat', cat.id);
                (cat.tasks || []).forEach(task => updateNoteIndicator('task', task.id));
            });
        }

        // Security: HTML escape to prevent XSS
        function escapeHtml(unsafe) {
            if (!unsafe) return '';
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        // Security: Role validation
        function isValidRole(role) {
            return ['admin', 'client', 'view', 'expert'].includes(role);
        }

        function hasAdminPermission() {
            return currentUserRole === 'admin' || currentUserRole === 'expert';
        }

        function hasWritePermission() {
            return currentUserRole === 'admin' || currentUserRole === 'client' || currentUserRole === 'expert';
        }

        // Editable Tasks Logic (Admin)
        function generateId() {
            return 'id_' + Math.random().toString(36).substr(2, 9);
        }

        function openActionModal(type, catId, taskId = null) {
            actionContext = { type, catId, taskId };

            modalManager.show('action-modal');
            domCache.actionInput.style.display = 'block';
            domCache.actionInput.required = true;
            domCache.actionConfirmText.style.display = 'none';
            domCache.actionSubmitBtn.style.background = '';

            // ── Tier 4 V2: Dynamic icon chip per action type ──
            const iconEl  = document.getElementById('action-modal-icon');
            const iconMap = {
                add:       { icon: 'fa-plus',            grad: 'linear-gradient(135deg,#006c50,#00FAC2)', glow: 'var(--glow-cyan)' },
                edit:      { icon: 'fa-pen',             grad: 'linear-gradient(135deg,var(--primary-color),var(--primary-accent))', glow: 'var(--glow-blue)' },
                delete:    { icon: 'fa-trash',           grad: 'linear-gradient(135deg,#ba1a1a,#ef4444)', glow: '0 0 16px rgba(239,68,68,0.4)' },
                addCat:    { icon: 'fa-folder-plus',     grad: 'linear-gradient(135deg,#006c50,#00FAC2)', glow: 'var(--glow-cyan)' },
                editCat:   { icon: 'fa-folder-open',    grad: 'linear-gradient(135deg,#27657c,var(--primary-accent))', glow: 'var(--glow-blue)' },
                deleteCat: { icon: 'fa-folder-minus',   grad: 'linear-gradient(135deg,#ba1a1a,#ef4444)', glow: '0 0 16px rgba(239,68,68,0.4)' },
            };
            if (iconEl && iconMap[type]) {
                const m = iconMap[type];
                iconEl.style.background  = m.grad;
                iconEl.style.boxShadow   = m.glow;
                iconEl.innerHTML         = `<i class="fas ${m.icon}" style="color:#fff; font-size:12px;"></i>`;
            }

            if (type === 'add') {
                domCache.actionTitle.textContent = 'Add New Task';
                domCache.actionInput.value = '';
                domCache.actionInput.placeholder = 'Task description';
                domCache.actionSubmitBtn.textContent = 'Add Task';
                domCache.actionSubmitBtn.className = 'modal-btn modal-btn-primary';
                setTimeout(() => domCache.actionInput.focus(), 100);
            } else if (type === 'edit') {
                domCache.actionTitle.textContent = 'Edit Task';
                const cat = currentData.find(c => c.id === catId);
                const task = cat ? cat.tasks.find(t => t.id === taskId) : null;
                domCache.actionInput.value = task ? task.name : '';
                domCache.actionInput.placeholder = 'Task description';
                domCache.actionSubmitBtn.textContent = 'Save Changes';
                domCache.actionSubmitBtn.className = 'modal-btn modal-btn-primary';
                setTimeout(() => domCache.actionInput.focus(), 100);
            } else if (type === 'delete') {
                domCache.actionTitle.textContent = 'Delete Task';
                domCache.actionInput.style.display = 'none';
                domCache.actionInput.required = false;
                domCache.actionConfirmText.style.display = 'block';
                domCache.actionConfirmText.textContent = 'Are you sure you want to delete this task? This action cannot be undone.';
                domCache.actionSubmitBtn.className = 'modal-btn modal-btn-danger';
                domCache.actionSubmitBtn.textContent = 'Delete Task';
            } else if (type === 'addCat') {
                domCache.actionTitle.textContent = 'Add New Category';
                domCache.actionInput.value = '';
                domCache.actionInput.placeholder = 'Category Name';
                domCache.actionSubmitBtn.textContent = 'Add Category';
                domCache.actionSubmitBtn.className = 'modal-btn modal-btn-primary';
                setTimeout(() => domCache.actionInput.focus(), 100);
            } else if (type === 'editCat') {
                domCache.actionTitle.textContent = 'Edit Category Name';
                const cat = currentData.find(c => c.id === catId);
                domCache.actionInput.value = cat ? cat.title : '';
                domCache.actionInput.placeholder = 'Category Name';
                domCache.actionSubmitBtn.textContent = 'Save Changes';
                domCache.actionSubmitBtn.className = 'modal-btn modal-btn-primary';
                setTimeout(() => domCache.actionInput.focus(), 100);
            } else if (type === 'deleteCat') {
                domCache.actionTitle.textContent = 'Delete Category';
                domCache.actionInput.style.display = 'none';
                domCache.actionInput.required = false;
                domCache.actionConfirmText.style.display = 'block';
                domCache.actionConfirmText.textContent = 'Are you sure you want to delete this category and all its tasks? This action cannot be undone.';
                domCache.actionSubmitBtn.className = 'modal-btn modal-btn-danger';
                domCache.actionSubmitBtn.textContent = 'Delete Category';
            }
        }

        function closeActionModal() {
            modalManager.hide('action-modal');
            actionContext = { type: '', catId: '', taskId: '' };
        }

        function handleActionSubmit(e) {
            e.preventDefault();
            const { type, catId, taskId } = actionContext;
            const cat = currentData.find(c => c.id === catId);

            // Category Operations don't require pre-existing finding of category for add
            if (type === 'addCat') {
                const name = domCache.actionInput.value.trim();
                if (name) {
                    const newCat = { id: generateId(), title: name, tasks: [] };
                    currentData.push(newCat);
                    trackAction('category_add', { catName: name });
                }
            } else if (type === 'editCat') {
                if (!cat) return closeActionModal();
                const oldTitle = cat.title;
                const name = domCache.actionInput.value.trim();
                if (name) { cat.title = name; trackAction('category_rename', { oldName: oldTitle, newName: name }); }
            } else if (type === 'deleteCat') {
                if (!cat) return closeActionModal();
                trackAction('category_delete', { catName: cat.title, taskCount: cat.tasks ? cat.tasks.length : 0 });
                if (cat.tasks) cat.tasks.forEach(task => delete appState[task.id]);
                currentData = currentData.filter(c => c.id !== catId);
            } else {
                // Task operations require category exists
                if (!cat) return closeActionModal();
                if (!cat.tasks) cat.tasks = [];

                if (type === 'add') {
                    const name = domCache.actionInput.value.trim();
                    if (name) {
                        const newTask = { id: generateId(), name: name };
                        cat.tasks.push(newTask);
                        appState[newTask.id] = { checklist: false, evidence: false };
                        trackAction('task_add', { taskName: name, catName: cat.title });
                    }
                } else if (type === 'edit') {
                    const name = domCache.actionInput.value.trim();
                    if (name) {
                        const task = cat.tasks.find(t => t.id === taskId);
                        if (task) { const oldName = task.name; task.name = name; trackAction('task_rename', { oldName, newName: name, catName: cat.title }); }
                    }
                } else if (type === 'delete') {
                    const toDel = cat.tasks.find(t => t.id === taskId);
                    trackAction('task_delete', { taskName: toDel ? toDel.name : taskId, catName: cat.title });
                    cat.tasks = cat.tasks.filter(t => t.id !== taskId);
                    delete appState[taskId];
                }
            }

            saveDataAndState();
            render();
            closeActionModal();
        }

        function addTask(catId) {
            if (!hasAdminPermission()) return;
            openActionModal('add', catId);
        }
        function editTask(catId, taskId) {
            if (!hasAdminPermission()) return;
            openActionModal('edit', catId, taskId);
        }
        function deleteTask(catId, taskId) {
            if (!hasAdminPermission()) return;
            openActionModal('delete', catId, taskId);
        }
        function addCategory() {
            if (!hasAdminPermission()) return;
            openActionModal('addCat', null);
        }
        function editCategory(catId) {
            if (!hasAdminPermission()) return;
            openActionModal('editCat', catId);
        }
        function deleteCategory(catId) {
            if (!hasAdminPermission()) return;
            openActionModal('deleteCat', catId);
        }

        // 2-Step Reset
        function handleReset() {
            const btn = document.getElementById('reset-btn');
            const span = btn.querySelector('span');

            if (resetStep === 0) {
                resetStep = 1;
                btn.classList.add('confirming');
                span.textContent = "Click again to confirm reset";

                // Cancel reset if clicked elsewhere
                document.addEventListener('click', cancelResetClick);
            } else if (resetStep === 1) {
                createNewState();
                render();
                resetResetBtn();
                trackAction('progress_reset');
                showToast('warning', '🔄 Progress Reset', 'All checklist items have been cleared.');
            }
        }

        function cancelResetClick(e) {
            if (domCache.resetBtn && !domCache.resetBtn.contains(e.target)) {
                resetResetBtn();
            }
        }

        function resetResetBtn() {
            const span = domCache.resetBtn.querySelector('span');
            resetStep = 0;
            domCache.resetBtn.classList.remove('confirming');
            span.textContent = "Reset Progress";
            document.removeEventListener('click', cancelResetClick);
        }

        // PDF Export
        function exportPDF() {
            const progress = calculateProgress();
            const now = new Date();

            // --- Meta fields ---
            const sessionId = currentSessionId || 'N/A';
            const exportedBy = currentUserRole === 'admin' ? 'Administrator' : (currentUserRole === 'client' ? 'Inspector' : currentUserRole);
            const dateStr = now.toLocaleDateString('en-GB', {
                timeZone: 'Asia/Ho_Chi_Minh',
                day: '2-digit', month: 'long', year: 'numeric'
            });
            const timeStr = now.toLocaleTimeString('en-GB', {
                timeZone: 'Asia/Ho_Chi_Minh',
                hour: '2-digit', minute: '2-digit'
            });

            const totalTasks   = progress.totalTasks;
            const checkDone    = progress.checklistCompleted;
            const evDone       = progress.evidenceCompleted;
            const fullyDone    = progress.fullyCompletedTasks;
            const pending      = totalTasks - fullyDone;
            const overallPct   = progress.overallPercent;
            const checkPct     = progress.checklistPercent;
            const evPct        = progress.evidencePercent;

            const overallPctNum = parseFloat(overallPct);
            const statusText = overallPctNum >= 100
                ? '✅ COMPLETED'
                : overallPctNum > 0
                    ? `🔄 IN PROGRESS — ${overallPct}% done`
                    : '○ NOT STARTED';

            // --- Populate meta ---
            document.getElementById('print-session-info').textContent  = sessionId;
            document.getElementById('print-exported-by').textContent   = exportedBy;
            document.getElementById('print-date-info').textContent     = `${dateStr}  ${timeStr}`;
            document.getElementById('print-site').textContent          = 'AVT Gas Metering Station';
            document.getElementById('print-period').textContent        = dateStr;
            document.getElementById('print-status').textContent        = statusText;

            // --- Populate summary ---
            document.getElementById('print-total').textContent         = totalTasks;
            document.getElementById('print-checklist-done').textContent = checkDone;
            document.getElementById('print-evidence-done').textContent  = evDone;
            document.getElementById('print-fully-done').textContent    = fullyDone;
            document.getElementById('print-pending').textContent       = pending;
            document.getElementById('print-bar-checklist').style.width = `${checkPct}%`;
            document.getElementById('print-bar-evidence').style.width  = `${evPct}%`;
            document.getElementById('print-bar-overall').style.width   = `${overallPct}%`;

            // Color overall number by completion
            const fullyEl = document.getElementById('print-fully-done');
            fullyEl.classList.toggle('green', fullyDone === totalTasks && totalTasks > 0);
            fullyEl.classList.toggle('amber', fullyDone < totalTasks);

            // --- Category breakdown table ---
            const tbody = document.getElementById('print-cat-breakdown');
            tbody.innerHTML = '';
            currentData.forEach(cat => {
                const tasks = cat.tasks || [];
                const total = tasks.length;
                let catCheck = 0, catEv = 0, catFull = 0;
                tasks.forEach(task => {
                    const s = appState[task.id] || {};
                    if (s.checklist) catCheck++;
                    if (s.evidence)  catEv++;
                    if (s.checklist && s.evidence) catFull++;
                });
                const isComplete = catFull === total && total > 0;
                const isPartial  = catFull > 0 && catFull < total;
                const statusClass = isComplete ? 'status-done' : isPartial ? 'status-partial' : 'status-pending';
                const statusLabel = isComplete ? '✓ Complete' : isPartial ? '◑ Partial' : '○ Pending';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${escapeHtml(cat.title)}</td>
                    <td style="text-align:center">${total}</td>
                    <td style="text-align:center">${catCheck}</td>
                    <td style="text-align:center">${catEv}</td>
                    <td style="text-align:center">${catFull}</td>
                    <td style="text-align:center" class="${statusClass}">${statusLabel}</td>
                `;
                tbody.appendChild(tr);
            });

            // --- Build print-task-table: one table per category ---
            const taskTableEl = document.getElementById('print-task-table');
            taskTableEl.innerHTML = ''; // reset on each export

            currentData.forEach((cat, catIdx) => {
                const tasks = cat.tasks || [];
                if (tasks.length === 0) return;

                let catCheck = 0, catEv = 0, catFull = 0;
                tasks.forEach(t => {
                    const s = appState[t.id] || {};
                    if (s.checklist) catCheck++;
                    if (s.evidence) catEv++;
                    if (s.checklist && s.evidence) catFull++;
                });

                // Build rows
                let rowsHtml = '';
                tasks.forEach((task, idx) => {
                    const s = appState[task.id] || {};
                    const isFull    = s.checklist && s.evidence;
                    const isPartial = s.checklist || s.evidence;
                    const rowClass  = isFull ? 'task-full' : '';
                    const labelClass = isFull ? 'done' : '';

                    const checkIcon = s.checklist
                        ? '<span style="color:#0d6957;">&#10003;</span>'
                        : '<span style="color:#ccc;">&#9675;</span>';
                    const evIcon = s.evidence
                        ? '<span style="color:#0d6957;">&#10003;</span>'
                        : '<span style="color:#ccc;">&#9675;</span>';

                    let statusText, statusClass;
                    if (isFull)         { statusText = '&#10003; Done';    statusClass = 'done'; }
                    else if (isPartial) { statusText = '&#9696; Partial';  statusClass = 'partial'; }
                    else                { statusText = '&#9675; Pending';  statusClass = 'pending'; }

                    rowsHtml += `
                        <tr class="${rowClass}">
                            <td class="task-num">${idx + 1}</td>
                            <td class="task-label ${labelClass}">${escapeHtml(task.name)}</td>
                            <td class="cell-check">${checkIcon}</td>
                            <td class="cell-check">${evIcon}</td>
                            <td class="cell-status ${statusClass}">${statusText}</td>
                        </tr>`;
                });

                const progressLabel = `${catFull}/${tasks.length} complete`;

                const block = document.createElement('div');
                block.className = 'rpt-cat-block';
                block.innerHTML = `
                    <table class="rpt-cat-table">
                        <thead>
                            <tr>
                                <th colspan="2">
                                    ${escapeHtml(cat.title)}
                                    <span class="cat-progress">${progressLabel}</span>
                                </th>
                                <th class="col-center">Checklist</th>
                                <th class="col-center">Evidence</th>
                                <th class="col-status">Status</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>`;

                taskTableEl.appendChild(block);
            });

            // --- Notes Section (before signature block) ---
            (function buildNotesSection() {
                const noteRows = [];
                currentData.forEach(cat => {
                    const catKey = `cat-${cat.id}`;
                    const catNote = ((notesState[catKey] || {}).text || '').trim();
                    if (catNote) {
                        noteRows.push({ type: 'cat', source: escapeHtml(cat.title), text: escapeHtml(catNote) });
                    }
                    (cat.tasks || []).forEach(task => {
                        const taskKey = `task-${task.id}`;
                        const taskNote = ((notesState[taskKey] || {}).text || '').trim();
                        if (taskNote) {
                            noteRows.push({ type: 'task', source: `${escapeHtml(cat.title)} \u2192 ${escapeHtml(task.name)}`, text: escapeHtml(taskNote) });
                        }
                    });
                });

                let rowsHtml = '';
                if (noteRows.length > 0) {
                    noteRows.forEach(r => {
                        const badge = r.type === 'cat'
                            ? `<span class="notes-type-badge badge-cat">Category</span>`
                            : `<span class="notes-type-badge badge-task">Task</span>`;
                        rowsHtml += `<tr><td class="notes-src">${badge}${r.source}</td><td>${r.text.replace(/\n/g, '<br>')}</td></tr>`;
                    });
                } else {
                    rowsHtml =
                        `<tr class="notes-empty-row"><td class="notes-src"></td><td></td></tr>` +
                        `<tr class="notes-empty-row"><td class="notes-src"></td><td></td></tr>` +
                        `<tr class="notes-empty-row"><td class="notes-src"></td><td></td></tr>`;
                }

                taskTableEl.insertAdjacentHTML('beforeend', `
                    <div class="rpt-notes-section">
                        <div class="rpt-notes-title">Notes</div>
                        <table class="rpt-notes-table">
                            <thead><tr><th style="width:30%">Source</th><th>Note Content</th></tr></thead>
                            <tbody>${rowsHtml}</tbody>
                        </table>
                    </div>`);
            })();

            // --- Signature block (append to taskTableEl) ---
            const sigHtml = `
                <div class="rpt-signatures" style="margin-top:64px;">
                    <div class="rpt-sig-box">
                        <div class="rpt-sig-role">Prepared By</div>
                        <div class="rpt-sig-line"></div>
                        <div class="rpt-sig-note">Name &amp; Signature</div>
                    </div>
                    <div class="rpt-sig-box">
                        <div class="rpt-sig-role">Reviewed By</div>
                        <div class="rpt-sig-line"></div>
                        <div class="rpt-sig-note">Name &amp; Signature</div>
                    </div>
                    <div class="rpt-sig-box">
                        <div class="rpt-sig-role">Approved By</div>
                        <div class="rpt-sig-line"></div>
                        <div class="rpt-sig-note">Name &amp; Signature</div>
                    </div>
                </div>`;
            taskTableEl.insertAdjacentHTML('beforeend', sigHtml);

            // Clear browser title to suppress print header, restore after
            const _prevTitle = document.title;
            document.title = '';
            trackAction('export_pdf', { templateName: window.currentTemplateName || 'Blank', sessionId: currentSessionId });
            window.print();
            setTimeout(() => { document.title = _prevTitle; }, 1000);
        }

        // ============================================
        // TOAST NOTIFICATION SYSTEM
        // ============================================
        (function() {
            // Create container once
            const container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);

            const DURATION = 3800; // ms before auto-dismiss
            const MAX_VISIBLE = 4;
            let queue = [];

            function removeToast(el) {
                if (el.dataset.removing) return;
                el.dataset.removing = '1';
                el.classList.add('toast-hiding');
                clearTimeout(el._timer);
                el.addEventListener('animationend', () => {
                    el.remove();
                    queue = queue.filter(x => x !== el);
                }, { once: true });
            }

            window.showToast = function(type, title, message) {
                // Prune if too many
                const visible = container.querySelectorAll('.toast-item');
                if (visible.length >= MAX_VISIBLE) {
                    removeToast(visible[visible.length - 1]);
                }

                const el = document.createElement('div');
                el.className = `toast-item toast-${type}`;
                el.innerHTML = `
                    <div class="toast-icon">${getToastIcon(type)}</div>
                    <div class="toast-body">
                        <div class="toast-title">${escapeHtml(title)}</div>
                        <div class="toast-msg">${escapeHtml(message || '')}</div>
                    </div>
                    <div class="toast-close">✕</div>
                    <div class="toast-progress"></div>
                `;

                // Animate progress bar shrink
                const bar = el.querySelector('.toast-progress');
                bar.style.transition = `transform ${DURATION}ms linear`;
                bar.style.transform = 'scaleX(1)';

                // Click to dismiss
                el.addEventListener('click', () => removeToast(el));

                container.prepend(el);
                queue.push(el);

                // Start progress bar (next frame to trigger transition)
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        bar.style.transform = 'scaleX(0)';
                    });
                });

                // Auto-dismiss
                el._timer = setTimeout(() => removeToast(el), DURATION);
            };

            function getToastIcon(type) {
                const icons = {
                    success: '✅',
                    uncheck: '↩️',
                    warning: '⚠️',
                    info:    '📋',
                    note:    '📝'
                };
                return icons[type] || 'ℹ️';
            }
        })();

        // ============================================
        // ANALYTICS TRACKING
        // ============================================
        function trackAction(actionType, details = {}) {
            analyticsData.actions.push({
                type: actionType,
                timestamp: Date.now(),
                role: currentUserRole,
                sessionId: currentSessionId,
                ...details
            });
            saveAnalytics();
        }

        function trackCompletion() {
            const totalTasks = currentData.reduce((sum, cat) => sum + cat.tasks.length, 0);
            const completedTasks = Object.values(appState).filter(s => s.checklist && s.evidence).length;
            const completionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0;

            analyticsData.completionHistory.push({
                timestamp: Date.now(),
                totalTasks,
                completedTasks,
                completionRate: parseFloat(completionRate)
            });
            saveAnalytics();
        }

        function saveAnalytics() {
            localStorage.setItem('avt_analytics', JSON.stringify(analyticsData));
        }

        function loadAnalytics() {
            const saved = localStorage.getItem('avt_analytics');
            if (saved) {
                try {
                    analyticsData = JSON.parse(saved);
                } catch (e) {
                    analyticsData = { sessionStart: null, actions: [], completionHistory: [] };
                }
            }
        }


        function showAnalyticsDashboard() {
            const T = currentData.reduce((s, c) => s + (c.tasks || []).length, 0);
            let fullyDone = 0, checklistDone = 0, evidenceDone = 0;

            const missingEvidence  = []; // has checklist, no evidence
            const notChecked       = []; // no checklist (regardless of evidence)

            currentData.forEach(cat => {
                (cat.tasks || []).forEach(task => {
                    const s = appState[task.id] || {};
                    if (s.checklist && s.evidence)  fullyDone++;
                    if (s.checklist)                checklistDone++;
                    if (s.evidence)                 evidenceDone++;

                    if (!s.checklist && !s.evidence) {
                        notChecked.push({ name: task.name, cat: cat.name });
                    } else if (s.checklist && !s.evidence) {
                        missingEvidence.push({ name: task.name, cat: cat.name });
                    } else if (!s.checklist && s.evidence) {
                        notChecked.push({ name: task.name, cat: cat.name });
                    }
                });
            });

            const pending = T - fullyDone;

            // Notes count (task-level)
            const notesCount = currentData.reduce((s, cat) =>
                s + (cat.tasks || []).filter(t => notesState[`task-${t.id}`] && notesState[`task-${t.id}`].text).length, 0);

            // Active time: count intervals between consecutive actions, ignore gaps > 5min
            const IDLE_THRESH = 5 * 60 * 1000;
            let activeMs = 0;
            const acts = analyticsData.actions.slice().sort((a, b) => a.timestamp - b.timestamp);
            for (let i = 1; i < acts.length; i++) {
                const gap = acts[i].timestamp - acts[i - 1].timestamp;
                if (gap < IDLE_THRESH) activeMs += gap;
            }
            const activeMins = Math.max(0, Math.round(activeMs / 60000));

            // --- Populate KPI Cards ---
            const pct = T > 0 ? (fullyDone / T * 100).toFixed(0) : 0;
            document.getElementById('an-fully').textContent      = `${fullyDone}/${T}`;
            document.getElementById('an-fully-pct').textContent  = `${pct}% complete`;
            document.getElementById('an-checklist').textContent  = `${checklistDone}/${T}`;
            document.getElementById('an-evidence').textContent   = `${evidenceDone}/${T}`;
            document.getElementById('an-pending').textContent    = pending;
            document.getElementById('an-notes').textContent      = notesCount;
            document.getElementById('an-duration').textContent   = activeMins > 0 ? `${activeMins}m` : '< 1m';

            // --- Category Breakdown Table ---
            const tbody = document.getElementById('an-cat-tbody');
            tbody.innerHTML = '';
            currentData.forEach(cat => {
                const tasks = cat.tasks || [];
                const catTotal = tasks.length;
                if (!catTotal) return;
                let catFully = 0, catCL = 0, catEv = 0;
                tasks.forEach(t => {
                    const s = appState[t.id] || {};
                    if (s.checklist && s.evidence) catFully++;
                    if (s.checklist) catCL++;
                    if (s.evidence)  catEv++;
                });
                const catPct = Math.round(catFully / catTotal * 100);
                const barColor = catPct === 100 ? '#22c55e' : catPct > 0 ? '#3b82f6' : '#9ca3af';
                const statusIcon = catPct === 100 ? '✅' : catPct > 0 ? '🔄' : '○';
                tbody.insertAdjacentHTML('beforeend', `
                    <tr>
                        <td style="white-space:nowrap;">
                            <span style="font-size:11px;">${statusIcon}</span>
                            <span style="color:var(--text-main); font-weight:600;">${escapeHtml(cat.title || cat.name || '')}</span>
                        </td>
                        <td style="text-align:center; font-weight:700; color:var(--success-color);">${catFully}</td>
                        <td style="text-align:center; color:var(--primary-color);">${catCL}/${catTotal}</td>
                        <td style="text-align:center; color:#f59e0b;">${catEv}/${catTotal}</td>
                        <td>
                            <div style="display:flex; align-items:center; gap:6px;">
                                <div class="an-mini-bar-wrap">
                                    <div class="an-mini-bar-fill" style="width:${catPct}%; background:${barColor};"></div>
                                </div>
                                <span style="font-size:11px; color:var(--text-muted);">${catPct}%</span>
                            </div>
                        </td>
                    </tr>`);
            });

            // --- Recent Activity ---
            const activityEl = document.getElementById('an-activity');
            const evtMap = {
                'login':             ['🔑', 'Logged in'],
                'logout':            ['🚪', 'Logged out'],
                'session_switch':    ['🔀', 'Switched to session picker'],
                'checklist_check':   ['✅', 'Checked'],
                'checklist_uncheck': ['↩️', 'Unchecked'],
                'evidence_add':      ['📎', 'Evidence added'],
                'evidence_remove':   ['🗑️', 'Evidence removed'],
                'note_save':         ['📝', 'Note saved'],
                'note_clear':        ['🗒️', 'Note cleared'],
                'session_new':       ['🆕', 'New blank session'],
                'template_load':     ['📂', 'Template loaded'],
                'template_save':     ['💾', 'Template saved'],
                'template_overwrite':['🔁', 'Template updated'],
                'template_delete':   ['🗑️', 'Template deleted'],
                'task_add':          ['➕', 'Task added'],
                'task_rename':       ['✏️', 'Task renamed'],
                'task_delete':       ['❌', 'Task deleted'],
                'category_add':      ['📁', 'Category added'],
                'category_rename':   ['✏️', 'Category renamed'],
                'category_delete':   ['🗂️', 'Category deleted'],
                'progress_reset':    ['🔄', 'Progress reset'],
                'export_pdf':        ['🖨️', 'Exported PDF'],
                'error':             ['⚠️', 'Error occurred']
            };
            const recent = (analyticsData.actions || []).slice(-15).reverse();
            if (recent.length === 0) {
                activityEl.innerHTML = '<div style="padding:12px 0; color:var(--text-muted); text-align:center;">No actions recorded yet</div>';
            } else {
                activityEl.innerHTML = recent.map(a => {
                    const _d = new Date(a.timestamp);
                    const time = `${String(_d.getDate()).padStart(2,'0')}/${String(_d.getMonth()+1).padStart(2,'0')}/${String(_d.getFullYear()).slice(-2)} ${String(_d.getHours()).padStart(2,'0')}:${String(_d.getMinutes()).padStart(2,'0')}`;
                    let [icon, label] = evtMap[a.type] || ['•', a.type];
                    if (a.type === 'login') {
                        const roleLabel = a.role === 'admin' ? 'Admin' : a.role === 'client' ? 'Client' : a.role === 'view' ? 'Viewer' : (a.role || 'User');
                        label = `${roleLabel} logged in`;
                    }
                    const sub = a.taskName ? ` <span style="color:var(--text-muted);">${escapeHtml(a.taskName)}</span>` : '';
                    return `<div class="an-activity-item">
                        <span class="an-activity-time">${time}</span>
                        <span class="an-activity-text">${icon} ${label}${sub}</span>
                    </div>`;
                }).join('');
            }

            // --- Pending Tasks ---
            const mkList = (arr, emptyMsg) => arr.length === 0
                ? `<div style="padding:8px 0; color:var(--text-muted); font-style:italic;">${emptyMsg}</div>`
                : arr.map(i => `<div class="an-pending-item">
                        <div style="color:var(--text-main);">${escapeHtml(i.name)}</div>
                        <div class="an-pending-cat">${escapeHtml(i.cat)}</div>
                    </div>`).join('');

            document.getElementById('an-missing-evidence').innerHTML = mkList(missingEvidence, 'None — all have evidence ✅');
            document.getElementById('an-not-checked').innerHTML      = mkList(notChecked, 'None — all are checked ✅');

            const pendingSection = document.getElementById('an-pending-section');
            if (pending === 0) {
                pendingSection.innerHTML = `<div style="text-align:center; padding:16px; color:var(--success-color); font-weight:700;">🎉 All tasks fully completed!</div>`;
            }

            modalManager.show('analytics-modal');
        }

        function closeAnalyticsDashboard() {
            modalManager.hide('analytics-modal');
        }

        function toggleSidebar() {
            domCache.sidebar.classList.toggle('open');
            domCache.overlay.classList.toggle('open');
        }

        // Dashboard Metrics
        function updateDashboard() {
            const progress = calculateProgress();

            // Legacy hidden IDs (kept for domCache compatibility)
            domCache.checklistTotal.textContent = progress.totalTasks;
            domCache.checklistCount.textContent = progress.checklistCompleted;

            domCache.evidenceTotal.textContent = progress.totalTasks;
            domCache.evidenceCount.textContent = progress.evidenceCompleted;

            domCache.overallPercent.textContent = progress.overallPercent;
            document.getElementById('overall-task-done').textContent  = progress.fullyCompletedTasks;
            document.getElementById('overall-task-total').textContent = progress.totalTasks;
            domCache.overallProgress.style.width = `${progress.overallPercent}%`;
            domCache.checklistProgress.style.width = `${progress.checklistPercent}%`;
            domCache.evidenceProgress.style.width = `${progress.evidencePercent}%`;

            // ── Right Sidebar binding (Anti-Jitter: direct property writes only) ──
            const rsClCount = document.getElementById('rs-checklist-count');
            const rsClTotal = document.getElementById('rs-checklist-total');
            const rsClProg  = document.getElementById('rs-checklist-progress');
            const rsEvCount = document.getElementById('rs-evidence-count');
            const rsEvTotal = document.getElementById('rs-evidence-total');
            const rsEvProg  = document.getElementById('rs-evidence-progress');
            const gaugeDone = document.getElementById('gauge-task-done');
            const gaugeTotal= document.getElementById('gauge-task-total');

            if (rsClCount) rsClCount.textContent = progress.checklistCompleted;
            if (rsClTotal) rsClTotal.textContent = progress.totalTasks;
            if (rsClProg)  rsClProg.style.width  = `${progress.checklistPercent}%`;
            if (rsEvCount) rsEvCount.textContent = progress.evidenceCompleted;
            if (rsEvTotal) rsEvTotal.textContent = progress.totalTasks;
            if (rsEvProg)  rsEvProg.style.width  = `${progress.evidencePercent}%`;
            if (gaugeDone) gaugeDone.textContent = progress.fullyCompletedTasks;
            if (gaugeTotal)gaugeTotal.textContent= progress.totalTasks;

            // ── Persist overallProgress to Firebase metadata (1 field, lightweight) ──
            // This allows the Resume Modal to read it instantly without re-scanning all tasks
            if (isFirebaseEnabled && currentSessionId) {
                clearTimeout(updateDashboard._metaSyncTimer);
                updateDashboard._metaSyncTimer = setTimeout(() => {
                    // Store as float (e.g. 4.8) so we can display 1 decimal in the modal
                    db.ref(`sessions/${currentSessionId}/metadata/overallProgress`)
                      .set(parseFloat(progress.overallPercent))
                      .catch(() => {});
                }, 1500);
            }

            // ── Tier 5: Update KPI row & Liquid Gauge (Anti-Jitter) ──
            updateDashboardKPIs();
        }

        // Tier 5 — KPI Row & Liquid Gauge updater
        // Cached selectors to avoid repeated getElementById on every tick
        const _kpiEl = {
            completed: null,
            pending:   null,
            total:     null,
            gaugeVal:  null,
            gaugeLiq:  null,
            init() {
                this.completed = document.getElementById('kpi-completed');
                this.pending   = document.getElementById('kpi-pending');
                this.total     = document.getElementById('kpi-total');
                this.gaugeVal  = document.getElementById('station-gauge-value');
                this.gaugeLiq  = document.getElementById('station-gauge-liquid');
            }
        };

        function updateDashboardKPIs() {
            // Lazy-init cache on first call
            if (!_kpiEl.completed) _kpiEl.init();

            // Count from currentData — "completed" = BOTH checklist AND evidence done
            // (consistent with sidebar "Overall Completed" metric)
            let totalTasks     = 0;
            let completedTasks = 0;

            currentData.forEach(cat => {
                if (!cat.tasks) return;
                cat.tasks.forEach(task => {
                    totalTasks++;
                    const state = appState[task.id] || { checklist: false, evidence: false };
                    if (state.checklist && state.evidence) completedTasks++;
                });
            });

            const pendingTasks = totalTasks - completedTasks;
            const percentRaw   = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;
            const percentLabel = totalTasks === 0 ? '0.0' : percentRaw.toFixed(1); // match sidebar format

            // Direct DOM property writes — NO innerHTML reassignment
            _kpiEl.completed.innerText       = completedTasks;
            _kpiEl.pending.innerText         = pendingTasks;
            _kpiEl.total.innerText           = totalTasks;
            _kpiEl.gaugeVal.innerText        = percentLabel + '%';
            _kpiEl.gaugeLiq.style.height     = percentRaw + '%';
        }

        function updateCategoryProgress() {
            currentData.forEach(cat => {
                updateSingleCategoryProgress(cat.id);
            });
        }

        function updateSingleCategoryProgress(catId) {
            const cat = currentData.find(c => c.id === catId);
            if (!cat) return;

            let catTasks = cat.tasks.length;
            let fullyCompleted = 0;

            cat.tasks.forEach(task => {
                const state = appState[task.id] || { checklist: false, evidence: false };
                if (state.checklist && state.evidence) fullyCompleted++;
            });

            const progressElement = document.getElementById(`cat-progress-${cat.id}`);
            if (progressElement) {
                progressElement.textContent = `${fullyCompleted}/${catTasks}`;
                progressElement.classList.toggle('completed', fullyCompleted === catTasks && catTasks > 0);
            }
        }

        // ============================================
        // INCREMENTAL RENDERING SYSTEM
        // ============================================

        // Render a single category (incremental update — title/progress only, no DOM rebuild)
        function renderCategory(cat, isNew = false) {
            const existingCat = document.querySelector(`[data-category-id="${cat.id}"]`);

            if (existingCat && !isNew) {
                // Only patch title text if changed — do NOT touch task-list innerHTML
                const titleEl = existingCat.querySelector('.category-title');
                if (titleEl && titleEl.textContent !== cat.title) {
                    titleEl.textContent = cat.title;
                }
                // Progress will be recalculated by updateSingleCategoryProgress
            } else {
                // Create new category element from scratch
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'category';
                categoryDiv.setAttribute('data-category-id', cat.id);

                categoryDiv.innerHTML = `
                    <div class="category-header">
                        <h2 class="category-title">${escapeHtml(cat.title)}</h2>
                        <div class="admin-controls">
                            <button class="icon-btn" data-action="edit-category" data-cat-id="${cat.id}" title="Edit Category Title" aria-label="Edit category: ${escapeHtml(cat.title)}">
                                <i class="fas fa-pen text-xs"></i>
                            </button>
                            <button class="icon-btn delete" data-action="delete-category" data-cat-id="${cat.id}" title="Delete Category" aria-label="Delete category: ${escapeHtml(cat.title)}" style="margin-left: 4px;">
                                <i class="fas fa-trash text-xs"></i>
                            </button>
                        </div>
                        <span class="category-progress" id="cat-progress-${cat.id}" style="margin-left: auto;">0/${cat.tasks.length}</span>
                    </div>
                    <div class="task-list" id="list-${cat.id}"></div>
                `;

                domCache.categoriesContainer.appendChild(categoryDiv);
                renderCategoryTasks(cat);
            }
        }

        // Render tasks for a specific category
        function renderCategoryTasks(cat) {
            const taskList = document.getElementById(`list-${cat.id}`);
            if (!taskList) return;

            taskList.innerHTML = '';

            cat.tasks.forEach(task => {
                const state = appState[task.id] || { checklist: false, evidence: false };
                const isFullyCompleted = state.checklist && state.evidence;

                const taskItem = document.createElement('div');
                taskItem.className = `task-item ${isFullyCompleted ? 'is-completed' : ''}`;
                taskItem.id = `container-${task.id}`;

                taskItem.innerHTML = `
                    <div class="task-name ${isFullyCompleted ? 'completed' : ''}" id="name-${task.id}">
                        ${escapeHtml(task.name)}
                    </div>
                    <div class="task-actions">
                        <label class="checkbox-group" data-tooltip="Mark task as done">
                            <input type="checkbox"
                                id="task-${task.id}-done"
                                data-task-id="${task.id}"
                                data-property="checklist"
                                aria-label="${escapeHtml(task.name)} — Mark as done"
                                aria-checked="${state.checklist ? 'true' : 'false'}"
                                ${state.checklist ? 'checked' : ''}
                                ${currentUserRole === 'view' ? 'disabled' : ''}
                            >
                            <div class="checkbox"><i class="fas fa-check"></i></div>
                            <span>Task</span>
                        </label>

                        <label class="checkbox-group evidence" data-tooltip="Evidence gathered">
                            <input type="checkbox"
                                id="task-${task.id}-evidence"
                                data-task-id="${task.id}"
                                data-property="evidence"
                                aria-label="${escapeHtml(task.name)} — Evidence gathered"
                                aria-checked="${state.evidence ? 'true' : 'false'}"
                                ${state.evidence ? 'checked' : ''}
                                ${currentUserRole === 'view' ? 'disabled' : ''}
                            >
                            <div class="checkbox evidence-box"><i class="fas fa-check"></i></div>
                            <span>Evidence</span>
                        </label>

                        <div class="admin-controls">
                            <button class="icon-btn" data-action="edit-task" data-cat-id="${cat.id}" data-task-id="${task.id}" title="Edit Task" aria-label="Edit task: ${escapeHtml(task.name)}">
                                <i class="fas fa-pen text-xs"></i>
                            </button>
                            <button class="icon-btn delete" data-action="delete-task" data-cat-id="${cat.id}" data-task-id="${task.id}" title="Delete Task" aria-label="Delete task: ${escapeHtml(task.name)}">
                                <i class="fas fa-times text-xs"></i>
                            </button>
                        </div>
                    </div>
                `;

                taskList.appendChild(taskItem);
            });

            // Add Task Button
            const addBtnDiv = document.createElement('div');
            addBtnDiv.innerHTML = `
                <button class="add-task-btn" data-action="add-task" data-cat-id="${cat.id}">
                    <i class="fas fa-plus" style="margin-right: 6px;"></i> Add new task
                </button>
            `;
            taskList.appendChild(addBtnDiv);
        }

        // Optimized render with incremental updates
        function renderIncremental() {
            // Check if number of categories changed
            const existingCategories = domCache.categoriesContainer.querySelectorAll('[data-category-id]');
            const categoryCountChanged = existingCategories.length !== currentData.length;

            if (categoryCountChanged) {
                // Full rebuild if category count changed
                render();
            } else {
                // Incremental update - only update changed categories
                currentData.forEach(cat => renderCategory(cat, false));
                updateDashboard();
                updateCategoryProgress();
            }
        }

        // Rendering Core
        function render() {
            domCache.categoriesContainer.innerHTML = '';

            currentData.forEach(cat => {
                if (!cat.tasks) cat.tasks = [];
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'category';
                categoryDiv.setAttribute('data-category-id', cat.id);

                categoryDiv.innerHTML = `
                    <div class="category-header">
                        <h2 class="category-title">${escapeHtml(cat.title)}</h2>
                        <button class="note-btn" id="note-btn-cat-${cat.id}"
                                onclick="openNoteModal('cat','${cat.id}','${escapeHtml(cat.title).replace(/'/g,"&apos;")}')"
                                aria-label="Note: ${escapeHtml(cat.title)}">
                            <i class="fas fa-sticky-note"></i>
                            <span class="note-dot"></span>
                        </button>
                        <div class="admin-controls">
                            <button class="icon-btn" data-action="edit-category" data-cat-id="${cat.id}" title="Edit Category Title" aria-label="Edit category: ${escapeHtml(cat.title)}">
                                <i class="fas fa-pen text-xs"></i>
                            </button>
                            <button class="icon-btn delete" data-action="delete-category" data-cat-id="${cat.id}" title="Delete Category" aria-label="Delete category: ${escapeHtml(cat.title)}" style="margin-left: 4px;">
                                <i class="fas fa-trash text-xs"></i>
                            </button>
                        </div>
                        <span class="category-progress" id="cat-progress-${cat.id}" style="margin-left: auto;">0/${cat.tasks.length}</span>
                    </div>
                    <div class="task-list" id="list-${cat.id}"></div>
                `;

                domCache.categoriesContainer.appendChild(categoryDiv);

                const taskList = document.getElementById(`list-${cat.id}`);

                cat.tasks.forEach(task => {
                    const state = appState[task.id] || { checklist: false, evidence: false };
                    const isFullyCompleted = state.checklist && state.evidence;

                    const taskItem = document.createElement('div');
                    taskItem.className = `task-item ${isFullyCompleted ? 'is-completed' : ''}`;
                    taskItem.id = `container-${task.id}`;

                    taskItem.innerHTML = `
                        <div class="task-name ${isFullyCompleted ? 'completed' : ''}" id="name-${task.id}">
                            ${escapeHtml(task.name)}
                        </div>
                        <div class="task-actions">
                            <label class="checkbox-group">
                                <input type="checkbox"
                                    id="task-${task.id}-done"
                                    data-task-id="${task.id}"
                                    data-property="checklist"
                                    aria-label="${escapeHtml(task.name)} — Mark as done"
                                    aria-checked="${state.checklist ? 'true' : 'false'}"
                                    ${state.checklist ? 'checked' : ''}
                                    ${currentUserRole === 'view' ? 'disabled' : ''}
                                >
                                <div class="checkbox"><i class="fas fa-check"></i></div>
                                <span>Task</span>
                            </label>

                            <label class="checkbox-group evidence">
                                <input type="checkbox"
                                    id="task-${task.id}-evidence"
                                    data-task-id="${task.id}"
                                    data-property="evidence"
                                    aria-label="${escapeHtml(task.name)} — Evidence gathered"
                                    aria-checked="${state.evidence ? 'true' : 'false'}"
                                    ${state.evidence ? 'checked' : ''}
                                    ${currentUserRole === 'view' ? 'disabled' : ''}
                                >
                                <div class="checkbox evidence-box"><i class="fas fa-check"></i></div>
                                <span>Evidence</span>
                            </label>

                            <button class="note-btn" id="note-btn-task-${task.id}"
                                    onclick="openNoteModal('task','${task.id}','${escapeHtml(task.name).replace(/'/g,"&apos;")}')"
                                    aria-label="Note: ${escapeHtml(task.name)}">
                                <i class="fas fa-sticky-note"></i>
                                <span class="note-dot"></span>
                            </button>
                            <div class="admin-controls">
                                <button class="icon-btn" data-action="edit-task" data-cat-id="${cat.id}" data-task-id="${task.id}" title="Edit Task" aria-label="Edit task: ${escapeHtml(task.name)}">
                                    <i class="fas fa-pen text-xs"></i>
                                </button>
                                <button class="icon-btn delete" data-action="delete-task" data-cat-id="${cat.id}" data-task-id="${task.id}" title="Delete Task" aria-label="Delete task: ${escapeHtml(task.name)}">
                                    <i class="fas fa-times text-xs"></i>
                                </button>
                            </div>
                        </div>
                    `;

                    taskList.appendChild(taskItem);
                });

                // Add Task Button (Admin only css handled)
                const addBtnDiv = document.createElement('div');
                addBtnDiv.innerHTML = `
                    <button class="add-task-btn" data-action="add-task" data-cat-id="${cat.id}">
                        <i class="fas fa-plus" style="margin-right: 6px;"></i> Add new task
                    </button>
                `;
                taskList.appendChild(addBtnDiv);
            });

            // Add Category Button
            if (domCache.addCategoryContainer) {
                domCache.addCategoryContainer.innerHTML = `
                    <button class="add-task-btn" data-action="add-category" style="border-radius: 6px; border: 1px dashed var(--border-color); text-align: center;">
                        <i class="fas fa-folder-plus" style="margin-right: 6px;"></i> Add New Category...
                    </button>
                `;
            }

            updateDashboard();
            updateCategoryProgress();
            updateAllNoteIndicators();
        }

        // ============================================
        // SUPPORT & FEEDBACK MODAL
        // ============================================

        function showSupportModal() {
            const modal = document.getElementById('support-modal');
            if (!modal) return;
            // Reset state
            const textarea = document.getElementById('support-feedback-text');
            const statusMsg = document.getElementById('support-status-msg');
            const submitBtn = document.getElementById('support-submit-btn');
            if (textarea) textarea.value = '';
            if (statusMsg) { statusMsg.style.display = 'none'; statusMsg.textContent = ''; }
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-paper-plane" style="margin-right:6px;"></i>Submit Feedback'; }
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            modalManager.register('support-modal');
            if (textarea) setTimeout(() => textarea.focus(), 100);
        }

        function closeSupportModal() {
            const modal = document.getElementById('support-modal');
            if (!modal) return;
            modal.style.display = 'none';
            document.body.style.overflow = '';
            const textarea = document.getElementById('support-feedback-text');
            if (textarea) textarea.value = '';
        }

        function handleSupportSubmit(event) {
            event.preventDefault();

            const textarea  = document.getElementById('support-feedback-text');
            const statusMsg = document.getElementById('support-status-msg');
            const submitBtn = document.getElementById('support-submit-btn');
            const feedbackText = textarea ? textarea.value.trim() : '';

            if (!feedbackText) return;

            // ── Security: Client-side Rate Limiting (max 1 submission per 5 minutes) ──
            const RATE_LIMIT_MS  = 5 * 60 * 1000; // 5 minutes
            const RATE_LIMIT_KEY = 'avt_support_last_submit';
            const lastSubmitStr  = sessionStorage.getItem(RATE_LIMIT_KEY);
            if (lastSubmitStr) {
                const elapsed = Date.now() - parseInt(lastSubmitStr, 10);
                if (elapsed < RATE_LIMIT_MS) {
                    const remaining = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000 / 60);
                    if (statusMsg) {
                        statusMsg.style.display     = 'block';
                        statusMsg.style.background  = 'rgba(235,87,87,0.12)';
                        statusMsg.style.borderColor = 'rgba(235,87,87,0.4)';
                        statusMsg.style.color       = '#eb5757';
                        statusMsg.textContent = `⏳ Please wait ${remaining} more minute(s) before submitting again.`;
                    }
                    return;
                }
            }

            // Disable button & show sending state
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Sending…';
            }
            if (statusMsg) {
                statusMsg.style.display = 'block';
                statusMsg.style.background  = 'rgba(0,168,232,0.10)';
                statusMsg.style.borderColor = 'rgba(0,168,232,0.35)';
                statusMsg.style.color       = 'var(--primary-accent)';
                statusMsg.textContent = '⏳ Sending your feedback…';
            }

            // ── Context capture ──
            const now      = new Date();
            const dd  = String(now.getDate()).padStart(2,'0');
            const mm  = String(now.getMonth()+1).padStart(2,'0');
            const yyyy = now.getFullYear();
            const hh  = String(now.getHours()).padStart(2,'0');
            const min = String(now.getMinutes()).padStart(2,'0');
            const dateStr  = `${dd}-${mm}-${yyyy} ${hh}:${min}`;
            const userRole = currentUserRole || 'unknown';
            const sessId   = currentSessionId || '--';

            // Use stored Template ID & Name (set when a template is loaded via createSessionFromTemplate)
            // Falls back to 'BLANK' if user started a blank session, or 'NONE' if no session
            const templateId   = window.currentTemplateId   || (currentSessionId ? 'BLANK' : 'NONE');
            const templateName = window.currentTemplateName || (currentSessionId ? 'Blank Session' : 'No Session');

            // Overall progress %
            const gaugeEl   = document.getElementById('station-gauge-value');
            const overallPct = gaugeEl ? gaugeEl.textContent : '0%';

            const emailSubject = `[AVT Feedback] ${dateStr} | ${userRole.toUpperCase()} | ${sessId} | ${templateId} | ${overallPct}`;
            const emailBody    = [
                feedbackText,
                '',
                '--- Context ---',
                `Date/Time      : ${dateStr}`,
                `User Role      : ${userRole}`,
                `Session ID     : ${sessId}`,
                `Template Name  : ${templateName}`,
                `Template ID    : ${templateId}`,
                `Progress       : ${overallPct}`,
            ].join('\n');

            // ── EmailJS send ──
            // STEP 1: Replace the three placeholder strings below with your EmailJS credentials
            //         from https://dashboard.emailjs.com/
            const EMAILJS_SERVICE_ID  = 'service_g6tj7dj';   // ✅ EmailJS Service ID
            const EMAILJS_TEMPLATE_ID = 'template_617hcjd';  // ✅ EmailJS Template ID
            const EMAILJS_PUBLIC_KEY  = 'lXVMz4sl6-asPS7CK'; // ✅ EmailJS Public Key

            // STEP 2: In your EmailJS template, map these variables:
            //   {{to_email}}   → phantiendat1985@gmail.com
            //   {{subject}}    → subject line
            //   {{message}}    → full body
            const templateParams = {
                to_email : 'phantiendat1985@gmail.com',
                subject  : emailSubject,
                message  : emailBody,
            };

            // Check if EmailJS library is loaded
            if (typeof emailjs === 'undefined') {
                // Fallback: open mailto link
                const mailtoUrl = `mailto:phantiendat1985@gmail.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
                window.open(mailtoUrl, '_blank');
                if (statusMsg) {
                    statusMsg.style.background  = 'rgba(26,127,100,0.15)';
                    statusMsg.style.borderColor = 'rgba(26,127,100,0.45)';
                    statusMsg.style.color       = '#00d4a0';
                    statusMsg.textContent = '✅ Mail client opened! (EmailJS not configured yet)';
                }
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-paper-plane" style="margin-right:6px;"></i>Submit Feedback';
                }
                setTimeout(() => closeSupportModal(), 2500);
                return;
            }

            emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY)
                .then(() => {
                    // ── Rate Limit: stamp the timestamp on success ──
                    sessionStorage.setItem(RATE_LIMIT_KEY, String(Date.now()));
                    if (statusMsg) {
                        statusMsg.style.background  = 'rgba(26,127,100,0.15)';
                        statusMsg.style.borderColor = 'rgba(26,127,100,0.45)';
                        statusMsg.style.color       = '#00d4a0';
                        statusMsg.textContent = '✅ Feedback sent! Thank you — we will review it shortly.';
                    }
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.innerHTML = '<i class="fas fa-check" style="margin-right:6px;"></i>Sent!';
                    }
                    setTimeout(() => closeSupportModal(), 2000);
                })
                .catch(err => {
                    console.error('EmailJS error:', err);
                    if (statusMsg) {
                        statusMsg.style.background  = 'rgba(235,87,87,0.12)';
                        statusMsg.style.borderColor = 'rgba(235,87,87,0.4)';
                        statusMsg.style.color       = '#eb5757';
                        statusMsg.textContent = '❌ Failed to send. Please try again or contact us directly.';
                    }
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="fas fa-paper-plane" style="margin-right:6px;"></i>Submit Feedback';
                    }
                });
        }

        // Run on load
        document.addEventListener('DOMContentLoaded', () => {
            // Initialize DOM cache for performance
            domCache.init();

            // Initialize loading state
            loadingState.init();

            // Setup event delegation
            setupEventDelegation();

            // Register all modals
            modalManager.register('auth-modal');
            modalManager.register('resume-modal');
            modalManager.register('action-modal');
            modalManager.register('save-template-modal');
            modalManager.register('template-library-modal');
            modalManager.register('analytics-modal');
            modalManager.register('note-modal');

            // Load analytics data
            loadAnalytics();

            // Check session login state with validation
            const sessRole = sessionStorage.getItem('gas_metering_session_role');
            if (sessRole && isValidRole(sessRole)) {
                authenticate(sessRole);
            } else if (sessRole) {
                // Invalid role detected - clear and force re-login
                sessionStorage.removeItem('gas_metering_session_role');
            }
        });
        /* ── Floating note-preview tooltip ── */
        (function () {
            let tip = null;
            let hideTimer = null;

            function getTip() {
                if (!tip) {
                    tip = document.createElement('div');
                    tip.id = 'note-floating-tip';
                    document.body.appendChild(tip);
                }
                return tip;
            }

            function showTip(btn) {
                const preview = btn.getAttribute('data-note-preview');
                if (!preview) return;
                clearTimeout(hideTimer);
                const el = getTip();
                el.textContent = preview;
                el.classList.remove('visible');

                // Position above the button using viewport coords
                const rect = btn.getBoundingClientRect();
                // Temporarily show off-screen to measure width
                el.style.visibility = 'hidden';
                el.style.display = 'block';
                const tw = el.offsetWidth;
                el.style.visibility = '';

                let left = rect.left + rect.width / 2 - tw / 2;
                let top  = rect.top - el.offsetHeight - 10;

                // Flip below if too close to top
                if (top < 8) {
                    top = rect.bottom + 10;
                    el.style.setProperty('--arrow-top', '1');
                } else {
                    el.style.removeProperty('--arrow-top');
                }

                // Keep within viewport horizontally
                left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));

                el.style.left = left + 'px';
                el.style.top  = top  + 'px';

                requestAnimationFrame(() => el.classList.add('visible'));
            }

            function hideTip() {
                if (!tip) return;
                tip.classList.remove('visible');
            }

            // Event delegation — single listener on document
            document.addEventListener('mouseenter', (e) => {
                const btn = e.target.closest('.note-btn.has-note');
                if (btn) showTip(btn);
            }, true);

            document.addEventListener('mouseleave', (e) => {
                const btn = e.target.closest('.note-btn.has-note');
                if (btn) hideTip();
            }, true);
        })();
    