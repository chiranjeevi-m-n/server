import { config } from "dotenv";
config(); // Load environment variables

import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const GITHUB_TOKEN = "process.env.GITHUB_TOKEN" ;
const OWNER = "process.env.OWNER";
const REPO = "process.env.REPO";
const PORT = process.env.PORT || 5000;

/**
 * Upload a file to GitHub repository.
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
 * Get list of uploaded files from GitHub repository.
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));