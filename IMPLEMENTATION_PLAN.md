# AVT Metering Checklist — Frontend Upgrade Plan

**File:** `AVT_metering_checklist.html` (~3.860 dòng, ~146KB)
**Last Updated:** 2026-03-20
**AI Session Context:** Antigravity (Gemini Deep Mind)

---

## ⚠️ CẨN THẬN — Jitter/Flicker Bug (Đã fix, không được tái phát)

> KI Location: `2794a0b9-e0c0-45e1-8147-14e5d17b58d6/jitter_dom_rebuild_bug.md`

**Root cause đã fix:** 3 luồng gây re-render toàn bộ DOM khi tick checkbox
1. Firebase `checked` listener → không được gọi `render()` — chỉ `updateTaskStyles()` in-place
2. `renderCategoryTasks()` dùng `innerHTML = ''` → chỉ dùng khi **structure** thay đổi (add/delete)
3. `renderCategory` incremental path → không gọi `renderCategoryTasks` nếu category đã tồn tại

**Golden Rule khi thêm animations:**
- ❌ KHÔNG dùng `innerHTML = ''` → trigger trong update loop
- ❌ KHÔNG thêm animation class vào elements cũ mà không check `.is-animated` flag
- ✅ Chỉ add animation một lần khi element **được tạo mới** (initial render)
- ✅ Dùng `will-change: transform, opacity` chỉ khi thực sự cần, remove sau khi animation xong

---

## STATUS HIỆN TẠI

| Tier | Trạng thái | Ngày bắt đầu |
|---|---|---|
| **Tier 1 — Quick Wins** | ✅ DONE (2026-03-20) | 2026-03-20 |
| **Tier 2 — Visual Premium** | ✅ DONE (2026-03-20) | 2026-03-20 |
| **Tier 3 — Architecture** | 🚫 Dropped — giữ single-file HTML | — |

> **Project HOÀN THÀNH.** Tier 3 không làm theo yêu cầu giữ sự đơn giản (1 file HTML duy nhất, dễ deploy và maintain).

---

## TIER 1 — Quick Wins ✅ DONE

**Đã implement vào `AVT_metering_checklist.html` ngày 2026-03-20**

### CSS thêm vào (cuối block `<style>`, trước `</style>`):

#### 1. `prefers-reduced-motion` — Wrapper toàn bộ animations
Bắt buộc phải là block đầu tiên trong Tier 1 CSS để override tất cả animations bên dưới:
```css
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
    }
}
```

#### 2. Checkbox — Spring animation khi check (không jitter vì không rebuild DOM)
```css
.checkbox {
    transition: background 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
                border-color 0.15s ease,
                transform 0.15s ease;
}
.checkbox:hover { transform: scale(1.05); }

@keyframes checkSpring {
    0%   { transform: scale(0.75); }
    55%  { transform: scale(1.18); }
    80%  { transform: scale(0.95); }
    100% { transform: scale(1); }
}
.checkbox-group input:checked + .checkbox {
    animation: checkSpring 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.checkbox i {
    transition: opacity 0.15s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform: scale(0.8);
}
.checkbox-group input:checked + .checkbox i { transform: scale(1); }
```

#### 3. Progress bar — Smooth transition (safe vì không rebuild innerHTML)
```css
/* Override `transition: none` cũ */
.progress-bar {
    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important;
}
```

#### 4. Toast — Spring entrance (thay translateY flat cũ)
```css
.toast {
    transform: translateY(120%) scale(0.95);
    opacity: 0;
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
                opacity 0.3s ease !important;
}
.toast.show {
    transform: translateY(0) scale(1);
    opacity: 1;
}
```

#### 5. Icon buttons — Hover lift effect
```css
.icon-btn {
    transition: background 0.15s ease, color 0.15s ease,
                transform 0.15s ease, box-shadow 0.15s ease;
}
.icon-btn:hover { transform: translateY(-1px); box-shadow: var(--shadow-sm); }
.icon-btn:active { transform: translateY(0) scale(0.94); box-shadow: none; }
```

