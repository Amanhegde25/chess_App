import Reel from "../models/Reel.js";
import ChessGame from "../models/ChessGame.js";
import Comment from "../models/Comment.js";

// GET /reels - Get all published reels (paginated feed)
export const getFeed = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const reels = await Reel.find({ status: "published" })
            .populate("gameId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Reel.countDocuments({ status: "published" });

        res.json({
            success: true,
            data: reels,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalReels: total,
                hasMore: page * limit < total,
            },
        });
        console.log(`GET /reels - Feed fetched: ${reels.length} reels (page ${page})`);
    } catch (err) {
        console.error("GET /reels - Error:", err);
        res.status(500).json({ error: "Failed to fetch reels", message: err.message });
    }
};

// GET /reels/random - Get random reels
export const getRandomReels = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        // Use MongoDB aggregation with $sample for random selection
        const reels = await Reel.aggregate([
            { $match: { status: "published" } },
            { $sample: { size: limit } },
            {
                $lookup: {
                    from: "chessgames",
                    localField: "gameId",
                    foreignField: "_id",
                    as: "gameId"
                }
            },
            { $unwind: { path: "$gameId", preserveNullAndEmptyArrays: true } }
        ]);

        res.json({
            success: true,
            data: reels,
            count: reels.length,
        });
        console.log(`GET /reels/random - Fetched ${reels.length} random reels`);
    } catch (err) {
        console.error("GET /reels/random - Error:", err);
        res.status(500).json({ error: "Failed to fetch random reels", message: err.message });
    }
};

// GET /reels/games - Get list of all available games (for game selection UI)
export const getAvailableGames = async (req, res) => {
    try {
        // Get all games that have at least one published reel
        const gamesWithReels = await Reel.distinct("gameId", { status: "published" });

        const games = await ChessGame.find({ _id: { $in: gamesWithReels } })
            .select("whitePlayer blackPlayer event year result")
            .sort({ year: -1 });

        // Format game names for display (e.g., "Magnus Carlsen vs Viswanathan Anand")
        const formattedGames = games.map(game => ({
            _id: game._id,
            displayName: `${game.whitePlayer} vs ${game.blackPlayer}`,
            whitePlayer: game.whitePlayer,
            blackPlayer: game.blackPlayer,
            event: game.event,
            year: game.year,
            result: game.result,
        }));

        res.json({
            success: true,
            data: formattedGames,
            count: formattedGames.length,
        });
        console.log(`GET /reels/games - Fetched ${formattedGames.length} available games`);
    } catch (err) {
        console.error("GET /reels/games - Error:", err);
        res.status(500).json({ error: "Failed to fetch games", message: err.message });
    }
};

// GET /reels/game/:gameId - Get reels for a specific game
export const getReelsByGame = async (req, res) => {
    try {
        const { gameId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Verify the game exists
        const game = await ChessGame.findById(gameId);
        if (!game) {
            return res.status(404).json({ error: "Game not found" });
        }

        const reels = await Reel.find({
            status: "published",
            gameId: gameId,
        })
            .populate("gameId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Reel.countDocuments({
            status: "published",
            gameId: gameId,
        });

        res.json({
            success: true,
            data: reels,
            game: {
                _id: game._id,
                displayName: `${game.whitePlayer} vs ${game.blackPlayer}`,
                whitePlayer: game.whitePlayer,
                blackPlayer: game.blackPlayer,
                event: game.event,
                year: game.year,
            },
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalReels: total,
                hasMore: page * limit < total,
            },
        });
        console.log(`GET /reels/game/${gameId} - Found ${reels.length} reels for ${game.whitePlayer} vs ${game.blackPlayer}`);
    } catch (err) {
        console.error("GET /reels/game/:gameId - Error:", err);
        res.status(500).json({ error: "Failed to fetch reels", message: err.message });
    }
};

// POST /reels/:reelId/view - Increment view count
export const viewReel = async (req, res) => {
    try {
        const { reelId } = req.params;

        const reel = await Reel.findByIdAndUpdate(
            reelId,
            { $inc: { "engagement.views": 1 } },
            { new: true }
        );

        if (!reel) {
            return res.status(404).json({ error: "Reel not found" });
        }

        res.json({
            success: true,
            message: "View recorded",
            views: reel.engagement.views,
        });
        console.log(`POST /reels/${reelId}/view - View recorded, total views: ${reel.engagement.views}`);
    } catch (err) {
        console.error("POST /reels/:reelId/view - Error:", err);
        res.status(500).json({ error: "Failed to record view", message: err.message });
    }
};

// GET /reels/:reelId/stats - Get reel engagement stats
export const getReelStats = async (req, res) => {
    try {
        const { reelId } = req.params;

        const reel = await Reel.findById(reelId).select("engagement");

        if (!reel) {
            return res.status(404).json({ error: "Reel not found" });
        }

        const commentsCount = await Comment.countDocuments({ reelId, isDeleted: false });

        res.json({
            success: true,
            stats: {
                likes: reel.engagement.likes,
                views: reel.engagement.views,
                saves: reel.engagement.saves,
                comments: commentsCount,
            },
        });
        console.log(`GET /reels/${reelId}/stats - Stats fetched (views: ${reel.engagement.views}, likes: ${reel.engagement.likes})`);
    } catch (err) {
        console.error("GET /reels/:reelId/stats - Error:", err);
        res.status(500).json({ error: "Failed to fetch reel stats", message: err.message });
    }
};
