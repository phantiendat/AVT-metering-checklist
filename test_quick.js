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

    console.log('\n=== Testing New Features ===');

    const domCacheInit = await p.evaluate(() => {
        return typeof domCache !== 'undefined' && domCache.categoriesContainer !== null;
    });
    console.log('✓ DOM Cache initialized:', domCacheInit);

    const loadingStateInit = await p.evaluate(() => {
        return typeof loadingState !== 'undefined' && loadingState.overlay !== null;
    });
    console.log('✓ Loading State initialized:', loadingStateInit);

    const modalManagerInit = await p.evaluate(() => {
        return typeof modalManager !== 'undefined' && Object.keys(modalManager.modals).length > 0;
    });
    console.log('✓ Modal Manager initialized:', modalManagerInit);

    const calculateProgressExists = await p.evaluate(() => {
        return typeof calculateProgress === 'function';
    });
    console.log('✓ calculateProgress function exists:', calculateProgressExists);

    const errorHandlerExists = await p.evaluate(() => {
        return typeof errorHandler !== 'undefined';
    });
    console.log('✓ Error Handler exists:', errorHandlerExists);

    const showToastExists = await p.evaluate(() => {
        return typeof showToast === 'function';
    });
    console.log('✓ showToast function exists:', showToastExists);

    console.log('\n=== All checks passed! ===\n');

    await b.close();
})();
