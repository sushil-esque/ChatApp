import {
  ArrowLeft,
  LogOut,
  Menu,
  MoreVertical,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { useNavigate } from "react-router-dom";

import { authApi } from "@/api/auth";
import { setAccessToken } from "@/api/client";
import { conversationApi } from "@/api/conversation";
import type { SearchUser } from "@/api/user";
import { userApi } from "@/api/user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getSocket } from "@/services/socket";
import { useAuthStore } from "@/store/authStore";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

// Types
interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isDeleted: boolean;
  createdAt: string;
  read: boolean;
  sender: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

interface Conversation {
  id: string;
  userAId: string;
  userBId: string;
  lastMessageAt: string | null;
  userA: { id: string; name: string; avatarUrl: string | null };
  userB: { id: string; name: string; avatarUrl: string | null };
  messages: Message[];
}

// Helper functions
function getOtherUser(conversation: Conversation, currentUserId: string) {
  return conversation.userAId === currentUserId
    ? conversation.userB
    : conversation.userA;
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "long", day: "numeric" });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function getUnreadCount(conversation: Conversation, currentUserId: string) {
  return conversation.messages.filter(
    (m) => m.senderId !== currentUserId && !m.read,
  ).length;
}

// Shifts messages across infinite query pages to keep page boundaries intact during optimistic updates.
function insertOptimisticMessage(
  oldData: { pages: Message[][]; pageParams: unknown[] } | undefined,
  optimisticMessage: Message,
): { pages: Message[][]; pageParams: unknown[] } | undefined {
  if (!oldData) return oldData;

  const newPages: Message[][] = [];
  let carryOver: Message | null = optimisticMessage;

  for (let i = 0; i < oldData.pages.length; i++) {
    const page = oldData.pages[i];
    const newPage = carryOver ? [carryOver, ...page] : [...page];

    if (newPage.length > 30) {
      carryOver = newPage.pop()!;
    } else {
      carryOver = null;
    }
    newPages.push(newPage);
  }

  if (carryOver) {
    newPages.push([carryOver]);
  }

  // Recalculate pageParams based on the new page boundaries
  const newPageParams = [oldData.pageParams[0]]; // Keep the first page param (usually undefined)
  for (let i = 1; i < newPages.length; i++) {
    const prevPage = newPages[i - 1];
    newPageParams.push(prevPage[prevPage.length - 1]?.id);
  }

  return {
    ...oldData,
    pages: newPages,
    pageParams: newPageParams,
  };
}

