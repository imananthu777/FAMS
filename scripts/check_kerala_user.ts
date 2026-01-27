
import { storage } from "../server/storage";

async function checkKeralUser() {
    const users = await storage.getUsers();
    const kerala = users.find(u => u.username === "Kerala");

    if (kerala) {
        console.log("Kerala User Object:");
        console.log(JSON.stringify(kerala, null, 2));
        console.log("\nRole field:", `'${kerala.role}'`);
        console.log("BranchCode field:", `'${kerala.branchCode}'`);
    } else {
        console.log("Kerala user not found!");
    }
}

checkKeralUser().catch(console.error);
