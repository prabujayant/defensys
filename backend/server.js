const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint to run the 'ls' command
app.get("/run-ls", (req, res) => {
    exec("docker exec docker-node1-1 cat blacklisted_macs.log", (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return res.status(500).json({ error: stderr });
        }
        console.log(`LS Output: ${stdout}`);
        res.json({ output: stdout });
    });
});

app.get("/run-log1", (req, res) => {
    exec("docker exec docker-node1-1 cat blacklisted_macs.log", (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return res.status(500).json({ error: stderr });
        }
        console.log(`LS Output: ${stdout}`);
        res.json({ output: stdout });
    });
});

app.get("/run-log2", (req, res) => {
    exec("docker exec docker-node2-1 cat blacklisted_macs.log", (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return res.status(500).json({ error: stderr });
        }
        console.log(`LS Output: ${stdout}`);
        res.json({ output: stdout });
    });
});

app.get("/run-log3", (req, res) => {
    exec("docker exec docker-node3-1 cat blacklisted_macs.log", (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return res.status(500).json({ error: stderr });
        }
        console.log(`LS Output: ${stdout}`);
        res.json({ output: stdout });
    });
});

app.get("/run-reset1", (req, res) => {
    exec("docker exec docker-node1-1 rm blacklisted_macs.log", (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return res.status(500).json({ error: stderr });
        }
        console.log(`LS Output: ${stdout}`);
        res.json({ output: stdout });
    });

    exec("docker exec docker-node1-1 touch blacklisted_macs.log", (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return res.status(500).json({ error: stderr });
        }
        console.log(`LS Output: ${stdout}`);
        res.json({ output: stdout });
    });
});

app.get("/run-reset2", (req, res) => {
    exec("docker exec docker-node2-1 rm blacklisted_macs.log", (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return res.status(500).json({ error: stderr });
        }
        console.log(`LS Output: ${stdout}`);
        res.json({ output: stdout });
    });

    exec("docker exec docker-node2-1 touch blacklisted_macs.log", (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return res.status(500).json({ error: stderr });
        }
        console.log(`LS Output: ${stdout}`);
        res.json({ output: stdout });
    });
});

app.get("/run-reset3", (req, res) => {
    exec("docker exec docker-node3-1 rm blacklisted_macs.log", (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return res.status(500).json({ error: stderr });
        }
        console.log(`LS Output: ${stdout}`);
        res.json({ output: stdout });
    });

    exec("docker exec docker-node3-1 touch blacklisted_macs.log", (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return res.status(500).json({ error: stderr });
        }
        console.log(`LS Output: ${stdout}`);
        res.json({ output: stdout });
    });
});

app.get("/run-stat1", (req, res) => {
    exec('docker stats docker-node1-1 --no-stream | findstr /R "[0-9].*MiB" | for /F "tokens=4" %A in (\'more\') do @echo %A', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return res.status(500).json({ error: stderr });
        }
        console.log(`LS Output: ${stdout}`);
        res.json({ output: stdout });
    });
});

app.get("/run-stat2", (req, res) => {
    exec('docker stats docker-node2-1 --no-stream | findstr /R "[0-9].*MiB" | for /F "tokens=4" %A in (\'more\') do @echo %A', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return res.status(500).json({ error: stderr });
        }
        console.log(`LS Output: ${stdout}`);
        res.json({ output: stdout });
    });
});

app.get("/run-stat3", (req, res) => {
    exec('docker stats docker-node3-1 --no-stream | findstr /R "[0-9].*MiB" | for /F "tokens=4" %A in (\'more\') do @echo %A', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return res.status(500).json({ error: stderr });
        }
        console.log(`LS Output: ${stdout}`);
        res.json({ output: stdout });
    });
});

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});