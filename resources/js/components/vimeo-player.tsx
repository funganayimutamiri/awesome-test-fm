import { useEffect, useRef, useState } from 'react';
import Player from '@vimeo/player';

interface VimeoPlayerProps {
    videoId: string;
    onTimeUpdate?: (currentTime: number) => void;
    onPlayerReady?: (player: Player) => void;
}

export const VimeoPlayer = ({ videoId, onTimeUpdate, onPlayerReady }: VimeoPlayerProps) => {
    const playerRef = useRef<HTMLDivElement>(null);
    const vimeoPlayerRef = useRef<Player | null>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (!playerRef.current) return;

        const player = new Player(playerRef.current, {
            id: parseInt(videoId),
            width: 800,
            responsive: true,
        });

        vimeoPlayerRef.current = player;

        player.ready().then(() => {
            setIsReady(true);
            onPlayerReady?.(player);

            player.getCurrentTime().then((seconds) => {
                onTimeUpdate?.(seconds);
            });
        });

        player.on('timeupdate', (data) => {
            onTimeUpdate?.(data.seconds);
        });

        return () => {
            player.destroy();
        };
    }, [videoId, onTimeUpdate, onPlayerReady]);

    return (
        <div className="relative w-full">
            <div
                ref={playerRef}
                className="w-full aspect-video bg-black rounded-lg overflow-hidden"
            />
            {!isReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#b8b8b8] rounded-lg">
                    <div className="text-white text-lg">Loading player...</div>
                </div>
            )}
        </div>
    );
};

export default VimeoPlayer;
