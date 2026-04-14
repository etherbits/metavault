import { serve } from "bun";
import index from "./index.html";

const server = serve({
  routes: {
    "/*": index,
  },
});

console.log(`🚀 Server running at ${server.url}`);
