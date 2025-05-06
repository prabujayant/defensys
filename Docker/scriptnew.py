import socket
import struct
import time
import json
import threading
import subprocess
import logging

# Threshold for detecting compromised node (e.g., 1000 bytes or 100 packets per second)
TRAFFIC_THRESHOLD_BYTES = 1000
TRAFFIC_THRESHOLD_PACKETS = 50

# Dictionary to store traffic statistics
traffic_stats = {}

# Dictionary to store isolated status
isolated_nodes = {}

# Lock for thread safety
lock = threading.Lock()

# Set up logging
LOG_FILE_PATH = '/app/blacklisted_macs.log'
PING_LOG_PATH = '/app/ping_results.log'
logging.basicConfig(filename=LOG_FILE_PATH, level=logging.INFO,
                    format='%(asctime)s - Blacklisted MAC: %(message)s')

# Nodes to ping
NODES_TO_PING = ["node1", "node2"]

def parse_ethernet_header(packet):
    """Extract Source MAC, Destination MAC, and Ethernet protocol."""
    eth_length = 14  # Ethernet header length
    eth_header = packet[:eth_length]
    eth = struct.unpack('!6s6sH', eth_header)
    dest_mac = ':'.join(format(b, '02x') for b in eth[0])  # Destination MAC
    src_mac = ':'.join(format(b, '02x') for b in eth[1])   # Source MAC
    eth_protocol = socket.ntohs(eth[2])
    return src_mac, dest_mac, eth_protocol, packet[eth_length:]

def update_stats(src_mac, dest_mac, packet_len, direction):
    """Update traffic statistics for a communication."""
    key = (src_mac, dest_mac)
    with lock:
        if key not in traffic_stats:
            traffic_stats[key] = {
                "BytesSent": 0, "BytesReceived": 0, "PacketsSent": 0, "PacketsReceived": 0, "StartTime": None, "Duration": 0
            }

        stats = traffic_stats[key]
        current_time = time.time()

        if stats["StartTime"] is None:
            stats["StartTime"] = current_time

        if direction == "sent":
            stats["BytesSent"] += packet_len
            stats["PacketsSent"] += 1
        elif direction == "received":
            stats["BytesReceived"] += packet_len
            stats["PacketsReceived"] += 1

        stats["Duration"] = current_time - stats["StartTime"]

        # Check for anomaly detection
        check_anomaly(key)

def check_anomaly(key):
    """Check if traffic statistics exceed the thresholds for anomaly detection."""
    stats = traffic_stats[key]
    if stats["BytesSent"] > TRAFFIC_THRESHOLD_BYTES or stats["PacketsSent"] > TRAFFIC_THRESHOLD_PACKETS:
        if key not in isolated_nodes or not isolated_nodes[key]:
            print(f"Anomaly detected for {key}. Isolating the node.")
            isolate_node(key)
            isolated_nodes[key] = True
    elif stats["BytesSent"] < TRAFFIC_THRESHOLD_BYTES and stats["PacketsSent"] < TRAFFIC_THRESHOLD_PACKETS:
        if key in isolated_nodes and isolated_nodes[key]:
            print(f"Traffic normalized for {key}. Recovering the node.")
            recover_node(key)
            isolated_nodes[key] = False

def isolate_node(key):
    """Simulate isolating the node by blocking its traffic."""
    print(f"Node {key} isolated. Blocking traffic.")

    # Log the blacklisted MAC address
    log_blacklisted_mac(key[0])

def recover_node(key):
    """Simulate recovering the node by restoring its access."""
    print(f"Node {key} recovered. Restoring traffic.")

def log_blacklisted_mac(src_mac):
    """Log the blacklisted MAC address."""
    logging.info(src_mac)

def ping_nodes():
    """Ping other nodes in the Docker network."""
    with open(PING_LOG_PATH, 'a') as log_file:
        for node in NODES_TO_PING:
            print(f"Sending ping to {node}...")  # Print ping action
            try:
                result = subprocess.run(
                    ["ping", "-c", "4", node],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                if result.returncode == 0:
                    log_file.write(f"Ping to {node} successful:\n{result.stdout}\n")
                    print(f"Ping to {node} successful.")  # Print success
                else:
                    log_file.write(f"Ping to {node} failed:\n{result.stderr}\n")
                    print(f"Ping to {node} failed.")  # Print failure
            except FileNotFoundError:
                log_file.write(f"Ping command not found. Ensure ping is installed in the container.\n")
                print("Ping command not found. Ensure ping is installed in the container.")  # Print error

def capture_traffic():
    """Capture packets and extract required details."""
    s = socket.socket(socket.AF_PACKET, socket.SOCK_RAW, socket.ntohs(0x0003))

    print("Capturing traffic... Press Ctrl+C to stop.")
    try:
        while True:
            # Capture packet
            packet, _ = s.recvfrom(65565)

            # Parse Ethernet header
            src_mac, dest_mac, eth_protocol, payload = parse_ethernet_header(packet)

            # Update statistics for packets (assuming bi-directional communication)
            packet_length = len(packet)
            update_stats(src_mac, dest_mac, packet_length, "sent")
            update_stats(dest_mac, src_mac, packet_length, "received")
    except KeyboardInterrupt:
        print("\nStopped capturing traffic.")
        print("Final Traffic Statistics in JSON:")
        print(json.dumps(traffic_stats, indent=4))

# Start the traffic capture and ping in parallel
if __name__ == "__main__":
    threading.Thread(target=capture_traffic).start()
    threading.Thread(target=ping_nodes).start()