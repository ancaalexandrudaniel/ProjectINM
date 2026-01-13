
import 'dotenv/config';
console.log("Key status:", process.env.GEMINI_API_KEY ? "PRESENT, Length: " + process.env.GEMINI_API_KEY.length : "MISSING");
