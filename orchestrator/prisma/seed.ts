import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_PROMPTS = [
  {
    type: "planner",
    content: `You are a content planner. Given source items, extract the main topic and create a brief outline for an article.

Source items (JSON):
{{SOURCE_ITEMS}}

Respond with JSON only:
{
  "topic": "main topic in one sentence",
  "outline": "bullet point outline for the article, 3-5 points"
}`,
  },
  {
    type: "scorer",
    content: `You are a content opportunity scorer. Rate how worthwhile it is to publish content on this topic (0-1).

Topic/Outline:
{{OUTLINE}}

{{FEEDBACK_SECTION}}

Consider: relevance, interest, uniqueness, potential value to readers.

Respond with JSON only:
{
  "topicScore": 0.0 to 1.0
}`,
  },
  {
    type: "writer",
    content: `You are a content writer. Create a draft article based on the outline and source material.

Outline:
{{OUTLINE}}

Source summary:
{{SOURCE_SUMMARY}}

Write a clear, informative article. 300-500 words. Use markdown formatting.`,
  },
  {
    type: "reviewer",
    content: `You are a content quality reviewer. Evaluate the draft on: clarity, logic, format, no repetition, no spam/risk.

Draft:
{{DRAFT}}

Respond with JSON only:
{
  "reviewScore": 0.0 to 1.0,
  "reviewNotes": "brief notes on quality",
  "riskFlag": false
}`,
  },
];

async function main() {
  for (const p of DEFAULT_PROMPTS) {
    const existing = await prisma.promptVersion.findFirst({
      where: { type: p.type, isActive: true },
    });
    if (existing) {
      console.log(`Prompt ${p.type} already seeded`);
      continue;
    }

    const latest = await prisma.promptVersion.findFirst({
      where: { type: p.type },
      orderBy: { version: "desc" },
    });
    const version = (latest?.version ?? 0) + 1;

    await prisma.promptVersion.create({
      data: {
        type: p.type,
        version,
        content: p.content,
        isActive: true,
      },
    });
    console.log(`Created prompt ${p.type} v${version}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
