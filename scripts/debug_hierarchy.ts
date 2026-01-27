
import { storage } from "../server/storage";

async function main() {
    const users = await storage.getUsers();
    const assets = await storage.getAssets();

    console.log("USERS DATA:");
    users.forEach(u => {
        console.log(`ID: ${u.id}, Username: ${u.username}, Role: ${u.role}, BranchCode: ${u.branchCode}, ReportingTo: ${u.ReportingTo}`);
    });

    console.log("\nLATEST 5 ASSETS:");
    assets.slice(-5).forEach(a => {
        console.log(`ID: ${a.id}, Name: ${a.name}, BranchName: ${a.branchName}, BranchCode: ${a.branchCode}, User: ${a.branchUser}`);
    });
}

main().catch(console.error);
