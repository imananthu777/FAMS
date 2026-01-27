
import { storage } from "../server/storage";

async function main() {
    const users = await storage.getUsers();
    console.log("ALL USERS:");
    users.forEach(u => {
        console.log(`ID: ${u.id}, User: ${u.username}, Role: ${u.role}, Code: ${u.branchCode}, RepTo: ${u.ReportingTo}`);
    });
}

main().catch(console.error);
