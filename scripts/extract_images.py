import json
import os
import subprocess
import sys

# --- CONFIGURATION ---
VIDEO_URL = "https://www.youtube.com/watch?v=0xFZBrKTyzw" # Change this as needed
OUTPUT_DIR = "../public/images/steps/extracted"
TIMESTAMPS_FILE = "video_timestamps.json"

def install_dependencies():
    print("📦 Installing dependencies (yt-dlp)...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "yt-dlp"])

def download_video(url, output_path):
    if os.path.exists(output_path):
        print(f"✅ Video already exists at {output_path}")
        return

    print(f"⬇️ Downloading video from {url}...")
    # Determines filename automatically
    try:
        subprocess.check_call(["yt-dlp", "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4", "-o", output_path, url])
        print("✅ Download complete.")
    except FileNotFoundError:
        print("⚠️ 'yt-dlp' not found. Installing it for you...")
        install_dependencies()
        try:
             subprocess.check_call(["yt-dlp", "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4", "-o", output_path, url])
        except Exception:
             print("❌ Error installing or running 'yt-dlp'. Please install it manually.")
             sys.exit(1)
    except subprocess.CalledProcessError:
        print("❌ Error downloading video.")
        sys.exit(1)

def time_to_seconds(time_str):
    """Converts HH:MM:SS or MM:SS to seconds."""
    parts = list(map(int, time_str.split(':')))
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    elif len(parts) == 2:
        return parts[0] * 60 + parts[1]
    return 0

def extract_frames(video_path, timestamps, output_dir):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    print(f"📸 Extracting {len(timestamps)} images...")

    for item in timestamps:
        time_str = item["time"]
        filename = item["name"]
        output_file = os.path.join(output_dir, filename)
        
        seconds = time_to_seconds(time_str)
        
        # ffmpeg command to extract a single frame
        # -ss seeks to position (fast)
        # -i input
        # -frames:v 1 takes one frame
        # -q:v 2 high quality jpg
        cmd = [
            "ffmpeg", 
            "-ss", str(seconds),
            "-i", video_path,
            "-frames:v", "1",
            "-q:v", "2",
            "-y", # Overwrite
            output_file
        ]
        
        try:
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            print(f"  ✨ Saved {filename} (at {time_str})")
        except FileNotFoundError:
            print("❌ Error: 'ffmpeg' is not installed. Please install specific tools.")
            sys.exit(1)
        except subprocess.CalledProcessError:
             print(f"  ❌ Failed to extract {filename}")

def main():
    # 1. Check tools
    try:
        subprocess.run(["ffmpeg", "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except FileNotFoundError:
        print("⚠️  FFmpeg is missing! Install it via 'brew install ffmpeg' on Mac.")
        return

    # 2. Setup
    video_filename = "source_video_2.mp4"
    VIDEO_URL_2 = "https://www.youtube.com/watch?v=urigyPb3uEI"
    
    # 3. Read Timestamps
    try:
        with open(TIMESTAMPS_FILE, 'r') as f:
            timestamps = json.load(f)
    except FileNotFoundError:
        print(f"❌ Could not find {TIMESTAMPS_FILE}")
        return

    # 4. Download (Both videos if needed)
    # Ideally should check which are needed content-wise, but we'll ensure both exist
    video_1 = "source_video.mp4"
    video_2 = "source_video_2.mp4"
    
    if not os.path.exists(video_1):
        download_video("https://www.youtube.com/watch?v=0xFZBrKTyzw", video_1)
    if not os.path.exists(video_2):
        download_video("https://www.youtube.com/watch?v=urigyPb3uEI", video_2)

    # 5. Extract with Source Selection
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    print(f"📸 Extracting {len(timestamps)} images...")

    for item in timestamps:
        time_str = item["time"]
        filename = item["name"]
        
        # Determine source video (default to video 1)
        source = item.get("source", "video1") 
        video_path = video_2 if source == "video2" else video_1
        
        output_file = os.path.join(OUTPUT_DIR, filename)
        seconds = time_to_seconds(time_str)
        
        cmd = [
            "ffmpeg", 
            "-ss", str(seconds),
            "-i", video_path,
            "-frames:v", "1",
            "-q:v", "2",
            "-y", 
            output_file
        ]
        
        try:
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            print(f"  ✨ Saved {filename} (from {source} at {time_str})")
        except subprocess.CalledProcessError:
             print(f"  ❌ Failed to extract {filename}")

if __name__ == "__main__":
    main()
