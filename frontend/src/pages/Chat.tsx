import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useInView } from "react-intersection-observer";
import {
  Menu,
  Send,
  MoreVertical,
  ArrowLeft,
  Search,
  LogOut,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { conversationApi } from "@/api/conversation";
import { setAccessToken } from "@/api/client";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";

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
}: {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentUser: User | null;
  onClose?: () => void;
  isLoading?: boolean;
}) {
  const filteredConversations = conversations.filter((conv) => {
    const otherUser = getOtherUser(conv, currentUser?.id || "");
    return otherUser.name.toLowerCase().includes(searchQuery.toLowerCase());
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
            placeholder="Search conversations..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))
            : filteredConversations.map((conversation) => {
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
                          {lastMessage?.content || "No messages yet"}
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
              })}
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
    <div className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Intersection observer refs for infinite scroll
  const { ref: topRef, inView: topInView } = useInView();
  const prevScrollHeightRef = useRef<number>(0);
  const hasInitiallyLoaded = useRef(false);
  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } =
    useQuery({
      queryKey: ["conversations"],
      queryFn: () => conversationApi.getConversations().then((res) => res.data),
    });

  // Set first conversation as selected on load
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  // Fetch messages for selected conversation with infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isSuccess,
    isLoading: messagesLoading,
  } = useInfiniteQuery({
    queryKey: ["messages", selectedConversationId],
    queryFn: ({ pageParam }) =>
      conversationApi
        .getMessages(selectedConversationId!, pageParam as string | undefined)
        .then((res) => res.data),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      // if less than 30 messages returned, no more pages
      if (lastPage.length < 30) return undefined;
      // cursor is the last item (oldest message in this batch since api returns desc)
      return lastPage[lastPage.length - 1]?.id;
    },
    enabled: !!selectedConversationId,
    select: (data) => ({
      ...data,
      // reverse page order so older pages appear first
      // reverse messages within each page so oldest message appears first
      // use spread [...] before reverse to avoid mutating the original cached array
      pages: [...data.pages].reverse().map((page) => [...page].reverse()),
    }),
  });

  // flatten all pages into one array — now in correct oldest to newest order
  const messages = data?.pages.flat() ?? [];
  console.log(data?.pages, "pages ");
  console.log(messages, "messages");

  // Load more when top sentinel is in view
  useEffect(() => {
    if (!hasInitiallyLoaded.current) return; // skip first load
    if (topInView && hasNextPage && !isFetchingNextPage) {
      // save scroll height before loading more so we can restore position
      const scrollContainer = scrollAreaRef.current?.querySelector(
        "[data-radix-scroll-area-viewport]",
      );

      prevScrollHeightRef.current = scrollContainer?.scrollHeight ?? 0;
      //                            e.g. 1200px
      void fetchNextPage();
    }
  }, [topInView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Restore scroll position after new page loads
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    );
    if (!scrollContainer) return;

    const newScrollHeight = scrollContainer.scrollHeight;
    //                      e.g. 1800px (600px of new messages added)

    const diff = newScrollHeight - prevScrollHeightRef.current;
    //           1800 - 1200 = 600px  how much content was added at top

    // only restore position if we loaded a new page (not initial load)
    if (diff > 0 && prevScrollHeightRef.current > 0) {
      scrollContainer.scrollTop = diff;
      //                          600px push view down by same amount content grew
      prevScrollHeightRef.current = 0; // reset after restoring
    }
  }, [data?.pages.length]);

  // Reset infinite query when conversation changes
  useEffect(() => {
    if (selectedConversationId) {
      void queryClient.resetQueries({
        queryKey: ["messages", selectedConversationId],
      });
    }
  }, [selectedConversationId, queryClient]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      conversationApi.sendMessage(selectedConversationId!, content),
    onMutate: async (content) => {
      // cancel any outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({
        queryKey: ["messages", selectedConversationId],
      });

      // snapshot previous data in case we need to roll back
      const previousMessages = queryClient.getQueryData([
        "messages",
        selectedConversationId,
      ]);

      // optimistically add message to cache immediately
      await queryClient.setQueryData(
        ["messages", selectedConversationId],
        (old: { pages: Message[][]; pageParams: unknown[] } | undefined) => {
          if (!old) return old;
          const optimisticMessage: Message = {
            id: `temp-${Date.now()}`,
            conversationId: selectedConversationId!,
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
          const newPages = [...old.pages];
          newPages[0] = [optimisticMessage, ...newPages[0]]; // prepend to first page

          return { ...old, pages: newPages };
        },
      );
      requestAnimationFrame(() => {
        const scrollContainer = scrollAreaRef.current?.querySelector(
          "[data-radix-scroll-area-viewport]",
        );
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      });
      return { previousMessages };
    },
    onSuccess: async () => {
      // refetch to replace optimistic message with real one from server
      await queryClient.invalidateQueries({
        queryKey: ["messages", selectedConversationId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["conversations"],
      });
      // scroll to bottom after message sent
      requestAnimationFrame(() => {
        const scrollContainer = scrollAreaRef.current?.querySelector(
          "[data-radix-scroll-area-viewport]",
        );
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      });
    },
    onError: (err, content, context) => {
      // roll back to previous messages if mutation failed
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["messages", selectedConversationId],
          context.previousMessages,
        );
      }
      toast.error("Failed to send message");
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

  // Scroll to bottom on initial load or conversation change
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    );
    if (!scrollContainer) return;
    console.log(scrollContainer.scrollHeight, "scrollHeight on initial load");
    // only scroll to bottom on first page load or when conversation changes, or when after sending a message (handled in sendMessageMutation onSuccess)
    if (data?.pages.length === 1) {
      console.log("scrolling to bottom on initial load or conversation change");
      setTimeout(() => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }, 100);
    }
  }, [selectedConversationId, data?.pages.length]);

  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId,
  );
  const otherUser = selectedConversation
    ? getOtherUser(selectedConversation, user?.id || "")
    : null;

  // Group messages by date
  const groupedMessages = messages.reduce(
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

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversationId) return;
    sendMessageMutation.mutate(messageInput);
    setMessageInput("");
  };

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
                  <div className="flex flex-col gap-6 p-4 md:p-6">
                    {/* top sentinel — triggers loading older messages when scrolled into view */}
                    <div ref={topRef}>
                      {isFetchingNextPage && (
                        <div className="flex justify-center py-2">
                          <div className="flex gap-3">
                            <Skeleton className="h-8 w-48 rounded-lg" />
                          </div>
                        </div>
                      )}
                      {!hasNextPage && messages.length > 0 && (
                        <p className="text-center text-xs text-muted-foreground py-2">
                          No more messages
                        </p>
                      )}
                    </div>

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
