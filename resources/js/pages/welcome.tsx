import { useState, useEffect, useCallback } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { dashboard, login, register } from '@/routes';
import VimeoPlayer from '@/components/vimeo-player';
import Player from '@vimeo/player';
import axios from 'axios';

// Types
interface Comment {
    id: number;
    username: string;
    user_id: number;
    text: string;
    timestamp: number;
    timestamp_formatted: string;
    created_at: string;
}

interface WelcomeProps {
    canRegister?: boolean;
}

interface CommentCardProps {
    comment: Comment;
    onSeek: (timestamp: number) => void;
    currentUserId?: number;
    onDelete?: (id: number) => void;
}

const CommentCard = ({ comment, onSeek, currentUserId, onDelete }: CommentCardProps) => {
    const isOwner = currentUserId === comment.user_id;

    return (
        <div className="comment-card">
            <div className="comment-avatar" />
            <div className="comment-content">
                <div className="comment-header">
                    <div className="comment-username">
                        {comment.username}
                    </div>
                    {isOwner && onDelete && (
                        <button
                            onClick={() => onDelete(comment.id)}
                            className="comment-delete"
                        >
                            Delete
                        </button>
                    )}
                </div>
                <div className="comment-text">
                    {comment.text}
                </div>
                <button
                    onClick={() => onSeek(comment.timestamp)}
                    className="comment-timestamp"
                >
                    {comment.timestamp_formatted} →
                </button>
            </div>
        </div>
    );
};

const CommentsList = ({
    comments,
    onSeek,
    currentUserId,
    onDelete
}: {
    comments: Comment[];
    onSeek: (timestamp: number) => void;
    currentUserId?: number;
    onDelete?: (id: number) => void;
}) => {
    return (
        <div className="comments-list">
            {comments.length === 0 ? (
                <div className="empty-comments">
                    No comments yet. Be the first to comment!
                </div>
            ) : (
                comments.map((comment) => (
                    <CommentCard
                        key={comment.id}
                        comment={comment}
                        onSeek={onSeek}
                        currentUserId={currentUserId}
                        onDelete={onDelete}
                    />
                ))
            )}
        </div>
    );
};

