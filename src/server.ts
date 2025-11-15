import dotenv from "dotenv";
dotenv.config();

import { app } from "./app";

const port = parseInt(process.env.APP_PORT || "4000", 10);

async function bootstrap(): Promise<void> {
  try {
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

void bootstrap();
