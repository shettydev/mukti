'use client';

import { createPlayer, videoFeatures } from '@videojs/react';
import { Video, VideoSkin } from '@videojs/react/video';
import '@videojs/react/video/skin.css';

const Player = createPlayer({ features: videoFeatures });

interface VideoJsPlayerProps {
  className?: string;
  src: string;
}

export default function VideoJsPlayer({ className, src }: VideoJsPlayerProps) {
  return (
    <Player.Provider>
      <VideoSkin className={className}>
        <Video autoPlay loop muted playsInline src={src} />
      </VideoSkin>
    </Player.Provider>
  );
}