// Sidebar component
function ConversationSidebar({
  conversations,
  selectedConversationId,
  onSelectConversation,
  searchQuery,
  onSearchChange,
  currentUser,
  onClose,
  isLoading,
  onConversationCreated,
  queryClient,
}: {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentUser: User | null;
  onClose?: () => void;
  isLoading?: boolean;
  onConversationCreated: (id: string) => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const filteredConversations = conversations.filter((conv) => {
    const otherUser = getOtherUser(conv, currentUser?.id || "");
    return otherUser.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const hasConversationMatch =
    filteredConversations.length > 0 || searchQuery === "";

  // Search users only when no conversation matches
  const { data: searchResults = [], isLoading: isSearchingUsers } = useQuery({
    queryKey: ["users", "search", searchQuery],
    queryFn: () => userApi.searchUsers(searchQuery).then((res) => res.data),
    enabled: !hasConversationMatch && searchQuery.length > 0,
  });

  const createConversationMutation = useMutation({
    mutationFn: (userId: string) =>
      conversationApi.createConversation(userId).then((res) => res.data),
    onSuccess: (conversation) => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      onConversationCreated(conversation.id);
      onSearchChange("");
      onClose?.();
    },
    onError: () => toast.error("Failed to start conversation"),
  });

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-4">
        <h1 className="text-xl font-bold text-foreground">Messages</h1>
      </div>

      {/* Search */}
      <div className="border-b border-border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search or start new chat..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Conversations or User Search Results */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))
          ) : !hasConversationMatch ? (
            <>
              <p className="px-3 py-1 text-xs text-muted-foreground">
                New conversation
              </p>

              {isSearchingUsers &&
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}

              {!isSearchingUsers && searchResults.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No users found
                </p>
              )}

              {searchResults.map((user: SearchUser) => (
                <button
                  key={user.id}
                  onClick={() => createConversationMutation.mutate(user.id)}
                  disabled={createConversationMutation.isPending}
                  className="w-full flex items-center gap-3 rounded-lg p-3 hover:bg-muted text-left transition-colors"
                >
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={user.avatarUrl || ""} />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-foreground">
                      {user.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </button>
              ))}
            </>
          ) : (
            filteredConversations.map((conversation) => {
              const otherUser = getOtherUser(
                conversation,
                currentUser?.id || "",
              );
              const unreadCount = getUnreadCount(
                conversation,
                currentUser?.id || "",
              );
              const lastMessage =
                conversation.messages[conversation.messages.length - 1];
              const isSelected = selectedConversationId === conversation.id;

              return (
                <button
                  key={conversation.id}
                  onClick={() => {
                    onSelectConversation(conversation.id);
                    onClose?.();
                  }}
                  className={`w-full rounded-lg p-3 text-left transition-colors ${
                    isSelected
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="mt-1 h-10 w-10 flex-shrink-0">
                      <AvatarImage src={otherUser.avatarUrl || ""} />
                      <AvatarFallback>
                        {getInitials(otherUser.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{otherUser.name}</p>
                        {unreadCount > 0 && (
                          <Badge
                            variant="default"
                            className="ml-auto flex-shrink-0"
                          >
                            {unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {lastMessage?.isDeleted
                          ? "This message was deleted"
                          : lastMessage?.content || "No messages yet"}
                      </p>
                      {lastMessage && (
                        <p className="text-xs text-muted-foreground">
                          {formatTime(lastMessage.createdAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Message bubble component
function MessageBubble({
  message,
  isOwn,
  onDelete,
  isDeleting,
}: {
  message: Message;
  isOwn: boolean;
  onDelete?: (messageId: string) => void;
  isDeleting?: boolean;
}) {
  const readReceipts = (
    <div className="text-xs text-muted-foreground">
      {isOwn && <span>{message.read ? "✓✓" : "✓"}</span>}
    </div>
  );

  return (
    <div
      data-message-id={message.id}
      className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
    >
      {!isOwn && (
        <Avatar className="mt-1 h-6 w-6 flex-shrink-0">
          <AvatarImage src={message.sender.avatarUrl || ""} />
          <AvatarFallback className="text-xs">
            {getInitials(message.sender.name)}
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={`flex flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}
      >
        <div
          className={`rounded-lg px-3 py-2 ${
            isOwn
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          }`}
        >
          {message.isDeleted ? (
            <p className="italic text-muted-foreground">
              This message was deleted
            </p>
          ) : (
            <p className="break-words text-sm">{message.content}</p>
          )}
        </div>
        <div className="flex items-center gap-2 px-2">
          <span className="text-xs text-muted-foreground">
            {formatTime(message.createdAt)}
          </span>
          {isOwn && readReceipts}
          {isOwn && !message.isDeleted && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-0 text-muted-foreground hover:text-foreground">
                  <MoreVertical className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem
                  onClick={() => onDelete?.(message.id)}
                  disabled={isDeleting}
                  className="gap-2 text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Chat Page Component
export default function ChatPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  // messages that arrived via socket — kept separate to avoid mutating the infinite query cache
  // (mutating the cache would corrupt pageParams and break pagination)
  const [socketMessages, setSocketMessages] = useState<Message[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Intersection observer refs for infinite scroll
  const { ref: topRef, inView: topInView } = useInView();
  const prevScrollHeightRef = useRef<number>(0);
  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } =
    useQuery({
      queryKey: ["conversations"],
      queryFn: () => conversationApi.getConversations().then((res) => res.data),
      enabled: !!user, // only fetch when user is set (token is ready)
    });

  // Set first conversation as selected on load
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  // join/leave conversation room amd emit message:seen when selected conversation changes
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !selectedConversationId) return;

    socket.emit("join:conversation", selectedConversationId);
    socket.emit("messages:read", { conversationId: selectedConversationId });
    return () => {
      socket.emit("leave:conversation", selectedConversationId);
    };
  }, [selectedConversationId]);

  // Clear socket messages whenever the user switches conversations
  useEffect(() => {
    setSocketMessages([]);
  }, [selectedConversationId]);

  // Fetch messages for selected conversation with infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: messagesLoading,
  } = useInfiniteQuery({
    queryKey: ["messages", selectedConversationId],
    queryFn: async ({ pageParam }) => {
      // await new Promise((resolve) => setTimeout(resolve, 3000));

      const res = await conversationApi.getMessages(
        selectedConversationId!,
        pageParam as string | undefined,
      );

      return res.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      // if less than 30 messages returned, no more pages
      if (lastPage.length < 30) return undefined;
      // cursor is the last item (oldest message in this batch since api returns desc)
      return lastPage[lastPage.length - 1]?.id;
    },
    enabled: !!selectedConversationId && !!user, // only fetch when user is set (token is ready)
    select: (data) => ({
      ...data,
      // reverse page order so older pages appear first
      // reverse messages within each page so oldest message appears first
      // use spread [...] before reverse to avoid mutating the original cached array
      /*
      data : {
                pages: [           // Message[][] — array of pages
                [msg4, msg3],    
                [msg2, msg1],  
                       ],
               pageParams: [     
                          undefined,       
                         "msg1-id",      
                        ]
                    }
      */
      pages: [...data.pages].reverse().map((page) => [...page].reverse()),
    }),
  });

  // flatten all pages into one array — now in correct oldest to newest order
  // const messages = data?.pages.flat();
  console.log("CHAT RENDER");

  const messages = useMemo(() => {
    console.log("flat executed");
    const infiniteMessages = data?.pages.flat() ?? [];
    const infiniteIds = new Set(infiniteMessages.map((m) => m.id));

    // Merge: infinite query messages (historical) + socket messages (real-time)
    // Filter socket messages so we only show ones for the current conversation
    // and exclude any already present in the infinite query (dedup).
    const extraSocketMessages = socketMessages.filter(
      (m) =>
        m.conversationId === selectedConversationId && !infiniteIds.has(m.id),
    );

    return [...infiniteMessages, ...extraSocketMessages];
    // return [...infiniteMessages, ...socketMessages];
  }, [data?.pages, socketMessages, selectedConversationId]);
  const lastMessage = messages[messages.length - 1];
  const lastMessageId = lastMessage?.id;
  const lastMessageSenderId = lastMessage?.senderId;

  // emit read when new message arrives and it's from the other user
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !selectedConversationId) return;
    if (!lastMessageId) return;

    if (lastMessageSenderId !== user?.id) {
      socket.emit("messages:read", { conversationId: selectedConversationId });
    }
  }, [lastMessageId, lastMessageSenderId, selectedConversationId, user?.id]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      conversationApi.sendMessage(selectedConversationId!, content),
    onMutate: async (content) => {
      const targetConversationId = selectedConversationId!; // Capture the id here

      // cancel any outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({
        queryKey: ["messages", targetConversationId],
      });

      // snapshot previous data in case we need to roll back
      const previousMessages = queryClient.getQueryData([
        "messages",
        targetConversationId,
      ]);

      // optimistically add message to cache immediately
      await queryClient.setQueryData(
        ["messages", targetConversationId], // which cache entry to update

        // how to update it
        (old: { pages: Message[][]; pageParams: unknown[] } | undefined) => {
          if (!old) return old;
          const optimisticMessage: Message = {
            id: `temp-${Date.now()}`,
            conversationId: targetConversationId,
            senderId: user!.id,
            content,
            isDeleted: false,
            createdAt: new Date().toISOString(),
            read: false,
            sender: {
              id: user!.id,
              name: user!.name,
              avatarUrl: user!.avatarUrl,
            },
          };

          // cache stores newest page first (desc order from API)
          // page 0 = newest messages
          // within each page, messages are newest first too
          // so add to BEGINNING of page 0 (it will appear at bottom after select reversal)
          /*
      data : {
                pages: [           // Message[][] — array of pages
                [msg4, msg3],    
                [msg2, msg1],  
                       ],
               pageParams: [     
                           undefined,       
                          "msg1-id",      
                        ]
                    }
      */
          return insertOptimisticMessage(old, optimisticMessage);
        },
      );
      return { previousMessages, conversationId: targetConversationId };
    },
    onSuccess: async (_, __, context) => {
      const targetConversationId =
        context?.conversationId || selectedConversationId;
      // refetch to replace optimistic message with real one from server
      await queryClient.invalidateQueries({
        queryKey: ["messages", targetConversationId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["conversations"],
      });
      // scroll to bottom after message sent
      // requestAnimationFrame(() => {
      //   const scrollContainer = scrollAreaRef.current?.querySelector(
      //     "[data-radix-scroll-area-viewport]",
      //   );
      //   if (scrollContainer) {
      //     scrollContainer.scrollTop = scrollContainer.scrollHeight;
      //   }
      // });
    },
    onError: (err, content, context) => {
      const targetConversationId =
        context?.conversationId || selectedConversationId;
      //                   here context = { previousMessages }  this is what onMutate returned
      // roll back to previous messages if mutation failed
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["messages", targetConversationId],
          context.previousMessages,
        );
      }
      console.log(err, "error");
      toast.error("Failed to send message");
    },
    onSettled: () => {
      isMessageSending.current = false;
      console.log("message sent", isMessageSending.current);
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) =>
      conversationApi.deleteMessage(selectedConversationId!, messageId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["messages", selectedConversationId],
      });
      toast.success("Message deleted");
    },
    onError: () => {
      toast.error("Failed to delete message");
    },
  });

  // Logout mutation
  const logoutMutate = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      setAccessToken(null);
      toast.success("Logged out successfully");
      setUser(null);
      navigate("/login");
    },
    onError: () => {
      toast.error("Failed to logout. Please try again.");
    },
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const useEffectRanRef = useRef<number>(0);
  const isMessageSending = useRef(false);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversationId) return;

    const socket = getSocket();
    const content = messageInput;
    isMessageSending.current = true;
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
    console.log("scrolled to bottom");
    setMessageInput("");
    if (socket?.connected) {
      // Optimistic update — add the temp message to socketMessages immediately
      // so the sender sees instant feedback without waiting for the server round-trip.
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId: selectedConversationId,
        senderId: user!.id,
        content,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        read: false,
        sender: {
          id: user!.id,
          name: user!.name,
          avatarUrl: user!.avatarUrl,
        },
      };
      setSocketMessages((prev) => [...prev, optimisticMessage]);
      // emit to server
      socket.emit("message:send", {
        conversationId: selectedConversationId,
        content,
      });
      console.log("message emmited");
    } else {
      // fallback to REST if socket not connected
      sendMessageMutation.mutate(content);
      console.log("fallback to rest");
    }
  };

  const messageCameFromSocket = useRef(false);
  // listen for incoming messages
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on("message:received", (message: Message) => {
      isMessageSending.current = false;
      console.log(isMessageSending.current, "isMessageSending after received");
      if (message.senderId === user?.id) {
        // Our own message came back confirmed from the server.
        // Remove the temp-* optimistic entry and add the real message in its place.
        setSocketMessages((prev) => [
          ...prev.filter((m) => !m.id.startsWith("temp-")),
          message,
        ]);
        console.log("message received");

        void queryClient.invalidateQueries({ queryKey: ["conversations"] });
        return;
      }

      // Someone else's message — add to socketMessages, deduped.
      // We deliberately do NOT touch the infinite query cache so that
      // pageParams stay intact and pagination keeps working.
      setSocketMessages((prev) => {
        messageCameFromSocket.current = true;

        const exists = prev.some((m) => m.id === message.id);
        if (exists) return prev;
        return [...prev, message];
      });

      // update conversation list (last message preview + unread count)
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    });

    socket.on(
      "messages:seen",
      (data: { conversationId: string; seenBy: string; seenAt: string }) => {
        // update messages in cache — mark all messages as read
        queryClient.setQueryData(
          ["messages", data.conversationId],
          (old: { pages: Message[][]; pageParams: unknown[] } | undefined) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page) =>
                page.map((message) => ({
                  ...message,
                  read: message.senderId === user?.id ? true : message.read,
                })),
              ),
            };
          },
        );

        // also update socket messages
        setSocketMessages((prev) =>
          prev.map((message) => ({
            ...message,
            read: message.senderId === user?.id ? true : message.read,
          })),
        );
      },
    );

    socket.on("message:error", (data: { error: string }) => {
      isMessageSending.current = false;
       // no correlation id in the payload, so drop any pending optimistic entries
      setSocketMessages((prev) => prev.filter((m) => !m.id.startsWith("temp-")));
      toast.error(data.error);
    });

    return () => {
      socket.off("message:received");
      socket.off("messages:seen");
      socket.off("message:error");
    };
  }, [queryClient, user?.id]);

  useEffect(() => {
    useEffectRanRef.current += 1;
    // console.log("conversation", selectedConversationId);
    // console.log("messages", messages.length);
    // console.log("container", scrollAreaRef.current);
    // console.log("bottom", bottomRef.current);
    console.log("first use effect ran count", useEffectRanRef.current);

    const scrollContainer = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    );
    // if (!scrollContainer) return;

    console.log(
      scrollContainer?.scrollHeight,
      "scrollContainer.scrollHeight from first use effect",
    );
    console.log(
      scrollContainer?.scrollTop,
      "scrollContainer.scrollTop from first use effect",
    );
    console.log(
      prevScrollHeightRef.current,
      "prevscroll height ref from first use effect before if",
    );
    console.log(messages.length, "length of messages");
    console.log(isMessageSending.current, "isMessageSending");

    if (messages.length > 30 && !isMessageSending.current) {
      const diff = scrollContainer?.scrollHeight - prevScrollHeightRef.current;
      console.log(diff, "diff");
      if (diff > 0 && !messageCameFromSocket.current) {
        console.log("scrolling to diff", diff);
        scrollContainer.scrollTop = diff;
      } else {
        console.log("scrolling to bottomRef");
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
      }
    }
    if (messages.length < 31 || isMessageSending.current) {
      console.log("scrolling to bottomRef for < 31 or when sending");
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }

    // bottomRef.current?.scrollIntoView({ behavior: "auto" });
    prevScrollHeightRef.current = scrollContainer?.scrollHeight;
    console.log(
      prevScrollHeightRef.current,
      "prevScrollHeightRef from first use effect",
    );
    messageCameFromSocket.current = false;
  }, [messages]);

  useEffect(() => {
    console.log("second use effect ran");
    console.log(topInView, "topInView");
    if (topInView && hasNextPage && !isFetchingNextPage) {
      console.log("fetching next page");
      fetchNextPage();
    }
  }, [topInView]);

  useEffect(() => {
    console.log("third use effect ran");
    console.log("selected conversation id", selectedConversationId);
    const scrollContainer = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    );
    if (bottomRef.current && selectedConversationId) {
      console.log("scrolling to bottomRef from third use effect");
      bottomRef.current.scrollIntoView({ behavior: "auto" });
    }
    if (scrollContainer) {
      prevScrollHeightRef.current = scrollContainer.scrollHeight;
      console.log(
        prevScrollHeightRef.current,
        "prevScrollHeightRef from third use effect",
      );
    }
  }, [selectedConversationId]);

  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId,
  );
  const otherUser = selectedConversation
    ? getOtherUser(selectedConversation, user?.id || "")
    : null;

  // Group messages by date
  const groupedMessages = messages?.reduce(
    (groups, message) => {
      const date = formatDate(message.createdAt);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    },
    {} as Record<string, Message[]>,
  );

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLogout = () => {
    logoutMutate.mutate();
  };

  const handleDeleteMessage = (messageId: string) => {
    deleteMessageMutation.mutate(messageId);
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden w-80 border-r border-border md:flex">
          <ConversationSidebar
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onSelectConversation={setSelectedConversationId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            currentUser={user}
            isLoading={conversationsLoading}
            onConversationCreated={(id) => setSelectedConversationId(id)}
            queryClient={queryClient}
          />
        </div>

        {/* Main Chat Area */}
        <div className="flex flex-1 flex-col">
          {/* Mobile Header with Menu */}
          <div className="flex items-center gap-2 border-b border-border bg-background p-4 md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="ghost">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <ConversationSidebar
                  conversations={conversations}
                  selectedConversationId={selectedConversationId}
                  onSelectConversation={setSelectedConversationId}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  currentUser={user}
                  onClose={() => setMobileOpen(false)}
                  isLoading={conversationsLoading}
                  onConversationCreated={(id) => setSelectedConversationId(id)}
                  queryClient={queryClient}
                />
              </SheetContent>
            </Sheet>

            {selectedConversation && otherUser && (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={otherUser.avatarUrl || ""} />
                  <AvatarFallback>{getInitials(otherUser.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{otherUser.name}</p>
                  <p className="text-xs text-muted-foreground">Active now</p>
                </div>
              </div>
            )}
          </div>

          {!selectedConversation ? (
            // Empty State
            <div className="flex flex-1 items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-muted p-4">
                  <Menu className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-foreground">
                    No conversation selected
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Select a conversation to start chatting
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Chat Header */}
              <div className="hidden items-center justify-between border-b border-border bg-background px-6 py-4 md:flex">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={otherUser!.avatarUrl || ""} />
                    <AvatarFallback>
                      {getInitials(otherUser!.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-semibold text-foreground">
                      {otherUser!.name}
                    </h2>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="text-xs text-muted-foreground">
                        Active now
                      </span>
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost">
                      <MoreVertical className="h-5 w-5 text-2xl text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 dark">
                    <DropdownMenuItem>Block user</DropdownMenuItem>
                    <DropdownMenuItem>Clear chat</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Messages Area */}
              <ScrollArea
                className="flex-1 overflow-hidden"
                ref={scrollAreaRef}
              >
                {messagesLoading ? (
                  <div className="flex flex-col gap-4 p-4">
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-16 w-48 rounded-lg" />
                    </div>
                    <div className="flex flex-row-reverse gap-2">
                      <Skeleton className="h-16 w-48 rounded-lg" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-10 w-32 rounded-lg" />
                    </div>
                  </div>
                ) : (
                  <div className="relative flex flex-col gap-6 p-4 md:p-6">
                    {/* top sentinel — triggers loading older messages when scrolled into view */}
                    <div ref={topRef} className="h-1 w-full" />

                    {isFetchingNextPage && (
                      <div className="absolute top-4 left-0 right-0 z-10 flex justify-center">
                        <div className="rounded-lg bg-background/50 p-1 backdrop-blur-sm">
                          <Skeleton className="h-8 w-48 rounded-lg shadow-sm" />
                        </div>
                      </div>
                    )}

                    {!hasNextPage && messages.length > 0 && (
                      <p className="text-center text-xs text-muted-foreground py-2">
                        No more messages
                      </p>
                    )}

                    {/* existing grouped messages render */}
                    {Object.entries(groupedMessages).map(([date, msgs]) => (
                      <div key={date}>
                        <div className="mb-4 flex items-center justify-center">
                          <Separator className="flex-1" />
                          <span className="px-3 text-xs text-muted-foreground">
                            {date}
                          </span>
                          <Separator className="flex-1" />
                        </div>

                        <div className="flex flex-col gap-4">
                          {msgs.map((message) => (
                            <MessageBubble
                              key={message.id}
                              message={message}
                              isOwn={message.senderId === user?.id}
                              onDelete={handleDeleteMessage}
                              isDeleting={deleteMessageMutation.isPending}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div ref={bottomRef} className="h-0" />
              </ScrollArea>

              {/* Input Area */}
              <div className="border-t border-border bg-background p-4">
                <div className="flex gap-3">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    rows={1}
                    disabled={sendMessageMutation.isPending}
                    className="max-h-24 text-muted-foreground min-h-10 flex-1 resize-none rounded-lg border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleSendMessage}
                        disabled={
                          !messageInput.trim() || sendMessageMutation.isPending
                        }
                        size="icon"
                        className="flex-shrink-0"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Send message</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Mobile Options Header */}
              <div className="flex items-center justify-between border-t border-border bg-background px-4 py-3 md:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedConversationId(null)}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem>Block user</DropdownMenuItem>
                    <DropdownMenuItem>Clear chat</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu (Desktop) */}
        <div className="hidden border-l border-border bg-background p-4 md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.avatarUrl || ""} />
                  <AvatarFallback>
                    {getInitials(user?.name || "U")}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 dark">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-foreground">
                  {user?.name}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Separator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="gap-2 text-red-600 focus:text-red-600"
                disabled={logoutMutate.isPending}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
}
