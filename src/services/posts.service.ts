import { prisma } from "../lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

type Operation = "+" | "-" | "*" | "/" | "^";

function calculateResult(
  leftValue: number,
  operation: Operation,
  rightValue: number
): number {
  switch (operation) {
    case "+":
      return leftValue + rightValue;
    case "-":
      return leftValue - rightValue;
    case "*":
      return leftValue * rightValue;
    case "/":
      if (rightValue === 0) {
        throw new Error("Division by zero is not allowed");
      }
      return leftValue / rightValue;
    case "^":
      return Math.pow(leftValue, rightValue);
    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }
}

export async function createPost(userId: number, initialNumber: number) {
  const post = await prisma.post.create({
    data: {
      user_id: userId,
      initial_number: new Decimal(initialNumber),
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  return {
    ok: true as const,
    post: {
      id: post.id,
      user_id: post.user_id,
      username: post.user.username,
      initial_number: Number(post.initial_number),
      created_at: post.created_at,
    },
  };
}

export async function replyToNode(
  userId: number,
  postId: number,
  parentId: number | null,
  operation: Operation,
  operandValue: number
) {
  // Verify post exists
  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post) {
    return { ok: false as const, code: "POST_NOT_FOUND" };
  }

  // Get parent value
  let parentValue: number;
  let depth = 0;

  if (parentId === null) {
    // Replying to the root post
    parentValue = Number(post.initial_number);
    depth = 0;
  } else {
    // Replying to a node
    const parentNode = await prisma.node.findUnique({
      where: { id: parentId },
    });

    if (!parentNode) {
      return { ok: false as const, code: "PARENT_NODE_NOT_FOUND" };
    }

    if (parentNode.post_id !== postId) {
      return { ok: false as const, code: "PARENT_NODE_MISMATCH" };
    }

    parentValue = Number(parentNode.result_value);
    depth = parentNode.depth + 1;
  }

  // Calculate result
  let resultValue: number;
  try {
    resultValue = calculateResult(parentValue, operation, operandValue);
  } catch (error) {
    return {
      ok: false as const,
      code: "CALCULATION_ERROR",
      message: error instanceof Error ? error.message : "Calculation failed",
    };
  }

  // Create node
  const node = await prisma.node.create({
    data: {
      post_id: postId,
      parent_id: parentId,
      user_id: userId,
      operation,
      operand_value: new Decimal(operandValue),
      result_value: new Decimal(resultValue),
      depth,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  return {
    ok: true as const,
    node: {
      id: node.id,
      post_id: node.post_id,
      parent_id: node.parent_id,
      user_id: node.user_id,
      username: node.user.username,
      operation: node.operation,
      operand_value: Number(node.operand_value),
      result_value: Number(node.result_value),
      depth: node.depth,
      created_at: node.created_at,
    },
  };
}

export async function getPostTree(postId: number) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
      nodes: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: {
          created_at: "asc",
        },
      },
    },
  });

  if (!post) {
    return { ok: false as const, code: "POST_NOT_FOUND" };
  }

  // Build tree structure
  type NodeData = {
    id: number;
    operation: string | null;
    operand: number;
    value: number;
    user_id: number;
    username: string;
    created_at: string;
    children: NodeData[];
  };

  const nodeMap = new Map<number, NodeData>();
  const rootNodes: NodeData[] = [];

  // Create map of all nodes
  post.nodes.forEach((node: typeof post.nodes[0]) => {
    nodeMap.set(node.id, {
      id: node.id,
      operation: node.operation,
      operand: Number(node.operand_value),
      value: Number(node.result_value),
      user_id: node.user_id,
      username: node.user.username,
      created_at: node.created_at.toISOString(),
      children: [],
    });
  });

  // Build tree
  post.nodes.forEach((node: typeof post.nodes[0]) => {
    const nodeData = nodeMap.get(node.id)!;
    if (node.parent_id === null) {
      rootNodes.push(nodeData);
    } else {
      const parent = nodeMap.get(node.parent_id);
      if (parent) {
        parent.children.push(nodeData);
      }
    }
  });

  return {
    ok: true as const,
    tree: {
      id: post.id,
      value: Number(post.initial_number),
      operation: null,
      operand: null,
      user_id: post.user_id,
      username: post.user.username,
      created_at: post.created_at.toISOString(),
      children: rootNodes,
    },
  };
}

export async function getFlatDiscussion(postId: number) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post) {
    return { ok: false as const, code: "POST_NOT_FOUND" };
  }

  const nodes = await prisma.node.findMany({
    where: { post_id: postId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    orderBy: {
      created_at: "asc",
    },
  });

  return {
    ok: true as const,
    nodes: nodes.map((node: typeof nodes[0]) => ({
      id: node.id,
      post_id: node.post_id,
      parent_id: node.parent_id,
      user_id: node.user_id,
      username: node.user.username,
      operation: node.operation,
      operand_value: Number(node.operand_value),
      result_value: Number(node.result_value),
      depth: node.depth,
      created_at: node.created_at.toISOString(),
    })),
  };
}

export async function getAllPosts(page: number = 1, limit: number = 10) {
  const skip = (page - 1) * limit;

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        _count: {
          select: {
            nodes: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    }),
    prisma.post.count(),
  ]);

  return {
    ok: true as const,
    posts: posts.map((post: typeof posts[0]) => ({
      id: post.id,
      user_id: post.user_id,
      username: post.user.username,
      initial_number: Number(post.initial_number),
      nodes_count: post._count.nodes,
      created_at: post.created_at.toISOString(),
    })),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
}

export async function getPostById(postId: number) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
      _count: {
        select: {
          nodes: true,
        },
      },
    },
  });

  if (!post) {
    return { ok: false as const, code: "POST_NOT_FOUND" };
  }

  return {
    ok: true as const,
    post: {
      id: post.id,
      user_id: post.user_id,
      username: post.user.username,
      initial_number: Number(post.initial_number),
      nodes_count: post._count.nodes,
      created_at: post.created_at.toISOString(),
    },
  };
}

