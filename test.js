const puppeteer = require('puppeteer');

(async () => {
    let b, p;
    try {
        b = await puppeteer.launch();
        p = await b.newPage();
        await p.setViewport({width: 1440, height: 900});
        p.on('console', m => console.log('CONSOLE:', m.text()));
        p.on('pageerror', e => console.error('PAGE ERROR:', e));

        await p.goto('file:///c:/Users/dat-b/Documents/AVT%20metering%20checklist/AVT_metering_checklist.html', {
            waitUntil: 'networkidle0',
            timeout: 10000
        });

        // Login as admin
        console.log('→ Authenticating as admin...');
        await p.evaluate(() => authenticate('admin'));
        await p.waitForTimeout(500);

        // Check titles
        const title = await p.evaluate(() => document.title);
        const h1 = await p.evaluate(() => document.querySelector('.page-title')?.textContent);
        if (!h1) throw new Error('Page title element not found');
        console.log('✓ Title:', title);
        console.log('✓ H1:', h1);

        await p.screenshot({path: 'test1.png', fullPage: true});

        // Edit category
        console.log('→ Testing edit category...');
        const catBtn = await p.$$('.icon-btn');
        if (!catBtn[0]) throw new Error('Edit button not found');
        await catBtn[0].click();
        await p.waitForTimeout(500);
        await p.evaluate(() => document.getElementById('action-input').value = 'Pressure Sensor Tests');
        await p.click('#action-submit-btn');
        await p.waitForTimeout(500);
        console.log('✓ Category edited');

        // Add category
        console.log('→ Testing add category...');
        const addCatBtn = await p.$('button[onclick="addCategory()"]');
        if (!addCatBtn) throw new Error('Add Category button not found');
        await addCatBtn.click();
        await p.waitForTimeout(500);
        await p.evaluate(() => document.getElementById('action-input').value = 'Miscellaneous Checks');
        await p.click('#action-submit-btn');
        await p.waitForTimeout(500);
        console.log('✓ Category added');

        await p.screenshot({path: 'test2.png', fullPage: true});
        console.log('✓ All tests passed');
    } catch (error) {
        console.error('✗ Test failed:', error.message);
        if (p) await p.screenshot({path: 'test-error.png', fullPage: true});
        throw error;
    } finally {
        if (b) await b.close();
    }
})().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
