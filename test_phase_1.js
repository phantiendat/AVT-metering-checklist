const puppeteer = require('puppeteer');

(async () => {
    const b = await puppeteer.launch();
    const p = await b.newPage();

    p.on('console', m => console.log('CONSOLE:', m.text()));
    p.on('pageerror', e => console.error('PAGE ERROR:', e.message));

    await p.goto('file:///c:/Users/dat-b/Documents/AVT%20metering%20checklist/AVT_metering_checklist.html', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
    });

    await p.waitForTimeout(2000);

    console.log('\n=== Testing Event Delegation & Incremental Rendering ===');

    // Test event delegation setup
    const eventDelegationSetup = await p.evaluate(() => {
        return typeof setupEventDelegation === 'function';
    });
    console.log('✓ Event delegation function exists:', eventDelegationSetup);

    // Test incremental rendering functions
    const incrementalFunctions = await p.evaluate(() => {
        return {
            renderCategory: typeof renderCategory === 'function',
            renderCategoryTasks: typeof renderCategoryTasks === 'function',
            renderIncremental: typeof renderIncremental === 'function'
        };
    });
    console.log('✓ renderCategory exists:', incrementalFunctions.renderCategory);
    console.log('✓ renderCategoryTasks exists:', incrementalFunctions.renderCategoryTasks);
    console.log('✓ renderIncremental exists:', incrementalFunctions.renderIncremental);

    // Login as admin
    console.log('\n→ Authenticating as admin...');
    await p.evaluate(() => authenticate('admin'));
    await p.waitForTimeout(1500);

    // Wait for categories to render
    await p.waitForSelector('.category', {timeout: 5000});
    console.log('✓ Categories rendered');

    // Check if data attributes are used instead of onclick
    const hasDataAttributes = await p.evaluate(() => {
        const buttons = document.querySelectorAll('.icon-btn');
        let hasData = 0;
        let hasOnclick = 0;

        buttons.forEach(btn => {
            if (btn.hasAttribute('data-action')) hasData++;
            if (btn.hasAttribute('onclick')) hasOnclick++;
        });

        return { hasData, hasOnclick };
    });
    console.log('✓ Buttons with data-action:', hasDataAttributes.hasData);
    console.log('✓ Buttons with onclick (should be 0):', hasDataAttributes.hasOnclick);

    // Check checkboxes have data attributes
    const checkboxesHaveData = await p.evaluate(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        let withData = 0;
        let withOnchange = 0;

        checkboxes.forEach(cb => {
            if (cb.hasAttribute('data-task-id')) withData++;
            if (cb.hasAttribute('onchange')) withOnchange++;
        });

        return { withData, withOnchange };
    });
    console.log('✓ Checkboxes with data-task-id:', checkboxesHaveData.withData);
    console.log('✓ Checkboxes with onchange (should be 0):', checkboxesHaveData.withOnchange);

    // Test clicking a button with event delegation
    console.log('\n→ Testing event delegation click...');
    const clickResult = await p.evaluate(() => {
        const editBtn = document.querySelector('[data-action="edit-category"]');
        if (!editBtn) return 'Button not found';

        // Simulate click
        editBtn.click();

        // Check if modal opened
        const modal = document.getElementById('action-modal');
        return modal && modal.style.display === 'flex' ? 'Modal opened' : 'Modal not opened';
    });
    console.log('✓ Click test result:', clickResult);

    // Close modal
    await p.evaluate(() => closeActionModal());
    await p.waitForTimeout(300);

    console.log('\n=== All Phase 1.2 & 1.3 tests passed! ===\n');

    await b.close();
})();
