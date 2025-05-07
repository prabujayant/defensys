# 🛡️ DefenSys: Intelligent Malware Detection & Dynamic Network Attack Simulator

> ⚡ Real-time network attack simulation + AI-powered malware classification = Cyber Defense Reinvented

## 🚀 Overview

**DefenSys** is a full-stack cyber defense platform designed to simulate real-world attacks dynamically and detect malware with deep learning precision. Built for security researchers, educators, and defenders, it blends **containerized attack orchestration** with **image-based malware classification**, all accessible via an intuitive Flask web app.

Whether you're stress-testing your NIDS or classifying suspicious binaries as malware families, DefenSys brings **offensive and defensive** capabilities under one powerful dashboard.

## 🧠 Core Features

| Feature                      | Description |
|-----------------------------|-------------|
| 🐍 Flask-based UI           | Seamless and simple web interface for interaction |
| 🐳 Docker-powered Attacks   | Launch `hping3` SYN flood attacks inside isolated containers |
| 📊 Real-time Status Panel   | Monitor active attack nodes and container states |
| 🧠 Deep Learning Malware Detection | Upload binary images for real-time malware family prediction |
| 🔍 Top-3 Malware Predictions | Showcases top predictions with confidence scores |
| 🔐 Binary & Multiclass Models | Combines a binary classifier with a family-level classifier |
| 🗂️ Auto-cleanup of uploads  | Ensures file system hygiene post-prediction |

## 🖼️ Architecture

+-------------+ +-------------------+ +--------------------------+
| Frontend | <----> | Flask App | <----> | TensorFlow DL Models |
+-------------+ +-------------------+ +--------------------------+
        ^             |                     |
        |             |                     |
        |             v                     v
Container Management    Docker CLI        Malware Image Preprocessing
(hping3 Attacks)       (ResNet / CNN Classification)

## ⚙️ Tech Stack

* **Python Flask** – Web server and API
* **Docker** – Attack simulation environment
* **TensorFlow/Keras** – For malware classification models
* **hping3** – Packet crafting and SYN flood attack tool
* **OpenCV / PIL** – Image preprocessing
* **HTML + JS** – Frontend interface (with Jinja2)

## 🔬 Use Cases

1. **Simulate DDoS Scenarios** – Great for testing your Intrusion Detection System (IDS).
2. **Classify Malware Types** – Upload binary-represented images of malware for AI-powered analysis.
3. **Cybersecurity Education** – Teach how different attacks are simulated and detected.
4. **Red vs Blue Team Exercises** – Offensive and defensive tools in one.

## 🧪 Running Locally

### 🔧 Prerequisites

* Docker installed and running
* Python 3.8+
* `virtualenv` recommended


## 🧠 AI Models Used

* **Binary Classifier** – CNN-based binary classifier (malicious vs benign)
* **Multiclass Classifier** – Classifies 25 malware families into categories like Trojan, Worm, Ransomware, etc.
Both models are trained on grayscale image representations of malware binaries.

## 📂 API Endpoints

### Attack Control

* **POST /setup-container** – Initializes the Docker container
* **POST /run-hping3** – Launches a SYN flood to a specified IP
* **POST /stop-hping3** – Stops attack on a given IP
* **GET /status** – Returns current container and attack status

### Malware Detection

* **POST /predict** – Upload a malware binary image and get prediction
* **GET /uploads/<filename>** – Access uploaded image (auto-deleted after inference)

### 🖥️ Setup

git clone https://github.com/prabujayant/DefenSys.git
cd DefenSys
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python app.py

**Model Placement**

models/
├── binary_model_best.keras
└── multi_model_best.keras

## 🔐 Sample Malware Categories

| Malware Family | Category    |
|----------------|-------------|
| Allaple.A      | Worm        |
| Fakerean       | Ransomware  |
| Yuner.A        | Downloader  |
| C2LOP.P        | Adware      |
| Rbot!gen       | Botnet      |
| Lolyda.AA3     | Backdoor    |
| VB.AT          | Virus       |
