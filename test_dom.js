const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

(async () => {
    try {
        console.log('→ Loading HTML file...');
        const html = fs.readFileSync('C:/Users/dat-b/Documents/AVT metering checklist/AVT_metering_checklist.html', 'utf8');
        const dom = new JSDOM(html, { runScripts: "dangerously" });
        const window = dom.window;
        const document = window.document;

        // Simulate client login
        console.log('→ Testing client role with JSDOM...');
        window.sessionStorage.setItem('gas_metering_session_role', 'client');
        window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

        setTimeout(() => {
            try {
                const adminControls = document.querySelectorAll('.admin-controls');
                console.log(`✓ Found ${adminControls.length} admin-controls elements`);

                const container = document.getElementById('categories-container');
                if (!container) {
                    throw new Error('Categories container not found');
                }

                const hasAdminMode = container.classList.contains('admin-mode');
                console.log(`✓ Admin mode on container: ${hasAdminMode}`);
                console.log('✓ JSDOM test completed');
            } catch (error) {
                console.error('✗ Test failed:', error.message);
                process.exit(1);
            }
        }, 500);
    } catch (error) {
        console.error('✗ Fatal error:', error.message);
        process.exit(1);
    }
})();
