import Comment from "../models/Comment.js";
import Reel from "../models/Reel.js";

// POST /comments - Create a new comment
export const createComment = async (req, res) => {
    try {
        const { reelId, text, parentCommentId } = req.body;
        const userId = req.user.userId;

        // Validate required fields
        if (!reelId || !text) {
            return res.status(400).json({ error: "reelId and text are required" });
        }

        // Check if reel exists
        const reel = await Reel.findById(reelId);
        if (!reel) {
            return res.status(404).json({ error: "Reel not found" });
        }

        // If it's a reply, check if parent comment exists
        if (parentCommentId) {
            const parentComment = await Comment.findById(parentCommentId);
            if (!parentComment) {
                return res.status(404).json({ error: "Parent comment not found" });
            }
            // Increment reply count on parent
            await Comment.findByIdAndUpdate(parentCommentId, {
                $inc: { repliesCount: 1 },
            });
        }

        // Create comment
        const comment = new Comment({
            reelId,
            userId,
            text,
            parentCommentId: parentCommentId || null,
        });

        await comment.save();

        // Increment comment count on reel
        await Reel.findByIdAndUpdate(reelId, {
            $inc: { "engagement.comments": 1 },
        });

        // Populate user info before sending response
        await comment.populate("userId", "username profile.avatarUrl");

        res.status(201).json({
            success: true,
            message: "Comment created successfully",
            data: comment,
        });
        console.log("POST /comments - Comment created:", comment._id);
    } catch (error) {
        console.error("Create comment error:", error);
        res.status(500).json({ error: "Failed to create comment" });
    }
};

// DELETE /comments/:commentId - Delete a comment (and all replies)
export const deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user.userId;

        // Find the comment
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }

        // Check if user owns the comment
        if (comment.userId.toString() !== userId) {
            return res.status(403).json({ error: "You can only delete your own comments" });
        }

        // Recursive function to delete comment and all its replies
        const deleteCommentAndReplies = async (parentId) => {
            // Find all direct replies
            const replies = await Comment.find({ parentCommentId: parentId });

            // Recursively delete each reply's children first
            for (const reply of replies) {
                await deleteCommentAndReplies(reply._id);
            }

            // Delete all direct replies
            const deletedReplies = await Comment.deleteMany({ parentCommentId: parentId });

            return deletedReplies.deletedCount;
        };

        // Count total comments to be deleted (for updating reel engagement)
        const countReplies = async (parentId) => {
            const replies = await Comment.find({ parentCommentId: parentId });
            let count = replies.length;
            for (const reply of replies) {
                count += await countReplies(reply._id);
            }
            return count;
        };

        const repliesCount = await countReplies(commentId);
        const totalDeleted = repliesCount + 1; // +1 for the parent comment itself

        // Delete all replies recursively
        await deleteCommentAndReplies(commentId);

        // Delete the parent comment itself
        await Comment.findByIdAndDelete(commentId);

        // Decrement comment count on reel
        await Reel.findByIdAndUpdate(comment.reelId, {
            $inc: { "engagement.comments": -totalDeleted },
        });

        // If this was a reply, decrement parent's reply count
        if (comment.parentCommentId) {
            await Comment.findByIdAndUpdate(comment.parentCommentId, {
                $inc: { repliesCount: -1 },
            });
        }

        res.json({
            success: true,
            message: `Comment and ${repliesCount} replies deleted successfully`,
            deletedCount: totalDeleted,
        });
        console.log(`DELETE /comments/:commentId - Comment ${commentId} and ${repliesCount} replies deleted`);
    } catch (error) {
        console.error("Delete comment error:", error);
        res.status(500).json({ error: "Failed to delete comment" });
    }
};

// GET /comments/reel/:reelId - Get all comments for a reel
export const getCommentsByReel = async (req, res) => {
    try {
        const { reelId } = req.params;

        const comments = await Comment.find({ reelId, isDeleted: false })
            .populate("userId", "username profile.avatarUrl")
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: comments.length,
            data: comments,
        });
        console.log("GET /comments/reel/:reelId - Comments fetched:", comments.length);
    } catch (error) {
        console.error("Get comments error:", error);
        res.status(500).json({ error: "Failed to fetch comments" });
    }
};
