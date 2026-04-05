# Support Feedback Feature Implementation Plan

This document outlines the design and implementation requirements for adding the "Support & Feedback" feature to the Lumina Industrial dashboard. As requested, this plan is prepared for execution by Claude 3.5 Sonnet.

## Goal
Implement a "Support" button in the left sidebar (below "Export PDF") accessible to all user roles (Admin, Client, Viewer). The button will open a glassmorphic modal allowing users to submit product improvement feedback. The submitted feedback must be automatically emailed to `phantiendat1985@gmail.com`.

## Technical Requirements & Constraints
> [!IMPORTANT]
> **Email Integration:** We have chosen **EmailJS** as the infrastructure for sending backend emails.
> Sonnet 3.5 must implement the `handleSupportSubmit` function to use the standard `emailjs.send()` method or a REST `fetch` call matching the EmailJS API structure. 
> *   Please leave placeholder strings like `"YOUR_SERVICE_ID"`, `"YOUR_TEMPLATE_ID"`, and `"YOUR_PUBLIC_KEY"` in the code with clear inline comments so the user knows where to paste their credentials.

## Proposed Changes

### `AVT_metering_checklist.html`

#### 1. Sidebar Nav Update (HTML)
*   **Where:** Inside the `<nav class="sidebar-nav">` element, directly below the `#nav-export` button.
*   **What:** Add a new button for Support.
*   **Permissions:** Apply CSS or JS logic to ensure this button is always visible to Admin, Client, and Viewer roles.
```html
<button class="nav-item-v2" id="nav-support" onclick="showSupportModal()" aria-label="Support & Feedback">
    <i class="fas fa-envelope-open-text"></i> Support
</button>
```

#### 2. Support Modal UI (HTML)
*   **Where:** Inside the `<body>`, alongside other modals like `#action-modal` and `#note-modal`.
*   **What:** Create `#support-modal` utilizing the existing Lumina Industrial V2 architecture (`.modal-overlay` + `.modal-box`).
*   **Design Specs:**
    *   **Header:** Use a gradient icon chip (e.g., green/blue gradient) with a headset or envelope icon. Title: "Support & Feedback". Subtitle: "Help us improve this product. Your feedback will be sent directly to the development team."
    *   **Fields:**
        *   `textarea` for the feedback body.
    *   **Actions:** "Cancel" (Secondary button) and "Submit Feedback" (Primary button).
    *   **Feedback Mechanism:** Incorporate an inline alert box (similar to `#auth-error`) to show "Sending..." state and success/error messages.

#### 3. Support Modal Logic & Context Injection (JavaScript)
*   **Where:** Add to the bottom of the script block or near modal functions.
*   **Functions needed:**
    *   `showSupportModal()`: Displays the modal, locks body scroll.
    *   `closeSupportModal()`: Hides the modal, clears input text.
    *   `handleSupportSubmit(event)`:
        1. Prevents default form submission.
        2. Disables the submit button and updates text to "Sending...".
        3. **Automatically Captures Context variables:**
            *   `Date/Time`: Current timestamp.
            *   `User Role`: Fetched from current login state.
            *   `Session ID`: `currentSessionId`
            *   `Template Name`: Captured if available from the active session.
            *   `Overall Progress`: Overall % completed from the UI (`#station-gauge-value` or DOM cached variables).
        4. **Payload Construction:** Create a dynamic Email **Subject** formatted as: `[Feedback] - {Date} - {User Role} - Session: {Session ID} - {Template Name}`.
        5. Triggers the chosen email API fetch request attaching the context metadata along with the user's message.
        6. On success, shows a success badge and auto-closes after 2 seconds.

#### 4. Role Authorization Update (JavaScript)
*   **Where:** In `applyRolePermissions(role)` and authentication flows.
*   **What:** Ensure `#nav-support` style is explicitly set to `display: flex !important;` (or similar) ensuring it is exempt from any restrictions applied to standard users.

## Execution Rules for Sonnet
> [!WARNING]
> *   **Anti-Jitter Rule:** Sonnet must NOT use `innerHTML` to replace existing structures. All DOM modifications must happen by injecting the new HTML block carefully, or via targeted `createElement` / class toggling.
> *   **Style Consistency:** Sonnet must use the established variables like `var(--glass-bg)`, `var(--radius-md)`, `modal-btn-primary`, and glassmorphic blur effects. Do not introduce inline styles unless necessary for positioning logic.

## Verification Plan
1. **Visibility Test:** Sonnet will log in as `admin`, `client`, and `viewer` to verify the "Support" button remains visible and clickable in the sidebar for all roles.
2. **Modal Experience:** Verify that clicking the button opens the modal smoothly and standard modal click-away (clicking `.modal-overlay`) correctly closes it.
3. **Submission Test:** Validate that clicking "Submit" sends a payload (or correctly triggers the email API chosen) and handles loading/success states cleanly.
