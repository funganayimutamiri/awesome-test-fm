<?php

namespace App\Http\Controllers;

use App\Models\VideoComment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class VideoCommentController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'video_id' => 'required|string',
        ]);

        $comments = VideoComment::with('user')
            ->where('video_id', $request->video_id)
            ->orderBy('timestamp', 'asc')
            ->get()
            ->map(function ($comment) {
                return [
                    'id' => $comment->id,
                    'username' => $comment->user->name,
                    'user_id' => $comment->user_id,
                    'text' => $comment->comment,
                    'timestamp' => $comment->timestamp,
                    'timestamp_formatted' => $this->formatTimestamp($comment->timestamp),
                    'created_at' => $comment->created_at,
                ];
            });

        return response()->json($comments);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'video_id' => 'required|string',
            'comment' => 'required|string|max:1000',
            'timestamp' => 'required|numeric|min:0',
        ]);

        $comment = VideoComment::create([
            'user_id' => Auth::id(),
            'video_id' => $validated['video_id'],
            'comment' => $validated['comment'],
            'timestamp' => $validated['timestamp'],
        ]);

        $comment->load('user');

        return response()->json([
            'id' => $comment->id,
            'username' => $comment->user->name,
            'user_id' => $comment->user_id,
            'text' => $comment->comment,
            'timestamp' => $comment->timestamp,
            'timestamp_formatted' => $this->formatTimestamp($comment->timestamp),
            'created_at' => $comment->created_at,
        ], 201);
    }

    public function destroy(string $id)
    {
        $comment = VideoComment::findOrFail($id);

        if ($comment->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $comment->delete();

        return response()->json(['message' => 'Comment deleted successfully']);
    }

    private function formatTimestamp($seconds): string
    {
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        $secs = floor($seconds % 60);

        if ($hours > 0) {
            return sprintf('%02d:%02d:%02d', $hours, $minutes, $secs);
        }

        return sprintf('%02d:%02d', $minutes, $secs);
    }
}
