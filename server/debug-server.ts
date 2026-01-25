
import 'dotenv/config';
console.log("Debug server starting...");

async function testImports() {
    try {
        console.log("Importing db...");
        await import('./db');
        console.log("Importing auth...");
        await import('./auth');
        console.log("Importing storage...");
        await import('./storage');
        console.log("Importing routes...");
        await import('./routes');
        console.log("Importing vite...");
        await import('./vite');
        console.log("All imports successful.");
    } catch (err: any) {
        console.error("Import failed:", err);
        console.error("Stack:", err.stack);
    }
}

testImports();
