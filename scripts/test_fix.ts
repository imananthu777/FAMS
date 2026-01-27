
import { storage } from "../server/storage";

async function simulateAdminView() {
    const users = await storage.getUsers();
    const assets = await storage.getAssets();

    const admin = users.find(u => u.role === 'Admin');
    if (!admin) { console.log('No admin'); return; }

    // Simulate picking "Manager 2"
    const mgr2 = users.find(u => u.role === 'Manager 2');
    if (!mgr2) {
        // Try searching loosely
        const mgr = users.find(u => u.role.toLowerCase().includes('manager') && u.role.includes('2'));
        if (mgr) {
            console.log(`Found Manager 2: ${mgr.username} (${mgr.role}, ${mgr.branchCode})`);
            simulateManagerView(mgr, users, assets);
        } else {
            console.log('Manager 2 not found');
        }
        return;
    }
    console.log(`Found Manager 2: ${mgr2.username} (${mgr2.role}, ${mgr2.branchCode})`);
    simulateManagerView(mgr2, users, assets);
}

function simulateManagerView(manager: any, users: any[], assets: any[]) {
    // Logic from Assets.tsx
    const validBranches = new Set<string>();
    validBranches.add(String(manager.branchCode));
    users.forEach(u => {
        if (String(u.ReportingTo) === String(manager.branchCode)) {
            validBranches.add(String(u.branchCode));
        }
    });

    console.log("Valid Branch Codes for this Manager:", Array.from(validBranches));

    const filteredAssets = assets.filter(a => validBranches.has(String(a.branchCode)));

    console.log(`\nFound ${filteredAssets.length} assets for this manager hierarchy.`);

    // Check for Thanjaur assets specifically
    const thanjaurAssets = filteredAssets.filter(a => a.branchName === 'Thanjaur');
    console.log(`Thanjaur Assets included: ${thanjaurAssets.length}`);
    if (thanjaurAssets.length > 0) {
        console.log("Sample Thanjaur Asset:", thanjaurAssets[0].name, thanjaurAssets[0].branchCode);
    } else {
        console.log("WARNING: Thanjaur assets missing from this view!");
        // Debug why
        const allThanjaur = assets.filter(a => a.branchName === 'Thanjaur');
        console.log(`Total Thanjaur assets in DB: ${allThanjaur.length}`);
        if (allThanjaur.length > 0) {
            console.log(`Sample Thanjaur Asset Code: ${allThanjaur[0].branchCode}`);
            console.log(`Is this code in validBranches? ${validBranches.has(String(allThanjaur[0].branchCode))}`);
        }
    }
}

simulateAdminView().catch(console.error);
