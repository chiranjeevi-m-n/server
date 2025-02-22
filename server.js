import { config } from "dotenv";
config(); // Load environment variables

import express from "express";
import cors from "cors";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import fetch from "node-fetch";  // Ensure node-fetch is installed

const app = express();
app.use(express.json());

// ✅ Fix CORS Policy
app.use(cors({
    origin: "*",  // Allow all origins (change to specific frontend in production)
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// ✅ Environment Variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.OWNER;
const REPO = process.env.REPO;
const PORT = process.env.PORT || 5000;

// ✅ Swagger Configuration
const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "GitHub File Upload",
            version: "1.0.0",
            description: "API to upload and list files on GitHub using Express.js",
        },
        servers: [{ url: "https://nodeserver-6nv5.onrender.com" }], // Update to your Render URL
    },
    apis: ["./server.js"], // Make sure this file path is correct
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// ✅ Redirect root to Swagger UI
app.get("/", (req, res) => res.redirect("/api-docs"));

/**
 * @swagger
 * /upload:
 *   post:
 *     summary: Upload a file to GitHub repository
 *     description: Uploads a file to a GitHub repository's "uploads" folder.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fileName:
 *                 type: string
 *               fileContent:
 *                 type: string
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       400:
 *         description: Missing fileName or fileContent
 *       401:
 *         description: Unauthorized (Invalid GitHub Token)
 *       500:
 *         description: Internal server error
 */
app.post("/upload", async (req, res) => {
    try {
        const { fileName, fileContent } = req.body;

        if (!fileName || !fileContent) {
            return res.status(400).json({ error: "Missing fileName or fileContent" });
        }

        const path = `uploads/${fileName}`;
        const githubApiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;

        const response = await fetch(githubApiUrl, {
            method: "PUT",
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: `Upload ${fileName}`,
                content: Buffer.from(fileContent).toString("base64"), // Convert to base64
            }),
        });

        const responseData = await response.json();

        if (response.ok) {
            res.json({ message: "File uploaded successfully!", fileUrl: responseData.content.html_url });
        } else {
            res.status(response.status).json({ error: "Upload failed", details: responseData });
        }
    } catch (error) {
        console.error("Error uploading file:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @swagger
 * /files:
 *   get:
 *     summary: Get list of uploaded files from GitHub repository
 *     description: Fetches the list of files stored in the repository's "uploads" folder.
 *     responses:
 *       200:
 *         description: Successfully retrieved list of files
 *       401:
 *         description: Unauthorized (Invalid GitHub Token)
 *       500:
 *         description: Internal server error
 */
app.get("/files", async (req, res) => {
    try {
        const githubApiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/uploads`;

        const response = await fetch(githubApiUrl, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` },
        });

        if (!response.ok) {
            console.error(`GitHub API Response Status: ${response.status}`);
            const errorData = await response.json();
            console.error("GitHub API Error:", errorData);
            return res.status(response.status).json({ error: "Failed to fetch files", details: errorData });
        }

        const files = await response.json();
        const fileList = files.map(file => ({
            name: file.name,
            downloadUrl: file.html_url,
        }));

        res.json(fileList);
    } catch (error) {
        console.error("Error fetching files:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ✅ Handle Preflight CORS Requests
app.options("*", cors());

// ✅ Start Server
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
