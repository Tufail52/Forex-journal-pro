import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import cookieSession from "cookie-session";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(
  cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET || "default-secret"],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: true,
    sameSite: "none",
  })
);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL || "http://localhost:3000"}/auth/callback`
);

// --- Auth Routes ---

app.get("/api/auth/url", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    prompt: "consent",
  });
  res.json({ url });
});

app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    req.session!.tokens = tokens;
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error getting tokens", error);
    res.status(500).send("Authentication failed");
  }
});

app.get("/api/auth/status", (req, res) => {
  res.json({ connected: !!req.session?.tokens });
});

app.post("/api/auth/logout", (req, res) => {
  req.session = null;
  res.json({ success: true });
});

// --- Google Sheets Routes ---

async function getSheetsClient(tokens: any) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials(tokens);
  return google.sheets({ version: "v4", auth });
}

app.get("/api/sheets/list", async (req, res) => {
  if (!req.session?.tokens) return res.status(401).json({ error: "Not connected" });
  try {
    // For now, we'll just return a placeholder or let the user create a new one
    res.json({ sheets: [] });
  } catch (error) {
    res.status(500).json({ error: "Failed to list sheets" });
  }
});

app.post("/api/sheets/create", async (req, res) => {
  if (!req.session?.tokens) return res.status(401).json({ error: "Not connected" });
  try {
    const sheets = await getSheetsClient(req.session.tokens);
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: "Trading Journal - " + new Date().toLocaleDateString() },
        sheets: [{ properties: { title: "Trades" } }],
      },
    });
    
    // Initialize headers
    const spreadsheetId = response.data.spreadsheetId!;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Trades!A1:N1",
      valueInputOption: "RAW",
      requestBody: {
        values: [["ID", "Pair", "Direction", "Entry Date", "Exit Date", "Risk %", "PnL %", "PnL $", "Strategy", "Session", "Notes", "Emotion", "Confluences", "Screenshots"]],
      },
    });

    res.json({ spreadsheetId });
  } catch (error) {
    console.error("Error creating sheet", error);
    res.status(500).json({ error: "Failed to create sheet" });
  }
});

app.put("/api/trades", async (req, res) => {
  const { spreadsheetId, trades: tradeList } = req.body;
  if (!req.session?.tokens || !spreadsheetId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const sheets = await getSheetsClient(req.session.tokens);
    
    // Clear existing data (except headers)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: spreadsheetId as string,
      range: "Trades!A2:L1000",
    });

    if (tradeList && tradeList.length > 0) {
      const values = tradeList.map((t: any) => [
        t.id, t.pair, t.direction, t.entryDate, t.exitDate, 
        t.riskPercent, t.pnlPercent, t.pnlAmount, t.strategy, 
        t.session, t.notes, t.emotion,
        JSON.stringify(t.confluences || []),
        JSON.stringify(t.screenshots || [])
      ]);

      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId as string,
        range: `Trades!A2:N${tradeList.length + 1}`,
        valueInputOption: "RAW",
        requestBody: { values },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error syncing trades", error);
    res.status(500).json({ error: "Failed to sync trades" });
  }
});

app.get("/api/trades", async (req, res) => {
  const { spreadsheetId } = req.query;
  if (!req.session?.tokens || !spreadsheetId) return res.status(401).json({ error: "Unauthorized" });
  
  try {
    const sheets = await getSheetsClient(req.session.tokens);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId as string,
      range: "Trades!A2:N1000",
    });
    
    const rows = response.data.values || [];
    const trades = rows.map(row => ({
      id: row[0],
      pair: row[1],
      direction: row[2],
      entryDate: row[3],
      exitDate: row[4],
      riskPercent: parseFloat(row[5]),
      pnlPercent: parseFloat(row[6]),
      pnlAmount: parseFloat(row[7]),
      strategy: row[8],
      session: row[9],
      notes: row[10],
      emotion: row[11],
      confluences: row[12] ? JSON.parse(row[12]) : [],
      screenshots: row[13] ? JSON.parse(row[13]) : []
    }));
    
    res.json(trades);
  } catch (error) {
    console.error("Error fetching trades", error);
    res.status(500).json({ error: "Failed to fetch trades" });
  }
});

app.post("/api/trades", async (req, res) => {
  const { spreadsheetId, trade } = req.body;
  if (!req.session?.tokens || !spreadsheetId) return res.status(401).json({ error: "Unauthorized" });
  
  try {
    const sheets = await getSheetsClient(req.session.tokens);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Trades!A2",
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          trade.id,
          trade.pair,
          trade.direction,
          trade.entryDate,
          trade.exitDate,
          trade.riskPercent,
          trade.pnlPercent,
          trade.pnlAmount,
          trade.strategy,
          trade.session,
          trade.notes,
          trade.emotion,
          JSON.stringify(trade.confluences || []),
          JSON.stringify(trade.screenshots || [])
        ]],
      },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error saving trade", error);
    res.status(500).json({ error: "Failed to save trade" });
  }
});

// --- Vite Middleware ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
