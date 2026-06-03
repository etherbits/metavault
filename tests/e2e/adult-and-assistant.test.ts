import { expect, test } from "@playwright/test";
import { signIn } from "../helpers/auth";

test("EZQ can create and search adult entries", async ({ request }) => {
  await signIn(request);
  const suffix = Date.now();
  const titleToken = `adult_entry_${suffix}`;

  const createResponse = await request.post("/ezq", {
    data: { query: `/create ${titleToken} adult:true` },
  });
  expect(createResponse.ok()).toBeTruthy();

  const created = await createResponse.json();
  expect(created.rows).toHaveLength(1);
  expect(created.rows[0]).toMatchObject({
    title: titleToken.replace(/_/g, " "),
    adult: true,
  });

  const searchResponse = await request.post("/ezq", {
    data: { query: `/search adult:true title:${titleToken}` },
  });
  expect(searchResponse.ok()).toBeTruthy();

  const searched = await searchResponse.json();
  expect(searched.rows).toHaveLength(1);
  expect(searched.rows[0]).toMatchObject({
    id: created.rows[0].id,
    adult: true,
  });
});

test("assistant chat uses OpenAI-compatible integration config", async ({
  request,
}) => {
  await signIn(request);
  const sourceMockPort = process.env.METAVAULT_E2E_SOURCE_MOCK_PORT ?? "3636";
  const baseUrl = `http://localhost:${sourceMockPort}/openai/v1`;

  const configResponse = await request.put(
    "/ai-integrations/openai_compatible",
    {
      data: {
        is_active: true,
        config: {
          baseUrl,
          apiKey: "test-key",
          model: "mock-gpt",
        },
      },
    }
  );
  expect(configResponse.ok()).toBeTruthy();

  const chatResponse = await request.post("/assistant/chat", {
    data: {
      message: "Describe the current results.",
      history: [{ role: "user", content: "Remember this session." }],
      context: {
        currentQuery: "/s adult:true",
        canonicalQuery: "search adult:true",
        visibleResults: [
          {
            id: "entry-1",
            title: "Adult Entry",
            media_type: "anime",
            status: "planning",
            adult: true,
            public_rating: 8,
            personal_rating: null,
            tags: [{ id: "tag-1", value: "Action", weight: "major" }],
          },
        ],
      },
    },
  });
  expect(chatResponse.ok()).toBeTruthy();

  const body = await chatResponse.json();
  expect(body.message).toContain("mock-gpt");
  expect(body.message).toContain("4 messages");
});
