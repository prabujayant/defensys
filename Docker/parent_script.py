import subprocess
import time

def get_docker_stats(container_name):
    """
    Runs the docker stats command for a specific container.
    """
    try:
        print(f"Fetching Docker stats for container: {container_name}")
        result = subprocess.run(
            ["docker", "stats", container_name, "--no-stream"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        if result.returncode != 0:
            print(f"Error fetching stats for {container_name}: {result.stderr.strip()}")
            return

        print(f"Stats for {container_name}:\n{result.stdout}")
    except Exception as e:
        print(f"An error occurred: {str(e)}")

if __name__ == "__main__":
    container_name = "docker-node1-1"
    
    while True:
        get_docker_stats("docker-node1-1")
        get_docker_stats("docker-node2-1")
        get_docker_stats("docker-node3-1")
        time.sleep(5)  # Adjust the interval as needed