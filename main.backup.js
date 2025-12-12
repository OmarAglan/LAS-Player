"use strict";

class VideoPlayer {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) {
            console.error("Video player container not found:", containerSelector);
            return;
        }

        // Find elements - prefer querying within the container
        this.videoElement = this.container.querySelector("video");
        this.controls = this.container.querySelector("#controls");
        this.playPauseButton = this.container.querySelector("#play-pause");
        this.rewindButton = this.container.querySelector("#rewind");
        this.fastForwardButton = this.container.querySelector("#fast-forward");
        this.volumeButton = this.container.querySelector("#volume");
        this.volumeSlider = this.container.querySelector("#volume-slider");
        this.progressIndicator = this.container.querySelector("#progress-indicator");
        this.progressBar = this.container.querySelector("#progress-bar");
        this.currentTimeSpan = this.container.querySelector("#current-time");
        this.totalDurationSpan = this.container.querySelector("#total-duration");
        this.fullscreenButton = this.container.querySelector("#fullscreen");
        this.playbackSpeedButton = this.container.querySelector("#playback-speed");
        this.speedOptionsList = this.container.querySelector("#speed-options");
        this.subtitleTrack = this.container.querySelector("#subtitle-track");
        this.subtitleToggleButton = this.container.querySelector("#subtitle-toggle");
        this.progressBarContainer = this.container.querySelector("#progress-bar-container");
        this.progressTooltip = this.container.querySelector("#progress-tooltip");
        this.volumeSliderContainer = this.container.querySelector("#volume-slider-container");
        this.errorOverlay = this.container.querySelector("#error-overlay");
        this.errorMessageElement = this.container.querySelector("#error-message");
        this.pipButton = this.container.querySelector("#pip-toggle");

        // Non-container elements (consider passing selectors if needed)
        this.videoUploadInput = document.querySelector("#video-upload");
        this.subtitleUploadInput = document.querySelector("#subtitle-upload");

        // Verify essential elements
        if (!this.videoElement || !this.controls || !this.progressBar || !this.playPauseButton) {
             console.error("Essential player elements not found within the container.");
             // Optionally disable controls or show an error message
             return;
        }

        // State
        this.lastVolume = 1;
        this.playbackSpeeds = [0.5, 0.75, 1, 1.5, 2];
        this.currentSpeedIndex = this.playbackSpeeds.findIndex(s => s === 1); // Find index of 1x speed
        this.mouseIsDownOnProgressBar = false;
        this.isMouseOverControls = false;
        this.isMouseOverContainer = false;
        this.hideControlsTimeout = null;
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0; // Added Touch Detection
        this.isSeekingWithTouch = false; // Added Touch Seeking State

        // Bind 'this' or use arrow functions for event handlers
        this.init();
    }

    // --- Initialization ---
    init() {
        this.loadSavedVolume();
        this.populateSpeedOptions();
        this.attachEventListeners();
        this.updateSubtitleToggleIcon(); // Set initial icon state
        this.checkPiPSupport(); // Added: Check and show PiP button if supported
        console.log("Video Player Initialized");
    }

    loadSavedVolume() {
        try {
            const savedVolume = localStorage.getItem('playerVolume');
            if (savedVolume !== null && this.volumeSlider) {
                const volumeLevel = parseFloat(savedVolume);
                 if (!isNaN(volumeLevel) && volumeLevel >= 0 && volumeLevel <= 1) {
                    this.videoElement.volume = volumeLevel;
                    this.volumeSlider.value = volumeLevel;
                    this.lastVolume = volumeLevel;
                    this.videoElement.muted = (volumeLevel === 0);
                 } else {
                    // Handle invalid saved value if needed
                    this.setDefaultVolume();
                 }
            } else {
                this.setDefaultVolume();
            }
        } catch (error) {
            console.error("Error loading volume from localStorage:", error);
            this.setDefaultVolume();
        }
        this.updateVolumeIcon(); // Ensure icon matches loaded/default state
    }

    setDefaultVolume() {
         this.videoElement.volume = 1;
         if (this.volumeSlider) this.volumeSlider.value = 1;
         this.lastVolume = 1;
         this.videoElement.muted = false;
    }

    saveVolume(volume) {
         try {
            localStorage.setItem('playerVolume', volume.toString());
         } catch (error) {
             console.error("Error saving volume to localStorage:", error);
         }
    }

    populateSpeedOptions() {
        if (!this.speedOptionsList) return;
        // Clear existing options first in case init is called multiple times
        this.speedOptionsList.innerHTML = '';
        this.playbackSpeeds.forEach((speed, index) => {
            const li = document.createElement("li");
            li.textContent = `${speed}x`;
            li.dataset.speed = speed;
            li.classList.add("px-3", "py-1", "cursor-pointer", "hover:bg-teal-600", "flex", "items-center", "justify-between");
            if (index === this.currentSpeedIndex) {
                li.classList.add("bg-teal-700");
            }
            // Add checkmark span
            const checkmarkSpan = document.createElement("span");
            checkmarkSpan.classList.add("checkmark", "ml-2");
            if (index !== this.currentSpeedIndex) {
                checkmarkSpan.classList.add("invisible");
            }
            checkmarkSpan.textContent = "✓";
            li.appendChild(checkmarkSpan);

            this.speedOptionsList.appendChild(li);
        });
    }

    // --- Event Listeners Setup ---
    attachEventListeners() {
        // Video Element Events
        this.videoElement.addEventListener("play", this.updatePlayPauseIcon.bind(this));
        this.videoElement.addEventListener("pause", this.updatePlayPauseIcon.bind(this));
        this.videoElement.addEventListener("click", this.handleVideoClick.bind(this)); // Changed from playPause
        this.videoElement.addEventListener("volumechange", this.handleVolumeChangeUpdate.bind(this));
        this.videoElement.addEventListener("timeupdate", this.handleTimeUpdate.bind(this));
        this.videoElement.addEventListener("loadedmetadata", this.handleLoadedMetadata.bind(this));
        this.videoElement.addEventListener("ended", this.handleVideoEnd.bind(this)); // Handle video finishing
        this.videoElement.addEventListener("error", this.handleVideoError.bind(this)); // Added error listener

        // Control Button Events (check if elements exist before adding listener)
        if (this.playPauseButton) this.playPauseButton.addEventListener("click", this.playPause.bind(this));
        if (this.rewindButton) this.rewindButton.addEventListener("click", () => this.rewindForward("rewind"));
        if (this.fastForwardButton) this.fastForwardButton.addEventListener("click", () => this.rewindForward("forward"));
        if (this.volumeButton) {
            if (this.isTouchDevice) {
                 this.volumeButton.addEventListener("click", this.handleVolumeIconTap.bind(this));
            } else {
                // Desktop: Keep mute toggle on click, slider appears on hover (via CSS/new JS logic)
                this.volumeButton.addEventListener("click", this.muteUnmute.bind(this));
                // Show slider on container hover too for desktop
                 if (this.volumeSliderContainer) {
                    this.container.addEventListener("mouseenter", () => this.volumeSliderContainer.classList.remove("opacity-0", "invisible"));
                    this.container.addEventListener("mouseleave", () => this.volumeSliderContainer.classList.add("opacity-0", "invisible"));
                 }
            }
        }
        if (this.volumeSlider) this.volumeSlider.addEventListener("input", this.handleVolumeSliderInput.bind(this));
        if (this.fullscreenButton) this.fullscreenButton.addEventListener("click", this.toggleFullscreen.bind(this));
        if (this.playbackSpeedButton) this.playbackSpeedButton.addEventListener("click", this.toggleSpeedOptions.bind(this));
        if (this.speedOptionsList) this.speedOptionsList.addEventListener("click", this.handleSpeedSelection.bind(this));
        if (this.subtitleToggleButton) this.subtitleToggleButton.addEventListener("click", this.toggleSubtitles.bind(this));
        if (this.pipButton) this.pipButton.addEventListener("click", this.togglePictureInPicture.bind(this));

        // Progress Bar Events
        this.progressBar.addEventListener("mousedown", () => { this.mouseIsDownOnProgressBar = true; });
        // Use window to catch mouseup/touchend even if cursor leaves progress bar
        window.addEventListener("mouseup", this.handleSeekEnd.bind(this));
        window.addEventListener("touchend", this.handleSeekEnd.bind(this));
        // Also handle leaving the bar itself
        this.progressBar.addEventListener("mouseleave", this.handleSeekEnd.bind(this)); // Re-use end logic
        this.progressBar.addEventListener("click", this.seeking.bind(this)); // Keep click for mouse
        this.progressBar.addEventListener("mousemove", this.handleSeekMove.bind(this));
        // Add Touch Events for Seeking
        this.progressBar.addEventListener("touchstart", this.handleSeekStart.bind(this), { passive: true });
        this.progressBar.addEventListener("touchmove", this.handleSeekMove.bind(this), { passive: false }); // Need preventDefault potentially

        // File Input Events
        if (this.videoUploadInput) this.videoUploadInput.addEventListener("change", this.loadVideoFromFile.bind(this));
        if (this.subtitleUploadInput) this.subtitleUploadInput.addEventListener("change", this.loadSubtitlesFromFile.bind(this));

        // Document/Window Events
        document.addEventListener("fullscreenchange", this.updateFullscreenIcon.bind(this));
        document.addEventListener("webkitfullscreenchange", this.updateFullscreenIcon.bind(this)); // Safari
        document.addEventListener("msfullscreenchange", this.updateFullscreenIcon.bind(this)); // IE11
        window.addEventListener("keyup", this.handleKeyboardShortcuts.bind(this));

        // Control Visibility Events
        this.container.addEventListener("mouseenter", this.handleContainerMouseEnter.bind(this));
        this.container.addEventListener("mouseleave", this.handleContainerMouseLeave.bind(this));
        this.controls.addEventListener("mouseenter", this.handleControlsMouseEnter.bind(this));
        this.controls.addEventListener("mouseleave", this.handleControlsMouseLeave.bind(this));
        // Add Touch listener for controls visibility
        this.container.addEventListener("touchstart", this.handleContainerTap.bind(this), { passive: true });

        // Progress Bar Tooltip Events (Disable on touch)
        if (this.progressBarContainer && this.progressTooltip && !this.isTouchDevice) {
            this.progressBarContainer.addEventListener("mousemove", this.updateProgressTooltip.bind(this));
            this.progressBarContainer.addEventListener("mouseenter", () => { this.progressTooltip.classList.remove("hidden"); });
            this.progressBarContainer.addEventListener("mouseleave", () => { this.progressTooltip.classList.add("hidden"); });
        }
    }

    // --- Core Functionality Methods ---
    playPause() {
        if (this.videoElement.paused || this.videoElement.ended) {
            this.videoElement.play().catch(error => console.error("Error playing video:", error));
        } else {
            this.videoElement.pause();
        }
    }

    rewindForward(type) {
        const skipTime = 10; // seconds
        this.videoElement.currentTime += type === "rewind" ? -skipTime : skipTime;
    }

    muteUnmute() {
        // Only toggle mute state. Slider input handles volume level.
        this.videoElement.muted = !this.videoElement.muted;

        // If unmuting and volume is 0, restore last known volume
        if (!this.videoElement.muted && this.videoElement.volume === 0) {
             this.videoElement.volume = this.lastVolume > 0 ? this.lastVolume : 1;
             if (this.volumeSlider) this.volumeSlider.value = this.videoElement.volume;
        }

        // Save state and update UI
        this.saveVolume(this.videoElement.muted ? 0 : this.videoElement.volume);
        this.updateVolumeIcon();
        // Sync slider value if it exists
        if (this.volumeSlider) {
            this.volumeSlider.value = this.videoElement.muted ? 0 : this.videoElement.volume;
        }
    }

    handleVolumeSliderInput() {
        if (!this.volumeSlider) return;
        const newVolume = parseFloat(this.volumeSlider.value);
        this.videoElement.volume = newVolume;
        this.videoElement.muted = (newVolume === 0); // Mute if slider is at 0

        if (!this.videoElement.muted) {
             this.lastVolume = newVolume; // Update last known non-mute volume
        }
        this.saveVolume(newVolume); // Save the slider value
        // Icon update will be triggered by the 'volumechange' event (usually)
        // But call directly ensure responsiveness if event doesn't fire (e.g. already 0 or 1)
        this.updateVolumeIcon();
    }

    // Triggered by 'volumechange' event on video element
    handleVolumeChangeUpdate() {
        // Update the icon based on the current video volume/muted state
        this.updateVolumeIcon();
        // Update slider position ONLY if the user isn't actively dragging it
        // This handles programmatic volume changes or external changes
        if (this.volumeSlider && !this.volumeSlider.matches(':active')) {
           this.volumeSlider.value = this.videoElement.muted ? 0 : this.videoElement.volume;
        }
    }

    updateProgress() {
        if (!this.videoElement.duration || !this.progressIndicator) return;
        const progressPercentage = (this.videoElement.currentTime / this.videoElement.duration) * 100;
        this.progressIndicator.style.width = `${Math.min(100, Math.max(0, progressPercentage))}%`; // Clamp value 0-100
    }

    updateTimeDisplay() {
        if (this.currentTimeSpan) {
             this.currentTimeSpan.textContent = this.formatTime(this.videoElement.currentTime);
        }
    }

    updateTotalDuration() {
        if (this.totalDurationSpan) {
            this.totalDurationSpan.textContent = this.formatTime(this.videoElement.duration);
        }
    }

    // Triggered by 'timeupdate' event
    handleTimeUpdate() {
         this.updateProgress();
         this.updateTimeDisplay();
    }

    // Triggered by 'loadedmetadata' event
    handleLoadedMetadata() {
        this.updateTotalDuration();
        // Potentially enable controls that depend on duration
    }

     // Triggered by 'ended' event
     handleVideoEnd() {
         // Reset play button to 'play' state
         this.updatePlayPauseIcon();
         // Optional: rewind to start, loop, etc.
         console.log("Video finished playing.");
     }

    seeking(e) {
        if (!this.videoElement.duration) return; // Can't seek if duration isn't known
         const progressBarRect = this.progressBar.getBoundingClientRect();
         // Calculate click position relative to the progress bar start
         const clickPositionX = e.clientX - progressBarRect.left;
         const barWidth = progressBarRect.width;
         // Clamp click position between 0 and barWidth
         const relativePosition = Math.min(1, Math.max(0, clickPositionX / barWidth));
         this.videoElement.currentTime = relativePosition * this.videoElement.duration;
         // Immediately update progress bar visually after seeking
         this.updateProgress();
    }

    toggleFullscreen() {
        if (!this.container) return; // Need the container to go fullscreen

        if (!document.fullscreenElement) {
            // Attempt to enter fullscreen
            const requestMethod = this.container.requestFullscreen || this.container.webkitRequestFullscreen || this.container.msRequestFullscreen;
            if (requestMethod) {
                requestMethod.call(this.container)
                    .catch(err => console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`));
            }
        } else {
            // Attempt to exit fullscreen
            const exitMethod = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
            if (exitMethod) {
                 exitMethod.call(document)
                    .catch(err => console.error(`Error attempting to exit full-screen mode: ${err.message} (${err.name})`));
            }
        }
    }

    toggleSpeedOptions() {
        if (this.speedOptionsList) {
             this.speedOptionsList.classList.toggle("hidden");
        }
    }

    handleSpeedSelection(e) {
        if (e.target.tagName === "LI" && e.target.dataset.speed) {
            const selectedSpeed = parseFloat(e.target.dataset.speed);
             if (!isNaN(selectedSpeed)) {
                this.setPlaybackSpeed(selectedSpeed);
                this.toggleSpeedOptions(); // Hide list after selection
             }
        }
    }

    setPlaybackSpeed(speed) {
        if (isNaN(speed)) return;

        this.videoElement.playbackRate = speed;
        if (this.playbackSpeedButton) {
            this.playbackSpeedButton.textContent = `${speed}x`;
        }

        // Update visual indicator in the list
        if (this.speedOptionsList) {
            const options = this.speedOptionsList.querySelectorAll("li");
            options.forEach(option => {
                const checkmark = option.querySelector(".checkmark");
                option.classList.remove("bg-teal-700");
                if(checkmark) checkmark.classList.add("invisible");

                 // Use a tolerance for float comparison if needed, but direct compare often okay here
                if (parseFloat(option.dataset.speed) === speed) {
                    option.classList.add("bg-teal-700");
                    if(checkmark) checkmark.classList.remove("invisible");
                }
            });
        }
         // Find and update currentSpeedIndex based on selected speed
        this.currentSpeedIndex = this.playbackSpeeds.findIndex(s => s === speed);
    }

    toggleSubtitles() {
        if (!this.subtitleTrack || this.subtitleToggleButton.disabled) return;

        // Access the TextTrack object associated with the <track> element
        const track = this.subtitleTrack.track;

        // Check if the track has loaded and is ready
        if (!track) {
            console.warn("Subtitle track not yet loaded or available.");
            return;
        }

        try {
            const isShowing = track.mode === "showing";
            // Set mode to 'showing' or 'hidden'. 'disabled' means track won't load.
            track.mode = isShowing ? "hidden" : "showing";
            console.log("Subtitle mode set to:", track.mode);
        } catch (error) {
             console.error("Error setting subtitle track mode:", error);
        }
        this.updateSubtitleToggleIcon(); // Update icon based on the new mode
    }

    // --- Error Handling Methods --- Added Section
    showError(message = "Could not load video.") {
        if (this.errorOverlay && this.errorMessageElement) {
            this.errorMessageElement.textContent = message;
            this.errorOverlay.classList.remove("hidden");
            // Optionally hide controls when error shows
             if (this.controls) this.controls.classList.add("opacity-0");
        }
         console.error("Video Player Error:", message);
    }

    hideError() {
        if (this.errorOverlay) {
            this.errorOverlay.classList.add("hidden");
        }
    }

    handleVideoError(event) {
        let message = "An unknown error occurred while loading the video.";
        const error = event.target.error;
        if (error) {
            switch (error.code) {
                case error.MEDIA_ERR_ABORTED:
                    message = "Video loading aborted.";
                    break;
                case error.MEDIA_ERR_NETWORK:
                    message = "A network error caused the video download to fail.";
                    break;
                case error.MEDIA_ERR_DECODE:
                    message = "The video playback was aborted due to a corruption problem or because the video used features your browser did not support.";
                    break;
                case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    message = "The video could not be loaded, either because the server or network failed or because the format is not supported.";
                    break;
                default:
                    message = `An unexpected error occurred (Code: ${error.code}).`;
                    break;
            }
        }
        this.showError(message);
    }
    // --- End Error Handling --- 

    loadVideoFromFile(e) {
        const file = e.target.files[0];
        this.hideError(); // Hide previous errors
        if (file && file.type.startsWith('video/')) {
             // Revoke previous video object URL if one exists
            const currentVideoSrc = this.videoElement.getAttribute('src');
            if (currentVideoSrc && currentVideoSrc.startsWith('blob:')) {
                URL.revokeObjectURL(currentVideoSrc);
            }

            const videoURL = URL.createObjectURL(file);
            this.videoElement.src = videoURL;
            this.videoElement.load(); // Important: load the new source
            console.log(`Loading video: ${file.name}`);

            // Reset subtitle state when loading a new video
            this.resetSubtitleState();
            // Reset duration display until new metadata loads
            if (this.totalDurationSpan) this.totalDurationSpan.textContent = "--:--";
            if (this.currentTimeSpan) this.currentTimeSpan.textContent = "00:00";
            if (this.progressIndicator) this.progressIndicator.style.width = "0%";
        } else if (file) {
             const errorMsg = `Invalid file type for video: ${file.type || 'unknown'}. Please select a video file.`;
             this.showError(errorMsg);
             e.target.value = ""; // Clear the input
        }
    }

    loadSubtitlesFromFile(e) {
        const file = e.target.files[0];
        this.hideError(); // Hide previous errors
        // Basic check for .vtt extension (more robust check might involve MIME type if provided)
        if (file && file.name.toLowerCase().endsWith('.vtt') && this.subtitleTrack) {
            // Revoke previous subtitle object URL
            const currentSubtitleSrc = this.subtitleTrack.getAttribute('src');
             if (currentSubtitleSrc && currentSubtitleSrc.startsWith('blob:')) {
                URL.revokeObjectURL(currentSubtitleSrc);
            }

            const subtitleURL = URL.createObjectURL(file);
            this.subtitleTrack.src = subtitleURL;
            // Browsers handle track loading. Set mode to hidden initially.
            // We rely on the 'mode' property of the TextTrack object later.
            // Resetting src should make the browser re-evaluate the track.
            this.subtitleTrack.track.mode = 'hidden'; // Default state

            // Re-enable the toggle button
            if (this.subtitleToggleButton) {
                 this.subtitleToggleButton.disabled = false;
            }

            // Update icon *after* a short delay to allow track processing
            // The track needs to load before its mode can be reliably checked/set
            setTimeout(() => {
                 // Verify track is loaded before updating UI
                 if (this.subtitleTrack.track) {
                    this.subtitleTrack.track.mode = 'hidden'; // Ensure it's hidden initially
                 } else {
                    console.warn("Subtitle track failed to load after src change.");
                 }
                 this.updateSubtitleToggleIcon(); // Update icon based on initial 'hidden' state
            }, 150); // Adjust delay if needed

            console.log(`Loading subtitles: ${file.name}`);
        } else if(file) {
             const errorMsg = `Invalid file type for subtitles: ${file.name}. Please select a .vtt file.`;
             this.showError(errorMsg);
             e.target.value = ""; // Clear the input
             this.resetSubtitleState(); // Ensure button is disabled etc.
        }
    }

    resetSubtitleState() {
        if (this.subtitleTrack) {
             // Revoke URL if it exists
             const currentSubtitleSrc = this.subtitleTrack.getAttribute('src');
             if (currentSubtitleSrc && currentSubtitleSrc.startsWith('blob:')) {
                URL.revokeObjectURL(currentSubtitleSrc);
            }
            // Remove src and potentially force track mode to disabled
            this.subtitleTrack.removeAttribute('src');
             if(this.subtitleTrack.track) {
                 this.subtitleTrack.track.mode = "disabled";
             }
        }
        // Disable and reset button
        if (this.subtitleToggleButton) {
             this.subtitleToggleButton.disabled = true;
             this.updateSubtitleToggleIcon(); // Set icon to 'off' state
        }
        // Clear the file input
        if(this.subtitleUploadInput) {
            this.subtitleUploadInput.value = "";
        }
    }

    handleKeyboardShortcuts(e) {
        // Ignore if focus is on an input/textarea/select element, or contentEditable
         const activeElement = document.activeElement;
         const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT' || activeElement.isContentEditable);

        if (isInputFocused) return;

        // Use e.key for more readable comparisons
        switch (e.key.toLowerCase()) { // Use toLowerCase for consistency
            case " ": // Space bar
            case "k":
                e.preventDefault(); // Prevent default space bar action (scrolling)
                this.playPause();
                break;
            case "arrowleft":
                e.preventDefault(); // Prevent potential browser back navigation?
                this.rewindForward("rewind");
                break;
            case "arrowright":
                e.preventDefault();
                this.rewindForward("forward");
                break;
            case "m":
                this.muteUnmute();
                break;
            case "f":
                this.toggleFullscreen();
                break;
            // Add more shortcuts here if needed
            // e.g., ArrowUp/ArrowDown for volume?
            default:
                // console.log("Unhandled key:", e.key);
                break;
        }
    }

    // --- UI Update Methods ---
    updatePlayPauseIcon() {
        if (!this.playPauseButton) return;
        const icon = this.playPauseButton.querySelector("i.material-icons");
        if (icon) {
             // Use 'pause' icon when playing, 'replay' if ended, 'play_arrow' otherwise
             if (this.videoElement.ended) {
                  icon.textContent = "replay";
             } else {
                  icon.textContent = this.videoElement.paused ? "play_arrow" : "pause";
             }
        }
    }

    updateVolumeIcon() {
        if (!this.volumeButton) return;
        const icon = this.volumeButton.querySelector("i.material-icons");
        if (icon) {
             if (this.videoElement.muted || this.videoElement.volume === 0) {
                icon.textContent = "volume_off";
            } else if (this.videoElement.volume <= 0.5) { // Use <= 0.5 for volume_down
                icon.textContent = "volume_down";
            } else {
                icon.textContent = "volume_up";
            }
        }
    }

    updateFullscreenIcon() {
        if (!this.fullscreenButton) return;
        const icon = this.fullscreenButton.querySelector("i.material-icons");
         if (icon) {
            icon.textContent = document.fullscreenElement ? "fullscreen_exit" : "fullscreen";
         }
    }

    updateSubtitleToggleIcon() {
        if (!this.subtitleToggleButton) return;
        const icon = this.subtitleToggleButton.querySelector("i.material-icons");
        if (!icon) return;

         // Check disabled state first
         if(this.subtitleToggleButton.disabled) {
            icon.textContent = "subtitles_off";
            this.subtitleToggleButton.classList.add("text-gray-400"); // Style disabled state
            this.subtitleToggleButton.classList.remove("text-white"); // Ensure active color removed
            return;
         }

        // Check track state if button is enabled
        // Ensure track object exists and check its mode
        const trackMode = this.subtitleTrack && this.subtitleTrack.track ? this.subtitleTrack.track.mode : 'disabled';

        if (trackMode === "showing") {
            icon.textContent = "subtitles";
            this.subtitleToggleButton.classList.remove("text-gray-400");
            this.subtitleToggleButton.classList.add("text-white"); // Style active state
        } else {
            icon.textContent = "subtitles_off";
            this.subtitleToggleButton.classList.add("text-gray-400");
            this.subtitleToggleButton.classList.remove("text-white");
        }
    }

    // --- Utility Methods ---
    formatTime(timeInSeconds) {
        // Return default for invalid inputs early
        if (isNaN(timeInSeconds) || timeInSeconds < 0) return "--:--";

        const totalSeconds = Math.floor(timeInSeconds);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        // Pad with leading zeros
        const paddedMinutes = String(minutes).padStart(2, "0");
        const paddedSeconds = String(seconds).padStart(2, "0");

        return `${paddedMinutes}:${paddedSeconds}`;
    }

    // --- Control Visibility Methods ---
    showControls() {
        clearTimeout(this.hideControlsTimeout); // Cancel any pending hide
        this.controls.classList.remove("opacity-0");
        this.controls.classList.add("opacity-100");
        // Restart hide timer if on touch device and video is playing
        if (this.isTouchDevice && !this.videoElement.paused) {
             this.scheduleHideControls();
        }
    }

    hideControls() {
        // Never hide if mouse is over controls (desktop)
        if (this.isMouseOverControls) return;
        // Always hide immediately if overlay is shown
        if (this.errorOverlay && !this.errorOverlay.classList.contains('hidden')) {
             this.controls.classList.remove("opacity-100");
             this.controls.classList.add("opacity-0");
             return;
        }

        this.controls.classList.remove("opacity-100");
        this.controls.classList.add("opacity-0");
    }

    // Schedule hiding controls (used mainly for touch)
    scheduleHideControls(delay = 3000) { // 3 second delay
         clearTimeout(this.hideControlsTimeout);
         // Don't hide if paused or seeking
         if (this.videoElement.paused || this.isSeekingWithTouch || this.mouseIsDownOnProgressBar) return;

         this.hideControlsTimeout = setTimeout(() => {
             this.hideControls();
         }, delay);
    }

     // Toggle visibility instantly on tap (touch devices)
     toggleControlsVisibilityWithTap() {
        if (this.controls.classList.contains("opacity-0")) {
            this.showControls(); // Shows and schedules hide if playing
        } else {
            clearTimeout(this.hideControlsTimeout); // Cancel any scheduled hide
            this.hideControls(); // Hide immediately
        }
     }

    handleContainerMouseEnter() {
        if (this.isTouchDevice) return; // Ignore mouse enter on touch
        this.isMouseOverContainer = true;
        this.showControls();
    }

    handleContainerMouseLeave() {
        if (this.isTouchDevice) return; // Ignore mouse leave on touch
        this.isMouseOverContainer = false;
        // Don't hide immediately, let controls listener handle it if mouse moves onto controls
        // Schedule hide only if mouse truly left container+controls area
        setTimeout(() => {
             if (!this.isMouseOverContainer && !this.isMouseOverControls) {
                 this.hideControls();
             }
        }, 100); // Small delay to allow moving onto controls
    }

    handleControlsMouseEnter() {
        if (this.isTouchDevice) return; // Ignore mouse enter on touch
        this.isMouseOverControls = true;
        this.showControls(); // Keep controls visible
    }

    handleControlsMouseLeave() {
        if (this.isTouchDevice) return; // Ignore mouse leave on touch
        this.isMouseOverControls = false;
        // Schedule hide only if mouse also left the main container
        if (!this.isMouseOverContainer) {
            this.hideControls(); // Use default hide logic (might have short delay)
        }
    }

    // Added: Handle container tap for touch devices
    handleContainerTap(e) {
        // Prevent if tap was on controls themselves
        if (e.target.closest("#controls")) return;
        this.toggleControlsVisibilityWithTap();
    }

    // --- Progress Bar Tooltip Method --- (No changes needed, conditional listener handles it)
    updateProgressTooltip(e) {
        if (!this.videoElement.duration || !this.progressTooltip) return;

        const progressBarRect = this.progressBar.getBoundingClientRect();
        const hoverPositionX = e.clientX - progressBarRect.left;
        const barWidth = progressBarRect.width;
        const hoverRatio = Math.min(1, Math.max(0, hoverPositionX / barWidth));
        const hoverTime = hoverRatio * this.videoElement.duration;

        this.progressTooltip.textContent = this.formatTime(hoverTime);

        // Position tooltip - Calculate left offset ensuring it stays within bar bounds
        const tooltipWidth = this.progressTooltip.offsetWidth;
        const tooltipOffset = hoverPositionX - (tooltipWidth / 2);
        const maxOffset = barWidth - tooltipWidth;
        const finalOffset = Math.min(maxOffset, Math.max(0, tooltipOffset)); // Clamp offset

        this.progressTooltip.style.left = `${finalOffset}px`;
        this.progressTooltip.classList.remove("hidden"); // Ensure visible while moving
    }

    checkPiPSupport() {
        if ('pictureInPictureEnabled' in document && document.pictureInPictureEnabled && this.pipButton) {
            // PiP is supported and the button exists
            this.pipButton.classList.remove("hidden"); // Make the button visible
             console.log("Picture-in-Picture is supported.");
        } else {
            console.log("Picture-in-Picture is not supported or button not found.");
        }
    }

    // --- Picture-in-Picture Method --- Added Section
    async togglePictureInPicture() {
        if (!document.pictureInPictureEnabled || this.videoElement.disablePictureInPicture) {
            console.warn("Picture-in-Picture is not supported or disabled for this video.");
            return;
        }

        try {
            if (document.pictureInPictureElement === this.videoElement) {
                // Currently in PiP, exit
                await document.exitPictureInPicture();
                console.log("Exited Picture-in-Picture mode.");
            } else {
                // Not in PiP, request it
                await this.videoElement.requestPictureInPicture();
                console.log("Entered Picture-in-Picture mode.");
            }
        } catch (error) {
            console.error("Error handling Picture-in-Picture request:", error);
            // Optionally show a user-facing error message
            this.showError(`Picture-in-Picture Error: ${error.message}`);
        }
    }

    // Added: Handle tap on volume icon for touch devices
    handleVolumeIconTap(e) {
        e.stopPropagation(); // Prevent tap from triggering container tap logic
        if (this.volumeSliderContainer) {
             const isSliderVisible = !this.volumeSliderContainer.classList.contains("invisible");
             if(isSliderVisible) {
                 this.volumeSliderContainer.classList.add("opacity-0", "invisible");
             } else {
                 this.volumeSliderContainer.classList.remove("opacity-0", "invisible");
                 // Optional: Start timer to hide slider if no interaction?
             }
        }
        // Optional: Keep mute toggle on icon tap as well?
        // this.muteUnmute();
    }

    // Added: Handle clicks/taps on the video element itself
    handleVideoClick(e) {
        // On touch devices, primary action is to toggle controls visibility
        // On desktop, toggle play/pause
        if (this.isTouchDevice) {
             this.toggleControlsVisibilityWithTap();
        } else {
            this.playPause();
        }
    }

    // --- Seeking Methods --- Modified/Added
    handleSeekStart(e) {
        if (!this.videoElement.duration) return;
        this.isSeekingWithTouch = true;
        this.handleSeekMove(e); // Process initial position
    }

    handleSeekMove(e) {
        if (!this.mouseIsDownOnProgressBar && !this.isSeekingWithTouch) return; // Only process if seeking
        if (!this.videoElement.duration) return;

        // Prevent page scroll during touch seek
        if (this.isSeekingWithTouch && e.cancelable) {
             e.preventDefault();
        }

        const progressBarRect = this.progressBar.getBoundingClientRect();
        const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
        const clickPositionX = clientX - progressBarRect.left;
        const barWidth = progressBarRect.width;
        const relativePosition = Math.min(1, Math.max(0, clickPositionX / barWidth));
        this.videoElement.currentTime = relativePosition * this.videoElement.duration;
        this.updateProgress(); // Update indicator immediately
    }

    handleSeekEnd(e) {
        this.mouseIsDownOnProgressBar = false;
        this.isSeekingWithTouch = false;
    }
    // --- End Seeking Methods ---
}

// --- Instantiate the Player ---
// Wait for the DOM to be fully loaded before initializing
document.addEventListener("DOMContentLoaded", () => {
    // Select the main container for the player
    const playerContainer = "#container";
    const player = new VideoPlayer(playerContainer);

     // Optional: Expose player instance globally for debugging?
     // window.videoPlayer = player;
});