const NewCommentForm = ({
    currentTime,
    onSubmit,
    isAuthenticated,
    player
}: {
    currentTime: string;
    onSubmit: (text: string) => void;
    isAuthenticated: boolean;
    player: Player | null;
}) => {
    const [commentText, setCommentText] = useState('');
    const [displayTime, setDisplayTime] = useState(currentTime);

    useEffect(() => {
        setDisplayTime(currentTime);
    }, [currentTime]);

    const handleTextareaFocus = async () => {
        if (player) {
            try {
                const seconds = await player.getCurrentTime();
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const secs = Math.floor(seconds % 60);

                const formatted = hours > 0
                    ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                    : `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

                setDisplayTime(formatted);
            } catch (error) {
                console.error('Error getting current time:', error);
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (commentText.trim()) {
            onSubmit(commentText);
            setCommentText('');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="login-prompt">
                <p className="login-prompt-text">
                    Please log in to leave a comment
                </p>
                <Link
                    href={login()}
                    className="login-button"
                >
                    LOG IN
                </Link>
            </div>
        );
    }

    return (
        <div className="new-comment-section">
            <form onSubmit={handleSubmit}>
                <div className="new-comment-header">
                    <div className="new-comment-title">
                        NEW COMMENT
                    </div>
                    <div className="new-comment-time">
                        {displayTime}
                    </div>
                </div>

                <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onFocus={handleTextareaFocus}
                    className="comment-input"
                    placeholder="Write your comment here..."
                    maxLength={1000}
                />

                <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="submit-button"
                >
                    SUBMIT
                    <span>➜</span>
                </button>
            </form>
        </div>
    );
};

export default function Welcome({ canRegister = true }: WelcomeProps) {
    const { auth } = usePage<SharedData>().props;
    const VIDEO_ID = '76979871';

    const [player, setPlayer] = useState<Player | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [currentTimeFormatted, setCurrentTimeFormatted] = useState('00:00');
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const formatTime = useCallback((seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }

        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);

    const fetchComments = useCallback(async () => {
        try {
            const response = await axios.get('/api/video-comments', {
                params: { video_id: VIDEO_ID }
            });
            setComments(response.data);
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setIsLoading(false);
        }
    }, [VIDEO_ID]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    const handleTimeUpdate = useCallback((time: number) => {
        setCurrentTime(time);
        setCurrentTimeFormatted(formatTime(time));
    }, [formatTime]);

    const handlePlayerReady = useCallback((playerInstance: Player) => {
        setPlayer(playerInstance);
    }, []);

    const handleCommentSubmit = async (text: string) => {
        if (!auth.user) {
            alert('Please log in to comment');
            return;
        }

        if (!player) {
            alert('Video player not ready. Please try again.');
            return;
        }

        try {
            const timestamp = await player.getCurrentTime();

            const response = await axios.post('/api/video-comments', {
                video_id: VIDEO_ID,
                comment: text,
                timestamp,
            });

            setComments(prev => [...prev, response.data].sort((a, b) => a.timestamp - b.timestamp));
        } catch (error) {
            console.error('Error submitting comment:', error);
            alert('Failed to submit comment. Please try again.');
        }
    };

    const handleSeekToTimestamp = useCallback((timestamp: number) => {
        if (player) {
            player.setCurrentTime(timestamp).catch(error => {
                console.error('Error seeking video:', error);
            });
        }
    }, [player]);

    const handleDeleteComment = async (commentId: number) => {
        if (!confirm('Are you sure you want to delete this comment?')) {
            return;
        }

        try {
            await axios.delete(`/api/video-comments/${commentId}`);
            setComments(prev => prev.filter(c => c.id !== commentId));
        } catch (error) {
            console.error('Error deleting comment:', error);
            alert('Failed to delete comment. Please try again.');
        }
    };

    return (
        <>
            <Head title="Awesome Video Player" />

            <div className="landing-page">
                {/* Header */}
                <header className="header">
                    <div className="logo">
                        <svg width="51" height="61" viewBox="0 0 51 61" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M46.4172 27.0342C47.4184 27.0342 48.5451 27.4095 49.4211 28.0352C49.9217 28.4106 50.2969 28.7865 50.4221 29.2871C51.5486 31.4148 49.5466 33.2927 48.4202 34.2939L48.0491 34.6602C47.1761 35.5075 46.2551 36.3041 45.2913 37.0469L44.9192 37.415C41.1236 41.2558 38.6462 46.352 38.2825 51.5654C38.0322 54.6944 36.0292 57.4478 33.2756 58.5742C31.7737 59.2 30.1465 59.2 28.7698 59.3252L26.7678 59.4502L24.0139 60.0762L22.387 60.4521C21.4471 60.7172 20.4802 60.8398 19.5168 60.8252L19.5081 60.8271L19.4885 60.8242C18.8735 60.8131 18.2605 60.745 17.6565 60.6211L17.2551 60.5771C15.8669 60.236 14.5681 59.6009 13.4456 58.7158C12.323 57.8307 11.4029 56.7157 10.7473 55.4453L9.87036 53.3174C7.49236 46.0584 4.73883 40.3011 0.608645 33.793C0.607913 33.7917 0.607422 33.7903 0.606692 33.7891C-0.391724 32.2882 -0.14101 30.6626 1.23462 29.6621L2.86157 29.0371H3.61255C6.99186 29.0371 9.1194 32.1662 9.87036 33.543L11.3635 36.1562L11.3723 36.1709L11.4983 36.2959V36.1709L11.6233 36.0459C12.0219 35.6772 12.5005 35.406 13.0217 35.2539C13.543 35.1019 14.0929 35.0733 14.6272 35.1699L16.6292 35.6699C16.7543 35.1696 17.1299 34.6693 17.5051 34.2939C18.2561 33.6681 19.1329 33.292 20.009 33.292L20.635 33.417L22.512 33.668C22.5884 33.711 22.6771 33.7236 22.7629 33.708L23.0129 33.543C23.6387 32.6669 24.6395 31.9155 25.7659 31.54L26.4124 31.4805C26.6535 31.4422 26.8974 31.4194 27.1428 31.415L27.4905 31.4297C27.7199 31.4488 27.9442 31.4861 28.1643 31.541C29.5967 31.8973 30.8743 32.972 32.3997 34.2939L33.1506 35.0439C33.2758 35.1691 34.1517 35.6698 34.9026 35.6699C35.1529 35.6699 35.4034 35.6702 35.5286 35.4199C36.5298 34.1684 37.7817 32.6668 39.1585 31.29L39.2835 31.1641C40.4098 30.0378 41.9115 28.6612 43.5383 27.7852C44.4144 27.2846 45.416 27.0342 46.4172 27.0342ZM46.3547 29.0381C45.6317 29.045 45.0234 29.1723 44.4153 29.5371C43.0387 30.288 41.7869 31.5397 40.5354 32.666C39.1586 34.0428 38.0318 35.4203 37.0305 36.6719L36.9338 36.7861C36.4356 37.343 35.7239 37.6729 34.9026 37.6729C33.7762 37.6728 32.6495 37.0475 32.0237 36.5469L32.0227 36.5459H31.8987L31.0227 35.7949C29.7674 34.6362 28.8094 33.7771 27.9202 33.4443C27.6366 33.3498 27.3561 33.2995 27.0696 33.2939C27.0419 33.2945 27.0142 33.2956 26.9866 33.2969L26.2668 33.417C26.1287 33.4565 25.994 33.5068 25.8635 33.5635C25.754 33.6122 25.6461 33.6662 25.5422 33.7275C25.0578 34.0139 24.659 34.4253 24.3889 34.9189C24.1386 35.2944 24.1387 35.6705 24.3889 36.0459L25.3274 38.2549C25.335 38.2731 25.3422 38.2914 25.3499 38.3096L26.1418 40.1758L27.8938 44.4316L28.1438 44.8066C28.6444 46.3083 29.0201 46.5585 29.6458 46.5586C30.5219 46.5586 31.2732 46.1834 31.6487 45.5576C32.0241 45.057 32.0238 44.5564 31.8987 43.9307L29.8967 39.0498C29.6464 38.6743 29.7716 38.2983 29.8967 37.9229L30.5217 37.4229H30.7727L30.8635 37.4277C31.303 37.4832 31.5232 37.9299 31.5237 38.0479V38.1738L33.6516 43.3047C34.1523 44.4311 34.0266 45.6833 33.2756 46.6846C32.5246 47.8108 31.1475 48.5615 29.6458 48.5615H29.1458L28.7698 48.9375C27.8936 50.1889 26.5167 50.9393 25.0149 51.0645C23.9977 51.1926 22.971 50.925 22.1448 50.3184C22.1422 50.3166 22.1386 50.3152 22.136 50.3135L22.011 50.5645C21.3852 51.3152 20.3842 51.9413 19.3831 52.0664C18.3509 52.1816 17.3088 51.964 16.4084 51.4463C15.5081 50.9286 14.7959 50.1375 14.3762 49.1875L13.6252 47.5605L10.6213 40.9268C10.246 40.1759 10.1212 39.2997 10.2463 38.5488V38.0479L8.24341 34.5439C8.12609 34.3328 7.9734 34.0734 7.78736 33.791C6.98098 32.5671 5.54475 30.9141 3.61255 30.9141L3.11255 31.0391L2.36157 31.29C1.86094 31.6655 1.8611 32.1662 2.23657 32.792C6.64786 39.4796 10.0629 46.7736 12.3743 54.4443L12.6243 54.8193C13.3165 56.0443 14.3152 57.0691 15.5217 57.793C15.7229 57.9137 15.9291 58.0245 16.1389 58.127C16.655 58.3731 17.1966 58.566 17.7561 58.6992L19.5081 58.9502L22.011 58.5742L23.5129 58.1992C24.3676 57.9637 25.2358 57.783 26.1116 57.6572L26.5168 57.5732L28.6448 57.3223C30.0215 57.3223 31.2731 57.1978 32.5247 56.6973C34.6523 55.8212 36.0292 53.8184 36.2795 51.4404C36.7802 45.558 39.5337 39.8002 43.9143 35.6699L45.6663 34.168L47.1682 32.917C48.4198 31.7906 49.0457 30.914 48.6702 30.1631C48.6702 30.0457 48.6412 29.9571 48.5862 29.8818L48.2952 29.6631C48.2943 29.6622 48.2931 29.661 48.2922 29.6602C47.7517 29.3362 47.2107 29.106 46.6702 29.0498C46.5656 29.0429 46.4603 29.0391 46.3547 29.0381ZM16.3528 49.0234C16.6012 49.3512 16.9145 49.6277 17.2776 49.8311C17.7707 50.1072 18.3306 50.2373 18.8918 50.21L19.1331 50.1885H18.7571C17.8448 50.1884 16.9326 49.778 16.3528 49.0234ZM14.2512 37.1719C14.0279 37.1362 13.7989 37.1518 13.5823 37.2168C13.3657 37.2818 13.167 37.3952 13.0002 37.5479L12.8743 37.6729C12.2486 38.2987 11.9988 39.2999 12.3743 40.0508L16.1292 48.3115C16.6298 49.4377 17.6308 50.0634 18.7571 50.0635C19.0886 50.0938 19.4228 50.0413 19.7288 49.9102C20.0345 49.7791 20.3025 49.5733 20.509 49.3125L20.885 48.8115L16.5042 39.0498L16.2542 38.2988C16.129 37.7983 15.8786 37.548 15.3782 37.4229L14.2512 37.1719ZM20.009 35.2949C19.9465 35.2949 19.8801 35.2987 19.8118 35.3057C19.7313 35.3204 19.6515 35.3402 19.5735 35.3662C19.3127 35.4532 19.0755 35.5996 18.8821 35.7949C18.1311 36.4207 18.0066 37.4227 18.3821 38.2988L22.637 47.9355C23.0124 48.6865 23.7639 49.1875 24.5149 49.1875C25.0251 49.1561 25.523 49.0174 25.9758 48.7803C26.4288 48.543 26.8264 48.2122 27.1428 47.8105L27.3928 47.5605C26.8922 46.9348 26.5172 46.1834 26.2668 45.5576L26.1418 45.1826L24.3889 40.9268L22.637 36.7969L22.387 36.2959C22.2618 35.9205 22.0114 35.545 21.636 35.5449L20.384 35.2949H20.009ZM29.8967 38.3662C29.8384 38.5726 29.8172 38.8113 29.8967 39.0498V38.3662ZM14.6272 35.2949C14.1123 35.2087 13.5837 35.2425 13.0842 35.3945C12.592 35.5444 12.1411 35.8055 11.7649 36.1562C12.1461 35.8131 12.5983 35.5576 13.0891 35.4082C13.5869 35.2567 14.1125 35.218 14.6272 35.2949ZM34.9026 35.7959V35.7949V35.7959ZM29.8967 0C30.0413 0.0134121 30.1813 0.0579915 30.3069 0.130859C30.4326 0.20385 30.5409 0.303802 30.6243 0.422852C30.7076 0.541958 30.7647 0.678168 30.7903 0.821289C30.7905 0.822552 30.7901 0.823932 30.7903 0.825195C30.7912 0.829823 30.7933 0.83422 30.7942 0.838867C30.8199 0.976107 30.8127 1.11818 30.7727 1.25195L28.3948 9.13672H34.4026C34.6528 9.13684 35.0284 9.26165 35.1536 9.51172C35.4038 9.88712 35.4037 10.3882 35.1536 10.7637L18.0061 29.9131C17.8416 30.0864 17.6207 30.1951 17.3831 30.2197C17.1453 30.2443 16.9067 30.1829 16.7102 30.0469C16.656 30.0093 16.6061 29.9667 16.5608 29.9199C16.5208 29.8812 16.4826 29.8399 16.4504 29.7939C16.3922 29.7107 16.3508 29.6178 16.3245 29.5205C16.3201 29.5066 16.3155 29.4927 16.3118 29.4785C16.2511 29.2475 16.275 29.002 16.3792 28.7871L21.636 15.6445H17.2551C17.0997 15.6495 16.9452 15.6188 16.804 15.5537C16.6627 15.4886 16.5388 15.391 16.4417 15.2695C16.3445 15.1481 16.2769 15.0056 16.2444 14.8535C16.2119 14.7015 16.2152 14.5441 16.2542 14.3936L20.259 0.750977C20.3842 0.25047 20.7596 0.000127586 21.135 0H29.8967ZM46.6438 27.166C46.5684 27.1618 46.4927 27.1592 46.4172 27.1592C46.4921 27.1592 46.5677 27.1631 46.6438 27.166ZM20.1897 7.84473L18.5422 13.6426H23.1379C23.2973 13.6508 23.4522 13.697 23.5901 13.7773C23.728 13.8577 23.8452 13.9699 23.9309 14.1045C23.9551 14.1425 23.9756 14.1829 23.9944 14.2236C24.0518 14.33 24.088 14.4471 24.0979 14.5684C24.1105 14.7232 24.0812 14.8785 24.0139 15.0186L20.259 24.4062L32.1497 11.1396H27.0178C26.8731 11.1263 26.7333 11.0807 26.6077 11.0078C26.482 10.9348 26.3727 10.8359 26.2893 10.7168C26.2566 10.67 26.2295 10.6197 26.2053 10.5684C26.1662 10.4955 26.1367 10.4175 26.1194 10.3359C26.0879 10.1872 26.0956 10.0325 26.1418 9.8877L26.1487 9.86621L28.5198 2.00293H21.886L20.1897 7.84473ZM34.9749 9.54785C34.8397 9.35715 34.621 9.26182 34.4026 9.26172L34.9749 9.54785ZM21.886 1.87793H28.6448V1.87695H21.886V1.87793ZM21.135 0.125C21.0048 0.125044 20.8904 0.156856 20.7903 0.211914C20.9285 0.156904 21.0864 0.125041 21.26 0.125H21.135Z" fill="white"/>
                        </svg>
                        <svg width="186" height="24" viewBox="0 0 186 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_1_819)">
                                <path d="M166.019 0C177.512 1.60086e-06 176.902 9.45461 176.902 13.752H162.056C162.1 16.9627 163.362 18.502 165.756 18.502C167.978 18.5018 168.891 17.3703 169.022 15.833L177.076 15.8779C176.814 20.4921 173.682 23.9764 166.063 23.9766C158.313 23.9766 155.563 20.1225 154.721 15.751C154.693 15.603 154.485 15.6264 154.485 15.7764V23.5234H146.299V9.68066C146.299 8.27737 145.865 6.9209 144.34 6.9209C142.73 6.92098 142.381 8.18872 142.381 9.68066V23.5234H134.153V9.68066C134.153 8.27738 133.848 6.92091 132.238 6.9209C130.628 6.9209 130.192 8.18867 130.192 9.68066V23.5254H122.006V15.5703C122.006 15.4182 121.798 15.3964 121.77 15.5449C120.925 20.0287 118.122 23.9764 110.887 23.9766C104.973 23.9766 102.065 21.3412 100.75 17.9512C100.631 17.6492 100.214 17.6714 100.134 17.9863C99.3255 21.2041 96.1645 23.9746 89.771 23.9746C84.1197 23.9746 80.6048 22.4878 79.2368 19.1992C79.0016 18.7158 78.8136 18.2287 78.6655 17.7852C78.4721 17.2093 77.71 17.1331 77.4312 17.6709C75.2162 21.9391 71.5182 23.9766 65.48 23.9766C57.2515 23.9764 55.3364 19.5883 55.3364 15.1553C55.3364 14.1612 55.4115 13.194 55.5562 12.2578C55.6134 11.8922 55.1381 11.7242 54.9761 12.0537L49.3052 23.5234H40.5112L40.895 9.36426C40.8968 9.29725 40.8079 9.2773 40.7817 9.33887L34.8511 23.5234H26.4067L25.6675 3.92578C25.655 3.58921 25.1916 3.54258 25.1167 3.87207L20.6606 23.5469H14.7534L15.395 20.9688C13.6977 22.7326 11.3029 24 8.21143 24C0.984815 23.9999 -0.973908 18.0724 0.418457 11.5586C1.68195 6.17486 4.98984 0.0214844 12.5649 0.0214844C15.3514 0.0215411 17.8326 1.33512 18.8765 3.18945L19.3765 0.474609L19.3804 0.472656L34.3774 0.451172L33.1021 14.1436C33.0972 14.2011 33.173 14.2227 33.1958 14.1689L38.7739 0.451172H46.5669L46.2261 14.8564C46.2243 14.9143 46.3005 14.9309 46.3198 14.877L51.6157 0.451172H60.7144L59.2681 3.37695C59.1077 3.70111 59.5014 4.00395 59.7593 3.75586C62.185 1.41255 65.5503 0 69.7065 0C74.9238 7.68099e-05 78.0464 2.12246 79.0327 5.93066C79.566 2.66017 82.4017 0 89.4263 0C97.2174 3.99301e-05 99.7865 2.44289 99.7866 7.78125H92.0806C92.0805 5.92714 91.3831 4.93079 89.4683 4.93066C87.5531 4.93066 86.8989 5.6555 86.8989 6.74023C86.899 9.71734 95.564 8.70292 98.9849 12.4678C99.2775 12.7882 99.789 12.5715 99.7876 12.1299V12.0332C99.7877 6.42307 101.834 0 110.976 0C118.474 0.000149603 121.178 4.44746 121.875 9.17188C121.889 9.2588 122.008 9.25001 122.008 9.16309V0.453125H127.933L127.93 3.16699C128.8 1.58255 131.369 0 134.068 0C136.462 6.38844e-05 139.335 0.724879 140.902 3.07715C142.033 1.31159 144.515 0.000120186 147.475 0C153.7 0 154.485 3.84503 154.485 9.18359V9.91699C154.943 4.88628 157.384 0 166.019 0ZM181.929 15.5176C184.177 15.5176 186 17.412 186 19.748C186 22.0841 184.177 23.9785 181.929 23.9785C179.681 23.9784 177.859 22.0841 177.859 19.748C177.859 17.412 179.681 15.5176 181.929 15.5176ZM79.3608 9.46777C79.3051 10.8041 79.0786 12.2657 78.6743 13.8447H63.7407C63.1745 15.9706 63.3057 18.6844 65.9175 18.6846C66.9247 18.6846 67.7162 18.399 68.314 17.9336C69.4538 17.3162 69.5579 15.4442 69.5591 15.4219L86.5503 15.5176C86.5503 17.7341 87.3788 18.957 89.686 18.957C91.383 18.957 92.3411 18.2776 92.3413 16.9668C92.3413 13.1278 81.6458 14.9906 79.3608 9.46777ZM110.976 6.78516C108.409 6.78516 107.276 8.36813 107.276 12.0332C107.276 15.6979 108.452 17.2349 110.889 17.2354C113.457 17.2351 114.588 15.6077 114.588 12.0332C114.588 8.45885 113.543 6.78532 110.976 6.78516ZM12.9565 6.94336C10.5624 6.94348 9.51824 8.34646 8.64697 11.7832C8.08061 13.8187 7.81978 17.1221 10.8677 17.1221C13.2619 17.122 14.262 15.6751 15.1333 12.2363C15.9175 9.06905 15.6123 6.94336 12.9565 6.94336ZM69.0962 5.47461C67.1376 5.47466 65.6579 6.55905 64.7866 9.54492H71.0112C71.7082 7.28322 71.3162 5.47461 69.0962 5.47461ZM165.585 5.38379C163.407 5.38379 162.145 6.37834 162.058 9.45508H169.023C168.936 6.51611 167.936 5.38389 165.585 5.38379Z" fill="white"/>
                            </g>
                            <defs>
                                <clipPath id="clip0_1_819">
                                    <rect width="186" height="24" fill="white"/>
                                </clipPath>
                            </defs>
                        </svg>
                    </div>

                    <div className="user-section">
                        {auth.user ? (
                            <>
                                <div className="user-avatar" />
                                <div className="username">
                                    {auth.user.name}
                                </div>
                                <Link
                                    href="/logout"
                                    method="post"
                                    as="button"
                                    className="nav-link"
                                >
                                    LOG OUT
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    className="nav-link"
                                >
                                    LOG IN
                                </Link>
                                {canRegister && (
                                    <Link
                                        href={register()}
                                        className="nav-link"
                                    >
                                        REGISTER
                                    </Link>
                                )}
                            </>
                        )}
                    </div>
                </header>

                {/* Main Content */}
                <main className="main-content">
                    {/* Video Section */}
                    <section className="video-section">
                        <h1 className="video-title">
                            FEATURED VIDEO
                        </h1>
                        <VimeoPlayer
                            videoId={VIDEO_ID}
                            onTimeUpdate={handleTimeUpdate}
                            onPlayerReady={handlePlayerReady}
                        />
                    </section>

                    {/* Comments Section */}
                    <aside className="comments-section">
                        <h2 className="comments-header">
                            COMMENTS
                        </h2>

                        {isLoading ? (
                            <div className="loading-comments">
                                Loading comments...
                            </div>
                        ) : (
                            <CommentsList
                                comments={comments}
                                onSeek={handleSeekToTimestamp}
                                currentUserId={auth.user?.id}
                                onDelete={handleDeleteComment}
                            />
                        )}

                        <NewCommentForm
                            currentTime={currentTimeFormatted}
                            onSubmit={handleCommentSubmit}
                            isAuthenticated={!!auth.user}
                            player={player}
                        />
                    </aside>
                </main>
            </div>
        </>
    );
}
