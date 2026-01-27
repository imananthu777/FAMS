
import { storage } from "../server/storage";

async function debugStorage() {
    console.log("--- DEBUGGING STORAGE ---");

    // 1. Check a Manager User
    const users = await storage.getUsers();
    const manager = users.find(u => u.role.includes("Manager"));
    if (manager) {
        console.log(`\nTesting Manager: ${manager.username}, Role: '${manager.role}', BranchCode: '${manager.branchCode}'`);

        // Call getAssets as the API would
        const assets = await storage.getAssets({ role: manager.role, branchCode: manager.branchCode });
        console.log(`Found ${assets.length} assets for this manager.`);
        if (assets.length === 0) {
            console.log("  No assets found! Inspecting raw assets to see why...");
            const allAssets = await storage.getAssets(); // Get basic raw list (Admin view)

            // Check if any asset has this ManagerID
            const potentialMatches = allAssets.filter(a => String(a.ManagerID).trim() === manager.role.trim());
            console.log(`  Raw assets with ManagerID '${manager.role}': ${potentialMatches.length}`);
            if (potentialMatches.length > 0) {
                console.log("  Sample match:", potentialMatches[0]);
                console.log("  ManagerID in Asset:", `'${potentialMatches[0].ManagerID}'`);
                console.log("  Manager Role:", `'${manager.role}'`);
                console.log("  Comparison:", `'${potentialMatches[0].ManagerID}'` === `'${manager.role}'`);
            } else {
                console.log("  No raw assets match this ManagerID. Showing first 3 assets to check column names:");
                console.table(allAssets.slice(0, 3));
            }
        }
    } else {
        console.log("No Manager user found to test.");
    }

    // 2. Check a Branch User
    const branchUser = users.find(u => u.role === "Branch User");
    if (branchUser) {
        console.log(`\nTesting Branch User: ${branchUser.username}, BranchCode: '${branchUser.branchCode}'`);
        const assets = await storage.getAssets({ role: branchUser.role, branchCode: branchUser.branchCode });
        console.log(`Found ${assets.length} assets for this branch user.`);
        if (assets.length === 0) {
            console.log("  No assets found! Inspecting raw assets...");
            const allAssets = await storage.getAssets();
            // Try matching by code or name
            const byCode = allAssets.filter(a => String(a.branchCode) === String(branchUser.branchCode));
            const byName = allAssets.filter(a => String(a.branchName) === String(branchUser.branchCode)); // unlikely but possible mismatch logic

            console.log(`  Assets with branchCode '${branchUser.branchCode}': ${byCode.length}`);
            console.log(`  Assets with branchName '${branchUser.branchCode}': ${byName.length}`);

            if (byCode.length > 0) {
                console.log("  Sample byCode:", byCode[0]);
            }
        }
    }

}

debugStorage().catch(console.error);
