
import { caseStudies, users } from "../shared/schema";

// Mock DB
const SIMULATED_LATENCY_MS = 20;

const mockDb = {
  insert: (table: any) => {
    return {
      values: (data: any) => {
        return {
          returning: async () => {
            await new Promise(resolve => setTimeout(resolve, SIMULATED_LATENCY_MS));

            // Validate input
            if (!data) throw new Error("No data");

            if (Array.isArray(data)) {
               // Batch
               if (data.some((d: any) => d.title.includes("FAIL"))) {
                 throw new Error("Simulated Batch Failure");
               }
               return data.map((d, i) => ({ ...d, id: `mock-id-${i}` }));
            } else {
               // Single
               if (data.title.includes("FAIL")) {
                 throw new Error("Simulated Single Failure");
               }
               return [{ ...data, id: `mock-id-single` }];
            }
          }
        }
      }
    }
  },
  delete: (table: any) => {
    return {
      where: async (condition: any) => {
         // no-op
      }
    }
  }
};

const db = mockDb;

async function runVerification() {
  console.log("Running Verification with Logic from server/routes.ts...");

  // Mock Request Data
  const caseStudiesData = Array.from({ length: 5 }).map((_, i) => ({
    title: i === 2 ? "Case Study FAIL" : `Case Study ${i}`,
    scenario: "Scenario...",
    questions: [],
    referenceArticles: [],
    sampleAnswer: "",
    modelEvaluation: "",
    aiFeedback: "",
    difficulty: "medium",
    estimatedTime: 10
  }));

  const userId = "user-123";
  const subject = "civil";
  const examDay = "day1";
  const sourceType = "test";
  const sourceLLM = "gpt";
  const batch = { id: "batch-123" };

  // --- COPIED LOGIC FROM server/routes.ts ---
  const insertedCaseStudies = [];
  const errors: Array<{ index: number; error: string }> = [];

  // Prepare all data objects first
  const caseStudiesDataPrepared = caseStudiesData.map((cs: any) => ({
    userId,
    subject,
    examDay: examDay || null,
    title: cs.title,
    scenario: cs.scenario,
    questions: cs.questions,
    referenceArticles: cs.referenceArticles,
    sampleAnswer: cs.sampleAnswer,
    modelEvaluation: cs.modelEvaluation,
    aiFeedback: cs.aiFeedback,
    sourceType,
    sourceLLM: sourceLLM || null,
    batchId: batch.id,
    difficulty: cs.difficulty,
    estimatedTime: cs.estimatedTime
  }));

  try {
    // Attempt batch insert
    const inserted = await db.insert(caseStudies).values(caseStudiesDataPrepared).returning();
    // @ts-ignore
    inserted.forEach(i => insertedCaseStudies.push(i));
    console.log("Batch insert succeeded (Unexpected for this test case)");
  } catch (batchError) {
    console.log("[Bulk Import] Batch insert failed as expected, falling back to sequential insert.");

    // Fallback to sequential insert
    for (let i = 0; i < caseStudiesDataPrepared.length; i++) {
      const csData = caseStudiesDataPrepared[i];
      try {
        const [inserted] = await db.insert(caseStudies).values(csData).returning();
        insertedCaseStudies.push(inserted);
      } catch (csErr: any) {
         console.warn(`Failed to insert case study ${i}:`, csErr.message);
         errors.push({ index: i, error: csErr.message });
      }
    }
  }
  // --- END COPIED LOGIC ---

  console.log("\nResults:");
  console.log(`Inserted: ${insertedCaseStudies.length}`);
  console.log(`Errors: ${errors.length}`);

  if (insertedCaseStudies.length === 4 && errors.length === 1) {
    console.log("VERIFICATION PASSED: Fallback logic correctly saved valid records and reported error.");
  } else {
    console.error("VERIFICATION FAILED");
    process.exit(1);
  }
}

runVerification().catch(console.error);
