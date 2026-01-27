
import { storage } from "../server/storage";
import { User } from "../shared/schema";



async function checkUsers() {
    const users = await storage.getUsers();
    console.log("Total Users:", users.length);
    users.forEach(u => {
        console.log(`User: ${u.username}, Role: ${u.role}, Branch: ${u.branchCode}, ReportingTo: ${u.ReportingTo}`);
    });
}

checkUsers();
