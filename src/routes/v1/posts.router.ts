import {
  handleCreatePost,
  handleReplyToNode,
  handleGetPostTree,
  handleGetFlatDiscussion,
  handleGetAllPosts,
  handleGetPost,
} from "../../controllers/posts.controller";
import { contract } from "./contracts";
import { initServer } from "@ts-rest/express";

const s = initServer();
export const postsRouter = s.router(contract.posts, {
  getAllPosts: ({ query }) => handleGetAllPosts(query),
  createPost: ({ body, req }) => handleCreatePost(body, req),
  replyToNode: ({ body, params, req }) => handleReplyToNode(body, params, req),
  getPostTree: ({ params }) => handleGetPostTree(params),
  getFlatDiscussion: ({ params }) => handleGetFlatDiscussion(params),
  getPost: ({ params }) => handleGetPost(params),
});
