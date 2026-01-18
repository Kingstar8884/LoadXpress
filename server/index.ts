import express from "express";
import path from "path";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";

const app = express();
const PORT = 5000;

app.use(express.json());

async function startServer() {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/api/auth/status", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user as any;
      res.json({
        authenticated: true,
        user: {
          id: user.claims?.sub,
          email: user.claims?.email,
          firstName: user.claims?.first_name,
          lastName: user.claims?.last_name,
          profileImageUrl: user.claims?.profile_image_url,
        },
      });
    } else {
      res.json({ authenticated: false });
    }
  });

  app.use(express.static(path.join(process.cwd())));

  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ message: "Not found" });
    }
    res.sendFile(path.join(process.cwd(), "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
