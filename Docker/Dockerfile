# Use Python 3.8 as base image
FROM python:3.8-slim

# Set the environment variable for the timezone to IST
ENV TZ=Asia/Kolkata
# Set working directory
WORKDIR /app
COPY . /app
RUN apt-get update && apt-get install -y docker.io
RUN apt-get update && apt-get install -y iputils-ping
# Install dependencies (including tzdata to set the timezone)
RUN apt-get update && apt-get install -y tzdata

# Set the timezone to IST
RUN dpkg-reconfigure --frontend noninteractive tzdata

# Copy the Python script into the container
COPY scriptnew.py .

# Install any Python dependencies
RUN pip install --no-cache-dir requests

# Set the entry point for the script
CMD ["python", "-u", "scriptnew.py"]
