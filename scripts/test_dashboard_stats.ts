
import { storage } from "../server/storage";

async function testDashboardStats() {
    console.log("--- TESTING DASHBOARD STATS FOR KERALA MANAGER ---\n");

    const users = await storage.getUsers();
    const keralaManager = users.find(u => u.username === "Kerala" && u.role.includes("Manager"));

    if (!keralaManager) {
        console.log("Kerala manager not found!");
        return;
    }

    console.log("Manager Info:");
    console.log(`  Username: ${keralaManager.username}`);
    console.log(`  Role: ${keralaManager.role}`);
    console.log(`  BranchCode: ${keralaManager.branchCode}\n`);

    // Test the dashboard stats
    const filter = { role: keralaManager.role, branchCode: keralaManager.branchCode };
    console.log("Calling getDashboardStats with filter:", filter);

    const stats = await storage.getDashboardStats(filter);
    console.log("\nDashboard Stats:");
    console.log(JSON.stringify(stats, null, 2));
}

testDashboardStats().catch(console.error);
