import React, { useRef, useEffect } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import * as hlsQualitySelector from 'videojs-hls-quality-selector';

export const VideoPlayer = (props) => {
    const videoRef = useRef(null);
    const playerRef = useRef(null);
    const { options, onReady, videoInformations } = props;

    useEffect(() => {

        // Make sure Video.js player is only initialized once
        if (!playerRef.current) {
            // The Video.js player needs to be _inside_ the component el for React 18 Strict Mode.
            const videoElement = document.createElement("video-js");

            videoElement.classList.add('vjs-big-play-centered');
            videoRef.current.appendChild(videoElement);

            const player = playerRef.current = videojs(videoElement, options, () => {
                onReady && onReady(player);
                player.hlsQualitySelector({ displayCurrentQuality: true });
            });


        } else {
            if (playerRef.current.src() !== videoInformations.videoUri) {
                // We need to dispose of the current player when the video source changes,
                // otherwise positioning at a given time won't work.
                playerRef.current.dispose();
                playerRef.current = null;

                // We can recreate the player with the basic options. The new video source
                // and time are adjusted in the onReady function.
                const videoElement = document.createElement("video-js");
                videoElement.classList.add('vjs-big-play-centered');
                videoRef.current.appendChild(videoElement);
                const player = playerRef.current = videojs(videoElement, options, () => {
                    onReady && onReady(player);
                    player.hlsQualitySelector({ displayCurrentQuality: true });
                });
            }
        }
    }, [options, videoRef, videoInformations]);

    // Dispose the Video.js player when the functional component unmounts
    useEffect(() => {
        const player = playerRef.current;

        return () => {
            if (player && !player.isDisposed()) {
                player.dispose();
                playerRef.current = null;
            }
        };
    }, [playerRef]);

    return (
        <div data-vjs-player>
            <div ref={videoRef} />
        </div>
    );
};

export default VideoPlayer;
