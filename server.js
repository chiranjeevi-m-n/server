import { config } from "dotenv";
config(); // Load environment variables

import express from "express";
import cors from "cors";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const app = express();
app.use(express.json());
app.use(cors());

const GITHUB_TOKEN = "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" ;
const OWNER = "chiranjeevi-m-n";
const REPO = "my-docs";
const PORT = process.env.PORT || 10000;

/**
 * Swagger Configuration
 */
const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "GitHub File Upload API",
            version: "1.0.0",
            description: "API to upload and list files on GitHub using Express.js",
        },
        servers: [{ url: `https://localhost:${PORT}` }], // Update for Render when deployed
    },
    apis: ["./server.js"], // Ensure the file is correctly referenced
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * Redirect root URL to Swagger UI
 */
app.get("/", (req, res) => {
    res.redirect("/api-docs");
});

/**
 * @swagger
 * /upload:
 *   post:
 *     summary: Upload a file to GitHub repository
 *     description: Uploads a file to a GitHub repository's "uploads" folder.
 *     parameters:
 *       - in: body
 *         name: file
 *         required: true
 *         description: File to upload
 *         schema:
 *           type: object
 *           properties:
 *             fileName:
 *               type: string
 *             fileContent:
 *               type: string
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       400:
 *         description: Missing fileName or fileContent
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
                content: fileContent,
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
            downloadUrl: file.html_url,  // Use `html_url` for correct link
        }));

        res.json(fileList);
    } catch (error) {
        console.error("Error fetching files:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
