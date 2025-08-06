from flask import Flask, request, jsonify
from datetime import datetime
import threading
import time
import logging
import requests

app = Flask(__name__)

# Traffic thresholds (increase these thresholds to suit the traffic you're expecting)
TRAFFIC_THRESHOLD_BYTES_PER_SEC = 1000  # 1000 bytes per second
TRAFFIC_THRESHOLD_PACKETS_PER_SEC = 50  # 50 packets per second

# Stats and blacklisting
traffic_stats = {}
isolated_ips = {}
lock = threading.Lock()

# Logging setup
LOG_FILE_PATH = '/app/blacklisted_ips.log'
DOS_LOG_PATH = '/app/dos_detected.log'
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE_PATH),
        logging.StreamHandler()
    ]
)
dos_logger = logging.getLogger('DoSLogger')
dos_logger.addHandler(logging.FileHandler(DOS_LOG_PATH))
dos_logger.setLevel(logging.WARNING)

# Optional: notify parent system
PARENT_API_URL = 'http://parent:5050/addData'

def load_blacklisted_ips_from_parent():
    try:
        response = requests.get('http://parent:5050/getData')
        if response.status_code == 200:
            data = response.json()
            for ip in data.keys():
                isolated_ips[ip] = True
        else:
            print(f"⚠️ Failed to fetch data. Status code: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Error contacting parent server: {e}")

def update_stats(src_ip, packet_size):
    """Update traffic stats for the given IP."""
    with lock:
        if src_ip not in traffic_stats:
            traffic_stats[src_ip] = {
                "Bytes": 0,
                "Packets": 0,
                "StartTime": time.time(),
                "Duration": 0
            }

        stats = traffic_stats[src_ip]
        current_time = time.time()

        # Update bytes and packet count
        stats["Bytes"] += packet_size
        stats["Packets"] += 1
        stats["Duration"] = current_time - stats["StartTime"]

        check_anomaly(src_ip, stats)


def check_anomaly(ip, stats):
    """Detect anomaly based on rate of traffic."""
    duration = max(stats["Duration"], 1)  # prevent division by zero
    byte_rate = stats["Bytes"] / duration  # Bytes per second
    packet_rate = stats["Packets"] / duration  # Packets per second

    print(f"IP: {ip} | Rate (packets/sec): {packet_rate:.2f} | Rate (bytes/sec): {byte_rate:.2f}")

    
    # Check for DoS condition based on thresholds
    if byte_rate > TRAFFIC_THRESHOLD_BYTES_PER_SEC or packet_rate > TRAFFIC_THRESHOLD_PACKETS_PER_SEC:
        if not isolated_ips.get(ip, False):
            msg = f"⚠️ DoS suspected from IP {ip} | {packet_rate:.2f} pkt/s, {byte_rate:.2f} B/s"
            print(msg)
            dos_logger.warning(msg)
            log_blacklisted_ip(ip)
            isolated_ips[ip] = True


def log_blacklisted_ip(ip):
    """Log blacklisted IP and notify parent."""
    logging.info(f"Blacklisted IP: {ip}")
    send_data_to_parent(ip)


def send_data_to_parent(ip):
    """Send data of blacklisted IP to the parent server."""
    timestamp = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
    data = {
        'ip': ip,
        'timestamp': timestamp
    }

    try:
        response = requests.post(PARENT_API_URL, json=data)
        if response.status_code == 201:
            print("Reported to parent:", response.json())
        else:
            print("Parent server error:", response.status_code)
    except requests.exceptions.RequestException as e:
        print(f"Failed to report to parent: {e}")


# Middleware to block requests from blacklisted IPs
@app.before_request
def block_blacklisted_ips():
    src_ip = request.remote_addr
    
    load_blacklisted_ips_from_parent()  # Load blacklisted IPs from parent

    if isolated_ips.get(src_ip, False):
        return jsonify({"error": "Your IP is blacklisted due to suspicious activity."}), 403
    


@app.route('/', methods=['GET', 'POST'])
def handle_request():
    """Handle incoming requests and update stats."""
    src_ip = request.remote_addr
    packet_size = len(request.data) if request.method == 'POST' else 0
    update_stats(src_ip, packet_size)

    return jsonify({"status": "received", "ip": src_ip})


@app.route('/stats', methods=['GET'])
def get_stats():
    """Retrieve current traffic statistics."""
    return jsonify(traffic_stats)


@app.route('/blacklisted', methods=['GET'])
def get_blacklisted():
    """Retrieve blacklisted IPs."""
    return jsonify({ip: True for ip, blocked in isolated_ips.items() if blocked})


if __name__ == '__main__':
    print("🚀 Starting DoS detection server...")
    app.run(host='0.0.0.0', port=5002)
