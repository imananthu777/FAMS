
import { storage } from "../server/storage";

async function debugManagerView() {
    console.log("--- DEBUGGING MANAGER VIEW (Kerala Manager 1) ---\n");

    const users = await storage.getUsers();
    const keralaManager = users.find(u => u.username === "Kerala" && u.role.includes("Manager"));

    if (!keralaManager) {
        console.log("Kerala manager not found!");
        return;
    }

    console.log("Manager Info:");
    console.log(`  Username: ${keralaManager.username}`);
    console.log(`  Role: ${keralaManager.role}`);
    console.log(`  BranchCode: ${keralaManager.branchCode}`);
    console.log();

    // Simulate the API call that useAssets makes
    const filter = { role: keralaManager.role, branchCode: keralaManager.branchCode };
    console.log("API Call: /api/assets with filter:", filter);

    const assets = await storage.getAssets(filter);
    console.log(`Returned ${assets.length} assets\n`);

    // Extract unique branch names (what the UI does)
    const uniqueBranchNames = [...new Set(assets.map(a => a.branchName))].sort();
    console.log(`Unique Branch Names (${uniqueBranchNames.length}):`);
    uniqueBranchNames.forEach(name => {
        const count = assets.filter(a => a.branchName === name).length;
        console.log(`  - ${name} (${count} assets)`);
    });

    if (uniqueBranchNames.length === 0) {
        console.log("\n⚠️  NO BRANCHES FOUND - Debugging why:");
        console.log("\nSample assets (first 3):");
        assets.slice(0, 3).forEach(a => {
            console.log(`  Asset: ${a.name}`);
            console.log(`    branchName: '${a.branchName}'`);
            console.log(`    branchCode: '${a.branchCode}'`);
            console.log(`    ManagerID: '${a.ManagerID}'`);
        });
    }
}

debugManagerView().catch(console.error);
