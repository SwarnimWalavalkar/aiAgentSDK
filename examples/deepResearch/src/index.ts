import "dotenv/config";

import { createFlow } from "../../../packages/core/orchestrators/flow";
import { join } from "path";
import { mkdir, writeFile } from "fs/promises";
import { researchAgent } from "./agents/researchAgent";
import { queryReformulationAgent } from "./agents/queryReformulationAgent";

// const problem = `A taxi driver earns $9461 per 1-hour work. If he works 12 hours a day and in 1 hour he uses 12-liters petrol with price $134 for 1-liter. How much money does he earn in one day?`;
// const problem = `A bakery sells cupcakes for $3 each. It costs them $1.25 to make each cupcake. If they sell 150 cupcakes a day for 6 days a week, how much profit do they make in a month (assuming 4 weeks in a month)?`;
// const problem = `A factory produces 500 toys per day. Each toy requires 3 plastic parts and 2 metal parts. If plastic parts cost $0.50 each and metal parts cost $0.75 each, what is the total cost of parts for one week's production?`;

// const problem = `What is the weather in Tokyo tomorrow?`;
// const problem = `What is the stock price of the company Jensen Huang is the CEO of?`;
// const problem = `What are the latest developments in quantum computing and their potential impact on cryptography?`;
// const problem = `Who were the sponsors of ETHIndia 2024? And how large was the prize pool?`;
const problem =
  "How do the Nvidia RTX 5000 series compare to the RTX 4000 series? Specifically, the RTX 5070 versus the RTX 4070, and 4080 versus 5080?";

console.log(`PROBLEM: ${problem}\n`);

const main = async () => {
  try {
    const flow = createFlow({
      agents: [queryReformulationAgent, researchAgent],
    });

    const result = await flow.run(problem);

    const fileName = "example.md";
    const outputDir = join(process.cwd(), "output");
    await mkdir(outputDir, { recursive: true }).catch(() => {});

    await writeFile(join(outputDir, fileName), result);

    console.log(`Output logged in ${outputDir}/${fileName}`);
  } catch (error) {
    console.error("ERROR:", error);
    process.exit(1);
  }
};

main();
