const puppeteer = require('puppeteer');

(async () => {
    let b, p;
    try {
        b = await puppeteer.launch();
        p = await b.newPage();
        await p.setViewport({ width: 1440, height: 900 });
        p.on('pageerror', e => console.error('PAGE ERROR:', e));

        await p.goto('file:///c:/Users/dat-b/Documents/AVT%20metering%20checklist/AVT_metering_checklist.html', {
            waitUntil: 'networkidle0',
            timeout: 10000
        });

        // Test Client role
        console.log('→ Testing Client role...');
        await p.evaluate(() => authenticate('client'));
        await p.waitForTimeout(500);
        await p.screenshot({ path: 'verify_client.png', fullPage: true });

        const visibleAdminControls = await p.evaluate(() => {
            const els = document.querySelectorAll('.admin-controls');
            let visibleCount = 0;
            els.forEach(el => {
                const style = window.getComputedStyle(el);
                if (style.display !== 'none' || el.offsetParent !== null) {
                    visibleCount++;
                }
            });
            return visibleCount;
        });
        if (visibleAdminControls > 0) {
            throw new Error(`Client should not see admin controls, but ${visibleAdminControls} are visible`);
        }
        console.log('✓ Client role: admin controls hidden');

        // Test View role
        console.log('→ Testing View role...');
        await p.evaluate(() => logout());
        await p.waitForTimeout(500);
        await p.evaluate(() => authenticate('view'));
        await p.waitForTimeout(500);
        await p.screenshot({ path: 'verify_view.png', fullPage: true });

        const isPointerEventsNone = await p.evaluate(() => {
            const cb = document.querySelector('.view-mode input[type="checkbox"]');
            if (!cb) return false;
            return window.getComputedStyle(cb).pointerEvents === 'none';
        });
        if (!isPointerEventsNone) {
            throw new Error('View mode should disable checkboxes');
        }
        console.log('✓ View role: checkboxes disabled');

        const isResetHidden = await p.evaluate(() => {
            const rbtn = document.querySelector('#reset-btn');
            if (!rbtn) return true;
            return window.getComputedStyle(rbtn).display === 'none';
        });
        if (!isResetHidden) {
            throw new Error('View mode should hide reset button');
        }
        console.log('✓ View role: reset button hidden');
        console.log('✓ All permission tests passed');

    } catch (error) {
        console.error('✗ Test failed:', error.message);
        if (p) await p.screenshot({path: 'test2-error.png', fullPage: true});
        throw error;
    } finally {
        if (b) await b.close();
    }
})().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
