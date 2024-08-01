import React, { useState, useEffect, FormEvent } from "react";
import {
  Modal,
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  Avatar,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { getDatabase, ref, set, onValue, get, update } from "firebase/database";
import moment from "moment";

const modalStyle = {
  borderTop: "1px solid rgba(0, 0, 0, 0.189)",
  marginTop: "2rem",
  paddingTop: "2rem",
};

interface User {
  name: string;
  pic: string;
}

interface CommentData {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
}

interface DiscussionModalProps {
  blogId: string;
  // isOpen: boolean;
  // handleClose: () => void;
}

const DiscussionModal: React.FC<DiscussionModalProps> = ({
  blogId,
  // isOpen,
  // handleClose,
}) => {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newComment, setNewComment] = useState("");
  const [user, setUser] = useState<User | null>(null);

  const placeholderAvatar = "https://via.placeholder.com/150"; // Placeholder avatar URL

  useEffect(() => {
    const fetchUserData = async () => {
      const userUid = localStorage.getItem("userUid");
      if (userUid) {
        const db = getDatabase();
        const userRef = ref(db, `users/${userUid}`);
        try {
          const userSnapshot = await get(userRef);
          if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            setUser({
              name: userData.name || "Guest User",
              pic: userData.pic || placeholderAvatar,
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };

    fetchUserData();

    const fetchComments = async () => {
      const db = getDatabase();
      const commentsRef = ref(db, `articles/${blogId}/comments`);
      onValue(commentsRef, async (snapshot) => {
        const commentIdsString = snapshot.val();
        if (commentIdsString) {
          const commentIds = commentIdsString.split(",");
          const commentsArray: CommentData[] = [];
          for (const commentId of commentIds) {
            const commentRef = ref(db, `comments/${commentId}`);
            const commentSnapshot = await get(commentRef);
            if (commentSnapshot.exists()) {
              commentsArray.push({
                id: commentId,
                ...commentSnapshot.val(),
              });
            }
          }
          setComments(commentsArray);
        } else {
          setComments([]);
        }
      });
    };

    fetchComments();
  }, [blogId]);

  function generateUUID() {
    var d = new Date().getTime();
    var d2 =
      (typeof performance !== "undefined" &&
        performance.now &&
        performance.now() * 1000) ||
      0;
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        var r = Math.random() * 16;
        if (d > 0) {
          r = (d + r) % 16 | 0;
          d = Math.floor(d / 16);
        } else {
          r = (d2 + r) % 16 | 0;
          d2 = Math.floor(d2 / 16);
        }
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      }
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (newComment.trim() && user) {
      const db = getDatabase();
      const newCommentId = generateUUID();
      const newCommentData: CommentData = {
        id: newCommentId,
        author: user.name,
        avatar: user.pic,
        content: newComment,
        timestamp: new Date().toISOString(),
      };

      // Store comment details in `comments` node
      const commentRef = ref(db, `comments/${newCommentId}`);
      await set(commentRef, newCommentData);

      // Update comment IDs in `articles/{blogId}/comments` node
      const articleCommentRef = ref(db, `articles/${blogId}/comments`);
      const articleCommentsSnapshot = await get(articleCommentRef);
      let updatedCommentIds = newCommentId;
      if (articleCommentsSnapshot.exists()) {
        const existingCommentIds = articleCommentsSnapshot.val();
        updatedCommentIds = `${existingCommentIds},${newCommentId}`;
      }
      await set(articleCommentRef, updatedCommentIds);

      setNewComment("");
    }
  };

  return (
    // <Modal open={isOpen} onClose={handleClose}>
    <div>
      <Box sx={modalStyle}>
        <Box display="flex" justifyContent="space-between">
          <Typography variant="h6">
            Discussions ({comments.length} Threads)
          </Typography>
          {/* <IconButton onClick={handleClose}>
            <Close />
          </IconButton> */}
        </Box>
        <Box mt={2}>
          {user && (
            <Box display="flex" alignItems="center">
              <Avatar src={user.pic || placeholderAvatar} alt={user.name} />
              <Typography ml={2} variant="subtitle1">
                {user.name}
              </Typography>
            </Box>
          )}
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Write Your Comments Here"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            multiline
            rows={4}
            margin="normal"
          />
          <Button variant="contained" color="primary" onClick={handleSubmit}>
            Submit
          </Button>
        </Box>
        <Box mt={4}>
          {comments.map((comment) => (
            <Comment key={comment.id} data={comment} />
          ))}
        </Box>
      </Box>
    </div>
  );
};

interface CommentProps {
  data: CommentData;
}

const Comment: React.FC<CommentProps> = ({ data }) => {
  const placeholderAvatar = "https://via.placeholder.com/150"; // Placeholder avatar URL

  return (
    <Box mt={2} borderBottom="1px solid #ddd" pb={2}>
      <Box display="flex" alignItems="center" className="hearder_comment">
        <Avatar src={data.avatar || placeholderAvatar} alt={data.author} />
        <Box ml={2}>
          <Typography variant="subtitle2">{data.author}</Typography>
          <Typography variant="caption" color="textSecondary">
            {moment(data.timestamp).fromNow()}
          </Typography>
        </Box>
      </Box>
      <Typography className="comment_text" mt={1} ml={7}>
        {data.content}
      </Typography>
    </Box>
  );
};

export default DiscussionModal;