#### 6. Sidebar nav items — Slide indicator
```css
.sidebar-nav-item {
    transition: background 0.15s ease, color 0.15s ease,
                padding-left 0.15s ease;
}
.sidebar-nav-item.active { padding-left: 18px; }
.sidebar-nav-item:not(.active):hover { padding-left: 14px; }
```

---

## TIER 2 — Visual Premium ✅ DONE

**Đã implement vào `AVT_metering_checklist.html` ngày 2026-03-20**

### 2.1 Typography Upgrade ✅
- Google Fonts: `DM Sans` (body) + `Space Grotesk` (display/headers) + `IBM Plex Mono` (mono)
- CSS variables: `--font-display`, `--font-body`, `--font-mono`
- Applied: `body { font-family: var(--font-body) }`, headers dùng `var(--font-display)`

### 2.2 Color System — AVT Brand ✅
- `--primary-color: #0f4c81` (Deep Navy — thay #1d6fa4)
- `--primary-accent: #00a8e8` (Electric Blue — glow effects)
- `--success-color: #1a7f64` (Forest Green)
- Shadows tinted với primary: `rgba(15,76,129,...)`

### 2.3 Glassmorphism Upgrade ✅
- `.auth-container`: `backdrop-filter: blur(20px) saturate(180%)`, glass border `rgba(255,255,255,0.6)`, depth shadows
- Dark mode: `rgba(30,37,48,0.95)` glass background
- Auth modal entrance: `@keyframes authSpring` — scale(0.88→1) + translateY

### 2.4 Skeleton Loading ✅
- `@keyframes shimmer` — linear-gradient sweep 1.6s
- `.skeleton`, `.skeleton-task` (52px height), `.skeleton-cat-header` (36px)
- Dark mode variant với màu `#1e2530` → `#2a3347`
- **Dùng bằng JS:** `el.innerHTML = '<div class="skeleton skeleton-task"></div>'` trước khi Firebase data về

### 2.5 Task Hover Enhancement ✅
- `box-shadow: inset 3px 0 0 var(--primary-color)` — không gây layout shift (vs border-left)
- Completed task hover: inset màu `--success-color`

---

## TIER 3 — Architecture Refactor ⏳ TODO

### 3.1 File Structure
```
AVT metering checklist/
├── index.html              (~50 lines shell)
├── css/
│   ├── variables.css
│   ├── layout.css
│   ├── components.css
│   ├── animations.css
│   └── print.css
├── js/
│   ├── auth.js
│   ├── checklist.js
│   ├── templates.js
│   ├── analytics.js
│   ├── pdf-export.js
│   └── ui.js
└── data/
    └── default-checklist.json
```

### 3.2 Anime.js Integration
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js"></script>
```
- Stagger animation khi render categories (initial load only — safe với jitter fix)
- Counter animation cho sidebar metrics

### 3.3 SVG Donut Chart
- Pure SVG, no library
- `stroke-dasharray` + `stroke-dashoffset` pattern
- `transition: stroke-dashoffset 0.6s ease`

---

## Notes cho AI sessions tiếp theo

1. **Luôn đọc KI jitter bug trước khi thêm bất kỳ animation nào**:
   - File: `C:\Users\dat-b\.gemini\antigravity\brain\2794a0b9-e0c0-45e1-8147-14e5d17b58d6\jitter_dom_rebuild_bug.md`

2. **Pattern an toàn cho animations:**
   - CSS-only transitions trên thuộc tính `transform`, `opacity`, `background-color`
   - Animation class chỉ add khi element **mới được tạo** trong `renderTask()` hoặc `renderCategory()`
   - Dùng `animation: X forwards` (không `infinite`) để tránh CPU waste

3. **Test sau mỗi thay đổi:**
   - Tick nhiều checkbox nhanh liên tục → không được thấy flash
   - Firebase sync → categories không được rebuild
   - Dark mode → animations phải match màu sắc

4. **Các file JS test hiện có:**
   - `test.js`, `test2.js`, `test_dom.js` — kiểm tra trước khi thay đổi logic JS

---
*Plan này được maintain bởi Antigravity AI — cập nhật sau mỗi tier hoàn thành.*
