#!/bin/bash

# Document how to use this script and what it is for
help() {
  cat <<EOF
package_live_content.sh
-----------------------

This script creates and package a live DASH content from scratch by relying on
\`ffmpeg\` (which has to be installed locally) and the shaka-packager (which
will be downloaded if not found locally in a directory called \`tmp\`).

Usage: $0 <OPTIONS>

Options:

  --segment-duration <duration>         Duration a single segment will have, in seconds.
                                        Defaults to $SEGMENT_DURATION (seconds).

  --framerate <duration>                Frame-rate of video Representations from that content,
                                        in frames per second.
                                        Defaults to $FRAME_RATE.

  --timeshift-buffer-depth <depth>      Depth of retained segments behind the last generated
                                        segment, in seconds.
                                        Defaults to $TIMESHIFT_BUFFER_DEPTH ($((TIMESHIFT_BUFFER_DEPTH / 60)) minutes).

  --output-dir <directory>              Output directory for the generated content. Can be an 
                                        absolute or a relative path.
                                        Defaults to '$OUTPUT_DIR'.

  --no-confirmation                     If set, this script will never ask for confirmation and
                                        just validate all prompts.
                                        Intended for automated scripts.

  --encrypted                           If set all video and audio will be encrypted with the same
                                        key.
                                        ( key_id =  $DEFAULT_KID
                                          key    =  $DEFAULT_KEY )

  --base-port <port>                    Base UDP port number where media encoded by ffmpeg will be
                                        communicated to the shaka-packager.
                                        $NB_PORTS_USED consecutive ports starting from this number will be used.
                                        Update this if the default ones conflict in your case.
                                        Defaults to $BASE_PORT (uses ports $BASE_PORT-$((BASE_PORT + NB_PORTS_USED - 1))).

  --shaka-path <path>                   Path to the shaka-packager binary. If not specified,
                                        the script will search for it in common locations and at
                                        last resort, try to load it from the web (you'll be asked
                                        for confirmation).

EOF
}

# TODO: Multiple keys optionally
# TODO: Detect if shaka-packager from previous script may be already running
# TODO: Automatic port selection?
# TODO: Also load ffmpeg dynamically in tmp?

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default values
SEGMENT_DURATION=3
FRAME_RATE=30
FRAGMENT_DURATION=3
TIMESHIFT_BUFFER_DEPTH=180
NO_CONFIRM=false
BASE_PORT=8881
SHAKA_PATH=""
TMP_DIR="$(
  cd "$(dirname "$0")/.."
  pwd
)/tmp"
OUTPUT_DIR="$TMP_DIR/testcontents/live"
KEY_ID=""
KEY=""

NB_PORTS_USED=6

DEFAULT_KID=0123456789abcdef0123456789abcdef
DEFAULT_KEY=fedcba9876543210fedcba9876543210

# PID tracking
FFMPEG_PID=""
SHAKA_PID=""

# Cleanup flag to prevent multiple cleanup runs
CLEANUP_DONE=false
FORCE_KILL_DONE=false

PORT_CONFLICT_DETECTED=false

# File patterns for files created by this script
ARTIFACTS_PATTERNS=(
  "manifest.mpd"
  "*_init.mp4"
  "*_[0-9]*.m4s"
  "*_[0-9]*.mp4"
)

# Checks that the command in argument exists, exits after printing the issue to
# stderr if that's not the case
requires_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Need '$1' (command not found)"
  fi
}

# Input validation functions
validate_hex_key() {
  local key="$1"
  if [[ ! "$key" =~ ^[0-9a-fA-F]{32}$ ]]; then
    return 1
  fi
  return 0
}

sanitize_directory_path() {
  local path="$1"
  # Remove any trailing slashes except for root
  if [[ "$path" != "/" ]]; then
    path="${path%/}"
  fi
  # Resolve to absolute path to prevent relative path issues
  if [[ "$path" != /* ]]; then
    path="$(pwd)/$path"
  fi
  echo "$path"
}

check_if_output_contain_media_files() {
  if [[ -d "$OUTPUT_DIR" ]]; then
    local files_found=false
    for pattern in "${ARTIFACTS_PATTERNS[@]}"; do
      if find "$OUTPUT_DIR" -maxdepth 1 -name "$pattern" -print -quit 2>/dev/null | grep -q .; then
        files_found=true
        break
      fi
    done
    if [[ "$files_found" == "true" ]]; then
      echo "⚠️  WARNING: Output directory contains existing media files!"
      printf "   Directory: %s\n" "$OUTPUT_DIR"
      echo "   These files will be removed before starting."
      echo ""

      if [[ "$NO_CONFIRM" == "false" ]]; then
        echo -n "Continue and remove existing files? (y/N): "
        if read -r response; then
          if [[ ! "$response" =~ ^[Yy][Ee][Ss]$ && ! "$response" =~ ^[Yy]$ ]]; then
            echo "Cancelled."
            exit 0
          fi
        else
          echo ""
          echo "Cancelled."
          exit 0
        fi
        echo ""
      fi
    fi
  fi
}

cleanup_media_files() {
  if [[ -d "$OUTPUT_DIR" ]]; then
    printf "Cleaning up media files from: %s\n" "$OUTPUT_DIR"
    for pattern in "${ARTIFACTS_PATTERNS[@]}"; do
      find "$OUTPUT_DIR" -maxdepth 1 -name "$pattern" -delete 2>/dev/null || true
    done
    echo "Media files cleanup completed."
  fi
}

# Log a line to stderr and exit with error code 1
err() {
  printf "ERROR: %s\n" "$1" >&2
  cleanup
  exit 1
}

# Function to check if a value is a positive number
is_positive_number() {
  [[ $1 =~ ^[0-9]+$ ]] && [[ $1 -gt 0 ]]
}

# Function to check if a port number is valid (1-65535)
is_valid_port() {
  [[ $1 =~ ^[0-9]+$ ]] && [[ $1 -ge 1 ]] && [[ $1 -le 65535 ]]
}

# Function to check if port range is available
check_port_range() {
  local base_port=$1
  local end_port=$((base_port + NB_PORTS_USED - 1))

  if [[ $end_port -gt 65535 ]]; then
    return 1
  fi

  # Check if any of the ports in range are in use
  for ((port = base_port; port <= end_port; port++)); do
    local port_in_use=false

    # Method 1: Try netstat (Linux/older macOS)
    if command -v netstat >/dev/null 2>&1; then
      if netstat -ln 2>/dev/null | grep -q ":$port "; then
        port_in_use=true
      fi
    # Method 2: Try lsof (macOS/Linux)
    elif command -v lsof >/dev/null 2>&1; then
      if lsof -i ":$port" >/dev/null 2>&1; then
        port_in_use=true
      fi
    # Method 3: Try ss (modern Linux)
    elif command -v ss >/dev/null 2>&1; then
      if ss -ln 2>/dev/null | grep -q ":$port "; then
        port_in_use=true
      fi
    # Method 4: Try nc (netcat) test - available on most systems
    elif command -v nc >/dev/null 2>&1; then
      # Try to connect to the port briefly to see if something is listening
      if timeout 1 nc -z 127.0.0.1 "$port" 2>/dev/null; then
        port_in_use=true
      fi
    fi

    if [[ "$port_in_use" == "true" ]]; then
      PORT_CONFLICT_DETECTED=true
      printf "⚠️ Warning: Port %d appears to be in use\n" "$port" >&2
    fi
  done

  # If no port checking method is available, just warn the user
  if ! command -v netstat >/dev/null 2>&1 &&
    ! command -v lsof >/dev/null 2>&1 &&
    ! command -v ss >/dev/null 2>&1 &&
    ! command -v nc >/dev/null 2>&1; then
    printf "⚠️ Warning: Cannot check if ports %d-%d are in use (no suitable tool found)\n" "$base_port" "$end_port" >&2
  fi

  return 0
}

# Cleanup function to ensure all processes are terminated
cleanup() {
  # Prevent multiple cleanup runs
  if [[ "$CLEANUP_DONE" == "true" ]]; then
    if [[ "$FORCE_KILL_DONE" != "true" ]]; then
      echo "Force killing remaining processes..."
      FORCE_KILL_DONE=true
      kill -- -$$ 2>/dev/null || true
    fi
    return
  fi

  CLEANUP_DONE=true
  echo "Cleaning up processes and files..."

  # More graceful process termination
  if [[ -n "$FFMPEG_PID" ]] && kill -0 "$FFMPEG_PID" 2>/dev/null; then
    printf "Terminating ffmpeg (PID: %s)...\n" "$FFMPEG_PID"
    kill -TERM "$FFMPEG_PID" 2>/dev/null || true
    # Give it a moment to terminate gracefully
    sleep 1
    if kill -0 "$FFMPEG_PID" 2>/dev/null; then
      kill -KILL "$FFMPEG_PID" 2>/dev/null || true
    fi
  fi

  if [[ -n "$SHAKA_PID" ]] && kill -0 "$SHAKA_PID" 2>/dev/null; then
    printf "Terminating shaka-packager (PID: %s)...\n" "$SHAKA_PID"
    kill -TERM "$SHAKA_PID" 2>/dev/null || true
    # Give it a moment to terminate gracefully
    sleep 1
    if kill -0 "$SHAKA_PID" 2>/dev/null; then
      kill -KILL "$SHAKA_PID" 2>/dev/null || true
    fi
  fi

  cleanup_media_files
}

clean_and_exit() {
  echo ""
  cleanup
  exit 1
}

on_no_packager_found() {
  echo "No shaka-packager binary found locally..."

  # Check if the install script exists relative to this script's location
  INSTALL_SCRIPT="$SCRIPT_DIR/install_shaka_packager.sh"
  if [[ ! -f "$INSTALL_SCRIPT" ]]; then
    err "install_shaka_packager.sh script not found at $INSTALL_SCRIPT. Cannot install shaka-packager automatically."
  fi

  printf "We will load the shaka-packager binary locally in the \"%s\" directory\n" "$TMP_DIR"
  if [[ "$NO_CONFIRM" == "false" ]]; then
    if ! "$INSTALL_SCRIPT"; then
      return 1
    fi
  else
    if ! "$INSTALL_SCRIPT" --no-confirmation; then
      return 1
    fi
  fi

  # Verify the binary was actually created
  if [[ ! -f "$TMP_DIR/shaka-packager" ]] || [[ ! -x "$TMP_DIR/shaka-packager" ]]; then
    echo "ERROR: shaka-packager binary was not successfully installed" >&2
    return 1
  fi

  return 0
}

# Set up traps for cleanup on script exit/interruption
trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM
trap 'cleanup; exit 0' EXIT

# Parse flags
while [[ $# -gt 0 ]]; do
  case $1 in
  --segment-duration)
    shift
    if [[ $# -eq 0 ]]; then
      err "--segment-duration requires a value."
    fi
    if is_positive_number "$1"; then
      SEGMENT_DURATION="$1"
      FRAGMENT_DURATION="$1"
    else
      err "--segment-duration must be a positive number."
    fi
    ;;
  --timeshift-buffer-depth)
    shift
    if [[ $# -eq 0 ]]; then
      err "--timeshift-buffer-depth requires a value."
    fi
    if is_positive_number "$1"; then
      TIMESHIFT_BUFFER_DEPTH="$1"
    else
      err "TIMESHIFT_BUFFER_DEPTH must be a positive number."
    fi
    ;;
  --frame-rate)
    shift
    if [[ $# -eq 0 ]]; then
      err "--frame-rate requires a value."
    fi
    if is_positive_number "$1"; then
      FRAME_RATE="$1"
    else
      err "FRAME_RATE must be a positive number."
    fi
    ;;
  --output-dir)
    shift
    if [[ $# -eq 0 ]]; then
      err "--output-dir requires a value."
    fi
    if [[ -z "$1" ]]; then
      err "OUTPUT_DIR cannot be empty."
    fi
    OUTPUT_DIR="$(sanitize_directory_path "$1")"
    ;;
  --base-port)
    shift
    if [[ $# -eq 0 ]]; then
      err "--base-port requires a value."
    fi
    if is_valid_port "$1"; then
      BASE_PORT="$1"
    else
      err "BASE_PORT must be a valid port number (1-65535)."
    fi
    ;;
  --shaka-path)
    shift
    if [[ $# -eq 0 ]]; then
      err "--shaka-path requires a value."
    fi
    if [[ -z "$1" ]]; then
      err "SHAKA_PATH cannot be empty."
    fi
    if [[ ! -f "$1" ]]; then
      err "Shaka-packager binary not found at: %s\n" "$1"
    fi
    if [[ ! -x "$1" ]]; then
      err "Shaka-packager binary is not executable: %s\n" "$1"
    fi
    SHAKA_PATH="$1"
    ;;
  --no-confirmation)
    NO_CONFIRM=true
    ;;
  --encrypted)
    KEY_ID=$DEFAULT_KID
    KEY=$DEFAULT_KEY
    ;;
  --help)
    help
    exit 0
    ;;
  *)
    printf "Error: Unknown option: %s\n" "$1"
    help
    exit 1
    ;;
  esac
  shift
done

# Exit on error, undefined variable and error in pipes
set -euo pipefail

requires_cmd printf
requires_cmd find

# Validate encryption keys if provided
if [[ -n "$KEY_ID" ]] && ! validate_hex_key "$KEY_ID"; then
  err "KEY_ID must be a 32-character hexadecimal string."
fi

if [[ -n "$KEY" ]] && ! validate_hex_key "$KEY"; then
  err "KEY must be a 32-character hexadecimal string."
fi

if ! check_port_range "$BASE_PORT"; then
  err "Port range starting from %d would exceed valid port range (1-65535).\n" "$BASE_PORT"
fi

# Create output directory with proper error handling
if ! mkdir -p "$OUTPUT_DIR"; then
  err "Failed to create output directory: $OUTPUT_DIR"
fi

OUTPUT_DIR=$(realpath "$OUTPUT_DIR")

check_if_output_contain_media_files

shaka_packager_cmd=""

if [[ -z "$(command -v ffmpeg)" ]]; then
  err "\"ffmpeg\" needs to be installed and available in your path to run this script"
fi

# Determine shaka-packager command based on --shaka-path option or search for it
if [[ -n "$SHAKA_PATH" ]]; then
  shaka_packager_cmd="$SHAKA_PATH"
elif [[ -f "$TMP_DIR/shaka-packager" ]] && [[ -x "$TMP_DIR/shaka-packager" ]]; then
  shaka_packager_cmd="$TMP_DIR/shaka-packager"
elif command -v shaka-packager >/dev/null 2>&1; then
  shaka_packager_cmd="shaka-packager"
elif command -v packager >/dev/null 2>&1; then
  if packager --help 2>/dev/null | head -1 | grep -q "shaka-packager"; then
    shaka_packager_cmd="packager"
  else
    if ! on_no_packager_found; then
      err "Failed to install shaka-packager"
    fi
    shaka_packager_cmd="$TMP_DIR/shaka-packager"
  fi
else
  if ! on_no_packager_found; then
    err "Failed to install shaka-packager"
  fi
  shaka_packager_cmd="$TMP_DIR/shaka-packager"
fi

# Calculate port range
PORT_720P=$BASE_PORT
PORT_480P=$((BASE_PORT + 1))
PORT_360P=$((BASE_PORT + 2))
PORT_AUDIO_1=$((BASE_PORT + 3))
PORT_AUDIO_2=$((BASE_PORT + 4))
PORT_LAST=$((BASE_PORT + NB_PORTS_USED - 1))

# Now over-engineer formatting to the max
# We're JS developers guys, of course we're going to spend some time doing useless yet shiny things
show_config_and_ask_confirmation() {
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BLUE='\033[0;34m'
  MAGENTA='\033[0;35m'
  CYAN='\033[0;36m'
  WHITE='\033[1;37m'
  BOLD='\033[1m'
  NC='\033[0m' # No Color

  print_table_row() {
    local label="$1"
    local value="$2"
    local color="$3"
    local max_value_length=40

    if [[ ${#value} -le $max_value_length ]]; then
      # Value fits on one line
      printf "│ ${CYAN}%-27s${NC} │ ${color}%-40s${NC} │\n" "$label" "$value"
    else
      # Value needs to be split across multiple lines
      local remaining_value="$value"
      local first_line=true

      while [[ -n "$remaining_value" ]]; do
        local chunk="${remaining_value:0:$max_value_length}"
        remaining_value="${remaining_value:$max_value_length}"

        if [[ "$first_line" == "true" ]]; then
          # First line with label
          printf "│ ${CYAN}%-27s${NC} │ ${color}%-40s${NC} │\n" "$label" "$chunk"
          first_line=false
        else
          # Continuation lines with empty label
          printf "│ ${CYAN}%-27s${NC} │ ${color}%-40s${NC} │\n" "" "$chunk"
        fi
      done
    fi
  }

  print_table_separator() {
    printf "├─────────────────────────────┼──────────────────────────────────────────┤\n"
  }

  print_table_border() {
    printf "┌─────────────────────────────┬──────────────────────────────────────────┐\n"
  }

  print_table_footer() {
    printf "└─────────────────────────────┴──────────────────────────────────────────┘\n"
  }

  echo ""
  echo -e "${BOLD}${WHITE}🎬 Live DASH Content Generation Configuration${NC}"
  echo ""

  print_table_border
  print_table_row "Parameter" "Value" "$BOLD$WHITE"
  print_table_separator
  print_table_row "Segment Duration" "$SEGMENT_DURATION seconds" "$GREEN"
  print_table_row "Frame Rate" "$FRAME_RATE fps" "$BLUE"
  print_table_row "Timeshift Buffer Depth" "$TIMESHIFT_BUFFER_DEPTH seconds" "$YELLOW"
  print_table_separator
  print_table_row "Shaka-packager command" "$shaka_packager_cmd" "$BLUE"
  if [[ "$PORT_CONFLICT_DETECTED" == "false" ]]; then
    print_table_row "Encoding Ports" "$BASE_PORT-$PORT_LAST (UDP)" "$MAGENTA"
  else
    print_table_row "Encoding Ports" "$BASE_PORT-$PORT_LAST (UDP) - Conflict detected" "$RED"
  fi
  print_table_separator
  print_table_row "Output Directory" "$OUTPUT_DIR" "$GREEN"
  print_table_row "Output Manifest" "$OUTPUT_DIR/manifest.mpd" "$GREEN"
  print_table_separator

  if [[ -z "$KEY_ID" ]]; then
    print_table_row "Encryption Status" "Unencrypted" "$RED"
  else
    print_table_row "Encryption Status" "Encrypted" "$GREEN"
    print_table_separator
    print_table_row "  Content" "All audio and video content" "$WHITE"
    print_table_row "  Key ID" "$KEY_ID" "$YELLOW"
    print_table_row "  Key" "$KEY" "$YELLOW"
  fi

  print_table_footer
  echo ""
  echo -e "${BOLD}${BLUE}💡 Tip:${NC} Run with ${BOLD}--help${NC} flag to see all configuration options"
  echo ""

  if [[ "$NO_CONFIRM" == "false" ]]; then
    echo -n "Do you want to continue? (y/N): "
    if read -r response; then
      if [[ ! "$response" =~ ^[Yy][Ee][Ss]$ && ! "$response" =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
      fi
    else
      echo ""
      echo "Cancelled."
      exit 0
    fi
  fi
}

show_config_and_ask_confirmation

echo "Starting..."

echo "Cleaning up any existing media files before starting..."
cleanup_media_files

if ! mkdir -p "$OUTPUT_DIR"; then
  err "Failed to create output directory: $OUTPUT_DIR"
fi

gop=$((FRAME_RATE * SEGMENT_DURATION))

# NOTE: We'll encode a test content, stream it as udp into configurable ports and feed
# that stream to the shaka-packager.

# Start shaka-packager with OS-appropriate path formatting
if [[ "$(uname -s)" =~ ^(CYGWIN|MINGW|MSYS) ]]; then
  # windows
  output_dir_win=$(echo "$OUTPUT_DIR" | sed 's|^/\([a-zA-Z]\)/|\1:/|' | sed 's|/|\\|g')

  if [[ -n "$KEY_ID" ]]; then
    key_flag="--keys label=:key_id=$KEY_ID:key=$KEY --clear_lead 0 --protection_scheme cenc"
  else
    key_flag=""
  fi

  "$shaka_packager_cmd" \
    in=udp://127.0.0.1:$PORT_720P,stream=video,init_segment=$output_dir_win\\h264_720p_init.mp4,segment_template=$output_dir_win\\h264_720p_\$Number\$.m4s \
    in=udp://127.0.0.1:$PORT_480P,stream=video,init_segment=$output_dir_win\\h264_480p_init.mp4,segment_template=$output_dir_win\\h264_480p_\$Number\$.m4s \
    in=udp://127.0.0.1:$PORT_360P,stream=video,init_segment=$output_dir_win\\h264_360p_init.mp4,segment_template=$output_dir_win\\h264_360p_\$Number\$.m4s \
    in=udp://127.0.0.1:$PORT_AUDIO_1,stream=audio,init_segment=$output_dir_win\\audio_eng_init.mp4,segment_template=$output_dir_win\\audio_eng_\$Number\$.m4s \
    in=udp://127.0.0.1:$PORT_AUDIO_2,stream=audio,init_segment=$output_dir_win\\audio_fra_init.mp4,segment_template=$output_dir_win\\audio_fra_\$Number\$.m4s \
    in=udp://127.0.0.1:$PORT_LAST,stream=audio,init_segment=$output_dir_win\\audio_arm_init.mp4,segment_template=$output_dir_win\\audio_arm_\$Number\$.m4s \
    --time_shift_buffer_depth "$TIMESHIFT_BUFFER_DEPTH" \
    --minimum_update_period "$SEGMENT_DURATION" \
    --segment_duration "$SEGMENT_DURATION" \
    --fragment_duration "$FRAGMENT_DURATION" \
    --mpd_output $output_dir_win\\manifest.mpd $key_flag &
else
  shaka_args=()
  shaka_args+=(
    "in=udp://127.0.0.1:$PORT_720P,stream=video,init_segment=$OUTPUT_DIR/h264_720p_init.mp4,segment_template=$OUTPUT_DIR/h264_720p_\$Number\$.m4s"
    "in=udp://127.0.0.1:$PORT_480P,stream=video,init_segment=$OUTPUT_DIR/h264_480p_init.mp4,segment_template=$OUTPUT_DIR/h264_480p_\$Number\$.m4s"
    "in=udp://127.0.0.1:$PORT_360P,stream=video,init_segment=$OUTPUT_DIR/h264_360p_init.mp4,segment_template=$OUTPUT_DIR/h264_360p_\$Number\$.m4s"
    "in=udp://127.0.0.1:$PORT_AUDIO_1,stream=audio,init_segment=$OUTPUT_DIR/audio_eng_init.mp4,segment_template=$OUTPUT_DIR/audio_eng_\$Number\$.m4s"
    "in=udp://127.0.0.1:$PORT_AUDIO_2,stream=audio,init_segment=$OUTPUT_DIR/audio_fra_init.mp4,segment_template=$OUTPUT_DIR/audio_fra_\$Number\$.m4s"
    "in=udp://127.0.0.1:$PORT_LAST,stream=audio,init_segment=$OUTPUT_DIR/audio_arm_init.mp4,segment_template=$OUTPUT_DIR/audio_arm_\$Number\$.m4s"
  )

  # Other shaka-packager options
  shaka_args+=(
    "--time_shift_buffer_depth" "$TIMESHIFT_BUFFER_DEPTH"
    "--minimum_update_period" "$SEGMENT_DURATION"
    "--segment_duration" "$SEGMENT_DURATION"
    "--fragment_duration" "$FRAGMENT_DURATION"
    "--mpd_output" "$OUTPUT_DIR/manifest.mpd"
  )

  # Add encryption if specified
  if [[ -n "$KEY_ID" ]]; then
    shaka_args+=(
      "--keys" "label=:key_id=$KEY_ID:key=$KEY"
      "--clear_lead" "0"
      "--protection_scheme" "cenc"
    )
  fi

  # Start shaka-packager with properly escaped arguments
  printf "Starting shaka-packager with command: %s\n" "$shaka_packager_cmd" "${shaka_args[@]}"
  "$shaka_packager_cmd" "${shaka_args[@]}" &
fi

SHAKA_PID=$!
printf "shaka-packager started with PID: %s\n" "$SHAKA_PID"

# Wait for shaka-packager to initialize and start listening
sleep 3

# Build ffmpeg arguments safely
ffmpeg_args=(
  -re
  -f lavfi -i "testsrc2=size=1280x720:rate=$FRAME_RATE"
  -f lavfi -i "testsrc2=size=854x480:rate=$FRAME_RATE"
  -f lavfi -i "testsrc2=size=640x360:rate=$FRAME_RATE"
  -f lavfi -i "sine=frequency=261.63:sample_rate=48000"
  -f lavfi -i "sine=frequency=293.66:sample_rate=48000"
  -f lavfi -i "sine=frequency=329.63:sample_rate=48000"
  -map 0:v -c:v libx264 -preset superfast -b:v 2500k -g "$gop" -keyint_min "$gop" -sc_threshold 0 -r "$FRAME_RATE" -s 1280x720 -f mpegts "udp://127.0.0.1:$PORT_720P"
  -map 1:v -c:v libx264 -preset superfast -b:v 1200k -g "$gop" -keyint_min "$gop" -sc_threshold 0 -r "$FRAME_RATE" -s 854x480 -f mpegts "udp://127.0.0.1:$PORT_480P"
  -map 2:v -c:v libx264 -preset superfast -b:v 600k -g "$gop" -keyint_min "$gop" -sc_threshold 0 -r "$FRAME_RATE" -s 640x360 -f mpegts "udp://127.0.0.1:$PORT_360P"
  -map 3:a -c:a aac -b:a 128k -ac 2 -ar 48000 -metadata:s:a language=eng -f mpegts "udp://127.0.0.1:$PORT_AUDIO_1"
  -map 4:a -c:a aac -b:a 128k -ac 2 -ar 48000 -metadata:s:a language=fre -f mpegts "udp://127.0.0.1:$PORT_AUDIO_2"
  -map 5:a -c:a aac -b:a 128k -ac 2 -ar 48000 -metadata:s:a language=arm -f mpegts "udp://127.0.0.1:$PORT_LAST"
)

ffmpeg "${ffmpeg_args[@]}" &

FFMPEG_PID=$!
printf "ffmpeg started with PID: %s\n" "$FFMPEG_PID"

wait
