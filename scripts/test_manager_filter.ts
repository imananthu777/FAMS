
import { storage } from "../server/storage";

async function testManagerFilter() {
    console.log("--- TESTING MANAGER FILTER ---");

    // Test with the exact params from the URL
    const filter = { role: "Manager1", branchCode: "Kerala" };
    console.log("Filter:", filter);

    const assets = await storage.getAssets(filter);
    console.log(`Found ${assets.length} assets with this filter.`);

    // Let's check what the actual data looks like
    const allAssets = await storage.getAssets();
    console.log(`Total assets in DB: ${allAssets.length}`);

    // Check for assets with ManagerID containing "Manager"
    const withManagerId = allAssets.filter(a => a.ManagerID && a.ManagerID.includes("Manager"));
    console.log(`Assets with ManagerID containing 'Manager': ${withManagerId.length}`);

    if (withManagerId.length > 0) {
        console.log("\nSample ManagerID values:");
        const uniqueManagerIds = [...new Set(withManagerId.map(a => a.ManagerID))];
        uniqueManagerIds.slice(0, 5).forEach(id => console.log(`  - '${id}'`));
    }

    // Now test with space
    const filter2 = { role: "Manager 1", branchCode: "Kerala" };
    console.log("\n--- Testing with 'Manager 1' (with space) ---");
    const assets2 = await storage.getAssets(filter2);
    console.log(`Found ${assets2.length} assets with this filter.`);

    // Check the role field comparison
    console.log("\nComparison test:");
    console.log(`  'Manager1'.includes('Manager'): ${"Manager1".includes('Manager')}`);
    console.log(`  'Manager 1'.includes('Manager'): ${"Manager 1".includes('Manager')}`);
}

testManagerFilter().catch(console.error);
