
import 'dotenv/config';
import { indexLegislativeActs } from "./services/clean-room/indexer";

async function main() {
    try {
        await indexLegislativeActs();
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

main();
