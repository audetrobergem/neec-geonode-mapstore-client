import React, { useRef, useEffect, useCallback } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import 'videojs-hls-quality-selector';

// ---------------------------------------------------------------------------
// VideoPlayer
// ---------------------------------------------------------------------------

/**
 * Thin wrapper around Video.js.
 *
 * Key behaviours:
 * - The player is created once and reused when only the time changes.
 * - The player is fully disposed and re-created when `videoInformations.videoUri`
 *   changes (required for Video.js to correctly seek on load).
 * - The player is always disposed on unmount.
 *
 * @param {object}   options          - Video.js constructor options
 * @param {function} onReady          - called with the player instance once ready
 * @param {object}   videoInformations - { videoUri, time, ... }
 */
const VideoPlayer = ({ options, onReady, videoInformations }) => {
    const containerRef = useRef(null);
    const playerRef = useRef(null);
    // Keep a ref to the latest onReady so the effect closure is always fresh
    const onReadyRef = useRef(onReady);
    useEffect(() => {
        onReadyRef.current = onReady;
    });

    /** Create a brand-new Video.js player inside the container div. */
    const createPlayer = useCallback(() => {
        if (!containerRef.current) return;

        const videoElement = document.createElement('video-js');
        videoElement.classList.add('vjs-big-play-centered');
        containerRef.current.appendChild(videoElement);

        const player = videojs(videoElement, options, () => {
            player.hlsQualitySelector({ displayCurrentQuality: true });
            onReadyRef.current?.(player);
        });

        playerRef.current = player;
    }, [options]);

    /** Dispose the current player if it exists and is not already disposed. */
    const disposePlayer = useCallback(() => {
        const player = playerRef.current;
        if (player && !player.isDisposed()) {
            player.dispose();
        }
        playerRef.current = null;
    }, []);

    // Initial mount: create the player
    useEffect(() => {
        createPlayer();
        return disposePlayer;
    }, []);

    // When the video URI changes: dispose and re-create so Video.js can seek
    // correctly after 'loadedmetadata'.
    useEffect(() => {
        const player = playerRef.current;
        if (!player) return;

        const currentSrc = player.isDisposed() ? null : player.src();
        if (currentSrc !== videoInformations?.videoUri) {
            disposePlayer();
            createPlayer();
        }
    }, [videoInformations?.videoUri, createPlayer, disposePlayer]);

    return (
        <div data-vjs-player>
            <div ref={containerRef} />
        </div>
    );
};

export default VideoPlayer;
